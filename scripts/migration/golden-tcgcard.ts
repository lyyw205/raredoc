// ── BATCH-2 골든 베이스라인 스냅샷 ─────────────────────────────────────────
// 키스톤 loadCardByLocaleId 출력을 재배선 전(前) 상태로 박제.
// 이후 BATCH-2 재배선 적용 후 --compare 로 diff=0 검증.
//
// 층화 샘플: supertype × region × era 셀당 최대 CELL_LIMIT 건, id ASC 고정 정렬.
//   supertype: Pokémon / Trainer / Energy / (null)  → 4
//   region:    EN / JP / KR                         → 3
//   era:       SV / SWSH / SM / OLD                 → 4
//   = 48 셀 × 최대 100건 = 최대 4,800 RegionCard
//
// 실행:
//   npx tsx scripts/migration/golden-tcgcard.ts              (베이스라인 캡처)
//   npx tsx scripts/migration/golden-tcgcard.ts --compare    (현재 vs baseline diff)
//
// 출력: .migration-snapshots/golden-tcgcard-baseline.jsonl

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { prisma } from "../../src/lib/prisma";
import { loadCardByLocaleId } from "../../src/lib/cards/queries";

// ── 상수 ─────────────────────────────────────────────────────────────────────

const CELL_LIMIT = 100; // 셀당 최대 건수
const SNAPSHOT_PATH = path.resolve(
  __dirname,
  "../../.migration-snapshots/golden-tcgcard-baseline.jsonl"
);

// era 결정: Set.name 으로 시대 분류 (setGroup.name 이 더 정확하지만 Set.name 만으로도 충분)
// JP 세트코드 prefix 기반 분류가 가장 안정적.
// Set.name ILIKE 패턴 대신 cardPackId(setGroupId) prefix 사용:
//   SV: sv- prefix
//   SWSH: og-s- / s1~s12 prefix
//   SM: sm- / og-sm- prefix
//   OLD: 그 외 (XY/BW/DP/...)
const ERA_CASES = `
  CASE
    WHEN sg.id ILIKE 'sv-%' OR sg.id ILIKE 'sv%' THEN 'SV'
    WHEN sg.id ILIKE 'og-s%' OR sg.id ILIKE 'mega-brave%' OR sg.id ILIKE 'mega-dream%'
      OR sg.id ILIKE 'mega-ninja%' OR sg.id ILIKE 'mega-inferno%' OR sg.id ILIKE 'mega-symphonia%'
      OR sg.id ILIKE 'mega-muniki%' THEN 'SWSH'
    WHEN sg.id ILIKE 'sm%' OR sg.id ILIKE 'og-sm%' THEN 'SM'
    ELSE 'OLD'
  END
`;

// BATCH-2 관련 필드 + 식별 필드를 키 알파벳 정렬로 직렬화
// ★ toCardMeta 출력 기준(CardMeta 타입)
const BATCH2_FIELDS = [
  // 식별
  "id",
  "primarySetId",
  "primaryNumber",
  // BATCH-2 대상 필드
  "supertype",
  "subtypes",
  "hp",
  "retreatCost",
  "weakness",
  "resistance",
  "evolvesFrom",
  "evolvesTo",
  "regulationMark",
  "legalities",
  // 추가 핵심 (회귀 감지용)
  "types",
  "pokedexNumbers",
  "rarityCode",
  "rarityNameKo",
] as const;

type B2Fields = (typeof BATCH2_FIELDS)[number];

// LocaleSummary 에서도 regulationMark/legalities 읽음 (cardToTCG 경유 시 primary 우선)
const LOCALE_FIELDS = [
  "id",
  "region",
  "language",
  "setId",
  "number",
  "regulationMark",
  "legalities",
  "rarityCode",
] as const;

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface GoldenEntry {
  rcId: string; // RegionCard.id (샘플 기준)
  cell: string; // "supertype|region|era"
  cardFields: Record<string, unknown>;
  localeFields: Record<string, unknown>;
  hash: string; // SHA256(cardFields+localeFields JSON)
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function stableJson(obj: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.keys(obj)
      .sort()
      .map((k) => [k, obj[k]])
  );
  return JSON.stringify(sorted);
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function extractFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const f of fields) {
    result[f] = (obj as Record<string, unknown>)[f] ?? null;
  }
  return result;
}

// ── 샘플 RegionCard id 추출 ───────────────────────────────────────────────────

interface SampleRow {
  id: string;
  supertype: string | null;
  region: string;
  era: string;
}

