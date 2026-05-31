/**
 * 카드 그룹화 dry-run 스크립트
 * - LogicalCard 머지 후보를 찾아 보고서 생성 (DB 수정 없음)
 * - 출력: docs/card-merge-candidates.md + docs/card-merge-candidates.json
 *
 * 매칭 정책 (사용자 확정):
 *   포켓몬 (pokedexNumbers.length > 0):
 *     SetGroup 동일 + primaryNumber 동일 + dex# 동일 → high confidence
 *   Trainer/Energy (pokedexNumbers.length === 0):
 *     SetGroup 동일 + primaryNumber 동일 + normalizedName 정확 일치 → medium confidence
 *     확신 없으면 skip (추측 금지)
 *
 * 위험 케이스 자동 감지:
 *   - 합본 set: 같은 SetGroup·region에 Set이 2개 이상 → ambiguous
 *   - 번호 일치하나 dex# 불일치 → ambiguous
 *   - 매칭 후보 여러 개 (1:N 충돌) → ambiguous
 *
 * CLI:
 *   npx tsx scripts/group-cards-dry-run.ts              # 전체
 *   npx tsx scripts/group-cards-dry-run.ts --set=sv-151  # 단일 SetGroup
 *   npx tsx scripts/group-cards-dry-run.ts --limit=5     # SetGroup 5개만
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

interface LocaleInfo {
  region: string;
  number: string;
  name: string;
  setId: string;
  language: string;
}

interface LCRow {
  id: string;
  setGroupId: string | null;
  primaryNumber: string | null;
  primaryNumberInt: number | null;
  pokedexNumbers: number[];
  supertype: string | null;
  locales: LocaleInfo[];
}

interface MergeCandidate {
  keepLcId: string;
  mergeLcIds: string[];
  setGroupId: string;
  number: string;
  confidence: "high" | "medium";
  signals: {
    pokedexNumbers?: number[];
    normalizedName?: string;
    enName?: string | null;
    jpName?: string | null;
    krName?: string | null;
    enSetId?: string | null;
    jpSetId?: string | null;
    krSetId?: string | null;
  };
}

interface AmbiguousCase {
  setGroupId: string;
  number: string;
  reason: string;
  lcIds: string[];
  details: string;
}

interface SetGroupStats {
  setGroupId: string;
  era: string;
  totalLC: number;
  enOnly: number;
  jpOnly: number;
  krOnly: number;
  alreadyMixed: number;
  mergeHigh: number;
  mergeMedium: number;
  ambiguous: number;
  skipped: number;
  hasCompoundSet: boolean;
}

// ────────────────────────────────────────────────
// Name normalization for Trainer/Energy matching
// ────────────────────────────────────────────────

/**
 * 이름을 정규화: 소문자, 특수문자 제거, 공백 정규화
 * EN/JP/KR 이름이 다르므로 이름 매핑 테이블 없이는 Trainer/Energy 교차 매칭 불가.
 * 같은 region 내 중복 또는 EN↔EN 중복 탐지에만 사용.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['''`]/g, "'")
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * EN↔JP 이름 매핑 (Trainer/Energy 교차 매칭용)
 * 추측 금지 원칙: 확실한 1:1 매핑만 포함.
 * 현재는 빈 맵 — 이름 번역 리서치 완료 후 채울 것.
 * key: normalized EN name, value: normalized JP name (or vice versa)
 */
const EN_JP_TRAINER_MAP: Record<string, string> = {
  // 예: "professors research": "博士の研究",
  // 예: "pokeball": "モンスターボール",
  // → 2단계 리서치 후 추가
};

/**
 * 카드 이름에서 포켓몬 종(베이스) 추출.
 * "Heracross-EX" → "heracross", "Mega Lucario EX" → "lucario",
 * "Pikachu V" → "pikachu", "Charizard VMAX" → "charizard"
 * EN 이름 기준. JP 이름이 ASCII라면 그대로 적용 (일부 JP 카드는 EN 이름으로 저장됨).
 */
