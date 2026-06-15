/**
 * XYC(スーパーレジェンドセット60「ゼルネアスEX・イベルタルEX」) JP 메타 — date + nameKo.
 *  · date 1970→2014-11-14(트래커). nameKo "도치마론의 진화"(오염)→KR공식 "XY 레전드 배틀 60장 덱 「제르네아스 EX+이벨타르 EX」".
 *  cardCount 25(=actual), 무레어도. ※kr-xyc=25행/maxn23(중복행 의심)는 별도 점검. 실행: npx tsx scripts/fix-xyc.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY 레전드 배틀 60장 덱 「제르네아스 EX+이벨타르 EX」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XYC" }, select: { nameKo: true, releaseDate: true } });
  console.log(`■ XYC JP | date ${s?.releaseDate?.toISOString().slice(0,10)}→2014-11-14 | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XYC" }, data: { releaseDate: new Date("2014-11-14T00:00:00Z"), nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XYC" }, select: { nameKo: true, releaseDate: true } });
    console.log(`✅ date=${v?.releaseDate?.toISOString().slice(0,10)} nameKo="${v?.nameKo}"`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
