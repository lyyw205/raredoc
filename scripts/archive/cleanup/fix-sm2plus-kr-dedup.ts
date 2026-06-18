/**
 * kr-sm2+(새로운 시련 KR) 중복비대 dedup — 109행 → 66행.
 * 구조:
 *   · #1-57  : 진짜(베이스49 + SR8, lc-jp-tcg-sm2+-*). 유지.
 *   · #58-66 : 9개 기본에너지(풀/불꽃/물/번개/초/격투/악/강철/페어리). 4개(물#60·번개#61·격투#63·악#64)=lc-jp 공유, 5개=lc-kr. ★전부 유지(에너지).
 *   · #67-109: 43개 중복(베이스#1-49 재listing, lc-kr, 각 이름트윈 보유). 삭제.
 * 안전: victim=#67-109 전부 lc-kr·트윈보유 / 보존 #58-66 전부 '에너지' / lc-jp LC 미삭제.
 *   (KR은 HR6/UR3 시크릿 미수집 — 별도 collection gap.)
 * og-sm2+ 비동결. prisma FK스칼라=cardId. 실행: npx tsx scripts/fix-sm2plus-kr-dedup.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";

const SET = "kr-sm2+";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const all = await prisma.regionCard.findMany({ where: { setId: SET }, select: { id: true, numberInt: true, name: true, cardId: true } });
  const keepers = all.filter((r) => r.numberInt <= 66);
  const victims = all.filter((r) => r.numberInt >= 67);
  const energies = all.filter((r) => r.numberInt >= 58 && r.numberInt <= 66);
  const keeperNames = new Set(keepers.map((k) => k.name));

  console.log(`■ ${SET} dedup | 전체 ${all.length} = 유지 ${keepers.length}(#1-66) + 중복 ${victims.length}(#67-109) | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  const noTwin = victims.filter((v) => !keeperNames.has(v.name));
  const notKr = victims.filter((v) => !v.cardId?.startsWith("lc-kr-"));
  const badEnergy = energies.filter((e) => !/에너지/.test(e.name));
  if (noTwin.length) { console.log(`  🔴 트윈없는 victim → 중단:`, noTwin.map(v=>`#${v.numberInt} ${v.name}`).join(", ")); await prisma.$disconnect(); return; }
  if (notKr.length) { console.log(`  🔴 lc-kr 아닌 victim → 중단:`, notKr.map(v=>`#${v.numberInt} ${v.name}(${v.cardId})`).join(", ")); await prisma.$disconnect(); return; }
  if (badEnergy.length) { console.log(`  🔴 비에너지 #58-66 → 중단:`, badEnergy.map(e=>`#${e.numberInt} ${e.name}`).join(", ")); await prisma.$disconnect(); return; }
  console.log(`  ✅ 안전: victim ${victims.length} 전부 lc-kr·트윈보유 / 에너지 ${energies.length} 전부 보존`);
  if (!APPLY) { console.log(`\n(dry-run) 삭제 ${victims.length}(#67-109) → ${SET} ${keepers.length}행. --apply`); await prisma.$disconnect(); return; }

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
