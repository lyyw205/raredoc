import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const KO = "포켓몬 카드 게임 BW 「30장 덱 대전 set 뮤츠VS게노세크트」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-MG" }, select: { nameKo: true, releaseDate: true } });
  console.log(`jp-tcg-MG date ${s?.releaseDate?.toISOString().slice(0,10)}->2013-07-13 | nameKo "${s?.nameKo}"->"${KO}" | ${APPLY?"APPLY":"dry"}`);
  if (APPLY) { await prisma.set.update({ where: { id: "jp-tcg-MG" }, data: { releaseDate: new Date("2013-07-13T00:00:00Z"), nameKo: KO } }); console.log("applied"); }
  await prisma.$disconnect();
})();
