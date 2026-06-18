/**
 * XYH(BREAKメガバトルデッキ60「メガタブンネEX」) JP 메타 — releaseDate + nameKo 교정.
 *  · releaseDate placeholder(1970)→2016-03-18(트래커).
 *  · nameKo "XY 퍼스트세트 「도치마론의 진화」"(타세트명 오염 — 구 JP덱류 공통) → KR공식 "XY BREAK 메가 배틀 60장 덱 「M다부니 EX」"(kr-xyh 일치).
 *  cardCount 27(=actual 무변경), 무레어도(배틀덱 정상). KR date 미확정→최종점검.
 * 실행: npx tsx scripts/fix-xyh.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const KO = "XY BREAK 메가 배틀 60장 덱 「M다부니 EX」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XYH" }, select: { nameKo: true, releaseDate: true } });
  console.log(`■ XYH JP | date ${s?.releaseDate?.toISOString().slice(0,10)}→2016-03-18 | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XYH" }, data: { releaseDate: new Date("2016-03-18T00:00:00Z"), nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XYH" }, select: { nameKo: true, releaseDate: true } });
    console.log(`✅ date=${v?.releaseDate?.toISOString().slice(0,10)} nameKo="${v?.nameKo}"`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
