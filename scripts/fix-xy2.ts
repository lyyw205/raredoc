import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const KO = "XY 확장팩 제2탄 「와일드 블레이즈」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY2" } });
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-XY2" }, select: { cardCount: true, nameKo: true } });
  console.log(`XY2 JP | cardCount ${s?.cardCount}->${actual} | nameKo "${s?.nameKo}"->"${KO}" | ${APPLY?"APPLY":"dry"}`);
  if (APPLY) { await prisma.set.update({ where: { id: "jp-tcg-XY2" }, data: { cardCount: actual, nameKo: KO } }); console.log("applied"); }
  await prisma.$disconnect();
})();
