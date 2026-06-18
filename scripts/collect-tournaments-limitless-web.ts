/**
 * P3: limitlesstcg.com 메인 사이트 수집기 — 코리안리그 정본 (docs/cardgame/meta-pipeline-multisource.md §3 #2)
 *
 * 실행: npx tsx scripts/collect-tournaments-limitless-web.ts [--dry-run] [--force] [--limit=N] [--id=567]
 *
 * - 대회 선별은 **시리즈명 기준**("Korean League" prefix) — data-country 단독 선별 금지(리스크 P1-2:
 *   한국 개최 메이저가 KR 메타를 오염). 메이저는 별도 보강 스크립트(enrich-majors-limitless, P5).
 * - standings 는 사이트 게재분(top cut, 보통 32)만 — usageRate 는 "입상 점유율" 의미 (UI 라벨 구분).
 * - 덱리스트 카드는 EN ptcgoCode 표기(2026-06-06 실측 — standard-jp 대회 포함) → resolver 경로①.
 * - 0건 파싱 시 hard fail (HTML 구조 변경 감지 — 나무위키 다중표 오염 선례).
 * - 파서/슬러그 매핑은 scripts/lib/limitless-web-parse.ts 공용.
 */
import "dotenv/config";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { CardResolver } from "./lib/resolve-card";
import {
  loadNormalizedTournament,
  type NormalizedStanding,
  type NormalizedTournament,
} from "./lib/tournament-loader";
import {
  LW_BASE,
  fetchLwHtml,
  parseStandings,
  parseDecklists,
  buildSlugMap,
} from "./lib/limitless-web-parse";

const CACHE_DIR = path.join(process.cwd(), "data", "limitless-web");

type Args = { dryRun: boolean; force: boolean; limit: number; id: string | null };
function parseArgs(): Args {
  const a: Args = { dryRun: false, force: false, limit: 99, id: null };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg === "--force") a.force = true;
    else if (arg.startsWith("--limit=")) a.limit = parseInt(arg.slice("--limit=".length), 10);
    else if (arg.startsWith("--id=")) a.id = arg.slice("--id=".length);
  }
  return a;
}

async function main() {
  const args = parseArgs();
  const resolver = await CardResolver.create();
  const slugMap = await buildSlugMap();
  console.log(`[lw] 슬러그 매핑 사전 ${slugMap.size}건 (DB nameEn/deckName + aliases.json)`);

  // 1. 대회 목록 — 시리즈명 선별
  const listHtml = await fetchLwHtml(`${LW_BASE}/tournaments?show=300`, CACHE_DIR, "tournaments-list.html");
  const rowRe = /<tr[^>]*data-name="(Korean League[^"]*)"[^>]*>[\s\S]*?<\/tr>/g;
  type Row = { name: string; date: string; format: string; players: number; id: string };
  const rows: Row[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(listHtml)) !== null) {
    const tr = m[0];
    const attrs = Object.fromEntries([...tr.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    const id = tr.match(/href="\/tournaments\/(\d+)"/)?.[1];
    if (!id) continue;
    rows.push({
      name: attrs["name"],
      date: attrs["date"],
      format: attrs["format"] || "standard",
      players: parseInt(attrs["players"] || "0", 10),
      id,
    });
  }
  if (rows.length === 0) throw new Error("[lw] Korean League 행 0건 — HTML 구조 변경 의심, hard fail");
  console.log(`[lw] Korean League ${rows.length}건 발견`);

  const targets = (args.id ? rows.filter((r) => r.id === args.id) : rows).slice(0, args.limit);
  const stats = { tournaments: 0, standings: 0, decklists: 0, skipped: 0, unmappedNames: new Map<string, number>() };

  for (const row of targets) {
    const tid = `lw-${row.id}`;
    // 멱등: 이미 sync 된 대회 skip (--force 로 재수집)
    if (!args.force) {
      const existing = await prisma.tournament.findUnique({ where: { id: tid }, select: { syncedAt: true } });
      if (existing?.syncedAt) {
        stats.skipped++;
        continue;
      }
    }

    const pageHtml = await fetchLwHtml(`${LW_BASE}/tournaments/${row.id}`, CACHE_DIR, `tournament-${row.id}.html`);
    const webStandings = parseStandings(pageHtml);
    if (webStandings.length === 0) throw new Error(`[lw] ${tid} standings 0건 파싱 — 구조 변경 의심, hard fail`);

    // 덱리스트 (없는 대회도 있음 — 페이지 404/빈 섹션 허용)
    let decklists: ReturnType<typeof parseDecklists> = [];
    try {
      const dlHtml = await fetchLwHtml(`${LW_BASE}/tournaments/${row.id}/decklists`, CACHE_DIR, `decklists-${row.id}.html`);
      decklists = parseDecklists(dlHtml);
    } catch {
      console.warn(`[lw] ${tid} decklists 페이지 없음/실패 — standings 만 적재`);
    }
    const dlByPlacing = new Map(decklists.map((d) => [d.placing, d]));

    const standings: NormalizedStanding[] = [];
    for (const s of webStandings) {
      const deckKey = s.archetypeName ? (slugMap.get(s.archetypeName.toLowerCase()) ?? null) : null;
      if (s.archetypeName && !deckKey) {
        stats.unmappedNames.set(s.archetypeName, (stats.unmappedNames.get(s.archetypeName) ?? 0) + 1);
      }
      const dl = dlByPlacing.get(s.placing);
      let decklist: object | null = null;
      if (dl) {
        // EN ptcgoCode 표기 → resolver 경로① 로 cardId additive 보강
        for (const bucket of ["pokemon", "trainer", "energy"] as const) {
          for (const c of dl.cards[bucket]) {
            const resolved = await resolver.resolveEn(c.set, c.number);
            if (resolved) c.cardId = resolved.cardId;
          }
        }
        decklist = dl.cards;
        stats.decklists++;
      }
      standings.push({
        placing: s.placing,
        playerName: s.player,
        country: s.country,
        deckKey,
        deckName: s.archetypeName,
        archetypeRaw: s.archetypeName,
        decklist,
        deckSource: decklist ? "limitless" : null,
      });
    }

    const t: NormalizedTournament = {
      id: tid,
      source: "limitless-web",
      sourceId: row.id,
      metaRegion: "KR",
      level: "league",
      externalUrl: `${LW_BASE}/tournaments/${row.id}`,
      name: `${row.name} ${row.date.slice(0, 4)}`,
      date: new Date(row.date),
      region: "KR",
      format: row.format === "standard-jp" ? "STANDARD_JP" : "STANDARD",
      players: row.players,
      platform: "오프라인",
    };
    const res = await loadNormalizedTournament(t, standings, { dryRun: args.dryRun });
    console.log(
      `[lw] ${tid} "${t.name}" ${row.date} p=${row.players} → standings ${res.standings} (덱리스트 ${decklists.length})${args.dryRun ? " (dry)" : ""}`,
    );
    stats.tournaments++;
    stats.standings += res.standings;
  }

  console.log(
    `\n[lw] 완료: 대회 ${stats.tournaments} / standings ${stats.standings} / 덱리스트 ${stats.decklists} / skip ${stats.skipped}`,
  );
  if (stats.unmappedNames.size) {
    console.log(`[lw] ⚠ 슬러그 미매핑 아키타입 ${stats.unmappedNames.size}종 (archetypeRaw 보존, aliases.json 보강 대상):`);
    for (const [name, n] of [...stats.unmappedNames.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  - "${name}" ×${n}`);
    }
  }
  console.log(`[lw] 카드 미해석 사유:\n${resolver.reportMisses() || "  없음"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
