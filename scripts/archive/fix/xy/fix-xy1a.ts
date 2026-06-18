import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
const KO = "XY 확장팩 제1탄 「X컬렉션」";
(async () => {
  const APPLY = process.argv.includes("--apply");
  const rare = await prisma.rarity.findFirst({ where: { code: "Rare" } });
  const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-XY1a", cardId: "lc-jp-tcg-XY1a-008" }, include: { rarity: true } });
  const krActual = await prisma.regionCard.count({ where: { setId: "kr-xy1" } });
  console.log(`XY1a #8 ${rc?.name} rarity ${rc?.rarity?.code ?? "null"}->Rare | jp nameKo align | kr-xy1 cardCount->${krActual} | ${APPLY?"APPLY":"dry"}`);
  if (APPLY) {
    if (rc && !rc.rarity) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: rare!.id } });
    await prisma.set.update({ where: { id: "jp-tcg-XY1a" }, data: { nameKo: KO } });
    await prisma.set.update({ where: { id: "kr-xy1" }, data: { cardCount: krActual } });
    console.log("applied");
  }
  await prisma.$disconnect();
})();