function extractPokemonBase(name: string): string {
  return name
    .toLowerCase()
    // "Mega Lucario EX - 105/096" 같은 슬래시 suffix 제거
    .replace(/\s*-\s*\d+\/\d+.*$/, "")
    // 접두사 제거: "mega ", "shadow ", "dark ", "light ", "prism star "
    .replace(/^(mega|shadow|dark|light|prism star|radiant|origin forme|hisuian|galarian|alolan|paldean)\s+/, "")
    // 접미사 제거: " ex", " EX", " GX", " V", " VMAX", " VSTAR", " VStar", " -EX", "-ex"
    .replace(/[\s-]*(ex|gx|v|vmax|vstar|g|star|break|lv\.x|\d+)$/i, "")
    .replace(/[\s-]*(ex|gx|v|vmax|vstar)$/i, "")
    .trim();
}

/**
 * 두 카드 이름이 같은 포켓몬 종을 가리키는지 검사 (EN 이름 기준).
 * EN↔EN: 베이스 추출 후 비교.
 * EN↔JP (ASCII JP 이름): 베이스 추출 후 비교.
 * JP 이름이 일본어(非ASCII)인 경우: 검사 불가 → true 반환 (보수적: 통과시킴).
 * 단, 두 이름이 모두 ASCII인데 베이스가 다르면 → false (ambiguous 처리).
 */
function isSamePokemonBase(nameA: string, nameB: string): boolean {
  const isAscii = (s: string) => /^[\x00-\x7F]*$/.test(s);
  // 비ASCII가 포함된 이름은 검사 불가 → 통과(보수적)
  if (!isAscii(nameA) || !isAscii(nameB)) return true;
  const baseA = extractPokemonBase(nameA);
  const baseB = extractPokemonBase(nameB);
  return baseA === baseB;
}

