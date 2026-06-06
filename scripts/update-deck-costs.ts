/**
 * UI-1b/D5: 덱 견적 캐시 배치 갱신 — docs/cardgame-ui-plan.md §3-D5
 *
 * 실행: npx tsx scripts/update-deck-costs.ts [--dry-run]
 * 주기: meta:weekly 말미 (시세 sync 후).
 *
 * computeDeckCost(견적 엔진)를 실집계 아키타입 전체에 돌려
 * DeckArchetype.deckCostBudget/deckCostPremium/deckCostMeta 를 채운다.
 * 덱 테이블 💰가격 열이 이 캐시를 읽음(토글은 프리캐시 2값 스왑 — 실시간 재계산 금지).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { computeDeckCost } from "../src/lib/services/deck-pricing";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const archetypes = await prisma.deckArchetype.findMany({
    where: { sampleSize: { gt: 0 } },
    select: { id: true, nameKo: true },
  });
  console.log(`[deck-costs] 대상 ${archetypes.length}덱`);

  let updated = 0;
  let skipped = 0;
  for (const a of archetypes) {
    const cost = await computeDeckCost(a.id);
    if (!cost || cost.pricedCount === 0) {
      skipped++;
      continue;
    }
    const meta = {
      pricedCount: cost.pricedCount,
      totalCount: cost.totalCount,
      basis: cost.basis,
      asOf: cost.asOf,
      hasExpensiveMissing: cost.hasExpensiveMissing,
    };
    if (!dryRun) {
      await prisma.deckArchetype.update({
        where: { id: a.id },
        data: {
          deckCostBudget: cost.budget.totalKrw,
          deckCostPremium: cost.premium.totalKrw,
          deckCostMeta: meta,
        },
      });
    }
    updated++;
    console.log(
      `[deck-costs] ${a.id.padEnd(28)} budget ${String(cost.budget.totalKrw).padStart(8)}원 / premium ${String(cost.premium.totalKrw).padStart(9)}원 (${cost.pricedCount}/${cost.totalCount}장${cost.hasExpensiveMissing ? " ±변동큼" : ""})`,
    );
  }
  console.log(`\n[deck-costs] 갱신 ${updated} / 견적불가 ${skipped}${dryRun ? " (dry)" : ""}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
