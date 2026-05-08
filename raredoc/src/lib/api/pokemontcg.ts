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
  tcgplayer?: {
    prices?: {
      normal?: { market?: number };
      holofoil?: { market?: number };
      reverseHolofoil?: { market?: number };
      "1stEdition"?: { market?: number };
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
