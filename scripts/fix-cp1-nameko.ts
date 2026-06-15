import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const KO = "XY 확장팩 「마그마단vs아쿠아단 더블크라이시스」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-CP1" }, select: { nameKo: true } });
  console.log(`CP1 nameKo "${s?.nameKo}" -> "${KO}" | ${APPLY ? "APPLY" : "dry"}`);
  if (APPLY && s?.nameKo !== KO) { await prisma.set.update({ where: { id: "jp-tcg-CP1" }, data: { nameKo: KO } }); console.log("applied"); }
  await prisma.$disconnect();
})();
