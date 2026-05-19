import { prisma } from "@/lib/prisma";
import { getAllSets } from "@/lib/api/pokemontcg";
import { SERIES_KO } from "@/lib/constants";

export interface PurchasableSet {
  id: string;
  name: string;
  nameKo: string | null;
  series: string;
  seriesKo: string | null;
  releaseDate: Date;
  cardCount: number;
  logoUrl: string | null;
  symbolUrl: string | null;
  avgPriceUsd: number | null;
}

const PURCHASABLE_WINDOW_MONTHS = 12;

function cutoffDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - PURCHASABLE_WINDOW_MONTHS);
  return d;
}

function pickPrice(p: {
  normal: number | null;
  holofoil: number | null;
  reverseHolo: number | null;
  firstEdition: number | null;
}): number | null {
  return p.holofoil ?? p.normal ?? p.reverseHolo ?? p.firstEdition ?? null;
}

async function avgPriceForSet(setId: string): Promise<number | null> {
  const cards = await prisma.card.findMany({
    where: { setId },
    select: {
      prices: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: {
          normal: true,
          holofoil: true,
          reverseHolo: true,
          firstEdition: true,
        },
      },
    },
  });
  const values: number[] = [];
  for (const c of cards) {
    const latest = c.prices[0];
    if (!latest) continue;
    const v = pickPrice(latest);
    if (v != null && Number.isFinite(v)) values.push(v);
  }
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

export async function getPurchasableSets(): Promise<PurchasableSet[]> {
  const cutoff = cutoffDate();

  try {
    const sets = await prisma.set.findMany({
      where: { releaseDate: { gte: cutoff } },
      orderBy: { releaseDate: "desc" },
    });
    if (sets.length > 0) {
      const enriched = await Promise.all(
        sets.map(async (s) => ({
          id: s.id,
          name: s.name,
          nameKo: s.nameKo,
          series: s.series,
          seriesKo: s.seriesKo ?? SERIES_KO[s.series] ?? null,
          releaseDate: s.releaseDate,
          cardCount: s.cardCount,
          logoUrl: s.logoUrl,
          symbolUrl: s.symbolUrl,
          avgPriceUsd: await avgPriceForSet(s.id),
        }))
      );
      return enriched;
    }
  } catch {
    // fall through to API fallback
  }

  // Fallback: pokemontcg API (no price data — UI will show placeholder)
  const apiSets = await getAllSets();
  return apiSets
    .map((s) => ({
      id: s.id,
      name: s.name,
      nameKo: null,
      series: s.series,
      seriesKo: SERIES_KO[s.series] ?? null,
      releaseDate: new Date(s.releaseDate),
      cardCount: s.total || s.printedTotal,
      logoUrl: s.images?.logo ?? null,
      symbolUrl: s.images?.symbol ?? null,
      avgPriceUsd: null,
    }))
    .filter((s) => s.releaseDate >= cutoff)
    .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
}

