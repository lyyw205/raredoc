import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // Check first few card numbers per MEGA set to understand tcgdex mapping
  const megaSets = await prisma.set.findMany({
    where: { setGroup: { era: "MEGA" } },
    select: { id: true, name: true, region: true },
  });

  for (const set of megaSets) {
    const sample = await prisma.cardLocale.findMany({
      where: { setId: set.id },
      select: { id: true, number: true, name: true },
      take: 3,
      orderBy: { number: "asc" },
    });
    console.log(`\nSet: ${set.id} (${set.name})`);
    for (const c of sample) console.log(`  ${c.id} | ${c.number} | ${c.name}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
