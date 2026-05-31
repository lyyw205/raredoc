/**
 * 랭킹 스냅샷 + 뱃지 재집계 (멱등). 로컬/배포 전 수동 실행용.
 *
 * 실행: npm run rankings:rebuild
 *
 * - rebuildRankings(): 전 유저 가치 집계 → RankingSnapshot upsert(userId+오늘 date 유니크)
 *   + 비-rankMode/rankMode 뱃지 갱신 + User.tier 파생 + BadgeTier.holders 갱신.
 * - 멱등: 같은 날 재실행 시 upsert 로 갱신.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { rebuildRankings } from "../src/lib/services/gamification";

async function main() {
  const result = await rebuildRankings();
  const earned = await prisma.userBadge.count({ where: { earnedTier: { not: null } } });
  console.log(`[rebuild-rankings] 유저 ${result.users}명 · 스냅샷 ${result.snapshots}개 · 획득 뱃지 ${earned}개.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
