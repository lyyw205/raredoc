"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { BucketId, PeriodDays, TradeEvent } from "@/lib/trades/shared";
import { PRICE_BUCKETS, PERIOD_DAYS } from "@/lib/trades/shared";

interface TradeFeedProps {
  locale: string;
  initial: TradeEvent[];
  initialBucket: BucketId;
  initialDays: PeriodDays;
  fetcher: (bucket: BucketId, days: PeriodDays) => Promise<TradeEvent[]>;
}

function formatKrw(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}억원`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function TradeCard({
  tr,
  locale,
  t,
}: {
  tr: TradeEvent;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const n = daysSince(new Date(tr.soldAt));
  return (
    <Link
      href={`/${locale}/cards/${tr.cardId}`}
      className="group shrink-0 w-[180px] md:w-[200px] rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-colors p-2"
    >
      <div className="aspect-[2/3] flex items-center justify-center mb-2 overflow-hidden rounded bg-black/30">
        {tr.imageSmall ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tr.imageSmall}
            alt={tr.cardName}
            loading="lazy"
            className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-3xl">🃏</span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 truncate">
        {locale === "ko" ? tr.setNameKo ?? tr.setName : tr.setName}
      </p>
      <p className="text-xs font-medium text-white truncate">
        {locale === "ko" ? tr.cardNameKo ?? tr.cardName : tr.cardName}
      </p>
      <p className="text-sm font-bold text-white mt-1">
        {formatKrw(tr.priceKrw)}
      </p>
      <p className="text-[10px] text-gray-500 mt-0.5">
        {n <= 0 ? t("today") : t("daysAgo", { n })}
        {tr.saleCount > 1 && (
          <span className="ml-1">
            · {t("tradesSaleCount", { n: tr.saleCount })}
          </span>
        )}
      </p>
    </Link>
  );
}

export function TradeFeed({
  locale,
  initial,
  initialBucket,
  initialDays,
  fetcher,
}: TradeFeedProps) {
  const t = useTranslations("home");
  const [bucket, setBucket] = useState<BucketId>(initialBucket);
  const [days, setDays] = useState<PeriodDays>(initialDays);
  const [trades, setTrades] = useState(initial);
  const [pending, startTransition] = useTransition();

  const isFirst = bucket === initialBucket && days === initialDays;
  useEffect(() => {
    if (isFirst) return;
    let cancelled = false;
    startTransition(async () => {
      const next = await fetcher(bucket, days);
      if (!cancelled) setTrades(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, days]);

  return (
    <section className="relative overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_20%,rgba(244,63,94,0.18),transparent_70%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_40%_30%_at_80%_60%,rgba(168,85,247,0.10),transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-4 pt-16 pb-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {t("tradesTitle")}
          </h1>
          <p className="mt-2 text-gray-400 text-sm md:text-base">
            {t("tradesSubtitle")}
          </p>
        </div>

        {/* Price bucket tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-3">
          {PRICE_BUCKETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBucket(b.id)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                bucket === b.id
                  ? "bg-white text-gray-900 border-white"
                  : "bg-transparent text-gray-300 border-white/20 hover:border-white/40"
              }`}
            >
              {t(`bucket.${b.id}`)}
            </button>
          ))}
        </div>

        {/* Period tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-8">
          {PERIOD_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                days === d
                  ? "bg-white/15 text-white border-white/30"
                  : "bg-transparent text-gray-400 border-white/10 hover:border-white/20"
              }`}
            >
              {t("period", { n: d })}
            </button>
          ))}
        </div>
      </div>

      {/* Single-row marquee — repeat items so the track always exceeds viewport.
          Each animation group needs enough cards to make the -50% translate
          seamless even when trades.length is small (e.g. 3 items). */}
      <div
        className={`pb-16 transition-opacity ${
          pending ? "opacity-50" : "opacity-100"
        }`}
      >
        {trades.length === 0 ? (
          <p className="text-center text-gray-500 py-12 max-w-7xl mx-auto px-4">
            {t("tradesEmpty")}
          </p>
        ) : (
          (() => {
            const MIN_PER_GROUP = 12;
            const repeats = Math.max(
              1,
              Math.ceil(MIN_PER_GROUP / trades.length)
            );
            const filled = Array.from({ length: repeats }).flatMap(() => trades);
            return (
              <div className="relative overflow-hidden marquee-mask">
                <div className="flex marquee-track w-max">
                  <div className="flex gap-3 pr-3">
                    {filled.map((tr, i) => (
                      <TradeCard
                        key={`a-${i}-${tr.id}`}
                        tr={tr}
                        locale={locale}
                        t={t}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3 pr-3" aria-hidden="true">
                    {filled.map((tr, i) => (
                      <TradeCard
                        key={`b-${i}-${tr.id}`}
                        tr={tr}
                        locale={locale}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </section>
  );
}
