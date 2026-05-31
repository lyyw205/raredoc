import {
  getGainers,
  getVolumeLeaders,
  getTrending,
  getDips,
  getNewHighs,
  type MarketRankItem,
} from "@/lib/services/market";
import MarketRankingsClient, {
  type MarketCardRow,
  type MarketRankingsData,
} from "./MarketRankingsClient";

export const revalidate = 3600;

const TAKE = 20;

/** 표시명: 한글명 우선. */
function displayName(item: MarketRankItem): string {
  return item.nameKo ?? item.name;
}

function displaySet(item: MarketRankItem): string {
  return item.setNameKo ?? item.setName;
}

function toRow(item: MarketRankItem, extra?: Partial<MarketCardRow>): MarketCardRow {
  return {
    cardId: item.cardId,
    name: displayName(item),
    set: displaySet(item),
    imageUrl: item.imageSmall,
    priceKrw: item.priceKrw,
    change1w: item.change1w,
    change1m: item.change1m,
    change3m: item.change3m,
    txCount: item.txCount,
    volumeKrw: item.volumeKrw,
    athKrw: item.athKrw,
    wishlist: 0,
    ...extra,
  };
}

/** 트렌딩 뱃지: 거래활성도·단기 상승 신호로 라벨 결정 (mock 라벨 체계 유지). */
function trendBadge(item: MarketRankItem): string {
  const c = item.change1w;
  if (c != null && c >= 15) return "급등";
  if (item.txCount >= 100) return "인기";
  if (c != null && c > 0) return "상승";
  return "신흥";
}

export default async function MarketRankingsPage() {
  const [gainers1w, gainers1m, gainers3m, volume, trending, dips, highs] = await Promise.all([
    getGainers(TAKE, "1w"),
    getGainers(TAKE, "1m"),
    getGainers(TAKE, "3m"),
    getVolumeLeaders(TAKE),
    getTrending(TAKE),
    getDips(TAKE),
    getNewHighs(TAKE),
  ]);

  const data: MarketRankingsData = {
    gainers1w: gainers1w.map((i) => toRow(i)),
    gainers1m: gainers1m.map((i) => toRow(i)),
    gainers3m: gainers3m.map((i) => toRow(i)),
    volume: volume.map((i) => toRow(i)),
    trending: trending.map((i) => toRow(i, { trendBadge: trendBadge(i) })),
    dips: dips.map((i) =>
      toRow(i, {
        dropPct:
          i.priceKrw != null && i.athKrw != null && i.athKrw > 0
            ? ((i.priceKrw - i.athKrw) / i.athKrw) * 100
            : 0,
      })
    ),
    highs: highs.map((i) => toRow(i)),
  };

  return <MarketRankingsClient data={data} />;
}
