/**
 * 시세 수집 공통 유틸 (price-collector Layer 1).
 * - 결정적 코드. LLM 없음. 오케스트레이터(sync-prices-all.ts)와 개별 스크립트가 공유.
 * docs/agents/price-collector-plan.md
 */
import { prisma } from "@/lib/prisma";

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** 한 출처 sync 1회 실행의 표준 결과. 오케스트레이터가 이걸로 판정·리포트. */
export type SyncResult = {
  label: string; // 사람이 읽는 출처 이름 (예: "EN pokemontcg.io")
  ok: boolean; // 치명 실패 없이 끝났나
  written: number; // 새로 적재한 Price 행
  dupSkipped: number; // 오늘자 이미 있어 갱신(멱등)
  unmatched: number; // 우리 DB에 없는 카드(추측 안 함)
  ambiguous: number; // 같은 번호 복수 인쇄본 → skip
  noPrice: number; // 출처에 가격 없음
  units: number; // 처리한 단위(세트/페이지) 수
  durationMs: number;
  warnings: string[]; // sanity 경고(치명 아님)
  errors: string[]; // 치명 에러(재시도 대상)
};

export function emptyResult(label: string): SyncResult {
  return {
    label,
    ok: true,
    written: 0,
    dupSkipped: 0,
    unmatched: 0,
    ambiguous: 0,
    noPrice: 0,
    units: 0,
    durationMs: 0,
    warnings: [],
    errors: [],
  };
}

/** 타임스탬프 + 라벨 prefix 로거. CLI에서 바로 읽기 좋게. */
export class Logger {
  constructor(private label: string) {}
  private ts() {
    // 로컬 HH:MM:SS (Date.now 금지 환경 회피: new Date()는 허용)
    return new Date().toISOString().slice(11, 19);
  }
  info(msg: string) {
    console.log(`${this.ts()} [${this.label}] ${msg}`);
  }
  warn(msg: string) {
    console.warn(`${this.ts()} [${this.label}] ⚠ ${msg}`);
  }
  error(msg: string) {
    console.error(`${this.ts()} [${this.label}] ✗ ${msg}`);
  }
}

export function startOfUtcDay(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 일시적 실패(504/타임아웃/네트워크)에 지수 백오프 재시도.
 * - ok면 텍스트 반환, 끝까지 실패면 null. (404 등 영구 실패는 즉시 null)
 */
export async function fetchTextWithRetry(
  url: string,
  opts: { headers?: Record<string, string>; retries?: number; log?: Logger } = {}
): Promise<string | null> {
  const { headers = {}, retries = 3, log } = opts;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, ...headers },
      });
      if (res.ok) return await res.text();
      // 4xx(404 등)는 영구 실패 → 재시도 무의미
      if (res.status >= 400 && res.status < 500) {
        log?.warn(`${url} → HTTP ${res.status} (영구 실패, 재시도 안 함)`);
        return null;
      }
      // 5xx/기타 → 재시도
      log?.warn(`${url} → HTTP ${res.status} (시도 ${attempt}/${retries})`);
    } catch (e) {
      log?.warn(`${url} → ${(e as Error).message} (시도 ${attempt}/${retries})`);
    }
    if (attempt < retries) await sleep(1000 * 2 ** (attempt - 1)); // 1s, 2s, 4s
  }
  return null;
}

/** JSON 버전. */
export async function fetchJsonWithRetry<T>(
  url: string,
  opts: { headers?: Record<string, string>; retries?: number; log?: Logger } = {}
): Promise<T | null> {
  const txt = await fetchTextWithRetry(url, opts);
  if (txt == null) return null;
  try {
    return JSON.parse(txt) as T;
  } catch {
    opts.log?.warn(`${url} → JSON 파싱 실패`);
    return null;
  }
}

/**
 * Price 멱등 스냅샷: 같은 (cardLocaleId, sourceId)의 오늘자 행이 있으면 update, 없으면 create.
 * @returns true=새로 생성, false=기존 갱신(dup)
 */
export async function upsertDailyPrice(
  cardLocaleId: string,
  sourceId: string,
  today: Date,
  data: {
    normal?: number | null;
    holofoil?: number | null;
    reverseHolo?: number | null;
    firstEdition?: number | null;
    marketPrice?: number | null;
    source: string;
    currency: string;
    condition?: string | null;
    gradingCompany?: string | null;
    grade?: number | null;
  }
): Promise<boolean> {
  const existing = await prisma.price.findFirst({
    where: { cardLocaleId, sourceId, recordedAt: { gte: today } },
    select: { id: true },
  });
  if (existing) {
    await prisma.price.update({ where: { id: existing.id }, data });
    return false;
  }
  await prisma.price.create({ data: { cardLocaleId, sourceId, ...data } });
  return true;
}

/** 출처 code → PriceSource.id 매핑 조회. 누락 시 throw(시드 안내). */
export async function getSourceIds(codes: string[]): Promise<Record<string, string>> {
  const rows = await prisma.priceSource.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.code, r.id]));
  const missing = codes.filter((c) => !map[c]);
  if (missing.length)
    throw new Error(`PriceSource 미시드: ${missing.join(", ")} — 먼저 'npm run seed:source' 실행`);
  return map;
}

/**
 * 결과 sanity 검증 → warnings 채움. 명백히 이상하면 ok=false로 강등(재시도 유도).
 * - parsed/units 대비 written이 0인데 에러도 없으면 "조용한 실패"로 간주.
 */
export function sanityCheck(r: SyncResult): void {
  if (r.units > 0 && r.written === 0 && r.dupSkipped === 0 && r.errors.length === 0) {
    r.warnings.push("처리 단위는 있으나 적재/갱신이 0건 — 파싱 로직/사이트 구조 변경 의심");
  }
  if (r.units > 0 && r.unmatched > 0 && r.written + r.dupSkipped === 0) {
    r.warnings.push(`전부 unmatched(${r.unmatched}) — 세트 매핑/번호 형식 점검 필요`);
  }
}
