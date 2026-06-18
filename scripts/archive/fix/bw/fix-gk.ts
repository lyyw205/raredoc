import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
const KO = "BW 최강 폭류 60장 덱 「거북왕 + 큐레무 EX」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-GK" }, select: { nameKo: true, releaseDate: true } });
  console.log(`jp-tcg-GK date ${s?.releaseDate?.toISOString().slice(0,10)}->2013-03-15 | nameKo "${s?.nameKo}"->"${KO}" | ${APPLY?"APPLY":"dry"}`);
  if (APPLY) { await prisma.set.update({ where: { id: "jp-tcg-GK" }, data: { releaseDate: new Date("2013-03-15T00:00:00Z"), nameKo: KO } }); console.log("applied"); }
  await prisma.$disconnect();
})();
