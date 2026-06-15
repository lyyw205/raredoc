import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const KO = "XY BREAK 확장팩 「포켓심쿵 컬렉션」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-CP3" }, select: { nameKo: true } });
  console.log(`CP3 nameKo "${s?.nameKo}" -> "${KO}" | ${APPLY ? "APPLY" : "dry"}`);
  if (APPLY) { await prisma.set.update({ where: { id: "jp-tcg-CP3" }, data: { nameKo: KO } }); console.log("applied"); }
  await prisma.$disconnect();
})();
