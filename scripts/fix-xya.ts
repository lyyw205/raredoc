import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const KO = "XY 메가 배틀 60장덱 「M리자몽 EX」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XYA" }, select: { nameKo: true, releaseDate: true } });
  console.log(`XYA JP | date ${s?.releaseDate?.toISOString().slice(0,10)}->2014-03-15 | nameKo "${s?.nameKo}"->"${KO}" | ${APPLY?"APPLY":"dry"}`);
  if (APPLY) { await prisma.set.update({ where: { id: "jp-tcg-XYA" }, data: { releaseDate: new Date("2014-03-15T00:00:00Z"), nameKo: KO } }); console.log("applied"); }
  await prisma.$disconnect();
})();
