/**
 * 백필 — 기존 동기화 대회의 TournamentStanding.deckIcons 보강.
 *
 * 배경: deckIcons 컬럼 추가 이전에 sync 된 대회들은 deckIcons 가 비어 있어
 *       DeckArchetype.iconKeys 가 채워지지 않는다(핵심 카드 식별 불가).
 *
 * 흐름:
 *   1. limitlessId 있는 Tournament 조회
 *   2. 각 대회: /standings 재조회 (rate guard) → placing 별 deck.icons 추출
 *   3. 해당 standing 의 deckIcons 만 update (다른 필드 불변)
 *   4. 이후 aggregate-meta 를 재실행하면 iconKeys 가 채워짐(별도 실행)
 *
 * CLI:
 *   npx tsx scripts/backfill-deck-icons.ts            # 전체
 *   npx tsx scripts/backfill-deck-icons.ts --dry-run
 *
 * 환경: WSL2 → curl(execFile) (scripts/lib/limitless-api.ts).
 *
 * docs/meta-pipeline-limitless.md
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { fetchStandings, rateGuard, getRemaining } from "./lib/limitless-api";

function parseArgs(): { dryRun: boolean } {
  return { dryRun: process.argv.slice(2).includes("--dry-run") };
}

async function main() {
  const { dryRun } = parseArgs();

  const tournaments = await prisma.tournament.findMany({
    where: { limitlessId: { not: null } },
    select: { id: true, limitlessId: true, nameKo: true },
    orderBy: { date: "desc" },
  });

  console.log(`[backfill] 대상 대회 ${tournaments.length}건 dry-run=${dryRun}`);

  const stats = { tournaments: 0, updated: 0, withIcons: 0, errors: 0, rateWaits: 0 };

  for (const t of tournaments) {
    try {
      if (await rateGuard()) stats.rateWaits++;
      const standings = await fetchStandings(t.limitlessId!);

      // placing → icons 매핑
      const iconsByPlacing = new Map<number, string[]>();
      for (const s of standings) {
        if (s.placing == null) continue;
        const icons = s.deck?.icons ?? [];
        if (!iconsByPlacing.has(s.placing)) iconsByPlacing.set(s.placing, icons);
      }

      let updated = 0;
      let withIcons = 0;
      for (const [placing, icons] of iconsByPlacing) {
        if (icons.length > 0) withIcons++;
        if (dryRun) continue;
        await prisma.tournamentStanding.updateMany({
          where: { tournamentId: t.id, placing },
          data: { deckIcons: icons },
        });
        updated++;
      }

      stats.tournaments++;
      stats.updated += updated;
      stats.withIcons += withIcons;
      console.log(
        `[ok] ${t.id} "${t.nameKo}" standings=${iconsByPlacing.size} icons채움=${withIcons} (r=${getRemaining()})`,
      );
    } catch (e) {
      stats.errors++;
      console.error(`[err] ${t.id} "${t.nameKo}": ${(e as Error).message}`);
    }
  }

  console.log("\n[backfill] ── 통계 ──");
  console.log(`  대회: ${stats.tournaments}  standings update: ${stats.updated}  icons보유: ${stats.withIcons}`);
  console.log(`  rate-wait: ${stats.rateWaits}  errors: ${stats.errors}`);
  if (!dryRun) console.log("  → 이제 'npm run aggregate:meta' 재실행해 iconKeys 갱신 필요.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
