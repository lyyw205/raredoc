/**
 * Limitless TCG API 클라이언트 (curl + execFile).
 *
 * WSL2 환경에서 node fetch 가 ETIMEDOUT 빈발 → curl 강제.
 * Rate limit: 50 req / 5분. 응답 헤더 `ratelimit: "50-in-5min"; r=잔량` 으로 잔량 추적.
 *
 * 사용: sync-tournaments-limitless.ts / aggregate-meta.ts 공용.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

const BASE = "https://play.limitlesstcg.com/api";

/** 직전 응답에서 파싱한 rate-limit 잔량(r). null 이면 아직 모름. */
let lastRemaining: number | null = null;

export type RateState = { remaining: number | null };

export const rateState: RateState = { remaining: null };

/** standings/decklist 카드 1장 */
export type LimitlessCard = {
  count: number;
  set?: string;
  number?: string;
  name: string;
};

export type LimitlessDecklist = {
  pokemon?: LimitlessCard[];
  trainer?: LimitlessCard[];
  energy?: LimitlessCard[];
};

export type LimitlessTournament = {
  id: string;
  name: string;
  date: string;
  format: string; // STANDARD/EXPANDED/EX/CUSTOM...
  players: number;
  organizerId?: number;
};

export type LimitlessDetails = {
  id: string;
  name: string;
  format: string;
  date: string;
  players: number;
  organizer?: { id: number; name: string };
  platform?: string; // PTCGL 등
  isOnline?: boolean;
  decklists?: boolean;
  phases?: { phase: number; type: string; rounds: number; mode: string }[];
};

export type LimitlessStanding = {
  placing: number;
  name: string; // 표시명
  player: string; // 소문자 username (pairings 와 조인 키)
  country?: string;
  record?: { wins: number; losses: number; ties: number };
  deck?: { id: string; name: string; icons?: string[] };
  decklist?: LimitlessDecklist;
  drop?: unknown;
};

/**
 * pairings 1행.
 * winner 의미(2026-06-01 실측):
 *   - string  → 그 username 이 승리 (player1/player2 중 하나)
 *   - 0       → 무승부(양쪽 존재, 승자 없음)
 *   - -1      → 부전승(bye)/미정 (player2 가 없을 수 있음)
 */
export type LimitlessPairing = {
  round: number;
  phase: number;
  table: number | null;
  winner: string | number;
  player1?: string;
  player2?: string;
};

/** curl 로 GET → JSON. rate-limit 헤더에서 잔량(r) 추적. */
async function getJson<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  // -D - : 헤더를 stdout 으로, -o /dev/stdout 대신 헤더+바디 분리 위해 -i 사용
  const { stdout } = await execFileP(
    "curl",
    ["-sSL", "-i", "--max-time", "30", url],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  // 헤더/바디 분리: 마지막 빈 줄(CRLF CRLF) 기준. 헤더 블록이 여러 개일 수 있어 마지막 분리점 사용.
  const splitIdx = stdout.indexOf("\r\n\r\n") >= 0 ? stdout.indexOf("\r\n\r\n") : stdout.indexOf("\n\n");
  const headerBlock = splitIdx >= 0 ? stdout.slice(0, splitIdx) : "";
  let body = splitIdx >= 0 ? stdout.slice(splitIdx).replace(/^[\r\n]+/, "") : stdout;

  // rate-limit 헤더 파싱: ratelimit: "50-in-5min"; r=49; t=300
  const rl = headerBlock.match(/ratelimit:[^\r\n]*r=(\d+)/i);
  if (rl) {
    lastRemaining = parseInt(rl[1], 10);
    rateState.remaining = lastRemaining;
  }

  // 일부 응답에 100-continue 등 추가 헤더 블록이 앞설 수 있어 첫 '[' 또는 '{' 부터 파싱
  const jsonStart = body.search(/[[{]/);
  if (jsonStart > 0) body = body.slice(jsonStart);

  try {
    return JSON.parse(body) as T;
  } catch (e) {
    throw new Error(`Limitless JSON parse 실패 (${path}): ${(e as Error).message} / body head: ${body.slice(0, 120)}`);
  }
}

export function getRemaining(): number | null {
  return lastRemaining;
}

export async function fetchTournaments(limit: number): Promise<LimitlessTournament[]> {
  return getJson<LimitlessTournament[]>(`/tournaments?game=PTCG&limit=${limit}`);
}

export async function fetchDetails(id: string): Promise<LimitlessDetails> {
  return getJson<LimitlessDetails>(`/tournaments/${id}/details`);
}

export async function fetchStandings(id: string): Promise<LimitlessStanding[]> {
  return getJson<LimitlessStanding[]>(`/tournaments/${id}/standings`);
}

export async function fetchPairings(id: string): Promise<LimitlessPairing[]> {
  return getJson<LimitlessPairing[]>(`/tournaments/${id}/pairings`);
}

/** req 간 최소 간격 + 잔량 부족 시 대기. 반환: rate-wait 발생 여부. */
export async function rateGuard(minGapMs = 700, lowWaterMark = 5, waitMs = 30_000): Promise<boolean> {
  let waited = false;
  if (lastRemaining !== null && lastRemaining < lowWaterMark) {
    // 잔량 임박 → 윈도우 회복 대기 (5분 윈도우라 보수적으로 대기)
    await sleep(waitMs);
    waited = true;
  }
  await sleep(minGapMs);
  return waited;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
