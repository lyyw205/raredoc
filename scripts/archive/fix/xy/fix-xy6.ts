/**
 * XY6(エメラルドブレイク / 에메랄드 브레이크) JP 메타 — cardCount + nameKo 정합.
 *  · cardCount 89(stale)→91. JP 레어도 C36/U24/R9/RR9/SR11/UR2=91 트래커 완전일치.
 *  · nameKo "에메랄드 브레이크"(단축)→"XY 확장팩 제6탄 「에메랄드 브레이크」"(KR공식, kr-xy6 일치).
 *  date 2015-03-14 정상. KR=89(=91−UR2, clean). KR date 미확정→최종점검. 실행: npx tsx scripts/fix-xy6.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const KO = "XY 확장팩 제6탄 「에메랄드 브레이크」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY6" } });
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XY6" }, select: { cardCount: true, nameKo: true } });
  console.log(`■ XY6 JP | cardCount ${s?.cardCount}→${actual} | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY6" }, data: { cardCount: actual, nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XY6" }, select: { cardCount: true, nameKo: true, releaseDate: true } });
    console.log(`✅ cardCount=${v?.cardCount} nameKo="${v?.nameKo}" date=${v?.releaseDate?.toISOString().slice(0,10)}`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
