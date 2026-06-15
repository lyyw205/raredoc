/**
 * XYE(対戦スタートセット30「エンブオーEX VS トゲキッスEX」) JP 메타 — date + nameKo(배틀세트 패턴).
 *  · date 1970→2015-07-18(트래커). nameKo "도치마론의 진화"(오염)→KR공식 "XY 30장 덱 대전 세트 「염무왕 EX vs 토게키스 EX」".
 *  cardCount 26(=actual), 무레어도. ※kr-xye=32(maxn26, 6 초과행)는 별도 점검. 실행: npx tsx scripts/fix-xye.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "XY 30장 덱 대전 세트 「염무왕 EX vs 토게키스 EX」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XYE" }, select: { nameKo: true, releaseDate: true } });
  console.log(`■ XYE JP | date ${s?.releaseDate?.toISOString().slice(0,10)}→2015-07-18 | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XYE" }, data: { releaseDate: new Date("2015-07-18T00:00:00Z"), nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-XYE" }, select: { nameKo: true, releaseDate: true } });
    console.log(`✅ date=${v?.releaseDate?.toISOString().slice(0,10)} nameKo="${v?.nameKo}"`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
