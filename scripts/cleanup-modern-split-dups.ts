/**
 * 하이브리드 정책 정리(멱등): modern SV/MEGA 합본 그룹과 중복되는 분할 og 그룹 12개 제거.
 *   - 해당 jp-tcg-* 세트는 삭제하지 않고 setGroupId=null 로 되돌려 카탈로그에서만 숨긴다(데이터 보존).
 *   - 기존 og-cp* 그룹의 era 라벨을 "XY (컨셉팩)" 으로 교정.
 * 실행: tsx scripts/cleanup-modern-split-dups.ts
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

const DUP_GROUP_IDS = [
  "og-sv1s", "og-sv1v", "og-sv2d", "og-sv2p", "og-sv4k", "og-sv4m",
  "og-sv5k", "og-sv5m", "og-sv11b", "og-sv11w", "og-m1l", "og-m1s",
];

async function main() {
  let unlinked = 0;
  let deleted = 0;
  for (const gid of DUP_GROUP_IDS) {
    const g = await prisma.setGroup.findUnique({
      where: { id: gid },
      include: { sets: { select: { id: true } } },
    });
    if (!g) continue;
    // 세트 먼저 미연결로(FK 보존), 그 다음 그룹 삭제.
    for (const s of g.sets) {
      await prisma.set.update({ where: { id: s.id }, data: { setGroupId: null } });
      unlinked++;
    }
    await prisma.setGroup.delete({ where: { id: gid } });
    deleted++;
  }

  // og-cp* era 라벨 교정
  const cp = await prisma.setGroup.updateMany({
    where: { id: { startsWith: "og-cp" } },
    data: { era: "XY (컨셉팩)" },
  });

  console.log(`삭제한 중복 그룹: ${deleted} / 미연결 처리한 세트: ${unlinked}`);
  console.log(`og-cp* era 교정: ${cp.count}건`);
  const total = await prisma.setGroup.count();
  console.log(`현재 SetGroup 총합: ${total}`);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); }).finally(() => prisma.$disconnect());
