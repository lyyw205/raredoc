/**
 * XYF(BREAKコンボデッキ60「ゴルダックBREAK+パルキアEX」) JP 메타 — date + nameKo 교정(XYH/XYG 동일패턴).
 *  · date 1970→2015-10-09(트래커). nameKo "도치마론의 진화"(오염)→KR공식 "XY BREAK 콤보 60장 덱 「골덕 BREAK +펄기아 EX」".
 *  cardCount 17(=actual), 무레어도. KR=16(maxn17, 1장 갭)·date 미확정→최종점검. 실행: npx tsx scripts/fix-xyf.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const KO = "XY BREAK 콤보 60장 덱 「골덕 BREAK +펄기아 EX」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XYF" }, select: { nameKo: true, releaseDate: true } });
  console.log(`■ XYF JP | date ${s?.releaseDate?.toISOString().slice(0,10)}→2015-10-09 | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XYF" }, data: { releaseDate: new Date("2015-10-09T00:00:00Z"), nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XYF" }, select: { nameKo: true, releaseDate: true } });
    console.log(`✅ date=${v?.releaseDate?.toISOString().slice(0,10)} nameKo="${v?.nameKo}"`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
