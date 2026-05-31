/**
 * EN 시세 수집 — PokeTrace (Layer 1, 결정적 스크립트)
 *
 * 출처: api.poketrace.com — TCGPlayer NEAR_MINT avg (USD).
 * 매핑:
 *   세트: PokeTrace set.slug → raredoc Set.id (EN CardLocale 있는 세트만 대상)
 *         1순위: ExternalIdMapping 캐시(sourceCode='poketrace', setId)
 *         2순위: slug 직접 Set.id 조회
 *         3순위: slug 정규화 vs Set.id 정규화 일치
 *         4순위: name fuzzy (소문자 normalize, 양방향 포함)
 *         — 이름 중복(bw1/en-tcg-bw1)은 짧은 ID 우선(pokemontcg.io 호환)
 *   카드: PokeTrace cardNumber("001/102") → numberInt(1) → CardLocale.numberInt
 *         numberInt 고유 1건만 채택, 복수=모호→skip(추측 금지)
 * 적재: Price (source='poketrace', condition='NEAR_MINT', currency='USD', marketPrice=avg)
 *       같은 (cardLocaleId, sourceId) 오늘자 행 update-or-create (멱등).
 * 매핑 캐시: ExternalIdMapping(sourceId=poketrace ExternalSource.id, externalId=ptSetSlug, setId=rdSetId)
 *
 * 실행(단독):
 *   npm run sync:prices:en:poketrace
 *   npm run sync:prices:en:poketrace -- --set=scarlet-violet
 *   npm run sync:prices:en:poketrace -- --limit=5
 *   npm run sync:prices:en:poketrace -- --dry-run
 * 오케스트레이터에서: import { run } from "./sync-prices-poketrace"
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import {
  Logger,
  type SyncResult,
  emptyResult,
  startOfUtcDay,
  upsertDailyPrice,
  getSourceIds,
  sanityCheck,
  sleep,
} from "./lib/price-sync-lib";

// ── PokeTrace API types ────────────────────────────────────────────────────────

const PT_BASE = "https://api.poketrace.com/v1";

interface PTSet {
  slug: string;
  name: string;
  releaseDate: string | null;
  cardCount: number | null;
}

interface PTPriceTier {
  avg: number;
  low: number | null;
  high: number | null;
  saleCount: number;
  lastUpdated?: string;
}

interface PTCard {
  id: string;
  name: string;
  cardNumber: string; // "001/102"
  set: { slug: string; name: string };
  variant?: string;
  rarity?: string;
  market: "US" | "EU";
  currency: "USD" | "EUR";
  refs: { tcgplayerId: string | null; cardmarketId: string | null };
  prices: {
    tcgplayer?: {
      NEAR_MINT?: PTPriceTier;
      LIGHTLY_PLAYED?: PTPriceTier;
      MODERATELY_PLAYED?: PTPriceTier;
    };
    ebay?: { NEAR_MINT?: PTPriceTier };
  };
  lastUpdated: string;
}

interface PTPage<T> {
  data: T[];
  pagination: { hasMore: boolean; nextCursor?: string; count: number };
}

// ── PokeTrace fetch with rate-limit backoff ────────────────────────────────────

async function fetchPT<T>(
  path: string,
  params: Record<string, string> = {},
  log?: Logger
): Promise<T | null> {
  const apiKey = process.env.POKETRACE_API_KEY;
  if (!apiKey) throw new Error("POKETRACE_API_KEY not set");

  const url = new URL(PT_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  // 3-attempt exponential backoff on 429: 5s → 20s → 45s
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url.toString(), { headers: { "X-API-Key": apiKey } });
    if (res.status === 429) {
      const wait = 5000 * attempt * attempt;
      log?.warn(`429 on ${path} (attempt ${attempt}/3) — waiting ${wait / 1000}s`);
      if (attempt < 3) await sleep(wait);
      continue;
    }
    if (!res.ok) {
      log?.warn(`HTTP ${res.status} on ${path}`);
      return null;
    }
    return (await res.json()) as T;
  }
  return null;
}

/** PokeTrace /sets 전체 페이지 순회 (1,300+ sets 예상). */
async function fetchAllPTSets(log: Logger): Promise<PTSet[]> {
  const all: PTSet[] = [];
  let cursor: string | undefined;
  do {
    const params: Record<string, string> = { limit: "100" };
    if (cursor) params.cursor = cursor;
    await sleep(800);
    const resp = await fetchPT<PTPage<PTSet>>("/sets", params, log);
    if (!resp?.data) break;
    all.push(...resp.data);
    cursor = resp.pagination.hasMore ? resp.pagination.nextCursor : undefined;
  } while (cursor);
  log.info(`PokeTrace sets 전체: ${all.length}개`);
  return all;
}

