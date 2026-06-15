/**
 * SM30A(GXスタートデッキ = tracker "GX Starter Decks") code 정렬 — DB code 'SM30A'(아웃라이어) → 'SMH'(트래커·SM레터스킴).
 *   jp-tcg-SM30A/kr-sm30a 모두. nameKo "랜덤30장덱"은 이 제품엔 정명(랜덤 30장 GX덱)이라 유지.
 *   JP 140=트래커131+기본에너지9(관례, 유지). JP date 2018-07-13 정상. KR 80=스코프차(적게발매).
 * 실행: npx tsx scripts/fix-sm30a-code.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const ids = ["jp-tcg-SM30A", "kr-sm30a"];
  const before = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, code: true, releaseDate: true, cardCount: true } });
  console.log(`■ SM30A→SMH code 정렬 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  before.forEach((s) => console.log(`  ${s.id}: code ${s.code}→SMH | date=${s.releaseDate?.toISOString().slice(0,10)} cc=${s.cardCount}`));
  if (APPLY) {
    for (const id of ids) await prisma.set.update({ where: { id }, data: { code: "SMH" } });
    const after = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, code: true } });
    console.log("\n=== 검증 ===");
    after.forEach((s) => console.log(`  ${s.id}: code=${s.code}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
