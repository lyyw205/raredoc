const BASE_URL = "https://api.poketrace.com/v1";

export interface PokeTracePriceTier {
  avg: number;
  low: number | null;
  high: number | null;
  saleCount: number;
  avg1d?: number;
  avg7d?: number;
  avg30d?: number;
  median3d?: number;
  median7d?: number;
  median30d?: number;
}

export interface PokeTraceCard {
  id: string;
  name: string;
  cardNumber: string;
  set: { slug: string; name: string };
  variant?: string;
  rarity?: string;
  market: "US" | "EU";
  currency: "USD" | "EUR";
  refs: { tcgplayerId: string | null; cardmarketId: string | null };
  prices: {
    ebay?: {
      NEAR_MINT?: PokeTracePriceTier;
      LIGHTLY_PLAYED?: PokeTracePriceTier;
    };
    tcgplayer?: {
      NEAR_MINT?: PokeTracePriceTier;
      LIGHTLY_PLAYED?: PokeTracePriceTier;
    };
  };
  topPrice?: number;
  totalSaleCount?: number;
  lastUpdated: string;
}

export interface PokeTraceHistoryEntry {
  date: string;
  source: "ebay" | "tcgplayer" | "cardmarket" | "cardmarket_unsold";
  avg: number;
  low: number | null;
  high: number | null;
  saleCount: number;
  avg1d?: number;
  avg7d?: number;
  avg30d?: number;
}

async function fetchPokeTrace<T>(
  path: string,
  params?: Record<string, string>
): Promise<T | null> {
  const apiKey = process.env.POKETRACE_API_KEY;
  if (!apiKey) return null;

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": apiKey },
      next: { revalidate: 3600 },
    });
    if (res.status === 429 || !res.ok) return null;
    const json = await res.json();
    if (process.env.NODE_ENV === "development") {
      console.log("[PokeTrace]", path, JSON.stringify(json).slice(0, 500));
    }
    return json;
  } catch {
    return null;
  }
}

export async function findPokeTraceCard(
  cardName: string,
  setName: string,
  cardNumber?: string
): Promise<PokeTraceCard | null> {
  const data = await fetchPokeTrace<{ data: PokeTraceCard[] }>("/cards", {
    search: cardName,
    market: "US",
    limit: "20",
  });
  if (!data?.data?.length) return null;

  const setLower = setName.toLowerCase();

  // 양방향 포함 검사: "151" ⊂ "pokemon card 151", "pokemon card 151" ⊂ "151" 둘 다 처리
  const setMatch = (c: PokeTraceCard) => {
    const cs = c.set.name.toLowerCase();
    return cs === setLower || cs.includes(setLower) || setLower.includes(cs);
  };

  // 1순위: 세트 + 카드 번호 모두 일치
  if (cardNumber) {
    const byNumber = data.data.find(
      (c) =>
        setMatch(c) &&
        (c.cardNumber === cardNumber || c.cardNumber.startsWith(`${cardNumber}/`))
    );
    if (byNumber) return byNumber;
  }

  // 2순위: 세트명만 일치
  return data.data.find(setMatch) ?? null;
}

export async function getPokeTraceCardById(
  poketraceId: string
): Promise<PokeTraceCard | null> {
  const data = await fetchPokeTrace<{ data: PokeTraceCard }>(
    `/cards/${poketraceId}`
  );
  return data?.data ?? null;
}

export async function getPokeTracePriceHistory(
  poketraceId: string,
  tier = "NEAR_MINT",
  period = "30d"
): Promise<PokeTraceHistoryEntry[]> {
  const data = await fetchPokeTrace<{ data: PokeTraceHistoryEntry[] }>(
    `/cards/${poketraceId}/prices/${tier}/history`,
    { period }
  );
  return data?.data ?? [];
}

// PokeTrace API는 가격을 USD float으로 반환 (센트 아님)
export function toUsd(value: number): number {
  return value;
}
