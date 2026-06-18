/**
 * RBD(=트래커 SNPr, BREAK進化パック「ライチュウBREAK」/ 라이츄 BREAK 진화팩) JP 메타 — date+nameKo(UBD 동일패턴).
 *  · date 1970→2015-09-26(트래커). nameKo "도치마론의 진화"(오염)→"BREAK 진화팩 「라이츄 BREAK」".
 *  cardCount 10(=actual), 무레어도. ※kr-rbd(19, lc_kr9)는 30장덱 별제품=별도점검. 실행: npx tsx scripts/fix-rbd.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const KO = "BREAK 진화팩 「라이츄 BREAK」";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-RBD" }, select: { nameKo: true, releaseDate: true } });
  console.log(`■ RBD JP | date ${s?.releaseDate?.toISOString().slice(0,10)}→2015-09-26 | nameKo "${s?.nameKo}"→"${KO}" | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-RBD" }, data: { releaseDate: new Date("2015-09-26T00:00:00Z"), nameKo: KO } });
    const v = await prisma.set.findUnique({ where: { id: "jp-tcg-RBD" }, select: { nameKo: true, releaseDate: true } });
    console.log(`✅ date=${v?.releaseDate?.toISOString().slice(0,10)} nameKo="${v?.nameKo}"`);
  } else console.log("(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
