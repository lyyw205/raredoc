/**
 * S8a-G(25th 골든박스) 희귀도 교정 — 박스 골드카드는 레어도 없음.
 * 3중 확인: 공식(#014/015 ポケモンごっこ 아이콘없음)·Bulbapedia(Rarity 0개)·트래커("no rarity").
 * DB가 #1-15에 RR/RRR(베이스 상속 오류, 몬스터볼=Double Rare 등) 배정 → null로. #16 기본에너지 이미 null.
 * JP/KR 카드 완전 정렬(divergence 없음) → 양쪽 동시. og-s8a-g 비동결.
 * 실행: npx tsx scripts/fix-s8ag-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const SET_IDS = ["jp-tcg-S8a-G", "kr-s8a-g"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S8a-G 희귀도 교정(#1-15 → null) | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const setId of SET_IDS) {
    const rows = await prisma.regionCard.findMany({ where: { setId, numberInt: { gte: 1, lte: 15 } }, include: { rarity: true }, orderBy: { numberInt: "asc" } });
    for (const rc of rows) {
      if (rc.rarityId == null) continue;
      console.log(`  ${setId} #${rc.numberInt} ${rc.name}: ${rc.rarity?.code} → (null)`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: null } });
    }
  }
  console.log(`\n${APPLY ? `✅ ${changed}장 교정` : `(dry-run) 변경예정 ${changed}장`}`);
  if (APPLY) {
    for (const setId of SET_IDS) {
      const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId }, _count: true });
      console.log(`  ${setId}: ${dist.map((d) => `${d.rarityId ? "rar" : "null"}:${d._count}`).join(" ")}`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
