import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const KO = "XY 「이벨타르 덱」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-XY30B" }, select: { nameKo: true, releaseDate: true } });
  const kr = await prisma.set.findUnique({ where: { id: "kr-xy30b" }, select: { nameKo: true } });
  console.log(`XY30B JP date ${jp?.releaseDate?.toISOString().slice(0,10)}->2014-01-31, nameKo "${jp?.nameKo}"->"${KO}" | kr-xy30b nameKo "${kr?.nameKo}"->"${KO}" | ${APPLY?"APPLY":"dry"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY30B" }, data: { releaseDate: new Date("2014-01-31T00:00:00Z"), nameKo: KO } });
    await prisma.set.update({ where: { id: "kr-xy30b" }, data: { nameKo: KO } });
    console.log("applied");
  }
  await prisma.$disconnect();
})();
