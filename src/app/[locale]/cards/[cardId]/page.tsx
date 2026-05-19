import { searchCards, getCardsBySet } from "@/lib/api/pokemontcg";
import {
  findPokeTraceCard,
  getPokeTracePriceHistory,
  toUsd,
} from "@/lib/api/poketrace";
import { getBunjangCardPrices } from "@/lib/api/bunjang";
import { prisma } from "@/lib/prisma";
import { RARITY_KO } from "@/lib/constants";
import { PriceChart, PT_RANGES } from "@/components/cards/PriceChart";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

// 같은 카드 · 다른 팩 목업 (실데이터 연동 전 임시)
const OTHER_PACK_VARIANTS = [
  { set: "포켓몬 151",           number: "025", priceLabel: "₩12,000"  },
  { set: "스타버스 ex",           number: "043", priceLabel: "₩85,000"  },
  { set: "이브이 히어로즈",        number: "077", priceLabel: "₩320,000" },
  { set: "스칼렛 ex",             number: "215", priceLabel: "₩185,000" },
  { set: "메가 에볼루션 프로모",   number: "198", priceLabel: "₩240,000" },
  { set: "썬앤문 프로모",          number: "012", priceLabel: "₩67,000"  },
  { set: "어둠을 밝힌 달빛",       number: "054", priceLabel: "₩28,000"  },
];

