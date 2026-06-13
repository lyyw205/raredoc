import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const JP_SET = "jp-tcg-SM5+";
const CARD_PACK_ID = "og-sm5+";
const HR = "cmpp4wysu0016yjurcnv0ys4l";
const UR = "cmpp4wyzt001wyjuriy5esk1h";

async function main() {
  // re-query the new secrets
  const news = await prisma.regionCard.findMany({
    where: { setId: JP_SET, numberInt: { gte: 57 } },
    orderBy: { numberInt: "asc" },
    select: {
      id: true, number: true, numberInt: true, name: true, rarityId: true, imageSmall: true, imageLarge: true,
      cardId: true,
      card: { select: { supertype: true, subtypes: true, gameCardId: true, nameKo: true, cardPackId: true, primarySetId: true, illustrator: true } },
    },
  });
  console.log("New secret RegionCards (>=57):");
  for (const c of news) {
    const rar = c.rarityId === HR ? "HR" : c.rarityId === UR ? "UR" : c.rarityId;
    const imgOk = c.imageSmall === c.imageLarge && !!c.imageSmall;
    console.log(`  #${c.number} ${c.name} [${rar}] img=${imgOk ? "OK" : "MISMATCH/null"} LC=${c.cardId} pack=${c.card?.cardPackId} primarySet=${c.card?.primarySetId} ${c.card?.supertype}/${JSON.stringify(c.card?.subtypes)} gc=${c.card?.gameCardId} nameKo=${c.card?.nameKo} illu=${c.card?.illustrator}`);
  }

  // counts
  const jpCount = await prisma.regionCard.count({ where: { setId: JP_SET } });
  const totalPack = await prisma.regionCard.count({ where: { set: { cardPackId: CARD_PACK_ID } } });
  const krCount = await prisma.regionCard.count({ where: { setId: "kr-sm5+" } });
  console.log(`\nJP count=${jpCount} (expect 63), KR count=${krCount} (expect 103 unchanged), totalPack=${totalPack} (expect 166)`);

  // gap closed? contiguous 1..63
  const all = await prisma.regionCard.findMany({ where: { setId: JP_SET }, select: { numberInt: true }, orderBy: { numberInt: "asc" } });
  const nums = all.map((a) => a.numberInt).filter((n): n is number => n != null);
  const missing = [];
  for (let i = 1; i <= 63; i++) if (!nums.includes(i)) missing.push(i);
  console.log("Missing numbers in 1..63:", missing.length ? missing : "none — gap closed");

  // total DB RegionCard count sanity (no other pack loss) — global count
  const globalCount = await prisma.regionCard.count();
  const globalLC = await prisma.card.count();
  console.log(`\nGlobal RegionCard total=${globalCount}, Global LogicalCard total=${globalLC}`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
