/**
 * pokemontcg.io 의 tcgplayer.prices.{variant}.market 가격을 Price 테이블에 스냅샷.
 * 매일 1회 cron 으로 돌리면 시계열 차트가 자동으로 쌓임.
 *
 * Usage:
 *   npm run sync:prices
 *   npm run sync:prices -- --set=sv8         # 특정 set만
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getCardsBySet, type TCGCard } from "../src/lib/api/pokemontcg";

function arg(name: string): string | null {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : null;
}

interface ExtractedPrice {
  normal: number | null;
  holofoil: number | null;
  reverseHolo: number | null;
  firstEdition: number | null;
}

function extractPrices(c: TCGCard): ExtractedPrice | null {
  const p = c.tcgplayer?.prices;
  if (!p) return null;
  const out: ExtractedPrice = {
    normal: p.normal?.market ?? null,
    holofoil: p.holofoil?.market ?? null,
    reverseHolo: p.reverseHolofoil?.market ?? null,
    firstEdition: p["1stEdition"]?.market ?? null,
  };
  // Skip if all null
  if (
    out.normal == null &&
    out.holofoil == null &&
    out.reverseHolo == null &&
    out.firstEdition == null
  ) {
    return null;
  }
  return out;
}

async function targetSetIds(): Promise<string[]> {
  const specific = arg("set");
  if (specific) return [specific];

  // Only sets that have cards in DB (sync-cards already ran on them)
  const rows = await prisma.card.findMany({
    select: { setId: true },
    distinct: ["setId"],
  });
  return rows.map((r) => r.setId);
}

async function main() {
  const ids = await targetSetIds();
  console.log(`[sync-prices] target sets: ${ids.length}`);

  let totalCards = 0;
  let pricesInserted = 0;
  const now = new Date();

  for (const [idx, setId] of ids.entries()) {
    try {
      const cards = await getCardsBySet(setId);
      let setPrices = 0;
      for (const c of cards) {
        totalCards++;
        const prices = extractPrices(c);
        if (!prices) continue;

        // Card must already exist in DB
        const dbCard = await prisma.card.findUnique({
          where: { id: c.id },
          select: { id: true },
        });
        if (!dbCard) continue;

        await prisma.price.create({
          data: {
            cardId: c.id,
            normal: prices.normal,
            holofoil: prices.holofoil,
            reverseHolo: prices.reverseHolo,
            firstEdition: prices.firstEdition,
            source: "tcgplayer",
            currency: "USD",
            recordedAt: now,
          },
        });
        setPrices++;
        pricesInserted++;
      }
      console.log(
        `  [${idx + 1}/${ids.length}] ${setId}: ${setPrices} prices`
      );
    } catch (err) {
      console.warn(`  [${idx + 1}/${ids.length}] ${setId}: failed`, err);
    }
  }

  console.log(
    `[sync-prices] done. ${pricesInserted} prices for ${totalCards} cards scanned`
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
