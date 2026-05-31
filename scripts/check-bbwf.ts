import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const sets = await prisma.set.findMany({
    where: { setGroupId: "sv-black-bolt-white-flare" },
    select: { id: true, name: true, cardCount: true, region: true },
  });
  console.log(JSON.stringify(sets, null, 2));

  // Also check what EN sets exist for SV era
  const svEnSets = await prisma.set.findMany({
    where: { setGroup: { era: "SV" }, region: "EN" },
    select: { id: true, name: true, cardCount: true },
    orderBy: { releaseDate: "asc" },
  });
  console.log("\nSV EN sets in DB:");
  for (const s of svEnSets) console.log(`  ${s.id} | ${s.name} | ${s.cardCount}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
