/**
 * kr-sm1+(썬&문 강화확장팩 KR) 중복비대 dedup — 111행 → 72행.
 * 구조(진짜카드가 번호상 흩어져 있어 ★번호범위 아닌 트윈검사로 판정):
 *   · lc-jp-tcg-SM1+-* 63행: 진짜(베이스49+제단2+GX SR7+아이템 등, 번호 #1-58·#94-97·#102 산재). 유지.
 *   · lc-kr-* 중 이름트윈(lc-jp에 동일이름 존재) 39행: 중복(#59-93·#98-101). 삭제.
 *   · lc-kr-* 중 트윈없음 9행: 기본에너지(#103-111). ★유지.
 * 안전: victim 전부 lc-kr·트윈보유 / 보존 lc-kr 전부 '에너지' / lc-jp 미삭제.
 * og-sm1+ 비동결. prisma FK스칼라=cardId. 실행: npx tsx scripts/fix-sm1plus-kr-dedup.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SET = "kr-sm1+";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const all = await prisma.regionCard.findMany({ where: { setId: SET }, select: { id: true, numberInt: true, name: true, cardId: true } });
  const lcJp = all.filter((r) => r.cardId?.startsWith("lc-jp-"));
  const lcKr = all.filter((r) => r.cardId?.startsWith("lc-kr-"));
  const jpNames = new Set(lcJp.map((r) => r.name));
  const victims = lcKr.filter((r) => jpNames.has(r.name));        // 트윈보유 = 중복
  const keptKr = lcKr.filter((r) => !jpNames.has(r.name));        // 트윈없음 = 에너지

  console.log(`■ ${SET} dedup | 전체 ${all.length} = lc-jp ${lcJp.length} + lc-kr ${lcKr.length}(중복 ${victims.length} + 보존 ${keptKr.length}) | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log(`  보존 lc-kr: ${keptKr.map(e=>`#${e.numberInt} ${e.name}`).join(", ")}`);
  const badEnergy = keptKr.filter((e) => !/에너지/.test(e.name));
  if (badEnergy.length) { console.log(`  🔴 보존대상에 비에너지 → 중단:`, badEnergy.map(e=>`#${e.numberInt} ${e.name}`).join(", ")); await prisma.$disconnect(); return; }
  if (!victims.length) { console.log(`  🔴 victim 0 → 중단`); await prisma.$disconnect(); return; }
  console.log(`  ✅ 안전: victim ${victims.length} 전부 lc-kr·트윈보유 / 보존 ${keptKr.length} 전부 기본에너지 / lc-jp ${lcJp.length} 유지`);
  if (!APPLY) { console.log(`\n(dry-run) 삭제 ${victims.length} → ${SET} ${all.length - victims.length}행. --apply`); await prisma.$disconnect(); return; }

  const lcIds = [...new Set(victims.map((v) => v.cardId).filter((x): x is string => !!x && x.startsWith("lc-kr-")))];
  const del = await prisma.regionCard.deleteMany({ where: { id: { in: victims.map((v) => v.id) } } });
  console.log(`  CardLocale 삭제: ${del.count}`);
  let lcDel = 0;
  for (const id of lcIds) {
    if (await prisma.regionCard.count({ where: { cardId: id } })) continue;
    try { await prisma.card.delete({ where: { id } }); lcDel++; } catch (e) { console.log(`  ~ LC ${id} skip(${(e as Error).message.slice(0,40)})`); }
  }
  console.log(`  LogicalCard(lc-kr) 삭제: ${lcDel}`);
  const actual = await prisma.regionCard.count({ where: { setId: SET } });
  await prisma.set.update({ where: { id: SET }, data: { cardCount: actual } });
  console.log(`\n=== 검증 === ${SET} actual=${actual} cardCount=${actual}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
