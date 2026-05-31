/**
 * MarketStat 재집계 (멱등). 로컬/배포 전 수동 실행용.
 *
 * 실행: npm run market:rebuild
 *
 * - rebuildMarketStats(): Price/Trade 가 있는 카드별로 오늘(date 00:00) 통계 산출
 *   → MarketStat upsert(cardId+date 유니크). 데이터 희소 시 산출 가능한 항목만 채움.
 * - 멱등: 같은 날 재실행 시 upsert 로 갱신.
 * - Supabase 풀(15) 보호: 서비스가 카드 단위 순차 처리.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { rebuildMarketStats } from "../src/lib/services/market";

async function main() {
  const result = await rebuildMarketStats();
  console.log(`[rebuild-market] 대상 카드 ${result.cards}개 · MarketStat ${result.stats}건 집계.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