// ────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const setArg = args.find((a) => a.startsWith("--set="))?.split("=")[1];
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const limit = limitArg ? parseInt(limitArg, 10) : undefined;

  console.log("=== 카드 그루핑 Dry-Run ===");
  console.log(`옵션: set=${setArg ?? "ALL"}, limit=${limit ?? "ALL"}`);
  console.log("");

  // ── 1. SetGroup 목록 로드 ──────────────────────
  const setGroups = await prisma.setGroup.findMany({
    where: setArg ? { id: setArg } : undefined,
    select: { id: true, era: true, nameEn: true, nameJa: true, nameKo: true },
    orderBy: [{ era: "asc" }, { id: "asc" }],
    take: limit,
  });
  console.log(`대상 SetGroup: ${setGroups.length}개`);

  // ── 2. SetGroup별 Set 목록 (합본 감지용) ─────────
  const allSets = await prisma.set.findMany({
    where: setArg ? { setGroupId: setArg } : undefined,
    select: { id: true, region: true, setGroupId: true },
  });
  // setGroupId → region → Set[] 인덱스
  const setsByGroupAndRegion = new Map<string, Map<string, string[]>>();
  for (const s of allSets) {
    if (!s.setGroupId) continue;
    if (!setsByGroupAndRegion.has(s.setGroupId)) {
      setsByGroupAndRegion.set(s.setGroupId, new Map());
    }
    const byRegion = setsByGroupAndRegion.get(s.setGroupId)!;
    if (!byRegion.has(s.region)) byRegion.set(s.region, []);
    byRegion.get(s.region)!.push(s.id);
  }

  // ── 3. 결과 누적 ──────────────────────────────
  const mergeCandidates: MergeCandidate[] = [];
  const ambiguousCases: AmbiguousCase[] = [];
  const statsPerGroup: SetGroupStats[] = [];

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const sg of setGroups) {
    // SetGroup의 모든 LogicalCard 로드 (locale 포함)
    const cards: LCRow[] = await prisma.logicalCard.findMany({
      where: { setGroupId: sg.id },
      select: {
        id: true,
        setGroupId: true,
        primaryNumber: true,
        primaryNumberInt: true,
        pokedexNumbers: true,
        supertype: true,
        locales: {
          select: {
            region: true,
            number: true,
            name: true,
            setId: true,
            language: true,
          },
        },
      },
    });

    if (cards.length === 0) continue;

    // 합본 감지: region당 Set이 2개 이상인 경우
    const byRegion = setsByGroupAndRegion.get(sg.id) ?? new Map<string, string[]>();
    const hasCompoundSet = [...byRegion.values()].some((sets) => sets.length > 1);

    // 각 LC의 region 분류
    const enOnlyCards: LCRow[] = [];
    const jpOnlyCards: LCRow[] = [];
    const krOnlyCards: LCRow[] = [];
    const alreadyMixedCards: LCRow[] = [];

    for (const lc of cards) {
      const regions = new Set(lc.locales.map((l) => l.region));
      if (regions.size > 1) {
        alreadyMixedCards.push(lc);
      } else if (regions.has("EN")) {
        enOnlyCards.push(lc);
      } else if (regions.has("JP")) {
        jpOnlyCards.push(lc);
      } else if (regions.has("KR")) {
        krOnlyCards.push(lc);
      }
    }

    let mergeHigh = 0;
    let mergeMedium = 0;
    let ambiguous = 0;
    let skipped = 0;

    // ── 합본 SetGroup: 전체 ambiguous ────────────
    if (hasCompoundSet) {
      const affectedLC = [...enOnlyCards, ...jpOnlyCards, ...krOnlyCards];
      if (affectedLC.length > 0) {
        ambiguousCases.push({
          setGroupId: sg.id,
          number: "ALL",
          reason: "합본 set: region당 Set이 2개 이상 — 번호 스킴 불일치 위험",
          lcIds: affectedLC.map((lc) => lc.id),
          details: `EN sets: ${(byRegion.get("EN") ?? []).join(",")}, JP sets: ${(byRegion.get("JP") ?? []).join(",")}, KR sets: ${(byRegion.get("KR") ?? []).join(",")}`,
        });
        ambiguous += affectedLC.length;
      }
      statsPerGroup.push({
        setGroupId: sg.id,
        era: sg.era,
        totalLC: cards.length,
        enOnly: enOnlyCards.length,
        jpOnly: jpOnlyCards.length,
        krOnly: krOnlyCards.length,
        alreadyMixed: alreadyMixedCards.length,
        mergeHigh,
        mergeMedium,
        ambiguous,
        skipped,
        hasCompoundSet: true,
      });
      totalSkipped += skipped;
      totalProcessed += cards.length;
      continue;
    }

    // ── 매칭 시도 ───────────────────────────────
    // EN을 "keep" 기준으로, JP/KR을 "merge" 후보로
    // 단 EN이 없으면 JP를 keep 기준으로

    // (primaryNumber → LCRow) 인덱스 구축
    function buildIndex(lcList: LCRow[]): Map<string, LCRow[]> {
      const idx = new Map<string, LCRow[]>();
      for (const lc of lcList) {
        const stripped = (lc.primaryNumber ?? "").replace(/^0+/, "");
        const num = stripped || (lc.primaryNumber ?? "");
        if (!idx.has(num)) idx.set(num, []);
        idx.get(num)!.push(lc);
      }
      return idx;
    }

    const enIdx = buildIndex(enOnlyCards);
    const jpIdx = buildIndex(jpOnlyCards);
    const krIdx = buildIndex(krOnlyCards);

    // 매칭 처리된 LC id 추적 (중복 머지 방지)
    const matched = new Set<string>();

    // 포켓몬 카드 매칭: (number, dex#) 3중 일치
    function matchPokemon(
      keepList: LCRow[],
      candidateLists: { list: LCRow[]; idx: Map<string, LCRow[]> }[]
    ) {
      for (const keepLC of keepList) {
        if (matched.has(keepLC.id)) continue;
        if (keepLC.pokedexNumbers.length === 0) continue; // Trainer/Energy는 별도 처리

        const num = (keepLC.primaryNumber ?? "").replace(/^0+/, "");
        const dexSet = new Set(keepLC.pokedexNumbers);

        const toMerge: LCRow[] = [];
        let isAmbiguous = false;
        let ambiguousReason = "";

        for (const { idx } of candidateLists) {
          const candidates = idx.get(num) ?? [];
          // 번호 일치 후보 중 dex# 일치하는 것만
          const dexMatch = candidates.filter(
            (c) =>
              !matched.has(c.id) &&
              c.pokedexNumbers.length > 0 &&
              c.pokedexNumbers.every((d) => dexSet.has(d)) &&
              keepLC.pokedexNumbers.every((d) => new Set(c.pokedexNumbers).has(d))
          );
          const numMatch = candidates.filter((c) => !matched.has(c.id));

          if (numMatch.length > 0 && dexMatch.length === 0) {
            // 번호는 일치하나 dex# 불일치
            isAmbiguous = true;
            ambiguousReason = `번호(${num}) 일치 but dex# 불일치: keep=[${keepLC.pokedexNumbers}] vs candidate=[${numMatch.map((c) => c.pokedexNumbers).join("|")}]`;
            break;
          }
          if (dexMatch.length > 1) {
            // 후보 여러 개 (1:N 충돌)
            isAmbiguous = true;
            ambiguousReason = `후보 여러 개(${dexMatch.length}개): number=${num}, dex#=[${keepLC.pokedexNumbers}]`;
            break;
          }
          if (dexMatch.length === 1) {
            // 이름 교차검증: ASCII 이름끼리는 베이스 포켓몬이 같아야 high confidence
            const candidate = dexMatch[0];
            const keepName = keepLC.locales[0]?.name ?? "";
            const candidateName = candidate.locales[0]?.name ?? "";
            if (!isSamePokemonBase(keepName, candidateName)) {
              isAmbiguous = true;
              ambiguousReason = `번호(${num}) + dex#(${keepLC.pokedexNumbers}) 일치 but 이름 베이스 불일치: "${keepName}" vs "${candidateName}" — 번호 스킴 불일치 의심`;
              break;
            }
            toMerge.push(candidate);
          }
        }

        if (isAmbiguous) {
          ambiguousCases.push({
            setGroupId: sg.id,
            number: num,
            reason: ambiguousReason,
            lcIds: [keepLC.id, ...toMerge.map((l) => l.id)],
            details: `keep: ${keepLC.id} dex=[${keepLC.pokedexNumbers}]`,
          });
          ambiguous++;
          continue;
        }

        if (toMerge.length > 0) {
          const enLocale = keepLC.locales.find((l) => l.region === "EN");
          const jpLocale = toMerge.find((l) => l.locales[0]?.region === "JP")?.locales[0];
          const krLocale = toMerge.find((l) => l.locales[0]?.region === "KR")?.locales[0];

          mergeCandidates.push({
            keepLcId: keepLC.id,
            mergeLcIds: toMerge.map((l) => l.id),
            setGroupId: sg.id,
            number: num,
            confidence: "high",
            signals: {
              pokedexNumbers: keepLC.pokedexNumbers,
              enName: enLocale?.name ?? null,
              jpName: jpLocale?.name ?? null,
              krName: krLocale?.name ?? null,
              enSetId: enLocale?.setId ?? null,
              jpSetId: jpLocale?.setId ?? null,
              krSetId: krLocale?.setId ?? null,
            },
          });
          matched.add(keepLC.id);
          for (const m of toMerge) matched.add(m.id);
          mergeHigh++;
        } else {
          skipped++;
        }
      }
    }

    // Trainer/Energy 매칭: (number) 일치 + 같은 region 내에서만 (이름 매핑 없으면 skip)
    function matchTrainer(
      keepList: LCRow[],
      candidateLists: { list: LCRow[]; idx: Map<string, LCRow[]> }[]
    ) {
      for (const keepLC of keepList) {
        if (matched.has(keepLC.id)) continue;
        if (keepLC.pokedexNumbers.length > 0) continue; // 포켓몬은 별도 처리

        const num = (keepLC.primaryNumber ?? "").replace(/^0+/, "");
        const keepName = normalizeName(keepLC.locales[0]?.name ?? "");
        const keepRegion = keepLC.locales[0]?.region ?? "";

        // EN↔JP/KR 이름 매핑 없으면 skip
        // 같은 region끼리는 정확 이름 일치로 체크 (평행팩 내 중복 탐지)
        // 현재 정책: 교차 region 매칭은 EN_JP_TRAINER_MAP에 있는 경우만
        const toMerge: LCRow[] = [];

        for (const { idx, list } of candidateLists) {
          if (list.length === 0) continue;
          const candidateRegion = list[0]?.locales[0]?.region ?? "";
          const candidates = idx.get(num) ?? [];
          const unmatched = candidates.filter((c) => !matched.has(c.id));

          if (unmatched.length === 0) continue;

          // 교차 region (EN↔JP, EN↔KR 등)
          if (keepRegion !== candidateRegion) {
            // 이름 매핑 테이블에 있는 경우만 매칭
            const mappedName = EN_JP_TRAINER_MAP[keepName];
            if (!mappedName) {
              // 매핑 없음 — skip (추측 금지)
              skipped++;
              continue;
            }
            const nameMatch = unmatched.filter(
              (c) => normalizeName(c.locales[0]?.name ?? "") === mappedName
            );
            if (nameMatch.length === 1) {
              toMerge.push(nameMatch[0]);
            } else if (nameMatch.length > 1) {
              ambiguousCases.push({
                setGroupId: sg.id,
                number: num,
                reason: `Trainer 이름 매핑 후보 여러 개(${nameMatch.length})`,
                lcIds: [keepLC.id, ...nameMatch.map((c) => c.id)],
                details: `keepName=${keepName}, mappedName=${mappedName}`,
              });
              ambiguous++;
              continue;
            }
          }
        }

        if (toMerge.length > 0) {
          const keepLocale = keepLC.locales[0];
          const mergeLocale = toMerge[0]?.locales[0];
          mergeCandidates.push({
            keepLcId: keepLC.id,
            mergeLcIds: toMerge.map((l) => l.id),
            setGroupId: sg.id,
            number: num,
            confidence: "medium",
            signals: {
              normalizedName: keepName,
              enName: keepRegion === "EN" ? keepLocale?.name : mergeLocale?.name ?? null,
              jpName: keepRegion === "JP" ? keepLocale?.name : mergeLocale?.name ?? null,
              krName: keepRegion === "KR" ? keepLocale?.name : null,
              enSetId: keepRegion === "EN" ? keepLocale?.setId : mergeLocale?.setId ?? null,
              jpSetId: keepRegion === "JP" ? keepLocale?.setId : null,
              krSetId: keepRegion === "KR" ? keepLocale?.setId : null,
            },
          });
          matched.add(keepLC.id);
          for (const m of toMerge) matched.add(m.id);
          mergeMedium++;
        }
      }
    }

    // EN → JP, KR 매칭
    matchPokemon(enOnlyCards, [
      { list: jpOnlyCards, idx: jpIdx },
      { list: krOnlyCards, idx: krIdx },
    ]);
    matchTrainer(enOnlyCards, [
      { list: jpOnlyCards, idx: jpIdx },
      { list: krOnlyCards, idx: krIdx },
    ]);

    // JP → KR 매칭 (EN에 이미 매칭된 건 matched로 스킵)
    matchPokemon(jpOnlyCards, [{ list: krOnlyCards, idx: krIdx }]);
    matchTrainer(jpOnlyCards, [{ list: krOnlyCards, idx: krIdx }]);

    // KR-only → EN/JP (이미 위에서 처리됨)
    // 나머지 unmatched 카운트
    const unmatchedEN = enOnlyCards.filter((lc) => !matched.has(lc.id)).length;
    const unmatchedJP = jpOnlyCards.filter((lc) => !matched.has(lc.id)).length;
    const unmatchedKR = krOnlyCards.filter((lc) => !matched.has(lc.id)).length;
    skipped += unmatchedEN + unmatchedJP + unmatchedKR;

    statsPerGroup.push({
      setGroupId: sg.id,
      era: sg.era,
      totalLC: cards.length,
      enOnly: enOnlyCards.length,
      jpOnly: jpOnlyCards.length,
      krOnly: krOnlyCards.length,
      alreadyMixed: alreadyMixedCards.length,
      mergeHigh,
      mergeMedium,
      ambiguous,
      skipped,
      hasCompoundSet: false,
    });

    totalProcessed += cards.length;
    totalSkipped += skipped;
  }

  // ── 4. 결과 통계 ──────────────────────────────
  const totalMergeCandidates = mergeCandidates.length;
  const totalAmbiguous = ambiguousCases.length;
  const highConf = mergeCandidates.filter((c) => c.confidence === "high").length;
  const medConf = mergeCandidates.filter((c) => c.confidence === "medium").length;

  // 머지 후 예상 LC 수
  // 각 MergeCandidate에서 mergeLcIds.length만큼 LC가 제거됨
  const removedLC = mergeCandidates.reduce((acc, c) => acc + c.mergeLcIds.length, 0);
  const estimatedFinalLC = 63037 - removedLC;

  console.log("\n=== 결과 요약 ===");
  console.log(`처리된 LogicalCard: ${totalProcessed}`);
  console.log(`머지 후보 총: ${totalMergeCandidates}쌍`);
  console.log(`  - high confidence (포켓몬 3중 일치): ${highConf}`);
  console.log(`  - medium confidence (Trainer 이름 매핑): ${medConf}`);
  console.log(`ambiguous 케이스: ${totalAmbiguous}`);
  console.log(`skip (매칭 불가): ${totalSkipped}`);
  console.log(`머지 시 제거될 LC: ${removedLC}`);
  console.log(`머지 후 예상 LC: 63,037 → ${estimatedFinalLC}`);

  // ── 5. JSON 출력 ──────────────────────────────
  const docsDir = path.resolve(__dirname, "../docs");
  fs.mkdirSync(docsDir, { recursive: true });

  const jsonOut = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalLC: 63037,
      totalMergeCandidates,
      highConfidence: highConf,
      mediumConfidence: medConf,
      ambiguous: totalAmbiguous,
      skipped: totalSkipped,
      estimatedRemovedLC: removedLC,
      estimatedFinalLC,
    },
    mergeCandidates,
    ambiguousCases,
  };
  const jsonPath = path.join(docsDir, "card-merge-candidates.json");
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2), "utf-8");
  console.log(`\nJSON 출력: ${jsonPath}`);

  // ── 6. Markdown 보고서 ────────────────────────
  const mdPath = path.join(docsDir, "card-merge-candidates.md");
  const md = buildMarkdown({
    statsPerGroup,
    mergeCandidates,
    ambiguousCases,
    summary: jsonOut.summary,
  });
  fs.writeFileSync(mdPath, md, "utf-8");
  console.log(`Markdown 출력: ${mdPath}`);
}

