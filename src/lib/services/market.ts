import { prisma } from "@/lib/prisma";
import { USD_KRW, toKrw } from "@/lib/trades/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 마켓 분석 집계 서비스 (Phase 6)
//
// 원천:
//   - Price  : 출처별(ebay/tcgplayer) 시세 스냅샷 (USD). 현재가/ATH 폴백.
//   - Trade  : PokeTrace 일자별 거래 집계 (priceHighUsd/Avg/Low, saleCount). 거래량/볼륨/변화율.
//
// 결과: MarketStat upsert (cardId + date(00:00) unique).
//   priceKrw  최신 시세(KRW) — Trade avg 우선, 없으면 Price.
//   change1w/1m/3m  Trade avg 시세의 N기간 전 대비 변화율(%) — 데이터 없으면 null.
//   txCount/volumeKrw  최근 30일 거래 건수 / 거래대금(KRW).
//   athKrw    역대 최고가(KRW) — Trade priceHigh 또는 Price 최댓값.
//   viewDelta 조회 추적 모델 없음 → null.
//   wishlist  위시 모델 없음 → 0.
//
// 데이터 희소(가격 1스냅샷·거래 적음)에 강건: 산출 불가 항목은 null/0 으로 둔다.
// ─────────────────────────────────────────────────────────────────────────────

const VOLUME_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Price 행에서 대표 가격을 KRW로 환산해 고른다.
 * - 단일값 amount(출처별 통화: yuyu JPY / cardmarket EUR / tcgplayer USD / 등급가).
 * - 값은 행의 currency 로 KRW 환산(통화 혼합 안전).
 */
function pickPriceKrw(p: {
  amount: number | null;
  currency: string | null;
}): number | null {
  const v = p.amount ?? null;
  if (v == null) return null;
  return Math.round(toKrw(v, p.currency));
}

type TradeRow = {
  regionCardId?: string;
  soldAt: Date;
  priceHighUsd: number;
  priceAvgUsd: number | null;
  priceLowUsd: number | null;
  saleCount: number;
};

type PriceRow = {
  regionCardId?: string;
  recordedAt: Date;
  amount: number | null;
  currency: string | null;
};

/** 기준일 기준 N일 전(±3일 허용)에 가장 가까운 거래 avg(USD) 를 찾는다. */
function avgUsdNearDaysAgo(trades: TradeRow[], asOf: Date, daysAgo: number): number | null {
  const target = asOf.getTime() - daysAgo * DAY_MS;
  const toleranceMs = 3 * DAY_MS;
  let best: { dist: number; usd: number } | null = null;
  for (const t of trades) {
    const usd = t.priceAvgUsd ?? t.priceHighUsd;
    if (usd == null || !Number.isFinite(usd)) continue;
    const dist = Math.abs(t.soldAt.getTime() - target);
    if (dist > toleranceMs) continue;
    if (best == null || dist < best.dist) best = { dist, usd };
  }
  return best?.usd ?? null;
}

function pctChange(current: number | null, past: number | null): number | null {
  if (current == null || past == null || past === 0) return null;
  return ((current - past) / past) * 100;
}

/**
 * 한 카드의 MarketStat 1행을 산출한다 (DB 반영 전 순수 계산).
 * 거래/가격 둘 다 비어 있으면 null (집계 대상 아님).
 */
