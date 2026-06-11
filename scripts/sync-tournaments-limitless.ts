/**
 * 메타 수집 — Limitless TCG 대회 standings 적재.
 *
 * 흐름:
 *   1. /tournaments?game=PTCG&limit=N → format∈{STANDARD,EXPANDED}, players≥min, date≥since 필터
 *   2. 이미 syncedAt 있는 대회 skip (멱등)
 *   3. 각 대회: /details + /standings 조회 (rate guard: req 간 700ms+, 잔량<5 대기)
 *   4. Tournament upsert + TournamentStanding upsert (tournamentId+placing)
 *
 * CLI:
 *   npm run sync:meta:lim                          # since=마지막 syncedAt, limit=50, min=32
 *   npm run sync:meta:lim -- --limit=5 --dry-run
 *   npm run sync:meta:lim -- --since=2026-05-20 --limit=20 --min-players=32
 *
 * 환경: WSL2 → curl(execFile) 강제 (scripts/lib/limitless-api.ts).
 *
 * docs/meta-pipeline-limitless.md
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import {
  fetchTournaments,
  fetchDetails,
  fetchStandings,
  rateGuard,
  getRemaining,
  type LimitlessStanding,
} from "./lib/limitless-api";

const ALLOWED_FORMATS = new Set(["STANDARD", "EXPANDED"]);

type Args = {
  since?: string; // YYYY-MM-DD
  limit: number;
  minPlayers: number;
  dryRun: boolean;
};

function parseArgs(): Args {
  const a: Args = { limit: 50, minPlayers: 32, dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg.startsWith("--since=")) a.since = arg.slice("--since=".length);
    else if (arg.startsWith("--limit=")) a.limit = parseInt(arg.slice("--limit=".length), 10);
    else if (arg.startsWith("--min-players=")) a.minPlayers = parseInt(arg.slice("--min-players=".length), 10);
  }
  return a;
}

/** standings country 최빈값 → region. 없으면 "INTL". */
function deriveRegion(standings: LimitlessStanding[]): string {
  const counts = new Map<string, number>();
  for (const s of standings) {
    if (s.country) counts.set(s.country, (counts.get(s.country) ?? 0) + 1);
  }
  if (counts.size === 0) return "INTL";
  let best = "INTL";
  let bestN = -1;
  for (const [c, n] of counts) {
    if (n > bestN) {
      best = c;
      bestN = n;
    }
  }
  return best;
}