// ────────────────────────────────────────────────
// Markdown 보고서 생성
// ────────────────────────────────────────────────

function buildMarkdown(opts: {
  statsPerGroup: SetGroupStats[];
  mergeCandidates: MergeCandidate[];
  ambiguousCases: AmbiguousCase[];
  summary: {
    totalLC: number;
    totalMergeCandidates: number;
    highConfidence: number;
    mediumConfidence: number;
    ambiguous: number;
    skipped: number;
    estimatedRemovedLC: number;
    estimatedFinalLC: number;
  };
}): string {
  const { statsPerGroup, mergeCandidates, ambiguousCases, summary } = opts;
  const lines: string[] = [];

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  lines.push(`# 카드 머지 후보 보고서`);
  lines.push(`\n생성일: ${now} (dry-run — DB 수정 없음)`);

  // ── 전체 요약 ──
  lines.push(`\n## 1. 전체 요약\n`);
  lines.push(`| 항목 | 수치 |`);
  lines.push(`|---|---|`);
  lines.push(`| 현재 LogicalCard | ${summary.totalLC.toLocaleString()} |`);
  lines.push(`| 머지 후보 쌍 (high confidence) | ${summary.highConfidence.toLocaleString()} |`);
  lines.push(`| 머지 후보 쌍 (medium confidence) | ${summary.mediumConfidence.toLocaleString()} |`);
  lines.push(`| ambiguous (사용자 검토 필요) | ${summary.ambiguous.toLocaleString()} |`);
  lines.push(`| skip (매칭 불가/데이터 부재) | ${summary.skipped.toLocaleString()} |`);
  lines.push(`| 머지 시 제거될 LC | ${summary.estimatedRemovedLC.toLocaleString()} |`);
  lines.push(`| **머지 후 예상 LC** | **${summary.estimatedFinalLC.toLocaleString()}** |`);

  // ── SetGroup별 통계 ──
  lines.push(`\n## 2. SetGroup별 통계\n`);
  lines.push(`| SetGroup | Era | 총LC | EN-only | JP-only | KR-only | Mixed | HighConf | MedConf | Ambig | Skip | 합본? |`);
  lines.push(`|---|---|---|---|---|---|---|---|---|---|---|---|`);

  const sortedStats = [...statsPerGroup].sort(
    (a, b) => b.mergeHigh + b.mergeMedium - (a.mergeHigh + a.mergeMedium)
  );
  for (const s of sortedStats) {
    lines.push(
      `| ${s.setGroupId} | ${s.era} | ${s.totalLC} | ${s.enOnly} | ${s.jpOnly} | ${s.krOnly} | ${s.alreadyMixed} | ${s.mergeHigh} | ${s.mergeMedium} | ${s.ambiguous} | ${s.skipped} | ${s.hasCompoundSet ? "⚠️합본" : "-"} |`
    );
  }

  // ── 샘플 100쌍 ──
  lines.push(`\n## 3. 머지 후보 샘플 (최대 100쌍)\n`);
  lines.push(
    `> 앞 50쌍 (high confidence 포켓몬) + 뒤 50쌍 (edge case / medium confidence)\n`
  );
  lines.push(
    `| # | SetGroup | Num | Confidence | dex# | EN name (LC id) | JP name (LC id) | KR name (LC id) |`
  );
  lines.push(`|---|---|---|---|---|---|---|---|`);

  const highSamples = mergeCandidates
    .filter((c) => c.confidence === "high")
    .slice(0, 50);
  const edgeSamples = [
    ...mergeCandidates.filter((c) => c.confidence === "medium").slice(0, 25),
    ...mergeCandidates.filter((c) => c.confidence === "high").slice(-25),
  ].slice(0, 50);
  const samples = [...highSamples, ...edgeSamples];

  samples.forEach((c, i) => {
    const dex = c.signals.pokedexNumbers?.join(",") ?? "-";
    const enCell = c.signals.enName ? `${c.signals.enName} (${c.keepLcId})` : "-";
    const jpId = c.mergeLcIds.find((id) =>
      id.toLowerCase().includes("jp")
    ) ?? c.mergeLcIds[0] ?? "-";
    const krId = c.mergeLcIds.find((id) =>
      id.toLowerCase().includes("kr")
    ) ?? "-";
    const jpCell = c.signals.jpName ? `${c.signals.jpName} (${jpId})` : "-";
    const krCell = c.signals.krName ? `${c.signals.krName} (${krId})` : "-";
    lines.push(
      `| ${i + 1} | ${c.setGroupId} | ${c.number} | ${c.confidence} | ${dex} | ${enCell} | ${jpCell} | ${krCell} |`
    );
  });

  // ── Ambiguous 케이스 ──
  lines.push(`\n## 4. Ambiguous 케이스 (사용자 검토 필요)\n`);
  if (ambiguousCases.length === 0) {
    lines.push(`ambiguous 케이스 없음.`);
  } else {
    lines.push(`총 ${ambiguousCases.length}개\n`);
    lines.push(`| # | SetGroup | Num | 원인 | 관련 LC | 상세 |`);
    lines.push(`|---|---|---|---|---|---|`);
    ambiguousCases.forEach((a, i) => {
      const lcStr = a.lcIds.slice(0, 3).join(", ") + (a.lcIds.length > 3 ? ` ... (+${a.lcIds.length - 3})` : "");
      lines.push(
        `| ${i + 1} | ${a.setGroupId} | ${a.number} | ${a.reason} | ${lcStr} | ${a.details} |`
      );
    });
  }

  // ── 위험 케이스 ──
  lines.push(`\n## 5. 위험 케이스 처리 결과\n`);
  const compoundGroups = statsPerGroup.filter((s) => s.hasCompoundSet);
  lines.push(`### 합본 Set (자동 ambiguous 처리)\n`);
  if (compoundGroups.length === 0) {
    lines.push(`합본 SetGroup 없음 (또는 처리 범위에 없음).`);
  } else {
    lines.push(`| SetGroup | Era | ambiguous로 분류된 LC |`);
    lines.push(`|---|---|---|`);
    for (const s of compoundGroups) {
      lines.push(`| ${s.setGroupId} | ${s.era} | ${s.ambiguous} |`);
    }
  }

  // ── 다음 단계 ──
  lines.push(`\n## 6. 다음 단계\n`);
  lines.push(`1. **이 보고서 검토**: 샘플 100쌍이 실제로 같은 카드인지 확인`);
  lines.push(`2. **ambiguous 케이스 결정**: 합본 set 처리 방침 확정 필요`);
  lines.push(`3. **머지 실행**: 사용자 OK 후 별도 스크립트(\`scripts/apply-card-merge.ts\`) 실행`);
  lines.push(`   - 입력: \`docs/card-merge-candidates.json\``);
  lines.push(`   - 동작: mergeLcIds의 CardLocale을 keepLcId로 재연결 후 mergeLcIds LogicalCard 삭제`);
  lines.push(`4. **Trainer/Energy 교차 매칭**: EN↔JP 이름 번역 맵 구축 후 medium confidence 확장`);
  lines.push(`\n> 백업: \`prisma/backups/logicalcard-cardlocale-20260531.json.bak\` (100.7MB, LC 63,037 / CL 66,845)`);

  return lines.join("\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