function computeStat(
  cardId: string,
  date: Date,
  prices: PriceRow[],
  trades: TradeRow[]
): {
  cardId: string;
  date: Date;
  priceKrw: number | null;
  change1w: number | null;
  change1m: number | null;
  change3m: number | null;
  txCount: number;
  volumeKrw: number;
  athKrw: number | null;
  viewDelta: number | null;
  wishlist: number;
} | null {
  // 최신 거래 avg(USD) — soldAt 내림차순 첫 행
  const tradesAsc = [...trades].sort((a, b) => a.soldAt.getTime() - b.soldAt.getTime());
  const latestTrade = tradesAsc.at(-1);
  const latestTradeUsd = latestTrade
    ? latestTrade.priceAvgUsd ?? latestTrade.priceHighUsd
    : null;

  // 최신 Price(통화별 → KRW)
  const pricesDesc = [...prices].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  const latestPriceKrw = pricesDesc.length > 0 ? pickPriceKrw(pricesDesc[0]) : null;

  // 현재가(KRW): 거래 avg(USD→KRW) 우선 → Price(통화별 환산) 폴백
  const latestTradeKrw = latestTradeUsd != null ? Math.round(latestTradeUsd * USD_KRW) : null;
  const priceKrw = latestTradeKrw ?? latestPriceKrw;
  if (priceKrw == null && trades.length === 0) return null;

  // 변화율: 거래 시계열 기반 (희소 시 null)
  const change1w = pctChange(latestTradeUsd, avgUsdNearDaysAgo(tradesAsc, date, 7));
  const change1m = pctChange(latestTradeUsd, avgUsdNearDaysAgo(tradesAsc, date, 30));
  const change3m = pctChange(latestTradeUsd, avgUsdNearDaysAgo(tradesAsc, date, 90));

  // 최근 30일 거래량/거래대금
  const windowStart = date.getTime() - VOLUME_WINDOW_DAYS * DAY_MS;
  let txCount = 0;
  let volumeKrw = 0;
  for (const t of trades) {
    if (t.soldAt.getTime() < windowStart) continue;
    const n = t.saleCount > 0 ? t.saleCount : 1;
    const unitUsd = t.priceAvgUsd ?? t.priceHighUsd;
    txCount += n;
    if (unitUsd != null && Number.isFinite(unitUsd)) {
      volumeKrw += Math.round(unitUsd * USD_KRW * n);
    }
  }

  // ATH(KRW): 거래 최고가(USD→KRW) + 가격 스냅샷 최댓값(통화별→KRW) 중 최대
  let athKrw: number | null = null;
  for (const t of trades) {
    if (Number.isFinite(t.priceHighUsd)) {
      const krw = Math.round(t.priceHighUsd * USD_KRW);
      athKrw = Math.max(athKrw ?? 0, krw);
    }
  }
  for (const p of prices) {
    const krw = pickPriceKrw(p);
    if (krw != null) athKrw = Math.max(athKrw ?? 0, krw);
  }
  if (priceKrw != null) athKrw = Math.max(athKrw ?? 0, priceKrw);

  return {
    cardId,
    date,
    priceKrw,
    change1w,
    change1m,
    change3m,
    txCount,
    volumeKrw,
    athKrw,
    viewDelta: null, // 조회 추적 모델 없음
    wishlist: 0, // 위시 모델 없음
  };
}

/**
 * MarketStat 전면 재집계 (멱등).
 *
 * 거래(Trade) 가 있는 카드를 대상으로 집계한다. 현재 Price 는 단일 스냅샷이라
 * 시계열(변화율/낙폭/신고가) 신호를 만들 수 없어 가격만 있는 카드는 의미 있는
 * 랭킹을 생성하지 못하므로 제외한다. (Price 는 대상 카드의 현재가/ATH 폴백에만 사용.)
 * → 시세 시계열이 적재되면 대상이 자동 확대된다.
 *
 * 모든 거래/가격을 메모리에 한 번에 로드해 카드별로 그룹핑하므로 DB 라운드트립이
 * 적다(Supabase 풀 보호). upsert 만 카드 단위 순차.
 *
 * @returns 대상 카드 수 / upsert 한 MarketStat 건수
 */
export async function rebuildMarketStats(date?: Date): Promise<{ cards: number; stats: number }> {
  const statDate = startOfDay(date ?? new Date());

  // 거래 전량 로드 후 카드별 그룹핑 (대상 카드 결정)
  const allTrades = await prisma.trade.findMany({
    select: {
      regionCardId: true,
      soldAt: true,
      priceHighUsd: true,
      priceAvgUsd: true,
      priceLowUsd: true,
      saleCount: true,
    },
  });
  const tradesByCard = new Map<string, TradeRow[]>();
  for (const t of allTrades) {
    const arr = tradesByCard.get(t.regionCardId) ?? [];
    arr.push(t);
    tradesByCard.set(t.regionCardId, arr);
  }

  // 가격 스냅샷 전량 로드 후 카드별 그룹핑.
  // 대상 = Trade 또는 Price 가 있는 카드 (시세만 있어도 현재가/ATH 산출 → 화면 노출).
  //   · 현재가(priceKrw)·ATH: Price 만으로도 산출.
  //   · 변동률(change1w/1m/3m): Trade 시계열 필요 → Price 만이면 null (며칠 쌓이면 자동 생성).
  const pricesByCard = new Map<string, PriceRow[]>();
  const allPrices = await prisma.price.findMany({
    select: {
      regionCardId: true,
      recordedAt: true,
      amount: true,
      currency: true,
    },
  });
  for (const p of allPrices) {
    const arr = pricesByCard.get(p.regionCardId) ?? [];
    arr.push(p);
    pricesByCard.set(p.regionCardId, arr);
  }

  // 대상 카드 = Trade ∪ Price (둘 중 하나라도 있으면 집계)
  const cardIds = Array.from(new Set([...tradesByCard.keys(), ...pricesByCard.keys()]));
  if (cardIds.length === 0) return { cards: 0, stats: 0 };

  let stats = 0;
  for (const cardId of cardIds) {
    const stat = computeStat(
      cardId,
      statDate,
      pricesByCard.get(cardId) ?? [],
      tradesByCard.get(cardId) ?? []
    );
    if (!stat) continue;

    await prisma.marketStat.upsert({
      where: { cardId_date: { cardId, date: statDate } },
      create: stat,
      update: {
        priceKrw: stat.priceKrw,
        change1w: stat.change1w,
        change1m: stat.change1m,
        change3m: stat.change3m,
        txCount: stat.txCount,
        volumeKrw: stat.volumeKrw,
        athKrw: stat.athKrw,
        // viewDelta 는 조회 추적이 누적한 값을 보존 (덮어쓰지 않음).
        wishlist: stat.wishlist,
      },
    });
    stats++;
  }

  return { cards: cardIds.length, stats };
}