async function main() {
  const args = parseArgs();

  // since 기본값: 마지막 syncedAt 이 있으면 그 날짜, 없으면 제한 없음
  let sinceDate: Date | null = null;
  if (args.since) {
    sinceDate = new Date(`${args.since}T00:00:00.000Z`);
  } else {
    const last = await prisma.tournament.findFirst({
      where: { syncedAt: { not: null } },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    if (last) sinceDate = last.date;
  }

  console.log(
    `[sync] limit=${args.limit} min-players=${args.minPlayers} since=${sinceDate ? sinceDate.toISOString().slice(0, 10) : "(none)"} dry-run=${args.dryRun}`,
  );

  const list = await fetchTournaments(args.limit);
  console.log(`[sync] /tournaments → ${list.length}건 (잔량 r=${getRemaining()})`);

  const candidates = list.filter((t) => {
    if (!ALLOWED_FORMATS.has(t.format)) return false;
    if (t.players < args.minPlayers) return false;
    if (sinceDate && new Date(t.date) < sinceDate) return false;
    return true;
  });
  console.log(`[sync] 필터 후 후보 ${candidates.length}건 (format/min-players/since)`);

  const stats = {
    tournaments: 0,
    standings: 0,
    skipped: 0,
    rateWaits: 0,
    errors: 0,
  };

  for (const t of candidates) {
    const tournamentId = `lim-${t.id}`;

    // 멱등: 이미 동기화된 대회 skip
    const existing = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { syncedAt: true },
    });
    if (existing?.syncedAt) {
      stats.skipped++;
      continue;
    }

    try {
      if (await rateGuard()) stats.rateWaits++;
      const details = await fetchDetails(t.id);

      if (await rateGuard()) stats.rateWaits++;
      const standings = await fetchStandings(t.id);

      const region = deriveRegion(standings);
      const winner = standings.find((s) => s.placing === 1);
      const winnerArchetypeId = winner?.deck?.id ?? null;

      if (args.dryRun) {
        console.log(
          `[dry] ${tournamentId} "${t.name}" ${t.format} p=${t.players} region=${region} standings=${standings.length} winner=${winnerArchetypeId ?? "?"} platform=${details.platform ?? "?"}`,
        );
        stats.tournaments++;
        stats.standings += standings.length;
        continue;
      }

      // syncedAt 은 standings 적재 성공 후 마지막에 set → 중간 실패 시 멱등 재시도 가능
      const tournamentFields = {
        name: t.name,
        date: new Date(t.date),
        region,
        format: t.format,
        players: t.players,
        platform: details.platform ?? null,
        winnerArchetypeId,
        status: "completed",
        // 멀티소스 식별 (docs/meta-pipeline-multisource.md §1): 이 수집기는 온라인 그래스루츠 정본
        source: "limitless-play",
        sourceId: t.id,
        metaRegion: "INTL",
        level: "online",
        externalUrl: `https://play.limitlesstcg.com/tournament/${t.id}`,
      };
      await prisma.tournament.upsert({
        where: { id: tournamentId },
        create: {
          id: tournamentId,
          nameKo: t.name, // 대회명은 번역 대상 아님 → 원문 유지(편집 시 수동)
          ...tournamentFields,
        },
        update: { ...tournamentFields },
      });

      // standings upsert (tournamentId+placing). 동일 placing 충돌 방지 위해 placing 중복 제거.
      const seen = new Set<number>();
      for (const s of standings) {
        // 진행중/미완 대회는 placing null 인 행 존재 → skip (집계 노이즈/PK 위반 방지)
        if (s.placing == null) continue;
        if (seen.has(s.placing)) continue;
        seen.add(s.placing);
        const rec = s.record ?? { wins: 0, losses: 0, ties: 0 };
        await prisma.tournamentStanding.upsert({
          where: { tournamentId_placing: { tournamentId, placing: s.placing } },
          create: {
            tournamentId,
            placing: s.placing,
            playerName: s.name ?? s.player ?? "Unknown",
            playerUsername: s.player ?? null, // pairings 매칭 안정화용 username 보존
            country: s.country ?? null,
            deckKey: s.deck?.id ?? null,
            deckName: s.deck?.name ?? null,
            deckIcons: s.deck?.icons ?? [],
            wins: rec.wins ?? 0,
            losses: rec.losses ?? 0,
            ties: rec.ties ?? 0,
            decklist: (s.decklist as object) ?? undefined,
            deckSource: s.decklist ? "limitless" : null,
          },
          update: {
            playerName: s.name ?? s.player ?? "Unknown",
            playerUsername: s.player ?? null,
            country: s.country ?? null,
            deckKey: s.deck?.id ?? null,
            deckName: s.deck?.name ?? null,
            deckIcons: s.deck?.icons ?? [],
            wins: rec.wins ?? 0,
            losses: rec.losses ?? 0,
            ties: rec.ties ?? 0,
            decklist: (s.decklist as object) ?? undefined,
            deckSource: s.decklist ? "limitless" : null,
          },
        });
        stats.standings++;
      }

      // standings 적재 성공 후에만 syncedAt set (멱등성: 중간 실패 시 미설정 → 재시도 가능)
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { syncedAt: new Date() },
      });

      stats.tournaments++;
      console.log(
        `[ok] ${tournamentId} "${t.name}" p=${t.players} region=${region} standings=${seen.size} winner=${winnerArchetypeId ?? "?"} (r=${getRemaining()})`,
      );
    } catch (e) {
      stats.errors++;
      console.error(`[err] ${tournamentId} "${t.name}": ${(e as Error).message}`);
    }
  }

  console.log("\n[sync] ── 통계 ──");
  console.log(`  대회: ${stats.tournaments}  standings: ${stats.standings}`);
  console.log(`  skip(이미동기화): ${stats.skipped}  rate-wait: ${stats.rateWaits}  errors: ${stats.errors}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
