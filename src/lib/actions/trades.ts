"use server";

import {
  getRecentTrades,
  PERIOD_DAYS,
  PRICE_BUCKETS,
  type PeriodDays,
  type TradeEvent,
} from "@/lib/api/trades";

type BucketId = (typeof PRICE_BUCKETS)[number]["id"];

const BUCKET_IDS = new Set(PRICE_BUCKETS.map((b) => b.id));
const PERIOD_SET = new Set<number>(PERIOD_DAYS as readonly number[]);

export async function fetchTradesAction(
  bucket: BucketId,
  days: PeriodDays
): Promise<TradeEvent[]> {
  if (!BUCKET_IDS.has(bucket)) return [];
  if (!PERIOD_SET.has(days)) return [];
  return getRecentTrades({ bucketId: bucket, days });
}