/**
 * 카드 상세 진입 시 가벼운 조회 추적. 모델 추가 없이 오늘자 MarketStat.viewDelta 를
 * 1 증가시킨다. 행이 없으면 최소 행을 생성(다른 통계는 다음 리빌드에서 채워짐).
 * 실패해도 페이지 렌더를 막지 않도록 호출부에서 await 없이 fire-and-forget 한다.
 */
export async function recordCardView(cardId: string, date?: Date): Promise<void> {
  const statDate = startOfDay(date ?? new Date());
  try {
    const existing = await prisma.marketStat.findUnique({
      where: { cardId_date: { cardId, date: statDate } },
      select: { id: true, viewDelta: true },
    });
    if (existing) {
      await prisma.marketStat.update({
        where: { id: existing.id },
        data: { viewDelta: (existing.viewDelta ?? 0) + 1 },
      });
    } else {
      await prisma.marketStat.create({
        data: { cardId, date: statDate, viewDelta: 1 },
      });
    }
  } catch {
    // 추적 실패는 무시 (graceful)
  }
}

/**
 * 카드 상세의 가격 히스토리 1포인트. 차트(recordedAt/amount)만 소비한다.
 */
export type PricePoint = {
  recordedAt: Date;
  amount: number | null;
};

/**
 * 단일 RegionCard 의 가격 스냅샷 시계열(오름차순). 실패 시 빈 배열(렌더 비차단).
 * 차트가 recordedAt/amount 만 쓰므로 그 2필드만 select 한다.
 */
