/**
 * SM2+ 이름교정 + KR발매일 + SM2L cardCount 동기화.
 *  · jp-tcg-sm2+ name "新たな試練に直面"(EN역번역 오류) → 公式 "新たなる試練の向こう"(pokemon-card.com pg=545 강화확장팩 라벨 확정). nameKo → KR세트명 일치.
 *  · kr-sm2+ releaseDate → 2017-05-26 (namu 국기태그 확정: 일본4/21·대한민국5/26, high conf).
 *  · jp-tcg-SM2L cardCount 54(stale)→62 (트래커 C24/U16/R6/RR4/SR5/HR4/UR3=62 완전일치).
 * 실행: npx tsx scripts/fix-sm2-finalize.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM2+ 이름/날짜 + SM2L cardCount | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-sm2+" }, select: { name: true, nameKo: true } });
  console.log(`  jp-tcg-sm2+ name: "${jp?.name}" → "新たなる試練の向こう" | nameKo "${jp?.nameKo}" → "썬&문 강화 확장팩 「새로운 시련」"`);
  const kr = await prisma.set.findUnique({ where: { id: "kr-sm2+" }, select: { releaseDate: true } });
  console.log(`  kr-sm2+ releaseDate ${kr?.releaseDate?.toISOString().slice(0,10)} → 2017-05-26`);
  const l = await prisma.set.findUnique({ where: { id: "jp-tcg-SM2L" }, select: { cardCount: true } });
  const lActual = await prisma.regionCard.count({ where: { setId: "jp-tcg-SM2L" } });
  console.log(`  jp-tcg-SM2L cardCount ${l?.cardCount} → ${lActual}`);

  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-sm2+" }, data: { name: "新たなる試練の向こう", nameKo: "썬&문 강화 확장팩 「새로운 시련」" } });
    await prisma.set.update({ where: { id: "kr-sm2+" }, data: { releaseDate: new Date("2017-05-26T00:00:00Z") } });
    await prisma.set.update({ where: { id: "jp-tcg-SM2L" }, data: { cardCount: lActual } });
    console.log("\n✅ 적용 완료");
    const rows = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-sm2+","kr-sm2+","jp-tcg-SM2L"] } }, select: { id: true, name: true, releaseDate: true, cardCount: true }, orderBy: { id: "asc" } });
    rows.forEach((s) => console.log(`  ${s.id}: name="${s.name}" date=${s.releaseDate?.toISOString().slice(0,10)} cc=${s.cardCount}`));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
