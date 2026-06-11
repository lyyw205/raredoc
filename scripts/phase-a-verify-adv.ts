/**
 * Phase A Verification: ADV1~5 (325 cards) comprehensive audit
 *
 * Sections:
 *   A) Image liveness (HEAD check via curl, 10 concurrent)
 *   B) Field completeness audit per set
 *   C) ID contiguity check (gaps/duplicates)
 *   E) Missing cards (NULL imageSmall) — tcgdex probe (NOTE: ADV has no tcgdex data, probes will return 404)
 *   F) supertype classification per set
 *   G) EN cross-check — deferred
 *   H) Version availability (RegionCard language breakdown)
 *
 * Run: npx tsx scripts/phase-a-verify-adv.ts
 * Output: docs/phase-a-verification-adv.md
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

const execFileP = promisify(execFile);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function curlHead(url: string): Promise<number> {
  try {
    const { stdout } = await execFileP("curl", [
      "-sSL", "-o", "/dev/null", "-w", "%{http_code}",
      "--max-time", "15", "--head", url,
    ]);
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

async function curlJson<T>(url: string): Promise<{ status: number; body: T | null }> {
  try {
    const { stdout } = await execFileP("curl", [
      "-sSL", "-w", "\n__STATUS__%{http_code}",
      "--max-time", "20", url,
    ]);
    const parts = stdout.split("\n__STATUS__");
    const status = parseInt(parts[parts.length - 1]?.trim() ?? "0", 10) || 0;
    const bodyStr = parts.slice(0, -1).join("\n__STATUS__");
    let body: T | null = null;
    try { body = JSON.parse(bodyStr); } catch { /* ignore */ }
    return { status, body };
  } catch {
    return { status: 0, body: null };
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function pct(num: number, den: number) {
  if (den === 0) return "—";
  return ((num / den) * 100).toFixed(1) + "%";
}

function mdTable(headers: string[], rows: string[][]): string {
  const sep = headers.map(() => "---");
  const fmt = (row: string[]) => "| " + row.map(c => (c ?? "").replace(/\|/g, "\\|")).join(" | ") + " |";
  return [fmt(headers), fmt(sep), ...rows.map(fmt)].join("\n");
}

// ---------------------------------------------------------------------------
// Section A: Image liveness
// ---------------------------------------------------------------------------

interface RegionCardRow {
  id: string;
  name: string;
  setId: string;
  imageSmall: string | null;
}

interface ImageResult {
  id: string;
  name: string;
  setId: string;
  url: string;
  status: number;
}

async function sectionA(cards: RegionCardRow[]): Promise<{
  perSet: Map<string, { ok: number; fail: number }>;
  failures: ImageResult[];
}> {
  console.log(`\n[A] Image liveness — ${cards.length} cards (10 concurrent)...`);

  const tasks = cards.map(card => async (): Promise<ImageResult> => {
    const url = card.imageSmall ?? "";
    const status = url ? await curlHead(url) : 0;
    return { id: card.id, name: card.name, setId: card.setId, url, status };
  });

  const results = await pLimit(tasks, 10);

  const perSet = new Map<string, { ok: number; fail: number }>();
  const failures: ImageResult[] = [];
  for (const r of results) {
    const s = r.setId.replace("jp-tcg-", "");
    if (!perSet.has(s)) perSet.set(s, { ok: 0, fail: 0 });
    if (r.status === 200) {
      perSet.get(s)!.ok++;
    } else {
      perSet.get(s)!.fail++;
      failures.push(r);
    }
  }

  const totalOk = results.filter(r => r.status === 200).length;
  console.log(`  [A] ${totalOk}/${cards.length} OK, ${failures.length} failed`);
  return { perSet, failures };
}

// ---------------------------------------------------------------------------
// Section B: Field completeness
// ---------------------------------------------------------------------------

interface LogicalCardRow {
  id: string;
  primarySetId: string | null;
  primaryNumber: string | null;
  hp: number | null;
  types: string[];
  attacks: unknown;
  abilities: unknown;
  subtypes: string[];
  illustrator: string | null;
  rarityId: string | null;
  pokedexNumbers: number[];
  supertype: string | null;
  nameKo: string | null;
}

type FieldKey = "hp" | "types" | "attacks" | "abilities" | "subtypes" | "illustrator" | "rarityId" | "pokedexNumbers" | "supertype" | "nameKo";

function isPresent(card: LogicalCardRow, field: FieldKey): boolean {
  switch (field) {
    case "hp": return card.hp != null;
    case "types": return Array.isArray(card.types) && card.types.length > 0;
    case "attacks": return card.attacks != null;
    case "abilities": return card.abilities != null;
    case "subtypes": return Array.isArray(card.subtypes) && card.subtypes.length > 0;
    case "illustrator": return !!card.illustrator;
    case "rarityId": return !!card.rarityId;
    case "pokedexNumbers": return Array.isArray(card.pokedexNumbers) && card.pokedexNumbers.length > 0;
    case "supertype": return !!card.supertype;
    case "nameKo": return !!card.nameKo;
  }
}

interface SetFieldStats {
  total: number;
  fields: Record<FieldKey, number>;
}

async function sectionB(lcards: LogicalCardRow[]): Promise<Map<string, SetFieldStats>> {
  console.log(`\n[B] Field completeness — ${lcards.length} LogicalCards...`);
  const FIELDS: FieldKey[] = ["hp", "types", "attacks", "abilities", "subtypes", "illustrator", "rarityId", "pokedexNumbers", "supertype", "nameKo"];
  const perSet = new Map<string, SetFieldStats>();

  for (const card of lcards) {
    const setKey = (card.primarySetId ?? "").replace("jp-tcg-", "");
    if (!perSet.has(setKey)) {
      perSet.set(setKey, { total: 0, fields: {} as Record<FieldKey, number> });
      FIELDS.forEach(f => perSet.get(setKey)!.fields[f] = 0);
    }
    const s = perSet.get(setKey)!;
    s.total++;
    for (const f of FIELDS) {
      if (isPresent(card, f)) s.fields[f]++;
    }
  }

  for (const [setKey, stats] of perSet) {
    console.log(`  [B] ${setKey}: ${stats.total} cards, hp=${pct(stats.fields.hp, stats.total)}, attacks=${pct(stats.fields.attacks, stats.total)}`);
  }
  return perSet;
}

// ---------------------------------------------------------------------------
// Section C: ID contiguity
// ---------------------------------------------------------------------------

interface ContiguityResult {
  setKey: string;
  cardCount: number;
  gaps: number[];
  duplicates: number[];
}

async function sectionC(cards: RegionCardRow[], sets: { id: string; cardCount: number | null }[]): Promise<ContiguityResult[]> {
  console.log(`\n[C] ID contiguity...`);
  const results: ContiguityResult[] = [];

  const setCardCount = new Map(sets.map(s => [s.id.replace("jp-tcg-", ""), s.cardCount ?? 0]));

  const bySet = new Map<string, number[]>();
  for (const card of cards) {
    const setKey = card.setId.replace("jp-tcg-", "");
    // ADV RegionCard IDs: jp-tcg-ADV1-1 (unpadded)
    const numMatch = card.id.match(/-(\d+)$/);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1], 10);
    if (!bySet.has(setKey)) bySet.set(setKey, []);
    bySet.get(setKey)!.push(num);
  }

  for (const [setKey, nums] of bySet) {
    const count = setCardCount.get(setKey) ?? nums.length;
    nums.sort((a, b) => a - b);
    const seen = new Set<number>();
    const duplicates: number[] = [];
    for (const n of nums) {
      if (seen.has(n)) duplicates.push(n);
      seen.add(n);
    }
    const gaps: number[] = [];
    for (let i = 1; i <= count; i++) {
      if (!seen.has(i)) gaps.push(i);
    }
    results.push({ setKey, cardCount: count, gaps, duplicates });
    console.log(`  [C] ${setKey}: ${nums.length}/${count} cards, gaps=${gaps.length}, dups=${duplicates.length}`);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Section E: Missing cards (NULL imageSmall) — tcgdex probe
// NOTE: ADV has no tcgdex data — all probes expected to return 404
// ---------------------------------------------------------------------------

interface MissingCardProbe {
  set: string;
  number: string;
  name: string;
  tcgdexStatus: number;
  tcgdexName?: string;
  inDb: boolean;
}

async function sectionE(locales: RegionCardRow[], lcards: LogicalCardRow[]): Promise<MissingCardProbe[]> {
  const missing = locales.filter(c => !c.imageSmall);
  console.log(`\n[E] Missing imageSmall — ${missing.length} cards — tcgdex probe (ADV: expected all 404)...`);

  if (missing.length === 0) {
    console.log(`  [E] No missing images found.`);
    return [];
  }

  const dbIds = new Set(lcards.map(c => c.id));
  const results: MissingCardProbe[] = [];

  for (const card of missing) {
    const setKey = card.setId.replace("jp-tcg-", "").toLowerCase(); // e.g. "adv1"
    const numMatch = card.id.match(/-(\d+)$/);
    const numStr = numMatch ? numMatch[1].padStart(3, "0") : "000";
    const url = `https://api.tcgdex.net/v2/ja/cards/${setKey}-${numStr}`;
    const { status, body } = await curlJson<{ name?: string }>(url);
    const dbId = `lc-orphan-${card.id}`;
    results.push({
      set: setKey,
      number: numStr,
      name: card.name,
      tcgdexStatus: status,
      tcgdexName: (body as { name?: string } | null)?.name,
      inDb: dbIds.has(dbId) || dbIds.has(card.id),
    });
    console.log(`  [E] ${setKey}-${numStr} ${card.name}: tcgdex=${status}`);
    await sleep(500);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Section F: supertype classification
// ---------------------------------------------------------------------------

interface SupertypeStats {
  setKey: string;
  counts: Map<string, number>;
  nullCards: { id: string; name: string }[];
}

async function sectionF(lcards: LogicalCardRow[], locales: RegionCardRow[]): Promise<SupertypeStats[]> {
  console.log(`\n[F] supertype classification...`);

  const nameMap = new Map<string, string>();
  for (const cl of locales) {
    const lcId = `lc-orphan-${cl.id}`;
    nameMap.set(lcId, cl.name);
  }

  const bySet = new Map<string, SupertypeStats>();
  for (const card of lcards) {
    const setKey = (card.primarySetId ?? "").replace("jp-tcg-", "");
    if (!bySet.has(setKey)) {
      bySet.set(setKey, { setKey, counts: new Map(), nullCards: [] });
    }
    const s = bySet.get(setKey)!;
    const st = card.supertype ?? "(null)";
    s.counts.set(st, (s.counts.get(st) ?? 0) + 1);
    if (!card.supertype) {
      s.nullCards.push({ id: card.id, name: nameMap.get(card.id) ?? card.id });
    }
  }

  for (const [, stats] of bySet) {
    console.log(`  [F] ${stats.setKey}:`, Object.fromEntries(stats.counts));
  }
  return [...bySet.values()];
}

// ---------------------------------------------------------------------------
// Section H: Version availability
// ---------------------------------------------------------------------------

interface LocaleStats {
  setKey: string;
  patterns: Map<string, number>;
  multiLocale: { id: string; langs: string[] }[];
}

async function sectionH(lcards: LogicalCardRow[]): Promise<LocaleStats[]> {
  console.log(`\n[H] Version availability (RegionCard language breakdown)...`);

  const lcIds = lcards.map(c => c.id);
  const localeRows = await prisma.regionCard.findMany({
    where: { logicalCardId: { in: lcIds } },
    select: { logicalCardId: true, language: true, setId: true },
  });

  const byLcId = new Map<string, string[]>();
  for (const row of localeRows) {
    if (!byLcId.has(row.logicalCardId)) byLcId.set(row.logicalCardId, []);
    byLcId.get(row.logicalCardId)!.push(row.language);
  }

  const bySet = new Map<string, LocaleStats>();
  for (const card of lcards) {
    const setKey = (card.primarySetId ?? "").replace("jp-tcg-", "");
    if (!bySet.has(setKey)) bySet.set(setKey, { setKey, patterns: new Map(), multiLocale: [] });
    const s = bySet.get(setKey)!;

    const langs = (byLcId.get(card.id) ?? []).sort().join("+") || "(none)";
    s.patterns.set(langs, (s.patterns.get(langs) ?? 0) + 1);
    const langsArr = byLcId.get(card.id) ?? [];
    if (langsArr.length > 1) {
      s.multiLocale.push({ id: card.id, langs: langsArr });
    }
  }

  for (const [, stats] of bySet) {
    console.log(`  [H] ${stats.setKey}:`, Object.fromEntries(stats.patterns));
  }
  return [...bySet.values()];
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function buildReport(data: {
  setDefs: { id: string; name: string; cardCount: number | null }[];
  sectionA: { perSet: Map<string, { ok: number; fail: number }>; failures: ImageResult[] };
  sectionB: Map<string, SetFieldStats>;
  sectionC: ContiguityResult[];
  sectionE: MissingCardProbe[];
  sectionF: SupertypeStats[];
  sectionH: LocaleStats[];
}): string {
  const SETS = ["ADV1", "ADV2", "ADV3", "ADV4", "ADV5"];
  const FIELDS: FieldKey[] = ["hp", "types", "attacks", "abilities", "subtypes", "illustrator", "rarityId", "pokedexNumbers", "supertype", "nameKo"];
  const lines: string[] = [];

  const now = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const totalCards = data.setDefs.reduce((a, s) => a + (s.cardCount ?? 0), 0);
  lines.push(`# Phase A Verification: ADV1~5`);
  lines.push(`\n생성 일시: ${now}\n`);
  lines.push(`대상: ADV1~5 (일본판 ADV 시리즈, 2003). 총 ${totalCards}장.\n`);

  const setName = (key: string) => data.setDefs.find(s => s.id === `jp-tcg-${key}`)?.name ?? key;

  // Section A
  lines.push(`## A) 이미지 라이브니스 (Image Liveness)`);
  lines.push(`\nSupabase Storage에 업로드된 카드 이미지 HTTP 상태 점검 (HEAD).\n`);
  const aHeaders = ["세트", "JP 이름", "총 카드", "HTTP 200", "실패", "성공률"];
  const aRows = SETS.map(s => {
    const stat = data.sectionA.perSet.get(s) ?? { ok: 0, fail: 0 };
    const total = stat.ok + stat.fail;
    return [s, setName(s), String(total), String(stat.ok), String(stat.fail), pct(stat.ok, total)];
  });
  lines.push(mdTable(aHeaders, aRows));

  const totalOk = SETS.reduce((a, s) => a + (data.sectionA.perSet.get(s)?.ok ?? 0), 0);
  lines.push(`\n**전체:** ${totalOk}/${totalCards} 이미지 정상 (${pct(totalOk, totalCards)})\n`);

  if (data.sectionA.failures.length > 0) {
    lines.push(`### 실패 목록 (${data.sectionA.failures.length}건)`);
    const fHeaders = ["ID", "이름", "URL", "HTTP 상태"];
    const fRows = data.sectionA.failures.map(f => [f.id, f.name, f.url || "(null)", String(f.status)]);
    lines.push(mdTable(fHeaders, fRows));
  } else {
    lines.push(`> 모든 이미지 정상 (실패 없음).`);
  }

  // Section B
  lines.push(`\n## B) 필드 완성도 감사 (Field Completeness)`);
  lines.push(`\n각 LogicalCard 필드의 채움률 (%). `);
  lines.push(`※ nameKo는 ADV 시리즈 한국 미발매이므로 0% 예상 (Pokemon 카드는 PokeAPI로 채워질 수 있음).\n`);

  const bHeaders = ["세트", "총계", ...FIELDS];
  const bRows = SETS.map(s => {
    const stats = data.sectionB.get(s);
    if (!stats) return [s, "0", ...FIELDS.map(() => "—")];
    return [s, String(stats.total), ...FIELDS.map(f => pct(stats.fields[f], stats.total))];
  });
  lines.push(mdTable(bHeaders, bRows));

  const concerning: string[] = [];
  for (const s of SETS) {
    const stats = data.sectionB.get(s);
    if (!stats) continue;
    for (const f of FIELDS) {
      if (f === "nameKo" || f === "abilities") continue;
      if (stats.fields[f] === 0) concerning.push(`${s}.${f}`);
    }
  }
  if (concerning.length > 0) lines.push(`\n**주의:** 0% 필드: ${concerning.join(", ")}`);

  // Section C
  lines.push(`\n## C) 인덱스 연속성 (ID Contiguity)`);
  lines.push(`\n각 세트의 카드 ID가 1부터 {cardCount}까지 연속되는지 점검.\n`);

  const cHeaders = ["세트", "cardCount", "실제 수", "갭 수", "중복 수", "상태"];
  const cRows = data.sectionC.map(r => {
    const status = r.gaps.length === 0 && r.duplicates.length === 0 ? "✓" : "!";
    return [r.setKey, String(r.cardCount), String(r.cardCount - r.gaps.length), String(r.gaps.length), String(r.duplicates.length), status];
  });
  lines.push(mdTable(cHeaders, cRows));

  for (const r of data.sectionC) {
    if (r.gaps.length > 0) lines.push(`\n**${r.setKey} 갭:** ${r.gaps.map(n => String(n).padStart(3, "0")).join(", ")}`);
    if (r.duplicates.length > 0) lines.push(`\n**${r.setKey} 중복:** ${r.duplicates.map(n => String(n).padStart(3, "0")).join(", ")}`);
  }

  // Section E
  lines.push(`\n## E) 누락 이미지 카드 진단`);
  lines.push(`\nimageSmall이 NULL인 카드 — tcgdex API 탐침 (ADV 시리즈는 tcgdex 데이터 없음 → 404 예상).\n`);

  if (data.sectionE.length === 0) {
    lines.push(`> 누락 이미지 카드 없음 — 모든 카드에 imageSmall URL 존재.`);
  } else {
    const eHeaders = ["세트", "번호", "이름", "tcgdex 상태", "tcgdex 이름", "DB 존재"];
    const eRows = data.sectionE.map(p => [
      p.set, p.number, p.name, String(p.tcgdexStatus),
      p.tcgdexName ?? "—", p.inDb ? "O" : "X",
    ]);
    lines.push(mdTable(eHeaders, eRows));
    const e404 = data.sectionE.filter(p => p.tcgdexStatus === 404).length;
    lines.push(`\n**요약:** tcgdex 404=${e404}건 (ADV 시리즈 미수록 — 정상)`);
  }

  // Section F
  lines.push(`\n## F) Supertype 분류`);
  lines.push(`\n각 세트의 LogicalCard.supertype 값 분포.\n`);

  const allSupertypes = new Set<string>();
  for (const stats of data.sectionF) for (const k of stats.counts.keys()) allSupertypes.add(k);
  const stypes = [...allSupertypes].sort();

  const fHeaders = ["세트", "합계", ...stypes];
  const fRows = data.sectionF.map(stats => {
    const total = [...stats.counts.values()].reduce((a, b) => a + b, 0);
    return [stats.setKey, String(total), ...stypes.map(t => String(stats.counts.get(t) ?? 0))];
  });
  lines.push(mdTable(fHeaders, fRows));

  const nullCards = data.sectionF.flatMap(s => s.nullCards);
  if (nullCards.length > 0) {
    lines.push(`\n### Null supertype 카드 (${nullCards.length}건)`);
    lines.push(mdTable(["LogicalCard ID", "이름"], nullCards.map(c => [c.id, c.name])));
  } else {
    lines.push(`\n> 모든 카드에 supertype 존재.`);
  }

  // Section G — Deferred
  lines.push(`\n## G) EN 교차 검증 — 보류 (Deferred)`);
  lines.push(`\n> **사유:** ADV 시리즈(adv1~5)는 EN EX 시리즈와 카드 구성이 상이하여 단순 ID 매핑 불가. 별도 대응 테이블 작성 후 진행 예정.\n`);

  // Section H
  lines.push(`## H) 버전 가용성 (RegionCard 언어 분포)`);
  lines.push(`\n각 LogicalCard의 RegionCard 언어 조합. ADV는 한국 미발매이므로 ja only 예상.\n`);

  const allPatterns = new Set<string>();
  for (const stats of data.sectionH) for (const k of stats.patterns.keys()) allPatterns.add(k);
  const patterns = [...allPatterns].sort();

  const hHeaders = ["세트", "총계", ...patterns];
  const hRows = data.sectionH.map(stats => {
    const total = [...stats.patterns.values()].reduce((a, b) => a + b, 0);
    return [stats.setKey, String(total), ...patterns.map(p => String(stats.patterns.get(p) ?? 0))];
  });
  lines.push(mdTable(hHeaders, hRows));

  const allMulti = data.sectionH.flatMap(s => s.multiLocale);
  if (allMulti.length > 0) {
    lines.push(`\n### 다중 언어 RegionCard 보유 카드 (${allMulti.length}건)`);
    lines.push(mdTable(["LogicalCard ID", "언어"], allMulti.map(c => [c.id, c.langs.join(", ")])));
  } else {
    lines.push(`\n> 모든 ADV 카드가 ja 단일 언어 — 정상.`);
  }

  // Recommended Actions
  lines.push(`\n## 권장 액션 (Recommended Actions)`);
  lines.push(``);
  const actions: { priority: string; action: string }[] = [];

  if (data.sectionA.failures.length > 0)
    actions.push({ priority: "P1", action: `이미지 미확보 ${data.sectionA.failures.length}건 — Supabase Storage 재업로드 필요` });

  const eRecoverable = data.sectionE.filter(p => p.tcgdexStatus === 200);
  if (eRecoverable.length > 0)
    actions.push({ priority: "P1", action: `누락 카드 ${eRecoverable.length}건 tcgdex에 존재 → 이미지 소스 별도 확보` });

  const lowFields: string[] = [];
  for (const s of SETS) {
    const stats = data.sectionB.get(s);
    if (!stats) continue;
    for (const f of ["hp", "types", "attacks", "supertype"] as FieldKey[]) {
      const rate = stats.total > 0 ? (stats.fields[f] / stats.total) : 1;
      if (rate < 0.5) lowFields.push(`${s}.${f}(${pct(stats.fields[f], stats.total)})`);
    }
  }
  if (lowFields.length > 0)
    actions.push({ priority: "P2", action: `필드 채움률 50% 미만: ${lowFields.join(", ")} — tcgdex ADV 데이터 없음, 수동 보강 필요` });

  const gapSets = data.sectionC.filter(r => r.gaps.length > 0);
  if (gapSets.length > 0)
    actions.push({ priority: "P2", action: `ID 갭 존재 세트: ${gapSets.map(r => `${r.setKey}(${r.gaps.length}갭)`).join(", ")} — 카드 누락 확인` });

  if (nullCards.length > 0)
    actions.push({ priority: "P2", action: `supertype null ${nullCards.length}건 — Pokemon/Trainer/Energy 수동 분류 필요` });

  const noIllustrator: string[] = [];
  for (const s of SETS) {
    const stats = data.sectionB.get(s);
    if (!stats) continue;
    const rate = stats.total > 0 ? (stats.fields["illustrator"] / stats.total) : 1;
    if (rate < 0.3) noIllustrator.push(`${s}(${pct(stats.fields["illustrator"], stats.total)})`);
  }
  if (noIllustrator.length > 0)
    actions.push({ priority: "P3", action: `illustrator 채움률 낮음: ${noIllustrator.join(", ")} — Bulbapedia 재시도 또는 수동 입력` });

  actions.push({ priority: "P3", action: `tcgdex ADV1~5 카드 데이터 없음 — 향후 tcgdex 추가 시 재보강 가능` });
  actions.push({ priority: "P3", action: `EN 교차 검증 보류 — JP↔EN 카드 대응 테이블 작성 후 별도 스크립트 실행` });

  lines.push(`| 우선순위 | 액션 |`);
  lines.push(`| --- | --- |`);
  for (const a of actions) lines.push(`| **${a.priority}** | ${a.action} |`);

  lines.push(``);
  lines.push(`---`);
  lines.push(`*자동 생성: scripts/phase-a-verify-adv.ts*`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Phase A Verification: ADV1~5 ===\n");

  const ADV_SET_IDS = ["jp-tcg-ADV1", "jp-tcg-ADV2", "jp-tcg-ADV3", "jp-tcg-ADV4", "jp-tcg-ADV5"];

  const sets = await prisma.set.findMany({
    where: { id: { in: ADV_SET_IDS } },
    select: { id: true, name: true, cardCount: true },
    orderBy: { id: "asc" },
  });

  const locales = await prisma.regionCard.findMany({
    where: { setId: { in: ADV_SET_IDS } },
    select: { id: true, name: true, setId: true, imageSmall: true },
    orderBy: { id: "asc" },
  });

  const lcards = await prisma.logicalCard.findMany({
    where: { primarySetId: { in: ADV_SET_IDS } },
    select: {
      id: true, primarySetId: true, primaryNumber: true,
      hp: true, types: true, attacks: true, abilities: true,
      subtypes: true, illustrator: true, rarityId: true,
      pokedexNumbers: true, supertype: true, nameKo: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`Loaded: ${sets.length} sets, ${locales.length} RegionCard, ${lcards.length} LogicalCard`);

  const resA = await sectionA(locales);
  const resB = await sectionB(lcards);
  const resC = await sectionC(locales, sets);
  const resE = await sectionE(locales, lcards);
  const resF = await sectionF(lcards, locales);
  const resH = await sectionH(lcards);

  const report = buildReport({
    setDefs: sets,
    sectionA: resA,
    sectionB: resB,
    sectionC: resC,
    sectionE: resE,
    sectionF: resF,
    sectionH: resH,
  });

  const outPath = path.join(__dirname, "..", "docs", "phase-a-verification-adv.md");
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\nReport written: ${outPath}`);

  console.log("\n=== SUMMARY ===");
  const totalCards = locales.length;
  const totalOk = [...resA.perSet.values()].reduce((a, s) => a + s.ok, 0);
  console.log(`A) Images: ${totalOk}/${totalCards} OK (${resA.failures.length} failed)`);

  for (const [setKey, stats] of resB) {
    console.log(`B) ${setKey}: hp=${pct(stats.fields.hp, stats.total)} attacks=${pct(stats.fields.attacks, stats.total)} nameKo=${pct(stats.fields.nameKo, stats.total)}`);
  }

  const gapCount = resC.reduce((a, r) => a + r.gaps.length, 0);
  const dupCount = resC.reduce((a, r) => a + r.duplicates.length, 0);
  console.log(`C) Contiguity: ${gapCount} gaps, ${dupCount} duplicates`);

  const e200 = resE.filter(p => p.tcgdexStatus === 200).length;
  const e404 = resE.filter(p => p.tcgdexStatus === 404).length;
  console.log(`E) Missing images: ${resE.length} total, tcgdex 200=${e200}, 404=${e404}`);

  const nullSupertype = resF.reduce((a, s) => a + s.nullCards.length, 0);
  console.log(`F) Null supertype: ${nullSupertype} cards`);
  console.log(`G) EN cross-check: DEFERRED`);
  const multiLocale = resH.reduce((a, s) => a + s.multiLocale.length, 0);
  console.log(`H) Multi-locale cards: ${multiLocale}`);

  console.log("\n=== CRITICAL FINDINGS ===");
  if (resA.failures.length > 0) console.log(`! ${resA.failures.length} images returning non-200`);
  if (e200 > 0) console.log(`! ${e200} missing cards exist in tcgdex — recoverable`);
  if (gapCount > 0) console.log(`! ${gapCount} ID gaps across sets`);
  if (nullSupertype > 0) console.log(`! ${nullSupertype} cards with null supertype`);
  if (resA.failures.length === 0 && resE.length === 0 && gapCount === 0 && nullSupertype === 0) {
    console.log(`  All checks CLEAN.`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
