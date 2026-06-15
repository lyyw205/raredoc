import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const KO = "XY 「제르네아스 덱」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XY30" }, select: { nameKo: true, releaseDate: true } });
  console.log(`XY30 JP | date ${s?.releaseDate?.toISOString().slice(0,10)}->2014-01-31 | nameKo "${s?.nameKo}"->"${KO}" | ${APPLY?"APPLY":"dry"}`);
  if (APPLY) { await prisma.set.update({ where: { id: "jp-tcg-XY30" }, data: { releaseDate: new Date("2014-01-31T00:00:00Z"), nameKo: KO } }); console.log("applied"); }
  await prisma.$disconnect();
})();