// ── 세트 매핑 인덱스 ─────────────────────────────────────────────────────────────

/** slug "scarlet-violet-151" → "scarletviolet151" */
function norm(s: string): string {
  return s.toLowerCase().replace(/[-_\s&',.:]/g, "");
}

type RdSetEntry = { id: string; name: string; normId: string; normName: string };

/**
 * raredoc EN 세트 인덱스 구축.
 * 이름 중복(bw1 / en-tcg-bw1) 시 짧은 ID 우선(pokemontcg.io 스타일 호환).
 * 반환: normId→entry, normName→entry (중복 이름은 최단 ID로 승자 결정).
 */
async function buildRdSetIndex(): Promise<{
  byNormId: Map<string, RdSetEntry>;
  byNormName: Map<string, RdSetEntry>;
}> {
  const enGroups = await prisma.cardLocale.groupBy({
    by: ["setId"],
    where: { region: "EN" },
  });
  const enSetIds = enGroups.map((g) => g.setId);
  const sets = await prisma.set.findMany({
    where: { id: { in: enSetIds } },
    select: { id: true, name: true },
  });

  const byNormId = new Map<string, RdSetEntry>();
  const byNormName = new Map<string, RdSetEntry>();

  for (const s of sets) {
    const entry: RdSetEntry = {
      id: s.id,
      name: s.name,
      normId: norm(s.id),
      normName: norm(s.name),
    };

    // normId: no collision expected (IDs are unique)
    byNormId.set(entry.normId, entry);

    // normName: prefer shorter ID on collision
    const existing = byNormName.get(entry.normName);
    if (!existing || s.id.length < existing.id.length) {
      byNormName.set(entry.normName, entry);
    }
  }

  return { byNormId, byNormName };
}

/** ExternalSource.code='poketrace' id (ExternalIdMapping 저장용). */
async function getPTExtSrcId(): Promise<string | null> {
  const src = await prisma.externalSource.findUnique({ where: { code: "poketrace" } });
  return src?.id ?? null;
}

/**
 * PokeTrace set slug → raredoc Set.id 매핑.
 * (1) ExternalIdMapping 캐시  (2) slug==setId  (3) normId  (4) normName fuzzy
 * 성공 시 ExternalIdMapping 캐시.
 */
async function mapPTSet(
  ptSet: PTSet,
  rdIdx: { byNormId: Map<string, RdSetEntry>; byNormName: Map<string, RdSetEntry> },
  extSrcId: string | null,
  log: Logger
): Promise<string | null> {
  const slug = ptSet.slug;

  // 1) 캐시
  if (extSrcId) {
    const cached = await prisma.externalIdMapping.findFirst({
      where: { sourceId: extSrcId, externalId: slug, setId: { not: null } },
      select: { setId: true },
    });
    if (cached?.setId) return cached.setId;
  }

  let matched: RdSetEntry | undefined;

  // 2) slug 직접 = Set.id (드물지만 pokemontcg.io 호환 set은 존재)
  const directSet = await prisma.set.findUnique({ where: { id: slug }, select: { id: true, name: true } });
  if (directSet) {
    matched = { id: directSet.id, name: directSet.name, normId: norm(directSet.id), normName: norm(directSet.name) };
  }

  // 3) normId 매칭 — "scarletviolet" matches rdSetId norm
  if (!matched) {
    matched = rdIdx.byNormId.get(norm(slug));
  }

  // 4) name fuzzy —양방향 포함
  if (!matched) {
    const normPtName = norm(ptSet.name);
    // exact name match first
    matched = rdIdx.byNormName.get(normPtName);
    // then substring in either direction
    if (!matched) {
      for (const entry of rdIdx.byNormName.values()) {
        if (entry.normName.includes(normPtName) || normPtName.includes(entry.normName)) {
          // guard: too-short names cause false positives (min length 4)
          if (normPtName.length >= 4 && entry.normName.length >= 4) {
            matched = entry;
            break;
          }
        }
      }
    }
  }

  if (!matched) return null;

  if (extSrcId) {
    await cacheSetMapping(extSrcId, slug, matched.id, log);
  }
  return matched.id;
}

async function cacheSetMapping(
  extSrcId: string,
  ptSlug: string,
  rdSetId: string,
  log: Logger
) {
  try {
    await prisma.externalIdMapping.upsert({
      where: { sourceId_externalId: { sourceId: extSrcId, externalId: ptSlug } },
      create: {
        sourceId: extSrcId,
        externalId: ptSlug,
        setId: rdSetId,
        confidence: 0.9,
        verifiedBy: "auto:sync-prices-poketrace",
      },
      update: { setId: rdSetId, updatedAt: new Date() },
    });
  } catch (e) {
    log.warn(`ExternalIdMapping 캐시 실패 (slug=${ptSlug}): ${(e as Error).message}`);
  }
}

// ── 카드 번호 파싱 ─────────────────────────────────────────────────────────────

/** PokeTrace cardNumber "001/102" → numberInt 1 */
function ptCardNumToInt(cardNumber: string): number | null {
  const m = cardNumber.match(/^(\d+)\//);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── 메인 실행 로직 ─────────────────────────────────────────────────────────────

export type PTOptions = {
  set?: string;    // 특정 PokeTrace set slug
  limit?: number;  // 앞 N개 PT set
  dryRun?: boolean;
};

/** 오케스트레이터/단독 공용 진입점. prisma.$disconnect는 호출자 책임. */
export async function run(opts: PTOptions = {}): Promise<SyncResult> {
  const t0 = Date.now();
  const log = new Logger("EN poketrace");
  const r = emptyResult("EN poketrace");

  const sid = await getSourceIds(["poketrace"]);
  const extSrcId = await getPTExtSrcId();
  const today = startOfUtcDay();

  // 1. raredoc EN 세트 인덱스 구축 (한 번만)
  log.info("raredoc EN 세트 인덱스 구축 중...");
  const rdIdx = await buildRdSetIndex();
  log.info(`raredoc EN 세트: normId ${rdIdx.byNormId.size}개, normName keys ${rdIdx.byNormName.size}개`);

  // 2. PokeTrace 세트 목록 수집
  log.info("PokeTrace /sets 전체 fetch 중...");
  const ptSets = await fetchAllPTSets(log);
  if (!ptSets.length) {
    r.ok = false;
    r.errors.push("PokeTrace /sets fetch 실패");
    r.durationMs = Date.now() - t0;
    return r;
  }

  // 필터
  let targetSets = opts.set ? ptSets.filter((s) => s.slug === opts.set) : ptSets;
  if (!targetSets.length && opts.set) {
    r.ok = false;
    r.errors.push(
      `PokeTrace set slug '${opts.set}' 없음. 사용 예: ${ptSets
        .slice(0, 5)
        .map((s) => s.slug)
        .join(", ")} ...`
    );
    r.durationMs = Date.now() - t0;
    return r;
  }
  if (opts.limit && opts.limit > 0) targetSets = targetSets.slice(0, opts.limit);

  // 3. 세트별 처리
  const missingSets: string[] = [];
  let setsMapped = 0;
  let setsFailed = 0;

  for (const ptSet of targetSets) {
    // 세트 매핑
    const rdSetId = await mapPTSet(ptSet, rdIdx, extSrcId, log);
    if (!rdSetId) {
      // 조용히 skip — 1,300+ set 중 JP/EU 세트가 대부분
      missingSets.push(ptSet.slug);
      setsFailed++;
      continue;
    }
    setsMapped++;

    // raredoc EN cardLocale 조회
    const locales = await prisma.cardLocale.findMany({
      where: { setId: rdSetId, region: "EN" },
      select: { id: true, numberInt: true },
    });
    if (!locales.length) {
      r.warnings.push(`[${ptSet.slug}→${rdSetId}] EN CardLocale 0건 — skip`);
      continue;
    }

    // numberInt → id[] 맵 (복수=모호→skip)
    const byNum = new Map<number, string[]>();
    for (const l of locales) {
      if (l.numberInt == null) continue;
      const arr = byNum.get(l.numberInt) ?? [];
      arr.push(l.id);
      byNum.set(l.numberInt, arr);
    }

    // PokeTrace 카드 페이지 순회
    let cursor: string | undefined;
    let pageNo = 0;
    let setWritten = 0;
    let setFailed = false;

    do {
      await sleep(700);
      const params: Record<string, string> = { set: ptSet.slug, market: "US", limit: "250" };
      if (cursor) params.cursor = cursor;

      const resp = await fetchPT<PTPage<PTCard>>("/cards", params, log);
      if (!resp) {
        r.errors.push(`[${ptSet.slug}] 카드 page ${pageNo + 1} fetch 3회 실패 — skip set`);
        r.ok = false;
        setFailed = true;
        break;
      }
      pageNo++;
      r.units++;

      for (const card of resp.data) {
        const numInt = ptCardNumToInt(card.cardNumber);
        if (numInt == null) {
          r.unmatched++;
          continue;
        }

        const ids = byNum.get(numInt);
        if (!ids || ids.length === 0) {
          r.unmatched++;
          continue;
        }
        if (ids.length > 1) {
          r.ambiguous++;
          continue;
        }

        const nmPrice = card.prices?.tcgplayer?.NEAR_MINT?.avg;
        if (nmPrice == null || !Number.isFinite(nmPrice) || nmPrice <= 0) {
          r.noPrice++;
          continue;
        }

        if (!opts.dryRun) {
          const wrote = await upsertDailyPrice(ids[0], sid.poketrace, today, {
            marketPrice: nmPrice,
            source: "poketrace",
            currency: "USD",
            condition: "NEAR_MINT",
          });
          wrote ? (r.written++, setWritten++) : r.dupSkipped++;
        } else {
          r.written++;
          setWritten++;
        }
      }

      cursor = resp.pagination.hasMore ? resp.pagination.nextCursor : undefined;
    } while (cursor);

    if (!setFailed) {
      log.info(
        `[${ptSet.slug}→${rdSetId}] locales=${locales.length} written=${setWritten}${opts.dryRun ? " (dry-run)" : ""}`
      );
    }
  }

  // 4. 매핑 실패 세트 기록 (EN 대상만 로그 — 전체는 JP/EU 대부분이라 silent)
  if (missingSets.length > 0) {
    await recordMissingSets(missingSets, log);
  }

  log.info(
    `완료: ptSets=${targetSets.length} mapped=${setsMapped} notMapped=${setsFailed}` +
      ` written=${r.written} dup=${r.dupSkipped} unmatched=${r.unmatched} ambiguous=${r.ambiguous} noPrice=${r.noPrice}`
  );

  r.durationMs = Date.now() - t0;
  sanityCheck(r);
  return r;
}

/** 매핑 실패 set slug 목록을 docs/poketrace-missing-sets.json 에 누적. */
async function recordMissingSets(slugs: string[], log: Logger) {
  try {
    const fs = await import("node:fs");
    const path = `${process.cwd()}/docs/poketrace-missing-sets.json`;
    let existing: string[] = [];
    try {
      existing = JSON.parse(fs.readFileSync(path, "utf-8"));
    } catch {
      // 없으면 새로 생성
    }
    const merged = Array.from(new Set([...existing, ...slugs])).sort();
    fs.mkdirSync(`${process.cwd()}/docs`, { recursive: true });
    fs.writeFileSync(path, JSON.stringify(merged, null, 2));
    log.info(`docs/poketrace-missing-sets.json 업데이트: ${merged.length}건`);
  } catch (e) {
    log.warn(`missing sets 기록 실패: ${(e as Error).message}`);
  }
}

// ── 단독 실행 ──────────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.includes("sync-prices-poketrace");
if (isMain) {
  const args = process.argv.slice(2);
  const opts: PTOptions = {
    set: args.find((a) => a.startsWith("--set="))?.split("=")[1],
    limit: Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1]) || undefined,
    dryRun: args.includes("--dry-run"),
  };
  if (opts.dryRun) console.log("[DRY-RUN] DB 쓰기 없음 — 매핑·파싱 검증만");
  run(opts)
    .then((r) => {
      console.log(
        `POKETRACE-SYNC done: written=${r.written} dup=${r.dupSkipped} unmatched=${r.unmatched} ambiguous=${r.ambiguous} noPrice=${r.noPrice} warnings=${r.warnings.length} errors=${r.errors.length} in ${(r.durationMs / 1000).toFixed(1)}s`
      );
      r.warnings.forEach((w) => console.warn("  ⚠ " + w));
      r.errors.forEach((e) => console.error("  ✗ " + e));
      return prisma.$disconnect();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
