import { searchCards } from "@/lib/api/pokemontcg";
import { loadCardByLocaleId, cardToTCG } from "@/lib/cards/queries";
import { pickRarityLabel } from "@/lib/cards/card-fields";
import {
  findPokeTraceCard,
  getPokeTracePriceHistory,
  toUsd,
  type PokeTraceCard,
  type PokeTraceHistoryEntry,
} from "@/lib/api/poketrace";
import { getBunjangCardPrices } from "@/lib/api/bunjang";
import { recordCardView, getCardPriceHistory, type PricePoint } from "@/lib/services/market";
import { getCardOwnerCounts } from "@/lib/services/marketplace";
import { CardVersionTabs, type CardVersion } from "@/components/cards/CardVersionTabs";
import { CardInfoPanel } from "@/components/cards/CardInfoPanel";
import { PriceSection } from "@/components/cards/PriceSection";
import { RARITY_KO } from "@/lib/constants";
import { PT_RANGES } from "@/components/cards/PriceChart";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/toss";

export const revalidate = 3600;

function trendPct(avg: number, avg7d?: number): number | null {
  if (!avg7d) return null;
  return ((avg - avg7d) / avg7d) * 100;
}

// 새 ERD 우선 + 영문 API 폴백.
// - RegionCard 존재 && region !== "EN" → 어댑터(JP/KR·일판단독: API 미수록)
// - 그 외 → 영문 API. API 가 null 인데 DB 가 있으면 DB 로 폴백(EN 누락 보호)
async function getCard(cardId: string) {
  const loaded = await loadCardByLocaleId(cardId).catch(() => null);

  if (loaded && loaded.locale.region !== "EN") {
    return { card: cardToTCG(loaded.card, loaded.locale), loaded };
  }

  try {
    const res = await searchCards(`id:${cardId}`, 1);
    const apiCard = res.data[0] ?? null;
    if (apiCard) return { card: apiCard, loaded };
  } catch {}

  return loaded
    ? { card: cardToTCG(loaded.card, loaded.locale), loaded }
    : null;
}

// ── 모듈 스코프 헬퍼 ─────────────────────────────────────────────────────────

/** (a) PokeTrace 컨디션 티어 추출 */
function extractPoketraceTiers(poketraceCard: PokeTraceCard | null) {
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

  return {
    ebayNm, tcgNm,
    ptEbayNm, ptTcgNm,
    ptEbayNmRange, ptTcgNmRange,
    ptEbayNmTrend, ptTcgNmTrend,
    ptEbaySaleCount, ptTcgSaleCount,
    otherConditions,
    ptTopPrice, ptTotalSaleCount, ptUpdatedAt,
    ptTcgPlayerUrl,
  };
}

/** (b) 차트 데이터 변환 */
function buildChartData(
  ptHistory: PokeTraceHistoryEntry[],
  priceHistory: PricePoint[]
): {
  historyForChart: { recordedAt: string; amount: number | null }[];
  chartLineLabels: { amount: string } | undefined;
  chartRanges: typeof PT_RANGES | undefined;
} {
  if (ptHistory.length > 0) {
    const byDate = new Map<string, { ebay?: number; tcg?: number }>();
    for (const entry of ptHistory) {
      const d = entry.date.slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, {});
      const day = byDate.get(d)!;
      if (entry.source === "ebay") day.ebay = toUsd(entry.avg);
      else if (entry.source === "tcgplayer") day.tcg = toUsd(entry.avg);
    }
    const historyForChart = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { ebay, tcg }]) => ({
        recordedAt: date,
        amount: ebay ?? tcg ?? null,
      }));
    return {
      historyForChart,
      chartLineLabels: { amount: "시세" },
      chartRanges: PT_RANGES,
    };
  }
  return {
    historyForChart: priceHistory.map((p) => ({
      recordedAt: p.recordedAt.toISOString(),
      amount: p.amount,
    })),
    chartLineLabels: undefined,
    chartRanges: undefined,
  };
}

