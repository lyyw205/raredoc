import { getAllSets } from "../src/lib/api/pokemontcg";
import { prisma } from "../src/lib/prisma";
import { SERIES_KO } from "../src/lib/constants";

async function seed() {
  console.log("Seeding sets from pokemontcg.io...");
  const sets = await getAllSets();
  console.log(`Found ${sets.length} sets`);

  let upserted = 0;
  for (const set of sets) {
    const [year, month, day] = set.releaseDate.split("/").map(Number);
    await prisma.set.upsert({
      where: { id: set.id },
      create: {
        id: set.id,
        name: set.name,
        series: set.series,
        seriesKo: SERIES_KO[set.series] ?? set.series,
        releaseDate: new Date(year, month - 1, day),
        cardCount: set.total || set.printedTotal,
        logoUrl: set.images?.logo ?? null,
        symbolUrl: set.images?.symbol ?? null,
      },
      update: {
        name: set.name,
        cardCount: set.total || set.printedTotal,
        logoUrl: set.images?.logo ?? null,
        symbolUrl: set.images?.symbol ?? null,
      },
    });
    upserted++;
    if (upserted % 20 === 0) console.log(`  ${upserted}/${sets.length} sets`);
  }
  console.log(`Seeded ${upserted} sets`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
