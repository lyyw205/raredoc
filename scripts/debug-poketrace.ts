import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  findPokeTraceCard,
  getPokeTracePriceHistory,
} from "../src/lib/api/poketrace";

async function rawSearch(name: string) {
  const apiKey = process.env.POKETRACE_API_KEY;
  const url = new URL("https://api.poketrace.com/v1/cards");
  url.searchParams.set("search", name);
  url.searchParams.set("market", "US");
  url.searchParams.set("limit", "5");
  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": apiKey ?? "" },
  });
  const j = await res.json();
  return j;
}

async function main() {
  // First: raw API sanity check
  console.log("=== Raw search: 'Charizard' ===");
  const raw = await rawSearch("Charizard");
  const items = (raw?.data ?? []).slice(0, 5);
  console.log(`Got ${items.length} hits`);
  for (const item of items) {
    console.log(
      `  - ${item.name} / ${item.set?.name} #${item.cardNumber} | id=${item.id} topPrice=${item.topPrice} totalSaleCount=${item.totalSaleCount}`
    );
  }
  console.log("");

  // Sample cards from a range of sets — newest set first might be too fresh
  // for PokeTrace, so cover several sets.
  const setIds = ["sv8", "sv9", "sv10", "sv6", "me1"];
  const cards = (
    await Promise.all(
      setIds.map((setId) =>
        prisma.card.findFirst({
          where: {
            setId,
            rarity: {
              in: [
                "Special Illustration Rare",
                "Illustration Rare",
                "Hyper Rare",
              ],
            },
          },
          include: { set: true },
        })
      )
    )
  ).filter((c): c is NonNullable<typeof c> => c != null);

  console.log(`Sampling ${cards.length} cards across ${setIds.length} sets`);

  for (const c of cards) {
    console.log(
      `\n>>> ${c.name} / ${c.set.name} #${c.number} (${c.rarity})`
    );
    const pt = await findPokeTraceCard(c.name, c.set.name, c.number);
    if (!pt) {
      console.log("  no match");
      continue;
    }
    console.log(
      `  matched poketraceId=${pt.id} topPrice=${pt.topPrice} totalSaleCount=${pt.totalSaleCount}`
    );
    console.log(
      `  prices.ebay.NEAR_MINT=`,
      JSON.stringify(pt.prices?.ebay?.NEAR_MINT)
    );
    console.log(
      `  prices.tcgplayer.NEAR_MINT=`,
      JSON.stringify(pt.prices?.tcgplayer?.NEAR_MINT)
    );

    const tiers = ["NEAR_MINT", "LIGHTLY_PLAYED"] as const;
    const periods = ["7d", "30d"] as const;
    for (const tier of tiers) {
      for (const period of periods) {
        const hist = await getPokeTracePriceHistory(pt.id, tier, period);
        console.log(`  history(${tier},${period}) entries=${hist.length}`);
        if (hist.length) {
          console.log(`    sample:`, JSON.stringify(hist.slice(0, 2)));
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
