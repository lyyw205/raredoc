import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const KO = "XY 확장팩 제1탄 「Y컬렉션」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-XY1b" }, select: { nameKo: true } });
  const kr = await prisma.set.findUnique({ where: { id: "kr-xy1b" }, select: { name: true, nameKo: true, code: true } });
  console.log(`jp-tcg-XY1b nameKo "${jp?.nameKo}"->"${KO}" | kr-xy1b name "${kr?.name}"/code "${kr?.code}" -> "${KO}"/XY1 | ${APPLY?"APPLY":"dry"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-XY1b" }, data: { nameKo: KO } });
    await prisma.set.update({ where: { id: "kr-xy1b" }, data: { name: KO, nameKo: KO, code: "XY1" } });
    console.log("applied");
  }
  await prisma.$disconnect();
})();
