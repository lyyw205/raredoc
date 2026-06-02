/**
 * SV 부속상품(스타터덱·배틀덱·강화박스·스페셜세트)을 본확장 setGroup에서 분리해
 * 타입별 신규 setGroup(era="SV-SP")으로 이동. dex에서 본확장과 별도 헤더로 표시됨.
 *
 * 동작: 신규 SetGroup 4개 생성(멱등 upsert) → 각 부속 Set.setGroupId 이동
 *       + 해당 Set을 primarySet으로 하는 LogicalCard.setGroupId 도 동기 이동. 멱등.
 *
 * 실행: npx tsx scripts/regroup-sv-subproducts.ts [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");

const GROUPS: { id: string; nameKo: string; order: number; members: string[] }[] = [
  { id: "sv-starter-decks", nameKo: "SV 스타터 덱·세트", order: 90,
    members: ["kr-svhk","kr-svhm","kr-svel","kr-svom","kr-svod","kr-svd","kr-sva","kr-svc","kr-svem"] },
  { id: "sv-battle-decks", nameKo: "SV 배틀 마스터 덱", order: 91,
    members: ["kr-svjp","kr-svjl"] },
  { id: "sv-battle-boxes", nameKo: "SV 배틀 강화 BOX", order: 92,
    members: ["kr-svf","kr-svn"] },
  { id: "sv-special-sets", nameKo: "SV 스페셜·프리미엄 세트", order: 93,
    members: ["kr-svp2","kr-svp1","kr-svg","kr-svb"] },
];

async function main() {
  for (const g of GROUPS) {
    if (!DRY) {
      await prisma.setGroup.upsert({
        where: { id: g.id },
        update: { era: "SV-SP", nameKo: g.nameKo, order: g.order },
        create: { id: g.id, era: "SV-SP", nameKo: g.nameKo, order: g.order, releaseDate: null },
      });
    }
    let movedSets = 0, movedLC = 0;
    for (const sid of g.members) {
      const set = await prisma.set.findUnique({ where: { id: sid }, select: { setGroupId: true } });
      if (!set) { console.log(`  ⚠ ${sid} 없음`); continue; }
      if (!DRY) {
        await prisma.set.update({ where: { id: sid }, data: { setGroupId: g.id } });
        const r = await prisma.logicalCard.updateMany({ where: { primarySetId: sid }, data: { setGroupId: g.id } });
        movedLC += r.count;
      } else {
        movedLC += await prisma.logicalCard.count({ where: { primarySetId: sid } });
      }
      movedSets++;
    }
    console.log(`${g.id} (era=SV-SP): ${DRY ? "would move" : "moved"} sets=${movedSets} LC=${movedLC}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
