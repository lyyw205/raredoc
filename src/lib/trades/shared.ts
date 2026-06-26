/**
 * Client-safe shared types + constants for trade feed.
 * Do NOT import server-only modules (prisma, fs, etc.) into this file.
 */

export const USD_KRW = 1400;
export const JPY_KRW = 9; // 100엔 ≈ 900원
export const EUR_KRW = 1500;

/** 통화 코드 → KRW 환산. 미지원 통화는 USD로 가정(보수적). */
export function toKrw(value: number, currency: string | null | undefined): number {
  switch (currency) {
    case "JPY":
      return value * JPY_KRW;
    case "EUR":
      return value * EUR_KRW;
    case "KRW":
      return value;
    case "USD":
    default:
      return value * USD_KRW;
  }
}

// ── 컨디션·시세 공용(collection/gamification/marketplace 단일출처) ─────────────

/** 컨디션(grade) → 시세 계수. NM(완전 새것) 기준 1.0. */
export const CONDITION_COEFFICIENT: Record<string, number> = {
  미개봉: 1.15,
  "1착": 1.1,
  NM: 1.0,
  VNDS: 0.95,
  LP: 0.85,
  MP: 0.65,
  HP: 0.45,
  DS: 0.3,
  D: 0.3,
};

/** 컨디션→계수 룩업(미지정 grade 는 1.0). */
export function conditionCoefficient(grade: string): number {
  return CONDITION_COEFFICIENT[grade] ?? 1.0;
}

/** 전체 9등급 어휘(컨디션 enum·정렬·계수키 단일출처). */
export const GRADES = ["미개봉", "1착", "NM", "VNDS", "LP", "MP", "HP", "DS", "D"] as const;
export type Grade = (typeof GRADES)[number];

export interface PriceFields {
  amount: number | null;
}

/** Price 행에서 대표 USD 시세 선택. */
export function pickPriceUsd(p: PriceFields): number | null {
  return p.amount ?? null;
}

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
