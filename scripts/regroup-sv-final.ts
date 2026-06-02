/**
 * SV 부속상품 최종 재정렬 — 나무위키 공식 분류(구축덱 / 기타강화상품) 2분류로 통합.
 *   - sv-decks  (구축덱): 스타터세트·스타트덱·스페셜덱세트·배틀마스터덱·테라스탈타입스텔라
 *   - sv-goods  (기타): 배틀강화BOX·ex스페셜세트·프리미엄트레이너박스
 *   - og-svln/og-svls(SV 스타터세트인데 og- 오분류)를 sv-decks로 흡수 후 빈 그룹 삭제
 *   - 임시 4그룹(sv-starter-decks/battle-decks/battle-boxes/special-sets) 삭제
 * 멱등. 실행: npx tsx scripts/regroup-sv-final.ts [--dry-run]
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");

const DECKS = ["kr-svhk","kr-svhm","kr-svel","kr-svom","kr-svod","kr-svd","kr-sva","kr-svc","kr-svem","kr-svg","kr-svjp","kr-svjl","kr-svln","kr-svls","jp-tcg-SVLN","jp-tcg-SVLS"];
const GOODS = ["kr-svf","kr-svn","kr-svp1","kr-svp2","kr-svb"];
const OLD_GROUPS = ["sv-starter-decks","sv-battle-decks","sv-battle-boxes","sv-special-sets","og-svln","og-svls"];

async function moveTo(groupId: string, nameKo: string, order: number, setIds: string[]) {
  if (!DRY) await prisma.setGroup.upsert({
    where: { id: groupId },
    update: { era: "SV-SP", nameKo, order },
    create: { id: groupId, era: "SV-SP", nameKo, order, releaseDate: null },
  });
  let sets = 0, lc = 0;
  for (const sid of setIds) {
    const s = await prisma.set.findUnique({ where: { id: sid }, select: { id: true } });
    if (!s) { console.log(`  ⚠ ${sid} 없음`); continue; }
    if (!DRY) {
      await prisma.set.update({ where: { id: sid }, data: { setGroupId: groupId } });
      lc += (await prisma.logicalCard.updateMany({ where: { primarySetId: sid }, data: { setGroupId: groupId } })).count;
    } else lc += await prisma.logicalCard.count({ where: { primarySetId: sid } });
    sets++;
  }
  console.log(`${groupId} "${nameKo}": sets=${sets} LC=${lc}`);
}

async function main() {
  await moveTo("sv-decks", "SV 구축덱", 90, DECKS);
  await moveTo("sv-goods", "SV 기타 강화상품", 91, GOODS);
  // 빈 옛 그룹 삭제(세트 0개 확인)
  for (const g of OLD_GROUPS) {
    const cnt = await prisma.set.count({ where: { setGroupId: g } });
    if (cnt === 0) { if (!DRY) await prisma.setGroup.delete({ where: { id: g } }).catch(()=>{}); console.log(`삭제: ${g}`); }
    else console.log(`보존(세트 ${cnt}개 남음): ${g}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
