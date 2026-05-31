/**
 * orphan LogicalCard (setGroupId=null) 의 setGroupId 를 primarySet 의 setGroupId 로 백필.
 * Phase 2 마이그레이션 누락 보정. 멱등(이미 채워진 row 는 건드리지 않음).
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

async function main() {
  const before = await prisma.logicalCard.count({ where: { setGroupId: null } });
  console.log(`백필 대상(setGroupId=null): ${before}`);

  // 1쿼리: primarySet 의 setGroupId 로 update. null 인 primarySetId 는 영향 없음.
  const res = await prisma.$executeRawUnsafe(`
    UPDATE "LogicalCard" lc
    SET "setGroupId" = s."setGroupId"
    FROM "Set" s
    WHERE lc."primarySetId" = s.id
      AND lc."setGroupId" IS NULL
      AND s."setGroupId" IS NOT NULL
  `);
  console.log(`업데이트된 row: ${res}`);

  const after = await prisma.logicalCard.count({ where: { setGroupId: null } });
  const distinctSg = await prisma.logicalCard.findMany({
    where: { setGroupId: { not: null } },
    distinct: ["setGroupId"],
    select: { setGroupId: true },
  });
  console.log(`잔여(setGroupId=null): ${after}`);
  console.log(`LogicalCard 연결된 SetGroup 수: ${distinctSg.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
