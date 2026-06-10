import { searchCards } from "@/lib/api/pokemontcg";
import { loadCardByLocaleId, logicalCardToTCG } from "@/lib/cards/queries";
import { pickRarityLabel } from "@/lib/cards/card-fields";
import { cn } from "@/lib/utils";
import {
  findPokeTraceCard,
  getPokeTracePriceHistory,
  toUsd,
  type PokeTraceCard,
  type PokeTraceHistoryEntry,
} from "@/lib/api/poketrace";
import { getBunjangCardPrices } from "@/lib/api/bunjang";
import { prisma } from "@/lib/prisma";
import { recordCardView } from "@/lib/services/market";
import { getCardOwnerCounts } from "@/lib/services/marketplace";
import { CardVersionTabs, type CardVersion } from "@/components/cards/CardVersionTabs";
import { RARITY_KO } from "@/lib/constants";
import { PriceChart, PT_RANGES } from "@/components/cards/PriceChart";
import { getDecksUsingCard } from "@/lib/services/cardgame";
import { DeckIcon } from "@/components/cardgame/DeckIcon";
import Link from "next/link";
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

// "이 카드를 쓰는 덱" 역링크 (UI-2차 — cardgame 채용률 데이터 연동). 채용 덱 없으면 미렌더.
async function DecksUsingCardSection({ logicalCardId, locale }: { logicalCardId: string; locale: string }) {
  const decks = await getDecksUsingCard(logicalCardId, 5).catch(() => []);
  if (decks.length === 0) return null;
  return (
    <section className="mt-10 space-y-5">
      <h2 className="text-toss-title font-bold text-toss-text-primary">이 카드를 쓰는 덱</h2>
      <Card padding="md">
        <div className="space-y-1">
          {decks.map((d) => (
            <Link
              key={d.archetypeId}
              href={`/${locale}/cardgame/decks/${d.archetypeId}`}
              className="flex items-center gap-3 p-2 rounded-toss-md hover:bg-toss-hover transition-colors"
            >
              <DeckIcon iconKeys={d.iconKeys} size="md" />
              <span className="flex-1 min-w-0 text-toss-caption font-semibold text-toss-text-primary truncate">
                {d.nameKo}
              </span>
              <span className="text-toss-micro text-toss-text-tertiary shrink-0">
                채용률 {d.adoptionRate}% · 평균 {d.avgCount}장
              </span>
              <span className="text-toss-caption font-bold text-toss-text-secondary w-14 text-right tabular-nums shrink-0">
                {d.usageRate.toFixed(1)}%
              </span>
            </Link>
          ))}
        </div>
        <p className="text-toss-micro text-toss-text-quaternary mt-3">
          글로벌 메타 표준 레시피 기준 채용률 · 우측은 덱 사용률
        </p>
      </Card>
    </section>
  );
}

// ── 카드 정보용 라벨/색상 (pokemontcg.io 영문 값 기준) ──────────────────────
const TYPE_KO: Record<string, string> = {
  Grass: "풀", Fire: "불꽃", Water: "물", Lightning: "번개", Psychic: "에스퍼",
  Fighting: "격투", Darkness: "악", Metal: "강철", Dragon: "드래곤",
  Colorless: "무색", Fairy: "페어리",
};

const TYPE_BG: Record<string, string> = {
  Grass: "bg-green-100 text-green-700", Fire: "bg-red-100 text-red-700",
  Water: "bg-blue-100 text-blue-700", Lightning: "bg-yellow-100 text-yellow-700",
  Psychic: "bg-purple-100 text-purple-700", Fighting: "bg-orange-100 text-orange-700",
  Darkness: "bg-gray-800 text-gray-100", Metal: "bg-slate-200 text-slate-700",
  Dragon: "bg-indigo-100 text-indigo-700", Colorless: "bg-gray-100 text-gray-600",
  Fairy: "bg-pink-100 text-pink-700",
};

const SUBTYPE_KO: Record<string, string> = {
  Basic: "기본", "Stage 1": "1진화", "Stage 2": "2진화",
  "Mega Evolution": "메가진화", MEGA: "메가진화",
  ex: "ex", EX: "EX", V: "V", VMAX: "VMAX", VSTAR: "VSTAR",
  Item: "아이템", Supporter: "서포트", Stadium: "스타디움",
  "Pokémon Tool": "포켓몬의 도구", Tool: "포켓몬의 도구",
  Special: "특수 에너지", "Basic Energy": "기본 에너지",
};

const FORMAT_LABEL: Record<string, string> = {
  standard: "스탠다드", expanded: "익스텐디드", unlimited: "언리미티드",
};

