/**
 * PokeTrace → Trade table sync.
 *
 * Strategy: PokeTrace의 /cards 응답에 들어있는 aggregate (avg/high/saleCount/lastUpdated)
 * 를 그대로 Trade 한 줄로 적재. 카드별 1행. (history 엔드포인트는 0건 반환해서 미사용)
 *
 * Usage:
 *   npx tsx scripts/sync-poketrace-trades.ts [--limit=200]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { findPokeTraceCard } from "../src/lib/api/poketrace";

const HIGH_VALUE_RARITIES = [
  "Special Illustration Rare",
  "Illustration Rare",
  "Hyper Rare",
  "Rare Secret",
  "Rare Rainbow",
  "Rare Ultra",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Rare Holo V",
  "Rare Holo EX",
];

function parseArg(name: string, fallback: number): number {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  if (!a) return fallback;
  const v = parseInt(a.split("=")[1], 10);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * PokeTrace 의 prices.{ebay|tcgplayer}.{tier} 객체에 들어있는 필드들.
 * 우리 wrapper 타입에는 lastUpdated 가 없어서 여기서 확장.
 */
interface PriceAggregate {
  avg?: number;
  high?: number | null;
  low?: number | null;
  saleCount?: number;
  lastUpdated?: string;
  avg1d?: number;
  avg7d?: number;
  avg30d?: number;
}

function pickAggregate(
  ptPrices:
    | { ebay?: Record<string, PriceAggregate>; tcgplayer?: Record<string, PriceAggregate> }
    | undefined,
  tier: string
): { agg: PriceAggregate; source: string } | null {
  const ebay = ptPrices?.ebay?.[tier];
  if (ebay && (ebay.high != null || ebay.avg != null)) {
    return { agg: ebay, source: "poketrace_ebay" };
  }
  const tcg = ptPrices?.tcgplayer?.[tier];
  if (tcg && (tcg.high != null || tcg.avg != null)) {
    return { agg: tcg, source: "poketrace_tcgplayer" };
  }
  return null;
}

async function main() {
  const limit = parseArg("limit", 200);

  if (!process.env.POKETRACE_API_KEY) {
    console.error("POKETRACE_API_KEY is required");
    process.exit(1);
  }

  console.log(`[sync] limit=${limit}`);

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);

  const candidates = await prisma.card.findMany({
    where: {
      set: { releaseDate: { gte: cutoff } },
      rarity: { in: HIGH_VALUE_RARITIES },
    },
    select: {
      id: true,
      name: true,
      number: true,
      set: { select: { name: true } },
    },
    take: limit,
  });
  console.log(`[sync] candidates: ${candidates.length}`);

  let matched = 0;
  let upserted = 0;

  for (const c of candidates) {
    try {
      const pt = await findPokeTraceCard(c.name, c.set.name, c.number);
      if (!pt) continue;
      matched++;

      // Cache the resolved PokeTrace id on Card so future requests skip the search.
      await prisma.card
        .update({ where: { id: c.id }, data: { poketraceId: pt.id } })
        .catch(() => null);

      const picked = pickAggregate(
        pt.prices as
          | {
              ebay?: Record<string, PriceAggregate>;
              tcgplayer?: Record<string, PriceAggregate>;
            }
          | undefined,
        "NEAR_MINT"
      );
      if (!picked) continue;

      const { agg, source } = picked;
      const priceHigh = agg.high ?? agg.avg;
      if (priceHigh == null) continue;

      const soldAt = agg.lastUpdated
        ? new Date(agg.lastUpdated)
        : new Date();
      if (Number.isNaN(soldAt.getTime())) continue;

      await prisma.trade.upsert({
        where: {
          cardId_soldAt_tier_source: {
            cardId: c.id,
            soldAt,
            tier: "NEAR_MINT",
            source,
          },
        },
        create: {
          cardId: c.id,
          soldAt,
          priceHighUsd: priceHigh,
          priceLowUsd: agg.low ?? null,
          priceAvgUsd: agg.avg ?? null,
          saleCount: agg.saleCount ?? 1,
          tier: "NEAR_MINT",
          source,
        },
        update: {
          priceHighUsd: priceHigh,
          priceLowUsd: agg.low ?? null,
          priceAvgUsd: agg.avg ?? null,
          saleCount: agg.saleCount ?? 1,
        },
      });
      upserted++;
    } catch (err) {
      console.warn(`[sync] error on ${c.name}:`, err);
    }
  }

  console.log(
    `[sync] done. matched=${matched}/${candidates.length} trades=${upserted}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