export async function getCardPriceHistory(regionCardId: string): Promise<PricePoint[]> {
  return prisma.price
    .findMany({
      where: { regionCardId },
      orderBy: { recordedAt: "asc" },
      select: {
        recordedAt: true,
        amount: true,
      },
    })
    .catch(() => [] as PricePoint[]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 조회 (UI 소비형) — 가장 최근 date 의 MarketStat 을 기준으로 랭킹 산출
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketRankItem {
  cardId: string;
  name: string;
  nameKo: string | null;
  imageSmall: string | null;
  setName: string;
  setNameKo: string | null;
  priceKrw: number | null;
  change1w: number | null;
  change1m: number | null;
  change3m: number | null;
  txCount: number;
  volumeKrw: number;
  athKrw: number | null;
}

type MarketStatRow = {
  cardId: string;
  priceKrw: number | null;
  change1w: number | null;
  change1m: number | null;
  change3m: number | null;
  txCount: number;
  volumeKrw: number;
  athKrw: number | null;
};

const STAT_SELECT = {
  cardId: true,
  priceKrw: true,
  change1w: true,
  change1m: true,
  change3m: true,
  txCount: true,
  volumeKrw: true,
  athKrw: true,
} as const;

/**
 * MarketStat 행 목록을 카드 표시정보와 join 해 MarketRankItem[] 로 변환한다.
 * MarketStat 에 Card 관계가 없으므로 cardId 로 별도 1회 조회 후 매핑한다.
 * 입력 순서를 보존하고, 카드 정보가 없는(삭제된) 행은 제외한다.
 */
async function joinCards(stats: MarketStatRow[]): Promise<MarketRankItem[]> {
  if (stats.length === 0) return [];
  const cardIds = stats.map((s) => s.cardId);
  // Phase 4: prisma.card → prisma.regionCard. MarketStat.cardId == RegionCard.id.
  // RegionCard 행은 자체 locale 의 표시명을 보유하므로 nameKo 는 별도 컬럼 없이 동일값으로 채워 호환 유지.
  const cards = await prisma.regionCard.findMany({
    where: { id: { in: cardIds } },
    select: {
      id: true,
      name: true,
      imageSmall: true,
      set: { select: { name: true, nameKo: true } },
    },
  });
  const byId = new Map(cards.map((c) => [c.id, c]));
  const items: MarketRankItem[] = [];
  for (const s of stats) {
    const card = byId.get(s.cardId);
    if (!card) continue;
    items.push({
      cardId: s.cardId,
      name: card.name,
      nameKo: card.name,
      imageSmall: card.imageSmall,
      setName: card.set.name,
      setNameKo: card.set.nameKo,
      priceKrw: s.priceKrw,
      change1w: s.change1w,
      change1m: s.change1m,
      change3m: s.change3m,
      txCount: s.txCount,
      volumeKrw: s.volumeKrw,
      athKrw: s.athKrw,
    });
  }
  return items;
}

/** 집계된 MarketStat 중 가장 최근 date 를 찾는다 (없으면 null). */
async function latestStatDate(): Promise<Date | null> {
  const latest = await prisma.marketStat.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return latest?.date ?? null;
}

/** 상승률 상위 — period 별 변화율 내림차순. 변화율이 없는 항목은 제외. */
export async function getGainers(
  n: number,
  period: "1w" | "1m" | "3m" = "1m"
): Promise<MarketRankItem[]> {
  const date = await latestStatDate();
  if (!date) return [];
  const field = period === "1w" ? "change1w" : period === "1m" ? "change1m" : "change3m";
  const rows = await prisma.marketStat.findMany({
    where: { date, [field]: { not: null } },
    orderBy: { [field]: "desc" },
    take: n,
    select: STAT_SELECT,
  });
  return joinCards(rows);
}

/** 거래량 상위 — txCount 내림차순. */
export async function getVolumeLeaders(n: number): Promise<MarketRankItem[]> {
  const date = await latestStatDate();
  if (!date) return [];
  const rows = await prisma.marketStat.findMany({
    where: { date, txCount: { gt: 0 } },
    orderBy: [{ txCount: "desc" }, { volumeKrw: "desc" }],
    take: n,
    select: STAT_SELECT,
  });
  return joinCards(rows);
}

/**
 * 트렌딩 — 위시/조회 모델이 없으므로 거래활성도(txCount)와 단기 상승(change1w)
 * 기반 근사. 거래가 있고 1주 상승했거나 거래량이 많은 카드를 점수화해 상위 노출.
 */
export async function getTrending(n: number): Promise<MarketRankItem[]> {
  const date = await latestStatDate();
  if (!date) return [];
  // 거래 또는 상승 신호가 있는 후보를 넉넉히 가져와 점수순 정렬
  const rows = await prisma.marketStat.findMany({
    where: {
      date,
      OR: [{ txCount: { gt: 0 } }, { change1w: { not: null } }],
    },
    select: STAT_SELECT,
    take: Math.max(n * 4, 40),
    orderBy: { txCount: "desc" },
  });
  const sorted = [...rows]
    .map((s) => ({ s, score: s.txCount + (s.change1w ?? 0) * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.s);
  return joinCards(sorted);
}

/** 고점 대비 낙폭 — athKrw 대비 현재가 낙폭이 큰 순. priceKrw/athKrw 둘 다 필요. */
export async function getDips(n: number): Promise<MarketRankItem[]> {
  const date = await latestStatDate();
  if (!date) return [];
  const rows = await prisma.marketStat.findMany({
    where: { date, priceKrw: { not: null }, athKrw: { not: null } },
    select: STAT_SELECT,
    take: Math.max(n * 6, 60),
  });
  const dipped = [...rows]
    .map((s) => {
      const price = s.priceKrw!;
      const ath = s.athKrw!;
      const dropPct = ath > 0 ? ((price - ath) / ath) * 100 : 0;
      return { s, dropPct };
    })
    .filter((x) => x.dropPct < 0) // 실제 낙폭만
    .sort((a, b) => a.dropPct - b.dropPct) // 가장 큰 낙폭(음수 작은 값) 먼저
    .slice(0, n)
    .map((x) => x.s);
  return joinCards(dipped);
}

/** 52주 신고가 — 현재가가 ATH 와 같거나 거의 같은(신고가 갱신) 카드. */
export async function getNewHighs(n: number): Promise<MarketRankItem[]> {
  const date = await latestStatDate();
  if (!date) return [];
  const rows = await prisma.marketStat.findMany({
    where: { date, priceKrw: { not: null }, athKrw: { not: null } },
    select: STAT_SELECT,
    take: Math.max(n * 8, 80),
    orderBy: { priceKrw: "desc" },
  });
  // 현재가가 ATH 의 99% 이상이면 신고가권으로 간주
  const highs = rows
    .filter((s) => s.athKrw! > 0 && s.priceKrw! >= s.athKrw! * 0.99)
    .slice(0, n);
  return joinCards(highs);
}