function CostPips({ cost }: { cost?: string[] }) {
  if (!cost || cost.length === 0)
    return <span className="text-toss-micro text-toss-text-quaternary">—</span>;
  return (
    <span className="inline-flex gap-0.5 items-center">
      {cost.map((c, i) => (
        <span
          key={i}
          title={TYPE_KO[c] ?? c}
          className={cn(
            "inline-flex w-4 h-4 rounded-full text-[9px] font-bold items-center justify-center",
            TYPE_BG[c] ?? "bg-gray-100 text-gray-600"
          )}
        >
          {c.charAt(0)}
        </span>
      ))}
    </span>
  );
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

// 새 ERD 우선 + 영문 API 폴백.
// - CardLocale 존재 && region !== "EN" → 어댑터(JP/KR·일판단독: API 미수록)
// - 그 외 → 영문 API. API 가 null 인데 DB 가 있으면 DB 로 폴백(EN 누락 보호)
async function getCard(cardId: string) {
  const loaded = await loadCardByLocaleId(cardId).catch(() => null);

  if (loaded && loaded.locale.region !== "EN") {
    return { card: logicalCardToTCG(loaded.logicalCard, loaded.locale), loaded };
  }

  try {
    const res = await searchCards(`id:${cardId}`, 1);
    const apiCard = res.data[0] ?? null;
    if (apiCard) return { card: apiCard, loaded };
  } catch {}

  return loaded
    ? { card: logicalCardToTCG(loaded.logicalCard, loaded.locale), loaded }
    : null;
}

// ── 모듈 스코프 헬퍼 ─────────────────────────────────────────────────────────

type PricePoint = {
  recordedAt: Date;
  normal: number | null;
  holofoil: number | null;
  source: string;
  sourceName: string | null;
  sourceRegion: string | null;
  condition: string | null;
};

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
  historyForChart: { recordedAt: string; normal: number | null; holofoil: number | null }[];
  chartLineLabels: { normal: string; holofoil: string } | undefined;
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
        normal: ebay ?? null,
        holofoil: tcg ?? null,
      }));
    return {
      historyForChart,
      chartLineLabels: { normal: "eBay NM", holofoil: "TCGPlayer NM" },
      chartRanges: PT_RANGES,
    };
  }
  return {
    historyForChart: priceHistory.map((p) => ({
      recordedAt: p.recordedAt.toISOString(),
      normal: p.normal,
      holofoil: p.holofoil,
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
  const artist = loaded.logicalCard.illustrator;
  return loaded.allLocales.map((l) => {
    const rarityLabel = pickRarityLabel(l.region, {
      nameJa: loaded.logicalCard.rarityNameJa,
      nameEn: loaded.logicalCard.rarityNameEn,
      nameKo: loaded.logicalCard.rarityNameKo,
      code: loaded.logicalCard.rarityCode,
    }) ?? null;
    return {
      region: l.region,
      name: l.name,
      nameKo: loaded.logicalCard.nameKo,
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
  const { cardId, locale } = await params;
  const got = await getCard(cardId);
  if (!got) notFound();
  const { card, loaded } = got;

  // 가벼운 조회 추적 (fire-and-forget — 렌더를 막지 않음).
  void recordCardView(cardId);

  // 가격 출처 정보 함께 조회(새 ERD: cardLocaleId + sourceId 우선, 기존 cardId 컬럼도 폴백).
  let priceHistory: PricePoint[] = [];
  let poketraceCard = null;
  let bunjangPrices = null;
  try {
    [priceHistory, poketraceCard, bunjangPrices] = await Promise.all([
      prisma.price
        .findMany({
          where: { cardLocaleId: cardId },
          orderBy: { recordedAt: "asc" },
          select: {
            recordedAt: true,
            normal: true,
            holofoil: true,
            sourceId: true,
            condition: true,
            priceSource: { select: { name: true, marketRegion: true } },
          },
        })
        .then((rows) =>
          rows.map((r) => ({
            recordedAt: r.recordedAt,
            normal: r.normal,
            holofoil: r.holofoil,
            source: r.sourceId ?? "",
            sourceName: r.priceSource?.name ?? null,
            sourceRegion: r.priceSource?.marketRegion ?? null,
            condition: r.condition,
          }))
        )
        .catch(() => [] as PricePoint[]),
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

  const latest = priceHistory.at(-1);

  // 차트 데이터: PokeTrace 히스토리 우선, 없으면 DB
  const { historyForChart, chartLineLabels, chartRanges } = buildChartData(ptHistory, priceHistory);

  // 보유 현황 (실데이터: CollectionItem 기준)
  const stats = await getCardOwnerCounts(cardId);

  // 지역별 발매판(영/일/한) — LogicalCard.locales 기반. 그룹에 있는 지역만 탭으로.
  const versions: CardVersion[] =
    loaded && loaded.allLocales.length > 1 ? buildVersions(loaded, card) : [];

  // 이름 — 한글명 기본, 하단에 영어명 / 일본명 (도감과 동일)
  const krName = loaded?.allLocales.find((l) => l.region === "KR")?.name ?? null;
  const jaName = loaded?.allLocales.find((l) => l.region === "JP")?.name ?? null;
  const enName = loaded?.allLocales.find((l) => l.region === "EN")?.name ?? null;
  const koName = locale === "ko" ? (loaded?.logicalCard.nameKo ?? krName) : null;
  const displayName = koName ?? card.name;
  const subNames = [enName, jaName].filter((n): n is string => !!n && n !== displayName);
  // 등급 — 표준화된 레어도 카테고리(한글) 우선
  const rarityLabel =
    loaded?.logicalCard.rarityCategoryNameKo ??
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
        <div className="flex-1 min-w-0">
          {/* 이름 + 등급 / 원어명(영어 / 일본명) */}
          <div className="mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-toss-title-1 font-bold text-toss-text-primary">{displayName}</h1>
              {rarityLabel && (
                <span className="px-2 py-0.5 rounded-toss-md bg-toss-bg-muted text-toss-caption font-semibold text-toss-text-secondary">
                  {rarityLabel}
                </span>
              )}
            </div>
            {subNames.length > 0 && (
              <p className="text-toss-caption text-toss-text-quaternary mt-0.5">{subNames.join(" / ")}</p>
            )}
          </div>

          {/* 분류·서브타입·레귤레이션·포맷 카드 + 보유 현황 카드 (한 행, 좌우) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* 분류 / 서브타입 / 레귤레이션 / 포맷 */}
            <Card padding="md">
              <div className="flex flex-wrap items-center gap-1.5">
                {card.supertype && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-toss-bg-muted text-toss-text-secondary">
                    {card.supertype === "Pokémon" ? "포켓몬" : card.supertype === "Trainer" ? "트레이너" : card.supertype === "Energy" ? "에너지" : card.supertype}
                  </span>
                )}
                {card.subtypes?.map((st) => (
                  <span key={st} className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                    {SUBTYPE_KO[st] ?? st}
                  </span>
                ))}
                {card.regulationMark && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-toss-md border border-toss-divider text-toss-caption text-toss-text-secondary">
                    레귤레이션
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-toss-text-primary text-toss-bg-base text-[10px] font-bold">
                      {card.regulationMark}
                    </span>
                  </span>
                )}
                {card.legalities &&
                  (["standard", "expanded"] as const).map((fmt) => {
                    const status = card.legalities?.[fmt];
                    if (!status) return null;
                    const legal = status === "Legal";
                    return (
                      <span
                        key={fmt}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-toss-md text-toss-caption font-medium",
                          legal ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}
                      >
                        {FORMAT_LABEL[fmt]} {legal ? "사용 가능" : "사용 금지"}
                      </span>
                    );
                  })}
              </div>
            </Card>

            {/* 보유 현황 + 구매 제안 */}
            <Card padding="md">
              <p className="text-toss-caption text-toss-text-secondary">
                👥 <span className="text-toss-text-primary font-bold">{stats.total}명</span> 등록
                <span className="mx-1.5 text-toss-text-quaternary">·</span>
                💬 <span className="text-toss-brand font-bold">{stats.offerable}명</span> 제안 가능
              </p>
              {stats.offerable > 0 && (
                <Button variant="primary" size="sm" asChild className="mt-2.5 w-full">
                  <a href={`/${locale}/cards/${cardId}/owners`}>구매 제안 →</a>
                </Button>
              )}
            </Card>
          </div>

          {/* 스탯 그리드 — 도감번호 / HP / 타입 / 약점 / 저항력 / 후퇴비 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {card.nationalPokedexNumbers?.length ? (
              <div className="p-3 bg-toss-bg-muted rounded-toss-md">
                <p className="text-toss-micro text-toss-text-tertiary">도감번호</p>
                <p className="text-toss-label font-semibold text-toss-text-primary mt-0.5 toss-numeric">
                  No.{card.nationalPokedexNumbers.map((n) => String(n).padStart(4, "0")).join(", No.")}
                </p>
              </div>
            ) : null}
            {card.hp && (
              <div className="p-3 bg-toss-bg-muted rounded-toss-md">
                <p className="text-toss-micro text-toss-text-tertiary">HP</p>
                <p className="text-toss-title font-bold text-toss-text-primary">{card.hp}</p>
              </div>
            )}
            {card.types?.length ? (
              <div className="p-3 bg-toss-bg-muted rounded-toss-md">
                <p className="text-toss-micro text-toss-text-tertiary">타입</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {card.types.map((t) => (
                    <span key={t} className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold", TYPE_BG[t] ?? "bg-gray-100 text-gray-600")}>
                      {TYPE_KO[t] ?? t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {card.weaknesses?.length ? (
              <div className="p-3 bg-toss-bg-muted rounded-toss-md">
                <p className="text-toss-micro text-toss-text-tertiary">약점</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {card.weaknesses.map((w, i) => (
                    <span key={i} className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold", TYPE_BG[w.type] ?? "bg-gray-100 text-gray-600")}>
                      {TYPE_KO[w.type] ?? w.type} {w.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {card.resistances?.length ? (
              <div className="p-3 bg-toss-bg-muted rounded-toss-md">
                <p className="text-toss-micro text-toss-text-tertiary">저항력</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {card.resistances.map((r, i) => (
                    <span key={i} className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold", TYPE_BG[r.type] ?? "bg-gray-100 text-gray-600")}>
                      {TYPE_KO[r.type] ?? r.type} {r.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {card.convertedRetreatCost != null && (
              <div className="p-3 bg-toss-bg-muted rounded-toss-md">
                <p className="text-toss-micro text-toss-text-tertiary">후퇴비</p>
                <p className="text-toss-label font-semibold text-toss-text-primary mt-0.5">
                  {card.convertedRetreatCost === 0 ? "0 (무료)" : `${card.convertedRetreatCost}개`}
                </p>
              </div>
            )}
          </div>

          {/* 진화 라인 (후퇴비 아래) */}
          {(card.evolvesFrom || card.evolvesTo?.length) && (
            <div className="flex items-center gap-1.5 flex-wrap text-toss-caption mb-5">
              <span className="text-toss-text-tertiary">진화</span>
              {card.evolvesFrom && (
                <>
                  <span className="px-2 py-1 rounded-toss-md bg-toss-bg-muted text-toss-text-secondary">
                    {card.evolvesFrom}
                  </span>
                  <span className="text-toss-text-quaternary">→</span>
                </>
              )}
              <span className="px-2 py-1 rounded-toss-md bg-toss-brand-weak text-toss-brand font-semibold">
                {card.name}
              </span>
              {card.evolvesTo?.map((to) => (
                <span key={to} className="flex items-center gap-1.5">
                  <span className="text-toss-text-quaternary">→</span>
                  <span className="px-2 py-1 rounded-toss-md bg-toss-bg-muted text-toss-text-secondary">
                    {to}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* 특성 */}
          {card.abilities?.map((ab, i) => (
            <div key={i} className="p-3 border border-toss-divider rounded-toss-md bg-toss-bg-base mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-toss-brand-weak text-toss-brand">
                  {ab.type === "Ability" ? "특성" : ab.type}
                </span>
                <span className="text-toss-label font-semibold text-toss-text-primary">{ab.name}</span>
              </div>
              <p className="text-toss-caption text-toss-text-secondary">{ab.text}</p>
            </div>
          ))}

          {/* 기술 */}
          {card.attacks?.map((atk, i) => (
            <div key={i} className="p-3 border border-toss-divider rounded-toss-md bg-toss-bg-base mb-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <CostPips cost={atk.cost} />
                  <span className="text-toss-label font-semibold text-toss-text-primary">{atk.name}</span>
                </div>
                {atk.damage && (
                  <span className="text-toss-title font-bold text-toss-text-primary">{atk.damage}</span>
                )}
              </div>
              {atk.text && <p className="text-toss-caption text-toss-text-secondary">{atk.text}</p>}
            </div>
          ))}

          {/* 룰 박스 (ex / 메가 등) */}
          {card.rules?.map((rule, i) => (
            <div key={i} className="p-3 rounded-toss-md bg-toss-bg-muted border-l-2 border-toss-text-tertiary mb-2">
              <p className="text-toss-caption text-toss-text-secondary">{rule}</p>
            </div>
          ))}

          {/* 도감 설명 */}
          {card.flavorText && (
            <p className="text-toss-caption text-toss-text-tertiary italic border-l-2 border-toss-divider pl-3 mt-3">
              {card.flavorText}
            </p>
          )}
        </div>
      </div>

      {/* ── 이 카드를 쓰는 덱 (UI-2차 역링크) ─────────────────────── */}
      {loaded?.logicalCard?.id && (
        <DecksUsingCardSection logicalCardId={loaded.logicalCard.id} locale={locale} />
      )}

      {/* ── 시세 (전체 폭, 하단) ──────────────────────────────────── */}
      <section className="mt-10 space-y-5">
        <h2 className="text-toss-title font-bold text-toss-text-primary">시세</h2>
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
      </section>
    </Container>
  );
}