/** (c) 지역별 발매판(versions) 빌드 */
function buildVersions(
  loaded: NonNullable<Awaited<ReturnType<typeof loadCardByLocaleId>>>,
  card: { images: { large: string } }
): import("@/components/cards/CardVersionTabs").CardVersion[] {
  const artist = loaded.card.illustrator;
  return loaded.allLocales.map((l) => {
    const rarityLabel = pickRarityLabel(l.region, {
      nameJa: loaded.card.rarityNameJa,
      nameEn: loaded.card.rarityNameEn,
      nameKo: loaded.card.rarityNameKo,
      code: loaded.card.rarityCode,
    }) ?? null;
    return {
      region: l.region,
      name: l.name,
      nameKo: loaded.card.nameKo,
      number: l.number,
      artist,
      rarity: rarityLabel,
      image:
        l.region === "EN"
          ? card.images.large ?? l.imageLarge ?? l.imageSmall
          : l.imageLarge ?? l.imageSmall,
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cardId: string }>;
}): Promise<Metadata> {
  const { cardId } = await params;
  const got = await getCard(cardId);
  if (!got) return {};
  const { card } = got;
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
  const { cardId: regionCardId, locale } = await params;
  const got = await getCard(regionCardId);
  if (!got) notFound();
  const { card, loaded } = got;

  // 가벼운 조회 추적 (fire-and-forget — 렌더를 막지 않음).
  void recordCardView(regionCardId);

  // 가격 출처 정보 함께 조회(새 ERD: regionCardId + sourceId 우선, 기존 cardId 컬럼도 폴백).
  let priceHistory: PricePoint[] = [];
  let poketraceCard = null;
  let bunjangPrices = null;
  try {
    [priceHistory, poketraceCard, bunjangPrices] = await Promise.all([
      getCardPriceHistory(regionCardId),
      findPokeTraceCard(card.name, card.set.name, card.number),
      getBunjangCardPrices(card.name, card.set.name, card.rarity ?? null),
    ]);
  } catch {}

  // PokeTrace 30일 가격 히스토리 (카드 ID 필요 → 순차)
  const ptHistory = poketraceCard?.id
    ? await getPokeTracePriceHistory(poketraceCard.id, "NEAR_MINT", "30d")
    : [];

  // PokeTrace 각 컨디션 티어 추출
  const {
    ebayNm, tcgNm,
    ptEbayNm, ptTcgNm,
    ptEbayNmRange, ptTcgNmRange,
    ptEbayNmTrend, ptTcgNmTrend,
    ptEbaySaleCount, ptTcgSaleCount,
    otherConditions,
    ptTopPrice, ptTotalSaleCount, ptUpdatedAt,
    ptTcgPlayerUrl,
  } = extractPoketraceTiers(poketraceCard);

  // 차트 데이터: PokeTrace 히스토리 우선, 없으면 DB
  const { historyForChart, chartLineLabels, chartRanges } = buildChartData(ptHistory, priceHistory);

  // 보유 현황 (실데이터: CollectionItem 기준)
  const stats = await getCardOwnerCounts(regionCardId);

  // 지역별 발매판(영/일/한) — Card.locales 기반. 그룹에 있는 지역만 탭으로.
  const versions: CardVersion[] =
    loaded && loaded.allLocales.length > 1 ? buildVersions(loaded, card) : [];

  // 이름 — 한글명 기본, 하단에 영어명 / 일본명 (도감과 동일)
  const krName = loaded?.allLocales.find((l) => l.region === "KR")?.name ?? null;
  const jaName = loaded?.allLocales.find((l) => l.region === "JP")?.name ?? null;
  const enName = loaded?.allLocales.find((l) => l.region === "EN")?.name ?? null;
  const koName = locale === "ko" ? (loaded?.card.nameKo ?? krName) : null;
  const displayName = koName ?? card.name;
  const subNames = [enName, jaName].filter((n): n is string => !!n && n !== displayName);
  // 등급 — 표준화된 레어도 카테고리(한글) 우선
  const rarityLabel =
    loaded?.card.rarityCategoryNameKo ??
    (locale === "ko" ? (card.rarity ? RARITY_KO[card.rarity] ?? card.rarity : null) : card.rarity);

  return (
    <Container size="xl" padding="md" className="py-8">
      {/* 뒤로 가기 */}
      <a
        href={`../../dex`}
        className="text-toss-label text-toss-text-tertiary hover:text-toss-text-primary transition-colors mb-6 inline-block"
      >
        ← 카드 도감
      </a>

      {/* ── 메인 2-col: 이미지(좌, 카드 너비) + 카드 정보(우, 나머지) ── */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* 좌측: 카드 이미지 + 보유 현황 카드 — 카드 너비에 맞춤, 스크롤 시 고정 */}
        <div className="md:w-80 md:shrink-0 md:sticky md:top-[68px] md:self-start">
          {versions.length > 1 ? (
            <CardVersionTabs versions={versions} locale={locale} />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            card.images.large ? (
              <img
                src={card.images.large}
                alt={card.name}
                className="rounded-toss-lg shadow-toss-lg w-full max-w-xs"
              />
            ) : (
              <div className="rounded-toss-lg w-full max-w-xs aspect-[5/7] bg-toss-bg-muted" />
            )
          )}
        </div>

        {/* 우측: 이름/등급/분류·레귤/스탯/진화/특성·기술·룰·도감설명 (사이드 패널과 동일 구조) */}
        <CardInfoPanel
          card={card}
          displayName={displayName}
          rarityLabel={rarityLabel}
          subNames={subNames}
          stats={stats}
          locale={locale}
          regionCardId={regionCardId}
        />
      </div>

      {/* ── 시세 (전체 폭, 하단) ──────────────────────────────────── */}
      <PriceSection
        historyForChart={historyForChart}
        chartLineLabels={chartLineLabels}
        chartRanges={chartRanges}
        ptTcgNm={ptTcgNm}
        ptTcgNmTrend={ptTcgNmTrend}
        tcgNm={tcgNm}
        ptTcgNmRange={ptTcgNmRange}
        ptTcgSaleCount={ptTcgSaleCount}
        ptTcgPlayerUrl={ptTcgPlayerUrl}
        ptEbayNm={ptEbayNm}
        ptEbayNmTrend={ptEbayNmTrend}
        ebayNm={ebayNm}
        ptEbayNmRange={ptEbayNmRange}
        ptEbaySaleCount={ptEbaySaleCount}
        priceHistory={priceHistory}
        bunjangPrices={bunjangPrices}
        otherConditions={otherConditions}
        ptTopPrice={ptTopPrice}
        ptTotalSaleCount={ptTotalSaleCount}
        ptUpdatedAt={ptUpdatedAt}
      />
    </Container>
  );
}