async function fetchSampleIds(): Promise<SampleRow[]> {
  // 층화: supertype × region × era 셀당 CELL_LIMIT, id ASC (결정적)
  // DISTINCT ON + LATERAL 없이 각 셀을 개별 쿼리로 → 48 쿼리지만 각 LIMIT 100 이라 빠름
  // 대신 단일 쿼리로 row_number() 파티션으로 처리
  const rows: SampleRow[] = await prisma.$queryRawUnsafe(`
    SELECT id, supertype, region, era
    FROM (
      SELECT
        cl.id,
        lc.supertype,
        cl.region,
        ${ERA_CASES.trim()} AS era,
        ROW_NUMBER() OVER (
          PARTITION BY lc.supertype, cl.region, ${ERA_CASES.trim()}
          ORDER BY cl.id ASC
        ) AS rn
      FROM "CardLocale" cl
      JOIN "LogicalCard" lc ON lc.id = cl."logicalCardId"
      LEFT JOIN "SetGroup" sg ON sg.id = lc."setGroupId"
    ) sub
    WHERE rn <= ${CELL_LIMIT}
    ORDER BY supertype NULLS LAST, region, era, id
  `);
  return rows;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

const COMPARE = process.argv.includes("--compare");

async function main() {
  if (COMPARE) {
    await runCompare();
  } else {
    await runCapture();
  }
  await prisma.$disconnect();
}

async function runCapture() {
  console.log("════ BATCH-2 골든 베이스라인 캡처 ════\n");
  console.log(`  셀당 LIMIT ${CELL_LIMIT} · 출력: ${SNAPSHOT_PATH}\n`);

  const samples = await fetchSampleIds();
  console.log(`  샘플 RegionCard ${samples.length} 건 추출 완료`);

  // 셀 분포 요약
  const cellCounts = new Map<string, number>();
  for (const s of samples) {
    const key = `${s.supertype ?? "null"}|${s.region}|${s.era}`;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }
  console.log(`  셀 분포:`);
  for (const [k, v] of [...cellCounts.entries()].sort()) {
    console.log(`    ${k.padEnd(32)} ${v}`);
  }
  console.log();

  // loadCardByLocaleId 호출하여 골든 출력 박제
  const entries: GoldenEntry[] = [];
  let ok = 0;
  let err = 0;
  let nullResult = 0;

  for (const s of samples) {
    try {
      const result = await loadCardByLocaleId(s.id);
      if (!result) {
        nullResult++;
        continue;
      }
      const cardFields = extractFields(
        result.card as unknown as Record<string, unknown>,
        BATCH2_FIELDS
      );
      const localeFields = extractFields(
        result.locale as unknown as Record<string, unknown>,
        LOCALE_FIELDS
      );
      const hashInput = stableJson(cardFields) + "|" + stableJson(localeFields);
      const entry: GoldenEntry = {
        rcId: s.id,
        cell: `${s.supertype ?? "null"}|${s.region}|${s.era}`,
        cardFields,
        localeFields,
        hash: sha256(hashInput),
      };
      entries.push(entry);
      ok++;
    } catch (e) {
      err++;
      if (err <= 5) console.error(`  ERROR id=${s.id}: ${e}`);
    }
  }

  // 저장 (JSONL)
  const dir = path.dirname(SNAPSHOT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const lines = entries.map((e) => JSON.stringify(e));
  fs.writeFileSync(SNAPSHOT_PATH, lines.join("\n") + "\n", "utf-8");

  console.log(`  loadCardByLocaleId 호출: ok=${ok} · null=${nullResult} · err=${err}`);
  console.log(`  저장: ${SNAPSHOT_PATH}`);
  console.log(`  총 엔트리: ${entries.length}`);
  console.log(
    `\n✅ 베이스라인 캡처 완료 — ${entries.length} 건 박제. diff=0 목표로 재배선 후 --compare 실행.`
  );
}

async function runCompare() {
  console.log("════ BATCH-2 골든 비교 (현재 vs baseline) ════\n");

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`  🔴 baseline 없음: ${SNAPSHOT_PATH}`);
    console.error("  먼저 베이스라인을 캡처하세요: npx tsx scripts/migration/golden-tcgcard.ts");
    process.exit(1);
  }

  // baseline 로드
  const lines = fs
    .readFileSync(SNAPSHOT_PATH, "utf-8")
    .split("\n")
    .filter((l) => l.trim());
  const baseline = new Map<string, GoldenEntry>();
  for (const line of lines) {
    const e: GoldenEntry = JSON.parse(line);
    baseline.set(e.rcId, e);
  }
  console.log(`  baseline ${baseline.size} 건 로드\n`);

  let same = 0;
  let diff = 0;
  let missing = 0;
  const diffs: { rcId: string; cell: string; changedFields: string[] }[] = [];

  for (const [rcId, base] of baseline) {
    let result: Awaited<ReturnType<typeof loadCardByLocaleId>>;
    try {
      result = await loadCardByLocaleId(rcId);
    } catch (e) {
      console.error(`  ERROR id=${rcId}: ${e}`);
      continue;
    }
    if (!result) {
      missing++;
      continue;
    }

    const curCardFields = extractFields(
      result.card as unknown as Record<string, unknown>,
      BATCH2_FIELDS
    );
    const curLocaleFields = extractFields(
      result.locale as unknown as Record<string, unknown>,
      LOCALE_FIELDS
    );

    // 필드별 비교
    const changedFields: string[] = [];
    for (const f of BATCH2_FIELDS) {
      const bv = JSON.stringify(base.cardFields[f] ?? null);
      const cv = JSON.stringify(curCardFields[f] ?? null);
      if (bv !== cv) changedFields.push(`card.${f}: ${bv} → ${cv}`);
    }
    for (const f of LOCALE_FIELDS) {
      const bv = JSON.stringify(base.localeFields[f] ?? null);
      const cv = JSON.stringify(curLocaleFields[f] ?? null);
      if (bv !== cv) changedFields.push(`locale.${f}: ${bv} → ${cv}`);
    }

    if (changedFields.length > 0) {
      diff++;
      if (diffs.length < 20) {
        diffs.push({ rcId, cell: base.cell, changedFields });
      }
    } else {
      same++;
    }
  }

  console.log(`  결과: same=${same} · diff=${diff} · missing=${missing}`);

  if (diffs.length > 0) {
    console.log(`\n  차이 샘플 (최대 20건):`);
    for (const d of diffs) {
      console.log(`    [${d.cell}] ${d.rcId}`);
      for (const f of d.changedFields.slice(0, 6)) {
        console.log(`      ${f}`);
      }
      if (d.changedFields.length > 6)
        console.log(`      ... (${d.changedFields.length - 6} 더)`);
    }
  }

  const totalDiff = diff + missing;
  console.log(
    `\n${totalDiff === 0 ? "✅ diff=0 — BATCH-2 재배선 안전 확인." : `🔴 diff=${totalDiff} — 회귀 발견. 위 차이를 확인하세요.`}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
