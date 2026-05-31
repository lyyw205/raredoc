import "server-only";
import { prisma } from "@/lib/prisma";
import {
  bucketBoundsUsd,
  USD_KRW,
  type BucketId,
  type PeriodDays,
  type TradeEvent,
} from "@/lib/trades/shared";

export {
  PRICE_BUCKETS,
  PERIOD_DAYS,
  bucketBoundsUsd,
  USD_KRW,
} from "@/lib/trades/shared";
export type {
  PriceBucket,
  PeriodDays,
  BucketId,
  TradeEvent,
} from "@/lib/trades/shared";

interface GetTradesOptions {
  days: PeriodDays;
  bucketId: BucketId;
  limit?: number;
}

export async function getRecentTrades(
  opts: GetTradesOptions
): Promise<TradeEvent[]> {
  const since = new Date();
  since.setDate(since.getDate() - opts.days);
  const { minUsd, maxUsd } = bucketBoundsUsd(opts.bucketId);

  try {
    const trades = await prisma.trade.findMany({
      where: {
        soldAt: { gte: since },
        priceHighUsd: {
          gte: minUsd,
          ...(maxUsd != null ? { lt: maxUsd } : {}),
        },
      },
      orderBy: { priceHighUsd: "desc" },
      take: opts.limit ?? 24,
      select: {
        id: true,
        localeId: true,
        soldAt: true,
        priceHighUsd: true,
        saleCount: true,
        locale: {
          select: {
            name: true,
            imageSmall: true,
            setId: true,
            set: { select: { name: true, nameKo: true } },
          },
        },
      },
    });

    return trades.map((t) => ({
      id: t.id,
      cardId: t.localeId, // URL 호환: shape 이름은 cardId 유지, 값은 CardLocale.id
      cardName: t.locale.name,
      cardNameKo: null, // CardLocale 은 단일 name. ko 표시는 language=ko locale 선택으로 처리
      setId: t.locale.setId,
      setName: t.locale.set.name,
      setNameKo: t.locale.set.nameKo,
      imageSmall: t.locale.imageSmall,
      soldAt: t.soldAt,
      priceUsd: t.priceHighUsd,
      priceKrw: Math.round(t.priceHighUsd * USD_KRW),
      saleCount: t.saleCount,
    }));
  } catch {
    return [];
  }
}
