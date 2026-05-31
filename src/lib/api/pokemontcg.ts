const BASE_URL = "https://api.pokemontcg.io/v2";

export interface TCGSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: { symbol: string; logo: string };
}

export interface TCGCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  artist?: string;
  set: { id: string; name: string };
  images: { small: string; large: string };
  // ── 카드 기본 정보 (pokemontcg.io v2 — API 응답에 포함, 타입만 추가) ──
  hp?: string;
  evolvesFrom?: string;
  evolvesTo?: string[];
  abilities?: { name: string; text: string; type: string }[];
  attacks?: {
    name: string;
    cost?: string[];
    convertedEnergyCost?: number;
    damage?: string;
    text?: string;
  }[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: { standard?: string; expanded?: string; unlimited?: string };
  regulationMark?: string;
  rules?: string[];
  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    // variant 키(normal/holofoil/reverseHolofoil/1stEdition…)별 가격. low/mid/high/market 모두 응답에 포함.
    prices?: Record<
      string,
      { low?: number; mid?: number; high?: number; market?: number; directLow?: number } | undefined
    >;
  };
  cardmarket?: {
    url?: string;
    updatedAt?: string;
    prices?: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
    };
  };
}

interface ListResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

async function fetchTCG<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const headers: Record<string, string> = {};
  if (process.env.POKEMONTCG_API_KEY) {
    headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
  }
  const res = await fetch(url.toString(), { headers, next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`pokemontcg API error: ${res.status}`);
  return res.json();
}

export async function getAllSets(): Promise<TCGSet[]> {
  const all: TCGSet[] = [];
  let page = 1;
  while (true) {
    const res = await fetchTCG<ListResponse<TCGSet>>("/sets", {
      pageSize: "250",
      page: String(page),
      orderBy: "-releaseDate",
    });
    all.push(...res.data);
    if (all.length >= res.totalCount) break;
    page++;
  }
  return all;
}

export async function getSet(id: string): Promise<TCGSet | null> {
  try {
    const res = await fetchTCG<{ data: TCGSet }>(`/sets/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getCardsBySet(setId: string): Promise<TCGCard[]> {
  const all: TCGCard[] = [];
  let page = 1;
  while (true) {
    const res = await fetchTCG<ListResponse<TCGCard>>("/cards", {
      q: `set.id:${setId}`,
      pageSize: "250",
      page: String(page),
    });
    all.push(...res.data);
    if (all.length >= res.totalCount) break;
    page++;
  }
  return all;
}

export async function searchCards(query: string, page = 1): Promise<ListResponse<TCGCard>> {
  return fetchTCG<ListResponse<TCGCard>>("/cards", {
    q: query,
    pageSize: "20",
    page: String(page),
  });
}
