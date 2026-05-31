import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // Check mega-dream-ex cards — are they real MEGA era?
  const dreamSample = await prisma.cardLocale.findMany({
    where: { setId: "jp-mega-dream-ex" },
    select: { id: true, number: true, name: true, imageSmall: true },
    take: 5,
    orderBy: { numberInt: "asc" },
  });
  console.log("mega-dream-ex sample:");
  for (const c of dreamSample) console.log(`  [${c.number}] ${c.name} | img: ${c.imageSmall?.substring(0,60) ?? "null"}`);

  // Check supertype distribution for MEGA
  const megaGroups = await prisma.setGroup.findMany({
    where: { era: "MEGA" },
    select: {
      id: true,
      nameJa: true,
      _count: { select: { logicalCards: true } },
    },
  });
  console.log("\nMEGA SetGroup LogicalCard counts:");
  for (const sg of megaGroups) {
    const nullSuper = await prisma.logicalCard.count({
      where: { setGroupId: sg.id, supertype: null },
    });
    console.log(`  ${sg.id} | ${sg.nameJa} | total=${sg._count.logicalCards} | null-supertype=${nullSuper}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
