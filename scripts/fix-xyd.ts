/**
 * XYD(メガバトルデッキ60「メガレックウザEX」) JP 메타 — date + nameKo(XYH/XYG/XYF 동일패턴).
 *  · date 1970→2015-03-14(트래커). nameKo "도치마론의 진화"(오염)→KR공식 "XY 메가 배틀 60장 덱 「M레쿠쟈 EX」".
 *  cardCount 20(=actual), 무레어도. KR date 미확정→최종점검. 실행: npx tsx scripts/fix-xyd.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY 메가 배틀 60장 덱 「M레쿠쟈 EX」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XYD" }, select: { nameKo: true, releaseDate: true } });
  console.log(`■ XYD JP | date ${s?.releaseDate?.toISOString().slice(0,10)}→2015-03-14 | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XYD" }, data: { releaseDate: new Date("2015-03-14T00:00:00Z"), nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XYD" }, select: { nameKo: true, releaseDate: true } });
    console.log(`✅ date=${v?.releaseDate?.toISOString().slice(0,10)} nameKo="${v?.nameKo}"`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
