/**
 * Sync cards from pokemontcg.io into the Card table.
 *
 * Usage:
 *   npx tsx scripts/sync-cards.ts                    # all sets in DB
 *   npx tsx scripts/sync-cards.ts --recent=24        # sets released within last 24 months
 *   npx tsx scripts/sync-cards.ts --set=sv8          # specific set id
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getCardsBySet } from "../src/lib/api/pokemontcg";

function arg(name: string): string | null {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : null;
}

async function targetSetIds(): Promise<string[]> {
  const specific = arg("set");
  if (specific) return [specific];

  const recentMonths = arg("recent");
  if (recentMonths) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(recentMonths, 10));
    const sets = await prisma.set.findMany({
      where: { releaseDate: { gte: cutoff } },
      select: { id: true },
      orderBy: { releaseDate: "desc" },
    });
    return sets.map((s) => s.id);
  }

  const sets = await prisma.set.findMany({
    select: { id: true },
    orderBy: { releaseDate: "desc" },
  });
  return sets.map((s) => s.id);
}

async function syncSet(setId: string): Promise<number> {
  const cards = await getCardsBySet(setId);
  let upserted = 0;
  for (const c of cards) {
    await prisma.card.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        setId,
        name: c.name,
        number: c.number,
        rarity: c.rarity ?? null,
        types: c.types ?? [],
        supertype: c.supertype ?? null,
        subtypes: c.subtypes ?? [],
        artist: c.artist ?? null,
        imageSmall: c.images?.small ?? null,
        imageLarge: c.images?.large ?? null,
      },
      update: {
        name: c.name,
        rarity: c.rarity ?? null,
        types: c.types ?? [],
        subtypes: c.subtypes ?? [],
        artist: c.artist ?? null,
        imageSmall: c.images?.small ?? null,
        imageLarge: c.images?.large ?? null,
      },
    });
    upserted++;
  }
  return upserted;
}

async function main() {
  const ids = await targetSetIds();
  console.log(`[sync-cards] target sets: ${ids.length}`);

  let totalCards = 0;
  for (const [idx, setId] of ids.entries()) {
    try {
      const n = await syncSet(setId);
      totalCards += n;
      console.log(`  [${idx + 1}/${ids.length}] ${setId}: ${n} cards`);
    } catch (err) {
      console.warn(`  [${idx + 1}/${ids.length}] ${setId}: failed`, err);
    }
  }
  console.log(`[sync-cards] done. ${totalCards} cards upserted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
