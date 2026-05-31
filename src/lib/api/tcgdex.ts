/**
 * TCGdex API 클라이언트 (무료·키 불필요)
 * https://api.tcgdex.net/v2/{lang}/...
 * lang: "en" | "ja"  (ko는 카드 데이터가 비어 사용 안 함)
 *
 * Note: Node.js 내장 fetch(undici)가 WSL2 환경에서 IPv6 ETIMEDOUT을 일으키므로
 * 스크립트 실행 시에는 Node https 모듈(IPv4 강제)로 fallback한다.
 * Next.js 서버 컴포넌트에서는 표준 fetch를 그대로 사용.
 */

const BASE_URL = "https://api.tcgdex.net/v2";

// ── 타입 정의 ──────────────────────────────────────────────────────────────────

export interface TcgdexSetCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

export interface TcgdexSet {
  id: string;
  name: string;
  cardCount: {
    official: number;
    total: number;
  };
  cards: TcgdexSetCard[];
}

export interface TcgdexSetSummary {
  id: string;
  name: string;
  cardCount?: {
    official?: number;
    total?: number;
  };
}

export interface TcgdexAttack {
  name: string;
  cost?: string[];
  damage?: string | number;
  effect?: string;
}

export interface TcgdexWeakness {
  type: string;
  value: string;
}

export interface TcgdexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  stage?: string;
  attacks?: TcgdexAttack[];
  weaknesses?: TcgdexWeakness[];
  retreat?: number;
  regulationMark?: string;
  set?: {
    id: string;
    name: string;
    cardCount?: { official: number; total: number };
  };
}

// ── fetch 헬퍼 ────────────────────────────────────────────────────────────────

/**
 * Node.js 스크립트 환경(WSL2 포함)에서 undici fetch가 IPv6 ETIMEDOUT을 일으키므로
 * https 모듈로 IPv4 강제 요청하는 fallback을 사용한다.
 * Next.js 서버 컴포넌트에서는 표준 fetch(revalidate 캐싱 지원)를 사용한다.
 */
async function httpGet(url: string): Promise<string> {
  // Next.js 런타임에서는 표준 fetch 사용 (캐시 지원)
  if (typeof process === "undefined" || process.env.NEXT_RUNTIME) {
    const res = await fetch(url, { next: { revalidate: 86400 } } as RequestInit);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
  // Node.js 스크립트 환경: https 모듈로 IPv4 강제
  const https = await import("https");
  return new Promise<string>((resolve, reject) => {
    const req = https.default.get(url, { family: 4 } as Parameters<typeof https.default.get>[1], (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => { body += chunk; });
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(new Error("timeout")); });
  });
}

async function fetchTcgdex<T>(path: string): Promise<T | null> {
  const url = `${BASE_URL}${path}`;
  try {
    const body = await httpGet(url);
    return JSON.parse(body) as T;
  } catch (e) {
    console.warn(`[tcgdex] fetch error: ${url}`, e);
    return null;
  }
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/** 언어별 전체 세트 목록 */
export async function getTcgSets(lang: string): Promise<TcgdexSetSummary[]> {
  const data = await fetchTcgdex<TcgdexSetSummary[]>(`/${lang}/sets`);
  return data ?? [];
}

/**
 * 세트 상세 (카드 배열 포함)
 * @param lang "en" | "ja"
 * @param setId 예: "SV2a"
 */
export async function getTcgSet(lang: string, setId: string): Promise<TcgdexSet | null> {
  return fetchTcgdex<TcgdexSet>(`/${lang}/sets/${setId}`);
}

/**
 * 카드 상세
 * @param lang "en" | "ja"
 * @param cardId 예: "SV2a-006"
 */
export async function getTcgCard(lang: string, cardId: string): Promise<TcgdexCard | null> {
  return fetchTcgdex<TcgdexCard>(`/${lang}/cards/${cardId}`);
}
