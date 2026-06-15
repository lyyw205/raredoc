/**
 * XY5 가이아볼케이노 메타 교정.
 *  · jp-tcg-XY5: cardCount 78(stale)→80, code null→"XY5", nameKo "가이아 볼케이노"→KR공식 "XY 확장팩 제5탄 「가이아 볼케이노」".
 *    JP 레어도 C32/U23/R9/RR6/SR8/UR2=80 트래커 완전일치. date 2014-12-13 정상.
 *  · kr-xy5: nameKo "타이달 스톰"(오염, name은 가이아인데 nameKo가 타이달) → "XY 확장팩 제5탄 「가이아 볼케이노」".
 *  ※KR=78(=80−UR2 무수집). ★KR 타이달스톰(kr-xy5a) 미존재=별도 미수집. KR date 미확정→최종점검.
 * 실행: npx tsx scripts/fix-xy5-gaia.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY 확장팩 제5탄 「가이아 볼케이노」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const jpActual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY5" } });
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-XY5" }, select: { cardCount: true, code: true, nameKo: true } });
  const kr = await prisma.set.findUnique({ where: { id: "kr-xy5" }, select: { nameKo: true } });
  console.log(`■ XY5 Gaia | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  console.log(`  jp-tcg-XY5: cardCount ${jp?.cardCount}→${jpActual}, code ${jp?.code}→"XY5", nameKo "${jp?.nameKo}"→"${KO}"`);
  console.log(`  kr-xy5: nameKo "${kr?.nameKo}"→"${KO}"`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY5" }, data: { cardCount: jpActual, code: "XY5", nameKo: KO } });
    await prisma.set.update({ where: { id: "kr-xy5" }, data: { nameKo: KO } });
    console.log("✅ 적용");
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
