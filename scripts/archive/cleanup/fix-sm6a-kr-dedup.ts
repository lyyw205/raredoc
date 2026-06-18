/**
 * kr-sm6a(드래곤스톰 KR) 중복비대 dedup — 108행 → 68행.
 * 구조(카드 인쇄번호로 실측 확정):
 *   · #1-59  → lc-orphan-jp-tcg-SM6a-*  : 진짜(메인 001/053~ + SR). 유지.
 *   · #60-68 → lc-kr-sm6a-060..068      : 9개 기본에너지(sm6a 각인 실물). 트윈없음=유니크 → ★유지.
 *   · #69-108→ lc-kr-sm6a-069..108      : 40개 중복(예: #69 파이리 이미지가 001/053 인쇄=#1과 동일카드). 삭제.
 * ※ 기존 fix-sm6b-kr-dedup.ts 의 "전부 트윈이면 lc-kr 전삭제" 로직은 여기선 에너지(트윈없음)때문에 STOP함 →
 *   이 스크립트는 "트윈 있는 lc-kr 행만" victim 으로 한정(에너지 보존).
 * 안전: victim 은 전부 numberInt≥69(진짜 ≤59 초과) + 트윈보유. 보존 lc-kr 은 전부 '기본 ...에너지'.
 *   둘 중 하나라도 위반하면 STOP. og-sm6a 비동결. prisma FK스칼라=cardId.
 * 실행: npx tsx scripts/fix-sm6a-kr-dedup.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";

const SET = "kr-sm6a";
const PREFIX = "lc-kr-sm6a-";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const all = await prisma.regionCard.findMany({ where: { setId: SET }, select: { id: true, numberInt: true, name: true, cardId: true } });
  const real = all.filter((r) => !r.cardId?.startsWith(PREFIX));          // lc-orphan 진짜
  const lcKr = all.filter((r) => r.cardId?.startsWith(PREFIX));            // lc-kr (에너지+중복)
  const realNames = new Set(real.map((r) => r.name));
  const victims = lcKr.filter((r) => realNames.has(r.name));              // 트윈보유 = 중복
  const keptEnergy = lcKr.filter((r) => !realNames.has(r.name));          // 트윈없음 = 에너지(보존)

  console.log(`■ ${SET} dedup | 전체 ${all.length} = 진짜 ${real.length} + lc-kr ${lcKr.length}(중복 ${victims.length} + 보존 ${keptEnergy.length}) | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log(`  victim 번호범위 ${Math.min(...victims.map(v=>v.numberInt))}-${Math.max(...victims.map(v=>v.numberInt))} / 진짜 최대 ${Math.max(...real.map(r=>r.numberInt))}`);
  console.log(`  보존 lc-kr: ${keptEnergy.map(e=>`#${e.numberInt} ${e.name}`).join(", ")}`);

  // 안전 가드
  const badNum = victims.filter((v) => v.numberInt <= Math.max(...real.map(r=>r.numberInt)));
  const badEnergy = keptEnergy.filter((e) => !/에너지/.test(e.name));
  if (badNum.length) { console.log(`  🔴 진짜 번호대(≤59)에 victim → 중단:`, badNum.map(v=>`#${v.numberInt} ${v.name}`).join(", ")); await prisma.$disconnect(); return; }
  if (badEnergy.length) { console.log(`  🔴 보존대상에 비에너지 → 중단:`, badEnergy.map(e=>`#${e.numberInt} ${e.name}`).join(", ")); await prisma.$disconnect(); return; }
  console.log(`  ✅ 안전: victim 전부 #≥69·트윈보유 / 보존 ${keptEnergy.length} 전부 기본에너지`);
  if (!APPLY) { console.log(`\n(dry-run) 삭제예정 ${victims.length}행 → ${SET} ${all.length - victims.length}행. --apply`); await prisma.$disconnect(); return; }

  const lcIds = [...new Set(victims.map((v) => v.cardId).filter((x): x is string => !!x))];
  const del = await prisma.regionCard.deleteMany({ where: { id: { in: victims.map((v) => v.id) } } });
  console.log(`  CardLocale 삭제: ${del.count}`);
  let lcDel = 0;
  for (const id of lcIds) {
    if (await prisma.regionCard.count({ where: { cardId: id } })) continue;
    try { await prisma.card.delete({ where: { id } }); lcDel++; } catch (e) { console.log(`  ~ LC ${id} skip(${(e as Error).message.slice(0,40)})`); }
  }
  console.log(`  LogicalCard 삭제: ${lcDel}`);
  const actual = await prisma.regionCard.count({ where: { setId: SET } });
  await prisma.set.update({ where: { id: SET }, data: { cardCount: actual } });
  console.log(`\n=== 검증 === ${SET} actual=${actual} cardCount=${actual}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
