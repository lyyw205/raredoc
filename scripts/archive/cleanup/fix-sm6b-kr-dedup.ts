/**
 * kr-sm6b(챔피언로드 KR) 중복비대 dedup — 127행 → 77행.
 * 분석: 50개 'lc-kr-sm6b-*' 팬텀행(#78-127, 고번호)이 전부 (이름) 트윈을 #1-77 jp-orphan 진짜행에 보유.
 *   46개는 이름+레어도 동일, 4개(#117 에너지순환장치·#118 이상한사탕·#122 TV리포터·#123 규토리장인)는
 *   같은이름·다른레어도 팬텀(레어도 오라벨이지만 동일카드 중복) → 이름기준 트윈으로 안전판정. 50/50 트윈보유·타세트참조0·번호분리(팬텀≥78>진짜≤77).
 * 삭제: lc-kr-sm6b-% 가리키는 kr-sm6b CardLocale 50행 + 자식없어진 LogicalCard. cardCount→77.
 * ※ 진짜행 일부 C/U/R 경계 의심(이상한사탕#57=C 등)은 dedup과 별개 → 최종 점검.
 * og-sm6b 비동결. prisma FK스칼라=cardId. 실행: npx tsx scripts/fix-sm6b-kr-dedup.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";

const SET = "kr-sm6b";
const PREFIX = "lc-kr-sm6b-";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const all = await prisma.regionCard.findMany({ where: { setId: SET }, select: { id: true, numberInt: true, name: true, cardId: true } });
  const victims = all.filter((r) => r.cardId?.startsWith(PREFIX));
  const keepers = all.filter((r) => !r.cardId?.startsWith(PREFIX));
  const keeperNames = new Set(keepers.map((k) => k.name));
  const noTwin = victims.filter((v) => !keeperNames.has(v.name));
  console.log(`■ ${SET} dedup | victim ${victims.length} / keeper ${keepers.length} | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log(`  팬텀 번호범위 ${Math.min(...victims.map(v=>v.numberInt))}-${Math.max(...victims.map(v=>v.numberInt))}, 진짜 최대 ${Math.max(...keepers.map(k=>k.numberInt))}`);
  if (noTwin.length) { console.log(`  🔴 이름트윈 없는 victim ${noTwin.length} → 중단:`, noTwin.map(v=>`#${v.numberInt} ${v.name}`).join(", ")); await prisma.$disconnect(); return; }
  console.log("  ✅ 안전: 50/50 이름트윈 보유");
  if (!APPLY) { console.log(`\n(dry-run) 삭제예정 ${victims.length}행 → ${SET} ${keepers.length}행. --apply`); await prisma.$disconnect(); return; }

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
