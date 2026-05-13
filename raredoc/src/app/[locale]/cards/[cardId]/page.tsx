import { searchCards, getCardsBySet } from "@/lib/api/pokemontcg";
import {
  findPokeTraceCard,
  getPokeTracePriceHistory,
  toUsd,
} from "@/lib/api/poketrace";
import { prisma } from "@/lib/prisma";
import { RARITY_KO } from "@/lib/constants";
import { PriceChart, PT_RANGES } from "@/components/cards/PriceChart";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

function trendPct(avg: number, avg7d?: number): number | null {
  if (!avg7d) return null;
  return ((avg - avg7d) / avg7d) * 100;
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  if (pct > 2)
    return <span className="text-xs text-green-400">↑{pct.toFixed(1)}%</span>;
  if (pct < -2)
    return <span className="text-xs text-red-400">↓{Math.abs(pct).toFixed(1)}%</span>;
  return <span className="text-xs text-gray-500">→</span>;
}

async function getCard(cardId: string) {
  try {
    const res = await searchCards(`id:${cardId}`, 1);
    return res.data[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cardId: string }>;
}): Promise<Metadata> {
  const { cardId } = await params;
  const card = await getCard(cardId);
  if (!card) return {};
  return {
    title: card.name,
    description: `${card.name} 카드 시세 및 정보. ${card.set.name} 수록. 희귀도: ${card.rarity ?? "—"}.`,
    openGraph: { images: [card.images.large] },
  };
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string; locale: string }>;
}) {
  const { cardId, locale } = await params;
  const card = await getCard(cardId);
  if (!card) notFound();

  // DB 히스토리 + PokeTrace 카드 정보 병렬 조회
  let priceHistory: { recordedAt: Date; normal: number | null; holofoil: number | null }[] = [];
  let poketraceCard = null;
  try {
    [priceHistory, poketraceCard] = await Promise.all([
      prisma.price
        .findMany({
          where: { cardId },
          orderBy: { recordedAt: "asc" },
          select: { recordedAt: true, normal: true, holofoil: true },
        })
        .catch(() => []),
      findPokeTraceCard(card.name, card.set.name, card.number),
    ]);
  } catch {}

  // PokeTrace 30일 가격 히스토리 (카드 ID 필요 → 순차)
  const ptHistory = poketraceCard?.id
    ? await getPokeTracePriceHistory(poketraceCard.id, "NEAR_MINT", "30d")
    : [];

  // PokeTrace 각 컨디션 티어 추출
  const ebayNm = poketraceCard?.prices?.ebay?.NEAR_MINT;
  const ebayLp = poketraceCard?.prices?.ebay?.LIGHTLY_PLAYED;
  const tcgNm = poketraceCard?.prices?.tcgplayer?.NEAR_MINT;
  const tcgLp = poketraceCard?.prices?.tcgplayer?.LIGHTLY_PLAYED;

  const ptEbayNm = ebayNm?.avg ? toUsd(ebayNm.avg) : null;
  const ptEbayLp = ebayLp?.avg ? toUsd(ebayLp.avg) : null;
  const ptTcgNm = tcgNm?.avg ? toUsd(tcgNm.avg) : null;
  const ptTcgLp = tcgLp?.avg ? toUsd(tcgLp.avg) : null;

  const ptEbayNmRange =
    ebayNm && ebayNm.low != null && ebayNm.high != null
      ? { low: toUsd(ebayNm.low), high: toUsd(ebayNm.high) }
      : null;
  const ptTcgNmRange =
    tcgNm && tcgNm.low != null && tcgNm.high != null
      ? { low: toUsd(tcgNm.low), high: toUsd(tcgNm.high) }
      : null;

  const ptEbayNmTrend = ebayNm ? trendPct(ebayNm.avg, ebayNm.avg7d) : null;
  const ptTcgNmTrend = tcgNm ? trendPct(tcgNm.avg, tcgNm.avg7d) : null;

  const ptEbaySaleCount = ebayNm?.saleCount ?? null;
  const ptTcgSaleCount = tcgNm?.saleCount ?? null;

  const ptTopPrice = poketraceCard?.topPrice ? toUsd(poketraceCard.topPrice) : null;
  const ptTotalSaleCount = poketraceCard?.totalSaleCount ?? null;
  const ptUpdatedAt = poketraceCard?.lastUpdated ?? null;

  const ptTcgPlayerId = poketraceCard?.refs?.tcgplayerId;
  const ptTcgPlayerUrl = ptTcgPlayerId
    ? `https://www.tcgplayer.com/product/${ptTcgPlayerId}`
    : null;

  const hasPtPrices = !!(ptEbayNm || ptTcgNm);
  const latest = priceHistory.at(-1);

  // 차트 데이터: PokeTrace 히스토리 우선, 없으면 DB
  let historyForChart: { recordedAt: string; normal: number | null; holofoil: number | null }[] =
    [];
  let chartLineLabels: { normal: string; holofoil: string } | undefined;
  let chartRanges: typeof PT_RANGES | undefined;

  if (ptHistory.length > 0) {
    const byDate = new Map<string, { ebay?: number; tcg?: number }>();
    for (const entry of ptHistory) {
      const d = entry.date.slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, {});
      const day = byDate.get(d)!;
      if (entry.source === "ebay") day.ebay = toUsd(entry.avg);
      else if (entry.source === "tcgplayer") day.tcg = toUsd(entry.avg);
    }
    historyForChart = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { ebay, tcg }]) => ({
        recordedAt: date,
        normal: ebay ?? null,
        holofoil: tcg ?? null,
      }));
    chartLineLabels = { normal: "eBay NM", holofoil: "TCGPlayer NM" };
    chartRanges = PT_RANGES;
  } else {
    historyForChart = priceHistory.map((p) => ({
      recordedAt: p.recordedAt.toISOString(),
      normal: p.normal,
      holofoil: p.holofoil,
    }));
  }

  // 같은 세트 인접 카드
  let prevCard: { id: string; name: string; images: { small: string } } | null = null;
  let nextCard: { id: string; name: string; images: { small: string } } | null = null;
  try {
    const setCards = await getCardsBySet(card.set.id);
    const idx = setCards.findIndex((c) => c.id === cardId);
    if (idx > 0) prevCard = setCards[idx - 1];
    if (idx >= 0 && idx < setCards.length - 1) nextCard = setCards[idx + 1];
  } catch {}

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 뒤로 가기 */}
      <a
        href={`../../expansions/${card.set.id}`}
        className="text-sm text-gray-400 hover:text-white transition-colors mb-6 inline-block"
      >
        ← {card.set.name}
      </a>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 카드 이미지 + 네비게이션 */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={card.images.large}
            alt={card.name}
            className="rounded-xl shadow-2xl w-full max-w-xs"
          />

          <div className="flex items-center gap-3 w-full max-w-xs">
            {prevCard ? (
              <a
                href={`../${prevCard.id}`}
                className="flex items-center gap-2 flex-1 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <img
                  src={prevCard.images.small}
                  alt={prevCard.name}
                  className="h-10 w-7 object-contain"
                />
                <span className="text-xs text-gray-400 truncate">← {prevCard.name}</span>
              </a>
            ) : (
              <div className="flex-1" />
            )}
            {nextCard ? (
              <a
                href={`../${nextCard.id}`}
                className="flex items-center gap-2 flex-1 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors justify-end"
              >
                <span className="text-xs text-gray-400 truncate">{nextCard.name} →</span>
                <img
                  src={nextCard.images.small}
                  alt={nextCard.name}
                  className="h-10 w-7 object-contain"
                />
              </a>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>

        {/* 카드 정보 */}
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-white">{card.name}</h1>
            <p className="text-gray-400 mt-1">
              {card.set.name} · #{card.number}
            </p>
          </div>

          {/* 메타 정보 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {card.rarity && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">희귀도</p>
                <p className="text-white font-medium">
                  {locale === "ko" ? (RARITY_KO[card.rarity] ?? card.rarity) : card.rarity}
                </p>
              </div>
            )}
            {card.artist && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">일러스트레이터</p>
                <p className="text-white font-medium">{card.artist}</p>
              </div>
            )}
            {card.supertype && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">카드 종류</p>
                <p className="text-white font-medium">{card.supertype}</p>
              </div>
            )}
            {card.types && card.types.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">속성</p>
                <p className="text-white font-medium">{card.types.join(", ")}</p>
              </div>
            )}
          </div>

          {/* 현재 시세 */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
            {hasPtPrices ? (
              <div className="space-y-4">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-300">현재 시세</h2>
                  {ptUpdatedAt && (
                    <span className="text-xs text-gray-600">
                      {new Date(ptUpdatedAt).toLocaleDateString("ko-KR")} 기준
                    </span>
                  )}
                </div>

                {/* 컬럼 헤더 */}
                <div className="grid grid-cols-[56px_1fr_1fr] gap-x-3 text-xs text-gray-500 pb-1 border-b border-gray-800">
                  <div />
                  <div className="text-center">eBay</div>
                  <div className="text-center">TCGPlayer</div>
                </div>

                {/* NM 행 */}
                <div className="grid grid-cols-[56px_1fr_1fr] gap-x-3 items-start">
                  <div>
                    <p className="text-xs font-semibold text-gray-300">NM</p>
                    <p className="text-[10px] text-gray-600 leading-tight">Near Mint</p>
                  </div>

                  {/* eBay NM */}
                  <div className="text-center space-y-0.5">
                    {ptEbayNm != null ? (
                      <>
                        <p className="text-lg font-bold text-yellow-400">
                          ${ptEbayNm.toFixed(2)}
                        </p>
                        <TrendBadge pct={ptEbayNmTrend} />
                        {ptEbayNmRange && ptEbayNmRange.low !== ptEbayNmRange.high && (
                          <p className="text-[11px] text-gray-600">
                            ${ptEbayNmRange.low.toFixed(2)} – ${ptEbayNmRange.high.toFixed(2)}
                          </p>
                        )}
                        {ptEbaySaleCount != null && (
                          <p className="text-[11px] text-gray-600">{ptEbaySaleCount}건</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">—</p>
                    )}
                  </div>

                  {/* TCGPlayer NM */}
                  <div className="text-center space-y-0.5">
                    {ptTcgNm != null ? (
                      <>
                        <p className="text-lg font-bold text-blue-400">
                          ${ptTcgNm.toFixed(2)}
                        </p>
                        <TrendBadge pct={ptTcgNmTrend} />
                        {ptTcgNmRange && ptTcgNmRange.low !== ptTcgNmRange.high && (
                          <p className="text-[11px] text-gray-600">
                            ${ptTcgNmRange.low.toFixed(2)} – ${ptTcgNmRange.high.toFixed(2)}
                          </p>
                        )}
                        {ptTcgSaleCount != null && (
                          <p className="text-[11px] text-gray-600">{ptTcgSaleCount}건</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">—</p>
                    )}
                  </div>
                </div>

                {/* LP 행 — 데이터 있을 때만 */}
                {(ptEbayLp != null || ptTcgLp != null) && (
                  <div className="grid grid-cols-[56px_1fr_1fr] gap-x-3 items-center pt-3 border-t border-gray-800">
                    <div>
                      <p className="text-xs font-semibold text-gray-300">LP</p>
                      <p className="text-[10px] text-gray-600 leading-tight">Lightly Played</p>
                    </div>
                    <div className="text-center">
                      {ptEbayLp != null ? (
                        <span className="text-sm text-gray-300">${ptEbayLp.toFixed(2)}</span>
                      ) : (
                        <span className="text-sm text-gray-600">—</span>
                      )}
                    </div>
                    <div className="text-center">
                      {ptTcgLp != null ? (
                        <span className="text-sm text-gray-300">${ptTcgLp.toFixed(2)}</span>
                      ) : (
                        <span className="text-sm text-gray-600">—</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 푸터: 집계 + 링크 */}
                <div className="pt-3 border-t border-gray-800 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {ptTopPrice != null && (
                    <span className="text-xs text-gray-500">
                      최고 낙찰가{" "}
                      <span className="text-gray-300 font-medium">${ptTopPrice.toFixed(2)}</span>
                    </span>
                  )}
                  {ptTotalSaleCount != null && (
                    <span className="text-xs text-gray-500">
                      총 거래{" "}
                      <span className="text-gray-300 font-medium">
                        {ptTotalSaleCount.toLocaleString()}건
                      </span>
                    </span>
                  )}
                  {ptTcgPlayerUrl && (
                    <a
                      href={ptTcgPlayerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-400 transition-colors ml-auto"
                    >
                      TCGPlayer ↗
                    </a>
                  )}
                </div>

                <p className="text-[11px] text-gray-600">출처: PokeTrace (eBay + TCGPlayer)</p>
              </div>
            ) : latest ? (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">현재 시세 (NM 기준)</h2>
                {latest.normal != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">노말</span>
                    <span className="text-lg font-bold text-yellow-400">
                      ${latest.normal.toFixed(2)}
                    </span>
                  </div>
                )}
                {latest.holofoil != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">홀로포일</span>
                    <span className="text-lg font-bold text-yellow-400">
                      ${latest.holofoil.toFixed(2)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-800">
                  출처: eBay ·{" "}
                  {new Date(priceHistory.at(-1)!.recordedAt).toLocaleDateString("ko-KR")} 기준
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">시세 데이터 수집 중</p>
            )}
          </div>

          {/* 가격 히스토리 차트 */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
            <PriceChart history={historyForChart} lineLabels={chartLineLabels} ranges={chartRanges} />
          </div>
        </div>
      </div>
    </div>
  );
}
