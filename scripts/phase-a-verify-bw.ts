/**
 * Phase A Verification: BW sets (bwp, bw1~bw11, dv1)
 *
 * Sections:
 *   A) Image liveness — EN (pokemontcg.io URLs)
 *   B) Field completeness audit per set
 *   C) ID contiguity check (gaps/duplicates)
 *   E) Missing cards (NULL imageSmall)
 *   F) Supertype classification per set
 *   H) Version availability (CardLocale language breakdown)
 *   (G — EN ↔ JP cross-check — deferred)
 *
 * Run: npx tsx scripts/phase-a-verify-bw.ts
 * Output: docs/phase-a-verification-bw.md
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
  } catch { return 0; }
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
// Set definitions
// ---------------------------------------------------------------------------

const BW_SET_KEYS = ["bwp", "bw1", "bw2", "bw3", "bw4", "bw5", "bw6", "dv1", "bw7", "bw8", "bw9", "bw10", "bw11"];
const EN_BW_SET_IDS = BW_SET_KEYS.map(k => `en-tcg-${k}`);
const JP_BW_SET_IDS = BW_SET_KEYS.filter(k => k !== "bwp").map(k => `jp-tcg-${k}`);
const BW_GROUP_IDS = BW_SET_KEYS.map(k => `og-${k}`);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardLocaleRow {
  id: string; name: string; setId: string; language: string; imageSmall: string | null;
}
interface ImageResult {
  id: string; name: string; setId: string; url: string; status: number; region: "EN" | "JP";
}
interface LogicalCardRow {
  id: string; primarySetId: string | null; primaryNumber: string | null;
  setGroupId: string | null;
  hp: number | null; types: string[]; attacks: unknown; abilities: unknown;
  subtypes: string[]; illustrator: string | null; rarityId: string | null;
  pokedexNumbers: number[]; supertype: string | null; nameKo: string | null;
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

// ---------------------------------------------------------------------------
// Section A: Image liveness
// ---------------------------------------------------------------------------

async function sectionA(enLocales: CardLocaleRow[], jpLocales: CardLocaleRow[]): Promise<{
  perSet: Map<string, { enOk: number; enFail: number; jpOk: number; jpFail: number }>;
  failures: ImageResult[];
}> {
  const allLocales = [
    ...enLocales.map(c => ({ ...c, region: "EN" as const })),
    ...jpLocales.map(c => ({ ...c, region: "JP" as const })),
  ];
  console.log(`\n[A] Image liveness — ${enLocales.length} EN + ${jpLocales.length} JP (10 concurrent)...`);

  const tasks = allLocales.map(card => async (): Promise<ImageResult> => {
    const url = card.imageSmall ?? "";
    const status = url ? await curlHead(url) : 0;
    return { id: card.id, name: card.name, setId: card.setId, url, status, region: card.region };
  });

  const results = await pLimit(tasks, 10);
  const perSet = new Map<string, { enOk: number; enFail: number; jpOk: number; jpFail: number }>();
  const failures: ImageResult[] = [];

  for (const r of results) {
    const key = r.setId.replace(/^(?:en|jp)-tcg-/, "");
    if (!perSet.has(key)) perSet.set(key, { enOk: 0, enFail: 0, jpOk: 0, jpFail: 0 });
    const s = perSet.get(key)!;
    if (r.region === "EN") {
      if (r.status === 200) s.enOk++; else { s.enFail++; failures.push(r); }
    } else {
      if (r.status === 200) s.jpOk++; else { s.jpFail++; failures.push(r); }
    }
  }

  const totalOk = results.filter(r => r.status === 200).length;
  console.log(`  [A] ${totalOk}/${allLocales.length} OK, ${failures.length} failed`);
  return { perSet, failures };
}

// ---------------------------------------------------------------------------
// Section B: Field completeness
// ---------------------------------------------------------------------------

interface SetFieldStats { total: number; fields: Record<FieldKey, number>; }

async function sectionB(lcards: LogicalCardRow[]): Promise<Map<string, SetFieldStats>> {
  console.log(`\n[B] Field completeness — ${lcards.length} LogicalCards...`);
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const perSet = new Map<string, SetFieldStats>();

  for (const card of lcards) {
    const setKey = card.setGroupId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
    if (!perSet.has(setKey)) {
      perSet.set(setKey, { total: 0, fields: Object.fromEntries(FIELDS.map(f => [f, 0])) as Record<FieldKey, number> });
    }
    const s = perSet.get(setKey)!;
    s.total++;
    for (const f of FIELDS) { if (isPresent(card, f)) s.fields[f]++; }
  }

  for (const [setKey, stats] of perSet) {
    console.log(`  [B] ${setKey}: ${stats.total} cards, hp=${pct(stats.fields.hp, stats.total)}, illustrator=${pct(stats.fields.illustrator, stats.total)}`);
  }
  return perSet;
}

// ---------------------------------------------------------------------------
// Section C: ID contiguity
// ---------------------------------------------------------------------------

interface ContiguityResult {
  setKey: string; region: string; cardCount: number; actual: number; gaps: number[]; duplicates: number[];
}

async function sectionC(
  enLocales: CardLocaleRow[], jpLocales: CardLocaleRow[],
  sets: { id: string; cardCount: number | null }[]
): Promise<ContiguityResult[]> {
  console.log(`\n[C] ID contiguity...`);
  const results: ContiguityResult[] = [];
  const setCountMap = new Map(sets.map(s => [s.id, s.cardCount ?? 0]));

  function check(locales: CardLocaleRow[], region: string): void {
    const bySet = new Map<string, number[]>();
    for (const card of locales) {
      const numMatch = card.id.match(/-(\d+)$/);
      if (!numMatch) continue;
      if (!bySet.has(card.setId)) bySet.set(card.setId, []);
      bySet.get(card.setId)!.push(parseInt(numMatch[1], 10));
    }
    for (const [setId, nums] of bySet) {
      const count = setCountMap.get(setId) ?? nums.length;
      const key = setId.replace(/^(?:en|jp)-tcg-/, "");
      nums.sort((a, b) => a - b);
      const seen = new Set<number>();
      const duplicates: number[] = [];
      for (const n of nums) { if (seen.has(n)) duplicates.push(n); seen.add(n); }
      const gaps: number[] = [];
      for (let i = 1; i <= count; i++) { if (!seen.has(i)) gaps.push(i); }
      results.push({ setKey: key, region, cardCount: count, actual: nums.length, gaps, duplicates });
      console.log(`  [C] ${region} ${key}: ${nums.length}/${count}, gaps=${gaps.length}, dups=${duplicates.length}`);
    }
  }

  check(enLocales, "EN");
  check(jpLocales, "JP");
  return results;
}

// ---------------------------------------------------------------------------
// Section E: Missing imageSmall
// ---------------------------------------------------------------------------

async function sectionE(enLocales: CardLocaleRow[], jpLocales: CardLocaleRow[]) {
  const enMissing = enLocales.filter(c => !c.imageSmall);
  const jpMissing = jpLocales.filter(c => !c.imageSmall);
  console.log(`\n[E] Missing imageSmall — EN: ${enMissing.length}, JP: ${jpMissing.length}`);
  return { enMissing, jpMissing };
}

// ---------------------------------------------------------------------------
// Section F: Supertype classification
// ---------------------------------------------------------------------------

interface SupertypeStats {
  setKey: string; counts: Map<string, number>; nullCards: { id: string; name: string }[];
}

async function sectionF(lcards: LogicalCardRow[], locales: CardLocaleRow[]): Promise<SupertypeStats[]> {
  console.log(`\n[F] Supertype classification...`);
  const nameMap = new Map<string, string>();
  for (const cl of locales) { nameMap.set(cl.id, cl.name); }

  const bySet = new Map<string, SupertypeStats>();
  for (const card of lcards) {
    const setKey = card.setGroupId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
    if (!bySet.has(setKey)) bySet.set(setKey, { setKey, counts: new Map(), nullCards: [] });
    const s = bySet.get(setKey)!;
    const st = card.supertype ?? "(null)";
    s.counts.set(st, (s.counts.get(st) ?? 0) + 1);
    if (!card.supertype) s.nullCards.push({ id: card.id, name: nameMap.get(card.id) ?? card.id });
  }

  for (const [, stats] of bySet) {
    console.log(`  [F] ${stats.setKey}:`, Object.fromEntries(stats.counts));
  }
  return [...bySet.values()];
}

// ---------------------------------------------------------------------------
// Section H: Version availability
// ---------------------------------------------------------------------------

interface LocaleStats { setKey: string; patterns: Map<string, number>; }

async function sectionH(allLcards: LogicalCardRow[]): Promise<LocaleStats[]> {
  console.log(`\n[H] Version availability...`);
  const lcIds = allLcards.map(c => c.id);
  const localeRows = await prisma.cardLocale.findMany({
    where: { logicalCardId: { in: lcIds } },
    select: { logicalCardId: true, language: true },
  });

  const byLcId = new Map<string, string[]>();
  for (const row of localeRows) {
    if (!byLcId.has(row.logicalCardId)) byLcId.set(row.logicalCardId, []);
    byLcId.get(row.logicalCardId)!.push(row.language);
  }

  const bySet = new Map<string, LocaleStats>();
  for (const card of allLcards) {
    const setKey = card.setGroupId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
    if (!bySet.has(setKey)) bySet.set(setKey, { setKey, patterns: new Map() });
    const s = bySet.get(setKey)!;
    const langs = (byLcId.get(card.id) ?? []).sort().join("+") || "(none)";
    s.patterns.set(langs, (s.patterns.get(langs) ?? 0) + 1);
  }

  for (const [, stats] of bySet) {
    console.log(`  [H] ${stats.setKey}:`, Object.fromEntries(stats.patterns));
  }
  return [...bySet.values()];
}

// ---------------------------------------------------------------------------
// Per-set count summary
// ---------------------------------------------------------------------------

async function sectionCounts(): Promise<{ setId: string; enCount: number; jpCount: number; logoUrl: string | null; symbolUrl: string | null }[]> {
  const rows: { setId: string; enCount: number; jpCount: number; logoUrl: string | null; symbolUrl: string | null }[] = [];
  for (const key of BW_SET_KEYS) {
    const enSetId = `en-tcg-${key}`;
    const jpSetId = `jp-tcg-${key}`;
    const enCount = await prisma.cardLocale.count({ where: { setId: enSetId } });
    const jpCount = key === "bwp" ? 0 : await prisma.cardLocale.count({ where: { setId: jpSetId } });
    const enSet = await prisma.set.findUnique({ where: { id: enSetId }, select: { logoUrl: true, symbolUrl: true } });
    rows.push({ setId: key, enCount, jpCount, logoUrl: enSet?.logoUrl ?? null, symbolUrl: enSet?.symbolUrl ?? null });
    console.log(`  [counts] ${key}: EN=${enCount}, JP=${jpCount}, logo=${!!enSet?.logoUrl}, symbol=${!!enSet?.symbolUrl}`);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function buildReport(data: {
  setDefs: { id: string; name: string; cardCount: number | null; region: string }[];
  counts: { setId: string; enCount: number; jpCount: number; logoUrl: string | null; symbolUrl: string | null }[];
  sectionA: { perSet: Map<string, { enOk: number; enFail: number; jpOk: number; jpFail: number }>; failures: ImageResult[] };
  sectionB: Map<string, SetFieldStats>;
  sectionC: ContiguityResult[];
  sectionE: { enMissing: CardLocaleRow[]; jpMissing: CardLocaleRow[] };
  sectionF: SupertypeStats[];
  sectionH: LocaleStats[];
}): string {
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const lines: string[] = [];
  const now = new Date().toISOString().replace("T"," ").substring(0,19) + " UTC";

  lines.push(`# Phase A Verification: BW Sets`);
  lines.push(`\n생성 일시: ${now}\n`);
  lines.push(`대상: EN BW (bwp, bw1~bw11, dv1) + JP BW overlay (bwp 제외).\n`);

  // ── Per-set counts ──
  lines.push(`## 0) 세트별 카드 수 & 로고`);
  lines.push(`\nEN 등록 수, JP 오버레이 매칭 수, 로고/심볼 상태.\n`);
  lines.push(mdTable(
    ["세트", "EN 등록", "JP 매칭", "로고", "심볼"],
    data.counts.map(r => [
      r.setId,
      String(r.enCount),
      r.setId === "bwp" ? "(skip)" : String(r.jpCount),
      r.logoUrl ? "✓" : "✗",
      r.symbolUrl ? "✓" : "✗",
    ])
  ));
  const totalEn = data.counts.reduce((a, r) => a + r.enCount, 0);
  const totalJp = data.counts.filter(r => r.setId !== "bwp").reduce((a, r) => a + r.jpCount, 0);
  lines.push(`\n**EN 합계:** ${totalEn}  **JP 합계:** ${totalJp}`);

  // ── Section A ──
  lines.push(`\n## A) 이미지 라이브니스`);
  lines.push(`\nEN(pokemontcg.io) 및 JP(Bulbapedia) 이미지 HTTP 상태 점검 (HEAD, 10 concurrent).\n`);
  const aKeys = [...new Set([...data.sectionA.perSet.keys()])].sort();
  lines.push(mdTable(
    ["세트","EN OK","EN 실패","JP OK","JP 실패","EN 성공률","JP 성공률"],
    aKeys.map(k => {
      const s = data.sectionA.perSet.get(k) ?? { enOk: 0, enFail: 0, jpOk: 0, jpFail: 0 };
      return [k, String(s.enOk), String(s.enFail), String(s.jpOk), String(s.jpFail), pct(s.enOk, s.enOk+s.enFail), pct(s.jpOk, s.jpOk+s.jpFail)];
    })
  ));

  const totalEnOk = [...data.sectionA.perSet.values()].reduce((a,s)=>a+s.enOk,0);
  const totalEnFail = [...data.sectionA.perSet.values()].reduce((a,s)=>a+s.enFail,0);
  const totalJpOk = [...data.sectionA.perSet.values()].reduce((a,s)=>a+s.jpOk,0);
  const totalJpFail = [...data.sectionA.perSet.values()].reduce((a,s)=>a+s.jpFail,0);
  lines.push(`\n**EN 전체:** ${totalEnOk}/${totalEnOk+totalEnFail} (${pct(totalEnOk,totalEnOk+totalEnFail)})`);
  lines.push(`**JP 전체:** ${totalJpOk}/${totalJpOk+totalJpFail} (${pct(totalJpOk,totalJpOk+totalJpFail)})\n`);

  if (data.sectionA.failures.length > 0) {
    lines.push(`### 실패 목록 (${data.sectionA.failures.length}건)`);
    lines.push(mdTable(["ID","이름","Region","URL","HTTP"], data.sectionA.failures.slice(0,50).map(f=>[f.id,f.name,f.region,f.url||"(null)",String(f.status)])));
    if (data.sectionA.failures.length > 50) lines.push(`(... ${data.sectionA.failures.length-50}건 생략)`);
  } else {
    lines.push(`> 모든 이미지 정상.`);
  }

  // ── Section B ──
  lines.push(`\n## B) 필드 완성도`);
  lines.push(`\n각 SetGroup 의 LogicalCard 필드 채움률.\n`);
  const bKeys = [...data.sectionB.keys()].sort();
  lines.push(mdTable(
    ["세트","총계",...FIELDS],
    bKeys.map(k => {
      const stats = data.sectionB.get(k)!;
      return [k, String(stats.total), ...FIELDS.map(f=>pct(stats.fields[f],stats.total))];
    })
  ));

  // ── Section C ──
  lines.push(`\n## C) 인덱스 연속성`);
  lines.push(`\nCardLocale ID 가 1~N 연속인지 점검.\n`);
  lines.push(mdTable(
    ["세트","Region","cardCount","실제","갭","중복","상태"],
    data.sectionC.map(r => {
      const status = r.gaps.length === 0 && r.duplicates.length === 0 ? "✓" : "!";
      return [r.setKey, r.region, String(r.cardCount), String(r.actual), String(r.gaps.length), String(r.duplicates.length), status];
    })
  ));
  for (const r of data.sectionC) {
    if (r.gaps.length > 0 && r.gaps.length <= 20) {
      lines.push(`\n**${r.region} ${r.setKey} 갭:** ${r.gaps.map(n=>String(n).padStart(3,"0")).join(", ")}`);
    } else if (r.gaps.length > 20) {
      lines.push(`\n**${r.region} ${r.setKey} 갭:** ${r.gaps.length}건 (첫 5: ${r.gaps.slice(0,5).map(n=>String(n).padStart(3,"0")).join(", ")}...)`);
    }
  }

  // ── Section E ──
  lines.push(`\n## E) 누락 이미지 카드`);
  if (data.sectionE.enMissing.length === 0 && data.sectionE.jpMissing.length === 0) {
    lines.push(`\n> 누락 이미지 없음.`);
  } else {
    if (data.sectionE.enMissing.length > 0) {
      lines.push(`\n### EN 누락 (${data.sectionE.enMissing.length}건)`);
      lines.push(mdTable(["ID","이름","세트"], data.sectionE.enMissing.map(c=>[c.id,c.name,c.setId])));
    }
    if (data.sectionE.jpMissing.length > 0) {
      lines.push(`\n### JP 누락 (${data.sectionE.jpMissing.length}건)`);
      lines.push(mdTable(["ID","이름","세트"], data.sectionE.jpMissing.slice(0,50).map(c=>[c.id,c.name,c.setId])));
      if (data.sectionE.jpMissing.length > 50) lines.push(`(... ${data.sectionE.jpMissing.length-50}건 생략)`);
    }
  }

  // ── Section F ──
  lines.push(`\n## F) Supertype 분류`);
  const allSt = new Set<string>();
  for (const s of data.sectionF) for (const k of s.counts.keys()) allSt.add(k);
  const stypes = [...allSt].sort();
  lines.push(mdTable(["세트","합계",...stypes], data.sectionF.map(s=>{
    const total = [...s.counts.values()].reduce((a,b)=>a+b,0);
    return [s.setKey, String(total), ...stypes.map(t=>String(s.counts.get(t)??0))];
  })));
  const nullCards = data.sectionF.flatMap(s=>s.nullCards);
  if (nullCards.length > 0) {
    lines.push(`\n### Null supertype (${nullCards.length}건)`);
    lines.push(mdTable(["LogicalCard ID","이름"], nullCards.map(c=>[c.id,c.name])));
  } else {
    lines.push(`\n> 모든 카드에 supertype 존재.`);
  }

  // ── Section G (deferred) ──
  lines.push(`\n## G) EN ↔ JP 로케일 대응`);
  lines.push(`\n> 섹션 G 는 이번 Phase 에서 defer. JP 오버레이 완료 후 별도 실행.\n`);

  // ── Section H ──
  lines.push(`\n## H) 버전 가용성 (언어 조합)`);
  const allPatterns = new Set<string>();
  for (const s of data.sectionH) for (const k of s.patterns.keys()) allPatterns.add(k);
  const patterns = [...allPatterns].sort();
  lines.push(mdTable(
    ["세트","총계",...patterns],
    data.sectionH.map(s=>{
      const total = [...s.patterns.values()].reduce((a,b)=>a+b,0);
      return [s.setKey, String(total), ...patterns.map(p=>String(s.patterns.get(p)??0))];
    })
  ));

  // ── Actions ──
  lines.push(`\n## 권장 액션`);
  const actions: { priority: string; action: string }[] = [];
  if (data.sectionA.failures.filter(f=>f.region==="EN").length > 0)
    actions.push({ priority: "P1", action: `EN 이미지 HTTP 비200 ${data.sectionA.failures.filter(f=>f.region==="EN").length}건` });
  if (data.sectionE.enMissing.length > 0)
    actions.push({ priority: "P1", action: `EN imageSmall 누락 ${data.sectionE.enMissing.length}건` });
  if (data.sectionE.jpMissing.length > 0)
    actions.push({ priority: "P2", action: `JP imageSmall 누락 ${data.sectionE.jpMissing.length}건 — Bulbapedia URL 재탐색` });
  const gapSets = data.sectionC.filter(r=>r.gaps.length>0);
  if (gapSets.length>0)
    actions.push({ priority: "P2", action: `ID 갭: ${gapSets.map(r=>`${r.region} ${r.setKey}(${r.gaps.length})`).join(", ")}` });
  const nullSuper = data.sectionF.reduce((a,s)=>a+s.nullCards.length,0);
  if (nullSuper>0) actions.push({ priority: "P2", action: `supertype null ${nullSuper}건` });
  const lowIll: string[] = [];
  for (const [k,stats] of data.sectionB) {
    const rate = stats.total > 0 ? stats.fields.illustrator/stats.total : 1;
    if (rate < 0.5) lowIll.push(`${k}(${pct(stats.fields.illustrator,stats.total)})`);
  }
  if (lowIll.length>0) actions.push({ priority: "P3", action: `illustrator 50% 미만: ${lowIll.join(", ")}` });

  if (actions.length === 0) {
    lines.push(`\n> 권장 액션 없음. 모든 섹션 정상.`);
  } else {
    lines.push(mdTable(["우선순위","액션"], actions.map(a=>[a.priority, a.action])));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Phase A Verification: BW ===");

  const allSets = await prisma.set.findMany({
    where: { id: { in: [...EN_BW_SET_IDS, ...JP_BW_SET_IDS] } },
    select: { id: true, name: true, cardCount: true, region: true },
  });

  const enLocales = await prisma.cardLocale.findMany({
    where: { setId: { in: EN_BW_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  const jpLocales = await prisma.cardLocale.findMany({
    where: { setId: { in: JP_BW_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  const lcards = await prisma.logicalCard.findMany({
    where: { setGroupId: { in: BW_GROUP_IDS } },
    select: { id: true, primarySetId: true, primaryNumber: true, setGroupId: true, hp: true, types: true, attacks: true, abilities: true, subtypes: true, illustrator: true, rarityId: true, pokedexNumbers: true, supertype: true, nameKo: true },
  });

  console.log(`Loaded: ${enLocales.length} EN locales, ${jpLocales.length} JP locales, ${lcards.length} LogicalCards`);

  const counts = await sectionCounts();
  const resA = await sectionA(enLocales, jpLocales);
  const resB = await sectionB(lcards);
  const resC = await sectionC(enLocales, jpLocales, allSets);
  const resE = await sectionE(enLocales, jpLocales);
  const resF = await sectionF(lcards, [...enLocales, ...jpLocales]);
  const resH = await sectionH(lcards);

  const report = buildReport({
    setDefs: allSets,
    counts,
    sectionA: resA,
    sectionB: resB,
    sectionC: resC,
    sectionE: resE,
    sectionF: resF,
    sectionH: resH,
  });

  const outPath = path.join(process.cwd(), "docs", "phase-a-verification-bw.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\n✓ Report saved: ${outPath}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
