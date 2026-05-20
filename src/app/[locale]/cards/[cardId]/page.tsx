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
import {
  Card,
  Container,
  DeltaBadge,
  Button,
  RankingTable,
} from "@/components/toss";

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
  if (Math.abs(pct) <= 2) return <span className="text-toss-caption text-toss-text-quaternary">→</span>;
  return <DeltaBadge percent={pct} mode="text" size="sm" />;
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

  // 보유 현황 (목업)
  const stats = mockOwnerStats(cardId);

  return (
    <Container size="xl" padding="md" className="py-8">
      {/* 뒤로 가기 */}
      <a
        href={`../../expansions/${card.set.id}`}
        className="text-toss-label text-toss-text-tertiary hover:text-toss-text-primary transition-colors mb-6 inline-block"
      >
        ← {card.set.name}
      </a>

      {/* ── 페이지 헤더 (이름 + 메타 한 줄 + 보유 현황 CTA) ───────────── */}
      {/* C + E */}
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-toss-display font-bold text-toss-text-primary">{card.name}</h1>
          <p className="text-toss-caption text-toss-text-tertiary mt-1">
            {card.set.name} · #{card.number}
            {card.rarity && ` · ${locale === "ko" ? (RARITY_KO[card.rarity] ?? card.rarity) : card.rarity}`}
            {card.artist && ` · ${card.artist}`}
            {card.supertype && ` · ${card.supertype}`}
            {card.types && card.types.length > 0 && ` · ${card.types.join(", ")}`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-toss-caption text-toss-text-secondary">
            👥 <span className="text-toss-text-primary font-bold">{stats.total}명</span> 등록
            <span className="mx-1.5 text-toss-text-quaternary">·</span>
            💬 <span className="text-toss-brand font-bold">{stats.offerable}명</span> 제안 가능
          </div>
          {stats.offerable > 0 && (
            <Button variant="primary" size="md" asChild>
              <a href={`/${locale}/cards/${cardId}/owners`}>구매 제안 →</a>
            </Button>
          )}
        </div>
      </header>

      {/* ── 메인 2-col 그리드 ──────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* 좌측: 카드 이미지 (sticky) */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.images.large}
            alt={card.name}
            className="rounded-toss-lg shadow-toss-lg w-full max-w-xs self-center mx-auto md:sticky md:top-[68px]"
          />
        </div>

        {/* 우측: 차트 → 시세 → 컨디션 → 푸터 */}
        <div className="space-y-5">
          {/* A: 가격 히스토리 (최상단) */}
          <Card padding="md">
            <PriceChart history={historyForChart} lineLabels={chartLineLabels} ranges={chartRanges} />
          </Card>

          {/* B: 시세 3출처 가로 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* TCGplayer */}
            <Card padding="sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-toss-caption font-semibold text-toss-text-secondary flex items-center gap-1.5">
                  <span>🇺🇸</span> TCGplayer
                </h3>
                {ptTcgPlayerUrl && (
                  <a
                    href={ptTcgPlayerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-toss-tiny text-toss-brand hover:text-toss-brand-hover transition-colors"
                  >
                    ↗
                  </a>
                )}
              </div>
              {ptTcgNm != null ? (
                <>
                  <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">${ptTcgNm.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-toss-tiny text-toss-text-tertiary">NM · 미국</span>
                    <TrendBadge pct={ptTcgNmTrend} />
                  </div>
                  {tcgNm?.avg7d != null && (
                    <p className="text-toss-tiny text-toss-text-tertiary mt-1.5 toss-numeric">7일평균 ${toUsd(tcgNm.avg7d).toFixed(2)}</p>
                  )}
                  {ptTcgNmRange && ptTcgNmRange.low !== ptTcgNmRange.high && (
                    <p className="text-toss-tiny text-toss-text-quaternary toss-numeric">${ptTcgNmRange.low.toFixed(2)} – ${ptTcgNmRange.high.toFixed(2)}</p>
                  )}
                  {ptTcgSaleCount != null && (
                    <p className="text-toss-tiny text-toss-text-quaternary toss-numeric">{ptTcgSaleCount}건</p>
                  )}
                </>
              ) : (
                <p className="text-toss-label text-toss-text-quaternary py-2">— 데이터 수집 중</p>
              )}
            </Card>

            {/* eBay */}
            <Card padding="sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-toss-caption font-semibold text-toss-text-secondary flex items-center gap-1.5">
                  <span>🌍</span> eBay
                </h3>
                <span className="text-toss-tiny text-toss-text-quaternary">Sold listings</span>
              </div>
              {ptEbayNm != null ? (
                <>
                  <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">${ptEbayNm.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-toss-tiny text-toss-text-tertiary">NM · 글로벌</span>
                    <TrendBadge pct={ptEbayNmTrend} />
                  </div>
                  {ebayNm?.avg7d != null && (
                    <p className="text-toss-tiny text-toss-text-tertiary mt-1.5 toss-numeric">7일평균 ${toUsd(ebayNm.avg7d).toFixed(2)}</p>
                  )}
                  {ebayNm?.median7d != null && (
                    <p className="text-toss-tiny text-toss-text-tertiary toss-numeric">중앙값 ${toUsd(ebayNm.median7d).toFixed(2)}</p>
                  )}
                  {ptEbayNmRange && ptEbayNmRange.low !== ptEbayNmRange.high && (
                    <p className="text-toss-tiny text-toss-text-quaternary toss-numeric">${ptEbayNmRange.low.toFixed(2)} – ${ptEbayNmRange.high.toFixed(2)}</p>
                  )}
                  {ptEbaySaleCount != null && (
                    <p className="text-toss-tiny text-toss-text-quaternary toss-numeric">{ptEbaySaleCount}건</p>
                  )}
                </>
              ) : latest?.normal ? (
                <>
                  <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">${latest.normal.toFixed(2)}</p>
                  <p className="text-toss-tiny text-toss-text-quaternary mt-1.5">노말 · {new Date(priceHistory.at(-1)!.recordedAt).toLocaleDateString("ko-KR")} 기준</p>
                </>
              ) : (
                <p className="text-toss-label text-toss-text-quaternary py-2">— 데이터 수집 중</p>
              )}
            </Card>

            {/* 번개장터 */}
            <Card padding="sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-toss-caption font-semibold text-toss-text-secondary flex items-center gap-1.5">
                  <span>🇰🇷</span> 번개장터
                </h3>
                {bunjangPrices && (
                  <a
                    href={`https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(bunjangPrices.query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-toss-tiny text-toss-brand hover:text-toss-brand-hover transition-colors"
                  >
                    ↗
                  </a>
                )}
              </div>
              {bunjangPrices ? (
                <>
                  <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">₩{bunjangPrices.avg.toLocaleString("ko-KR")}</p>
                  <p className="text-toss-tiny text-toss-text-tertiary mt-0.5">평균 · 국내</p>
                  <p className="text-toss-tiny text-toss-text-quaternary mt-1.5 toss-numeric">
                    {bunjangPrices.count}건 · ₩{bunjangPrices.min.toLocaleString("ko-KR")} – ₩{bunjangPrices.max.toLocaleString("ko-KR")}
                  </p>
                  <p className="text-toss-tiny text-toss-text-quaternary mt-1 truncate">검색어: {bunjangPrices.query}</p>
                </>
              ) : (
                <p className="text-toss-label text-toss-text-quaternary py-2">— 데이터 수집 중</p>
              )}
            </Card>
          </div>

          {/* D: 컨디션별 시세 RankingTable */}
          {otherConditions.length > 0 && (
            <Card padding="md">
              <h3 className="text-toss-label font-bold text-toss-text-primary mb-3">컨디션별 시세</h3>
              <RankingTable.Root className="mt-3">
                <RankingTable.Head>
                  <RankingTable.HeadRow>
                    <RankingTable.Header>컨디션</RankingTable.Header>
                    <RankingTable.Header align="right">eBay</RankingTable.Header>
                    <RankingTable.Header align="right">TCGplayer</RankingTable.Header>
                  </RankingTable.HeadRow>
                </RankingTable.Head>
                <RankingTable.Body>
                  {otherConditions.map(({ key, label, ebay, tcg }) => (
                    <RankingTable.Row key={key}>
                      <RankingTable.Cell>
                        <div>
                          <p className="text-toss-label font-semibold text-toss-text-primary">{key}</p>
                          <p className="text-toss-micro text-toss-text-tertiary">{label}</p>
                        </div>
                      </RankingTable.Cell>
                      <RankingTable.Cell align="right" numeric>
                        {ebay?.avg != null ? (
                          <span className="text-toss-text-primary">${toUsd(ebay.avg).toFixed(2)}</span>
                        ) : (
                          <span className="text-toss-text-quaternary">—</span>
                        )}
                      </RankingTable.Cell>
                      <RankingTable.Cell align="right" numeric>
                        {tcg?.avg != null ? (
                          <span className="text-toss-text-primary">${toUsd(tcg.avg).toFixed(2)}</span>
                        ) : (
                          <span className="text-toss-text-quaternary">—</span>
                        )}
                      </RankingTable.Cell>
                    </RankingTable.Row>
                  ))}
                </RankingTable.Body>
              </RankingTable.Root>
            </Card>
          )}

          {/* 푸터: 집계 + 출처 */}
          {(ptTopPrice != null || ptTotalSaleCount != null || ptUpdatedAt) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-toss-micro text-toss-text-tertiary px-1">
              {ptTopPrice != null && (
                <span>최고가 <span className="text-toss-text-primary font-semibold toss-numeric">${ptTopPrice.toFixed(2)}</span></span>
              )}
              {ptTotalSaleCount != null && (
                <span>총 거래 <span className="text-toss-text-primary font-semibold toss-numeric">{ptTotalSaleCount.toLocaleString()}건</span></span>
              )}
              {ptUpdatedAt && (
                <span className="ml-auto">{new Date(ptUpdatedAt).toLocaleDateString("ko-KR")} 기준</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── F: 페이지 하단 캐러셀 ───────────────────────────────────── */}
      <div className="mt-12 space-y-6">
        {/* 같은 카드 · 다른 팩 */}
        <section>
          <h3 className="text-toss-label font-bold text-toss-text-primary mb-3">같은 카드 · 다른 팩</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {OTHER_PACK_VARIANTS.map((v, i) => (
              <a key={i} href="#" className="shrink-0 w-20 group text-left">
                <div className="rounded-toss-md overflow-hidden bg-toss-bg-base border border-toss-divider shadow-toss-hairline group-hover:ring-2 group-hover:ring-toss-brand/40 transition-all aspect-[5/7]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.images.small} alt={card.name} className="w-full h-full object-cover" />
                </div>
                <p className="mt-1.5 text-toss-tiny text-toss-text-tertiary truncate">{v.set}</p>
              </a>
            ))}
          </div>
        </section>

        {/* 같은 팩 · 다른 카드 */}
        {sameSetOthers.length > 0 && (
          <section>
            <h3 className="text-toss-label font-bold text-toss-text-primary mb-3">같은 팩 · 다른 카드</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {sameSetOthers.map((c) => (
                <a key={c.id} href={`../${c.id}`} className="shrink-0 w-20 group text-left">
                  <div className="rounded-toss-md overflow-hidden bg-toss-bg-base border border-toss-divider shadow-toss-hairline group-hover:ring-2 group-hover:ring-toss-brand/40 transition-all aspect-[5/7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.images.small} alt={c.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="mt-1.5 text-toss-tiny text-toss-text-tertiary truncate">{c.name}</p>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </Container>
  );
}
