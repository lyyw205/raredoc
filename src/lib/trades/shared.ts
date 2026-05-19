/**
 * Client-safe shared types + constants for trade feed.
 * Do NOT import server-only modules (prisma, fs, etc.) into this file.
 */

export const USD_KRW = 1400;

export interface PriceBucket {
  id: "tier1" | "tier2" | "tier3" | "tier4";
  minKrw: number;
  maxKrw: number | null;
}

export const PRICE_BUCKETS: PriceBucket[] = [
  { id: "tier1", minKrw: 0, maxKrw: 100_000 },
  { id: "tier2", minKrw: 100_000, maxKrw: 1_000_000 },
  { id: "tier3", minKrw: 1_000_000, maxKrw: 10_000_000 },
  { id: "tier4", minKrw: 10_000_000, maxKrw: null },
];

export const PERIOD_DAYS = [1, 2, 3, 5, 7] as const;
export type PeriodDays = (typeof PERIOD_DAYS)[number];
export type BucketId = PriceBucket["id"];

export interface TradeEvent {
  id: string;
  cardId: string;
  cardName: string;
  cardNameKo: string | null;
  setId: string;
  setName: string;
  setNameKo: string | null;
  imageSmall: string | null;
  soldAt: Date;
  priceUsd: number;
  priceKrw: number;
  saleCount: number;
}

export function bucketBoundsUsd(bucketId: BucketId): {
  minUsd: number;
  maxUsd: number | null;
} {
  const bucket = PRICE_BUCKETS.find((b) => b.id === bucketId);
  if (!bucket) return { minUsd: 0, maxUsd: null };
  return {
    minUsd: bucket.minKrw / USD_KRW,
    maxUsd: bucket.maxKrw == null ? null : bucket.maxKrw / USD_KRW,
  };
}