// 카드 id 기반 결정적 목업 보유자 통계 (실데이터 연동 전 임시)
function mockOwnerStats(cardId: string) {
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = ((hash << 5) - hash + cardId.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);
  const total = 8 + (hash % 90);
  const offerable = Math.floor(total * (0.3 + ((hash % 40) / 100)));
  return { total, offerable };
}

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

  // DB 히스토리 + PokeTrace + 번개장터 병렬 조회
  let priceHistory: { recordedAt: Date; normal: number | null; holofoil: number | null }[] = [];
  let poketraceCard = null;
  let bunjangPrices = null;
  try {
    [priceHistory, poketraceCard, bunjangPrices] = await Promise.all([
      prisma.price
        .findMany({
          where: { cardId },
          orderBy: { recordedAt: "asc" },
          select: { recordedAt: true, normal: true, holofoil: true },
        })
        .catch(() => []),
      findPokeTraceCard(card.name, card.set.name, card.number),
      getBunjangCardPrices(card.name, card.set.name, card.rarity ?? null),
    ]);
  } catch {}

  // PokeTrace 30일 가격 히스토리 (카드 ID 필요 → 순차)
  const ptHistory = poketraceCard?.id
    ? await getPokeTracePriceHistory(poketraceCard.id, "NEAR_MINT", "30d")
    : [];

  // PokeTrace 각 컨디션 티어 추출
  const ebayNm = poketraceCard?.prices?.ebay?.NEAR_MINT;
  const ebayLp = poketraceCard?.prices?.ebay?.LIGHTLY_PLAYED;
  const ebayMp = poketraceCard?.prices?.ebay?.MODERATELY_PLAYED;
  const ebayHp = poketraceCard?.prices?.ebay?.HEAVILY_PLAYED;
  const ebayD  = poketraceCard?.prices?.ebay?.DAMAGED;
  const tcgNm  = poketraceCard?.prices?.tcgplayer?.NEAR_MINT;
  const tcgLp  = poketraceCard?.prices?.tcgplayer?.LIGHTLY_PLAYED;
  const tcgMp  = poketraceCard?.prices?.tcgplayer?.MODERATELY_PLAYED;
  const tcgHp  = poketraceCard?.prices?.tcgplayer?.HEAVILY_PLAYED;
  const tcgD   = poketraceCard?.prices?.tcgplayer?.DAMAGED;

  const ptEbayNm = ebayNm?.avg ? toUsd(ebayNm.avg) : null;
  const ptTcgNm  = tcgNm?.avg  ? toUsd(tcgNm.avg)  : null;

  const ptEbayNmRange =
    ebayNm && ebayNm.low != null && ebayNm.high != null
      ? { low: toUsd(ebayNm.low), high: toUsd(ebayNm.high) }
      : null;
  const ptTcgNmRange =
    tcgNm && tcgNm.low != null && tcgNm.high != null
      ? { low: toUsd(tcgNm.low), high: toUsd(tcgNm.high) }
      : null;

  const ptEbayNmTrend = ebayNm ? trendPct(ebayNm.avg, ebayNm.avg7d) : null;
  const ptTcgNmTrend  = tcgNm  ? trendPct(tcgNm.avg,  tcgNm.avg7d)  : null;

  const ptEbaySaleCount = ebayNm?.saleCount ?? null;
  const ptTcgSaleCount  = tcgNm?.saleCount  ?? null;

  // 하위 컨디션 행 (NM 이외)
  const otherConditions = [
    { key: "LP", label: "Lightly Played",   ebay: ebayLp, tcg: tcgLp },
    { key: "MP", label: "Mod. Played",      ebay: ebayMp, tcg: tcgMp },
    { key: "HP", label: "Heavily Played",   ebay: ebayHp, tcg: tcgHp },
    { key: "D",  label: "Damaged",          ebay: ebayD,  tcg: tcgD  },
  ].filter((c) => c.ebay?.avg || c.tcg?.avg);

  const ptTopPrice = poketraceCard?.topPrice ? toUsd(poketraceCard.topPrice) : null;
  const ptTotalSaleCount = poketraceCard?.totalSaleCount ?? null;
  const ptUpdatedAt = poketraceCard?.lastUpdated ?? null;

  const ptTcgPlayerId = poketraceCard?.refs?.tcgplayerId;
  const ptTcgPlayerUrl = ptTcgPlayerId
    ? `https://www.tcgplayer.com/product/${ptTcgPlayerId}`
    : null;

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

  // 같은 세트의 다른 카드들 (캐러셀용)
  let setCards: { id: string; name: string; number: string; images: { small: string } }[] = [];
  try {
    setCards = await getCardsBySet(card.set.id);
  } catch {}
  const sameSetOthers = setCards.filter((c) => c.id !== cardId).slice(0, 20);

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
        {/* 카드 이미지 + 캐러셀 */}
        <div className="flex flex-col gap-4">
          <img
            src={card.images.large}
            alt={card.name}
            className="rounded-xl shadow-2xl w-full max-w-xs self-center"
          />

          {/* 같은 카드 · 다른 팩 (목업) */}
          <div>
            <h3 className="text-[11px] font-semibold text-gray-400 mb-1.5">같은 카드 · 다른 팩</h3>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {OTHER_PACK_VARIANTS.map((v, i) => (
                <a key={i} href="#" className="shrink-0 w-14 group text-left">
                  <div className="rounded overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-gray-600 transition-colors aspect-[5/7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.images.small} alt={card.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="mt-1 text-[9px] text-gray-500 truncate leading-tight">{v.set}</p>
                </a>
              ))}
            </div>
          </div>

          {/* 같은 팩 · 다른 카드 */}
          {sameSetOthers.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-gray-400 mb-1.5">같은 팩 · 다른 카드</h3>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {sameSetOthers.map((c) => (
                  <a key={c.id} href={`../${c.id}`} className="shrink-0 w-14 group text-left">
                    <div className="rounded overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-gray-600 transition-colors aspect-[5/7]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.images.small} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="mt-1 text-[9px] text-gray-500 truncate leading-tight">{c.name}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
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

          {/* 시세 — 3출처 등가 (세로 3행) */}
          <div className="space-y-3">
            {/* TCGplayer */}
            <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>🇺🇸</span> TCGplayer
                </h3>
                {ptTcgPlayerUrl && (
                  <a
                    href={ptTcgPlayerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    ↗
                  </a>
                )}
              </div>
              {ptTcgNm != null ? (
                <>
                  <p className="text-2xl font-bold text-blue-400">${ptTcgNm.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-600">NM · 미국</span>
                    <TrendBadge pct={ptTcgNmTrend} />
                  </div>
                  {tcgNm?.avg7d != null && (
                    <p className="text-[10px] text-gray-500 mt-1.5">7일평균 ${toUsd(tcgNm.avg7d).toFixed(2)}</p>
                  )}
                  {ptTcgNmRange && ptTcgNmRange.low !== ptTcgNmRange.high && (
                    <p className="text-[10px] text-gray-600">${ptTcgNmRange.low.toFixed(2)} – ${ptTcgNmRange.high.toFixed(2)}</p>
                  )}
                  {ptTcgSaleCount != null && (
                    <p className="text-[10px] text-gray-600">{ptTcgSaleCount}건</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600 py-2">— 데이터 수집 중</p>
              )}
            </div>

            {/* eBay */}
            <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>🌍</span> eBay
                </h3>
                <span className="text-[10px] text-gray-600">Sold listings</span>
              </div>
              {ptEbayNm != null ? (
                <>
                  <p className="text-2xl font-bold text-emerald-400">${ptEbayNm.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-600">NM · 글로벌</span>
                    <TrendBadge pct={ptEbayNmTrend} />
                  </div>
                  {ebayNm?.avg7d != null && (
                    <p className="text-[10px] text-gray-500 mt-1.5">7일평균 ${toUsd(ebayNm.avg7d).toFixed(2)}</p>
                  )}
                  {ebayNm?.median7d != null && (
                    <p className="text-[10px] text-gray-500">중앙값 ${toUsd(ebayNm.median7d).toFixed(2)}</p>
                  )}
                  {ptEbayNmRange && ptEbayNmRange.low !== ptEbayNmRange.high && (
                    <p className="text-[10px] text-gray-600">${ptEbayNmRange.low.toFixed(2)} – ${ptEbayNmRange.high.toFixed(2)}</p>
                  )}
                  {ptEbaySaleCount != null && (
                    <p className="text-[10px] text-gray-600">{ptEbaySaleCount}건</p>
                  )}
                </>
              ) : latest?.normal ? (
                <>
                  <p className="text-2xl font-bold text-emerald-400">${latest.normal.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-600 mt-1.5">노말 · {new Date(priceHistory.at(-1)!.recordedAt).toLocaleDateString("ko-KR")} 기준</p>
                </>
              ) : (
                <p className="text-sm text-gray-600 py-2">— 데이터 수집 중</p>
              )}
            </div>

            {/* 번개장터 */}
            <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>🇰🇷</span> 번개장터
                </h3>
                {bunjangPrices && (
                  <a
                    href={`https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(bunjangPrices.query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    ↗
                  </a>
                )}
              </div>
              {bunjangPrices ? (
                <>
                  <p className="text-2xl font-bold text-orange-400">₩{bunjangPrices.avg.toLocaleString("ko-KR")}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">평균 · 국내</p>
                  <p className="text-[10px] text-gray-600 mt-1.5">
                    {bunjangPrices.count}건 · ₩{bunjangPrices.min.toLocaleString("ko-KR")} – ₩{bunjangPrices.max.toLocaleString("ko-KR")}
                  </p>
                  <p className="text-[10px] text-gray-700 mt-1 truncate">검색어: {bunjangPrices.query}</p>
                </>
              ) : (
                <p className="text-sm text-gray-600 py-2">— 데이터 수집 중</p>
              )}
            </div>
          </div>

          {/* 컨디션별 상세 시세 (LP/MP/HP/D) — 데이터 있을 때만 */}
          {otherConditions.length > 0 && (
            <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">컨디션별 시세</h3>
              <div className="grid grid-cols-[56px_1fr_1fr] gap-x-3 text-xs text-gray-500 pb-1.5 border-b border-gray-800">
                <div />
                <div className="text-center">eBay</div>
                <div className="text-center">TCGplayer</div>
              </div>
              {otherConditions.map(({ key, label, ebay, tcg }) => (
                <div
                  key={key}
                  className="grid grid-cols-[56px_1fr_1fr] gap-x-3 items-center pt-2 mt-2 border-t border-gray-800/60 first:border-t-0 first:mt-0"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-400">{key}</p>
                    <p className="text-[10px] text-gray-600 leading-tight">{label}</p>
                  </div>
                  <div className="text-center">
                    {ebay?.avg != null ? (
                      <span className="text-sm text-gray-300">${toUsd(ebay.avg).toFixed(2)}</span>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </div>
                  <div className="text-center">
                    {tcg?.avg != null ? (
                      <span className="text-sm text-gray-300">${toUsd(tcg.avg).toFixed(2)}</span>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 푸터: 집계 + 출처 */}
          {(ptTopPrice != null || ptTotalSaleCount != null || ptUpdatedAt) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600 px-1">
              {ptTopPrice != null && (
                <span>최고가 <span className="text-gray-400 font-medium">${ptTopPrice.toFixed(2)}</span></span>
              )}
              {ptTotalSaleCount != null && (
                <span>총 거래 <span className="text-gray-400 font-medium">{ptTotalSaleCount.toLocaleString()}건</span></span>
              )}
              {ptUpdatedAt && (
                <span className="ml-auto">{new Date(ptUpdatedAt).toLocaleDateString("ko-KR")} 기준</span>
              )}
            </div>
          )}

          {/* 가격 히스토리 차트 */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
            <PriceChart history={historyForChart} lineLabels={chartLineLabels} ranges={chartRanges} />
          </div>

          {/* 보유 현황 (목업) */}
          {(() => {
            const stats = mockOwnerStats(cardId);
            return (
              <div className="px-4 py-3 rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-400">
                    👥 <span className="text-white font-semibold">{stats.total}명</span> 등록
                  </span>
                  <span className="text-gray-700">·</span>
                  <span className="text-gray-400">
                    💬 <span className="text-yellow-400 font-semibold">{stats.offerable}명</span> 제안 가능
                  </span>
                </div>
                {stats.offerable > 0 && (
                  <a
                    href={`/${locale}/cards/${cardId}/owners`}
                    className="text-xs text-yellow-500 hover:text-yellow-400 font-medium whitespace-nowrap"
                  >
                    구매 제안 →
                  </a>
                )}
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
