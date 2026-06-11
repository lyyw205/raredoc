/**
 * Phase A Verification: JP L sets (l1a~l3) + EN HGSS sets (hgss1~col1)
 *
 * Sections:
 *   A) Image liveness — EN (pokemontcg.io URLs) + JP (Supabase/tcgplayer URLs)
 *   B) Field completeness audit per set
 *   C) ID contiguity check (gaps/duplicates)
 *   E) Missing cards (NULL imageSmall)
 *   F) Supertype classification per set
 *   G) EN ↔ JP cross-check (locale pairing) — HGSS only
 *   H) Version availability (CardLocale language breakdown)
 *
 * Run: npx tsx scripts/phase-a-verify-lhgss.ts
 * Output: docs/phase-a-verification-lhgss.md
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

// JP L sets
const JP_L_SET_IDS = ["jp-tcg-L1a", "jp-tcg-L1b", "jp-tcg-L2", "jp-tcg-LL", "jp-tcg-L3"];
const JP_L_GROUP_IDS = ["og-l1a", "og-l1b", "og-l2", "og-ll", "og-l3"];

// HGSS EN + JP sets
const HGSS_SET_KEYS = ["hgss1", "hsp", "hgss2", "hgss3", "hgss4", "col1"];
const EN_HGSS_SET_IDS = HGSS_SET_KEYS.map(k => `en-tcg-${k}`);
const JP_HGSS_SET_IDS = HGSS_SET_KEYS.filter(k => k !== "hsp").map(k => `jp-tcg-${k}`);

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
  cardPackId: string | null;
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
    // Key: cardPackId for JP-L cards, primarySetId for HGSS EN
    const setKey = card.cardPackId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
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
    const setKey = card.cardPackId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
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
// Section G: EN ↔ JP locale pairing (HGSS only)
// ---------------------------------------------------------------------------

interface LocalePairingResult {
  setKey: string; enCount: number; jpCount: number; paired: number; enOnly: number; jpOnly: number;
}

async function sectionG(
  hgssLcards: LogicalCardRow[],
  enLocales: CardLocaleRow[],
): Promise<LocalePairingResult[]> {
  console.log(`\n[G] EN ↔ JP locale pairing (HGSS)...`);

  const enByLC = new Map<string, string>();
  for (const cl of enLocales) {
    const lc = cl.id.replace("en-tcg-", "lc-en-tcg-");
    enByLC.set(lc, cl.id);
  }

  const jpLocalesByLC = await prisma.cardLocale.findMany({
    where: { setId: { in: JP_HGSS_SET_IDS } },
    select: { logicalCardId: true, setId: true },
  });
  const jpLCSet = new Set(jpLocalesByLC.map(r => r.logicalCardId));

  const bySet = new Map<string, LocalePairingResult>();
  for (const card of hgssLcards) {
    const setKey = (card.primarySetId ?? "").replace("en-tcg-", "");
    if (!bySet.has(setKey)) bySet.set(setKey, { setKey, enCount: 0, jpCount: 0, paired: 0, enOnly: 0, jpOnly: 0 });
    const s = bySet.get(setKey)!;
    const hasEn = enByLC.has(card.id);
    const hasJp = jpLCSet.has(card.id);
    if (hasEn) s.enCount++;
    if (hasJp) s.jpCount++;
    if (hasEn && hasJp) s.paired++;
    if (hasEn && !hasJp) s.enOnly++;
    if (!hasEn && hasJp) s.jpOnly++;
  }

  for (const [, r] of bySet) {
    console.log(`  [G] ${r.setKey}: EN=${r.enCount}, JP=${r.jpCount}, paired=${r.paired}`);
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
    const setKey = card.cardPackId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
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
// Report generation
// ---------------------------------------------------------------------------

function buildReport(data: {
  setDefs: { id: string; name: string; cardCount: number | null; region: string }[];
  sectionA: { perSet: Map<string, { enOk: number; enFail: number; jpOk: number; jpFail: number }>; failures: ImageResult[] };
  sectionB: Map<string, SetFieldStats>;
  sectionC: ContiguityResult[];
  sectionE: { enMissing: CardLocaleRow[]; jpMissing: CardLocaleRow[] };
  sectionF: SupertypeStats[];
  sectionG: LocalePairingResult[];
  sectionH: LocaleStats[];
  tcgdexCoverage: { setId: string; dbCount: number; tcgdexCount: number }[];
}): string {
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const lines: string[] = [];
  const now = new Date().toISOString().replace("T"," ").substring(0,19) + " UTC";

  lines.push(`# Phase A Verification: JP L Sets + EN HGSS Sets`);
  lines.push(`\n생성 일시: ${now}\n`);
  lines.push(`대상: JP L (l1a, l1b, l2, ll, l3) + EN HGSS (hgss1, hsp, hgss2, hgss3, hgss4, col1).\n`);

  // ── tcgdex coverage ──
  lines.push(`## 0) tcgdex 커버리지 (JP L Sets)`);
  lines.push(`\ntcgdex 가 보유한 카드 수 vs DB cardCount.\n`);
  lines.push(mdTable(
    ["JP Set", "DB cardCount", "tcgdex 카드", "커버율", "비고"],
    data.tcgdexCoverage.map(r => [
      r.setId, String(r.dbCount), String(r.tcgdexCount),
      pct(r.tcgdexCount, r.dbCount),
      r.tcgdexCount < r.dbCount ? `${r.dbCount - r.tcgdexCount}장 미보유` : "✓ 완전"
    ])
  ));

  const setNameMap = new Map(data.setDefs.map(s => [s.id, s.name]));

  // ── Section A ──
  lines.push(`\n## A) 이미지 라이브니스 (Image Liveness)`);
  lines.push(`\nEN(pokemontcg.io) 및 JP(Supabase/archives) 이미지 HTTP 상태 점검 (HEAD, 10 concurrent).\n`);
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
    lines.push(mdTable(["ID","이름","Region","URL","HTTP"], data.sectionA.failures.map(f=>[f.id,f.name,f.region,f.url||"(null)",String(f.status)])));
  } else {
    lines.push(`> 모든 이미지 정상.`);
  }

  // ── Section B ──
  lines.push(`\n## B) 필드 완성도 감사 (Field Completeness)`);
  lines.push(`\n각 CardPack/Set 의 LogicalCard 필드 채움률.\n`);
  const bKeys = [...data.sectionB.keys()].sort();
  lines.push(mdTable(
    ["세트","총계",...FIELDS],
    bKeys.map(k => {
      const stats = data.sectionB.get(k)!;
      return [k, String(stats.total), ...FIELDS.map(f=>pct(stats.fields[f],stats.total))];
    })
  ));

  // ── Section C ──
  lines.push(`\n## C) 인덱스 연속성 (ID Contiguity)`);
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
  lines.push(`\nimageSmall 이 NULL 인 CardLocale.\n`);
  if (data.sectionE.enMissing.length === 0 && data.sectionE.jpMissing.length === 0) {
    lines.push(`> 누락 이미지 없음.`);
  } else {
    if (data.sectionE.enMissing.length > 0) {
      lines.push(`### EN 누락 (${data.sectionE.enMissing.length}건)`);
      lines.push(mdTable(["ID","이름","세트"], data.sectionE.enMissing.map(c=>[c.id,c.name,c.setId])));
    }
    if (data.sectionE.jpMissing.length > 0) {
      lines.push(`### JP 누락 (${data.sectionE.jpMissing.length}건)`);
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

  // ── Section G (HGSS only) ──
  lines.push(`\n## G) EN ↔ JP 로케일 대응 (HGSS)`);
  lines.push(`\nhsp 는 JP 대응 없음 (promo).\n`);
  if (data.sectionG.length === 0) {
    lines.push(`> HGSS EN 세트가 아직 없음 — sync-hgss-pokemontcgio.ts 실행 후 재실행.`);
  } else {
    lines.push(mdTable(
      ["세트","EN 카드","JP 카드","양쪽","EN만","JP만"],
      data.sectionG.map(r=>[r.setKey,String(r.enCount),String(r.jpCount),String(r.paired),String(r.enOnly),String(r.jpOnly)])
    ));
  }

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
  if (data.sectionA.failures.length > 0) actions.push({ priority: "P1", action: `이미지 HTTP 비200 ${data.sectionA.failures.length}건 — URL 재확인` });
  if (data.sectionE.enMissing.length > 0) actions.push({ priority: "P1", action: `EN imageSmall 누락 ${data.sectionE.enMissing.length}건` });
  if (data.sectionE.jpMissing.length > 0) actions.push({ priority: "P2", action: `JP imageSmall 누락 ${data.sectionE.jpMissing.length}건 — Bulbapedia 재탐색` });
  const gapSets = data.sectionC.filter(r=>r.gaps.length>0);
  if (gapSets.length>0) actions.push({ priority: "P2", action: `ID 갭: ${gapSets.map(r=>`${r.region} ${r.setKey}(${r.gaps.length})`).join(", ")}` });
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
  console.log("=== Phase A Verification: L + HGSS ===");

  // Fetch set metadata
  const allSets = await prisma.set.findMany({
    where: { id: { in: [...JP_L_SET_IDS, ...EN_HGSS_SET_IDS, ...JP_HGSS_SET_IDS] } },
    select: { id: true, name: true, cardCount: true, region: true },
  });

  // Fetch JP L locales
  const jpLLocales = await prisma.cardLocale.findMany({
    where: { setId: { in: JP_L_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  // Fetch HGSS EN locales
  const enHgssLocales = await prisma.cardLocale.findMany({
    where: { setId: { in: EN_HGSS_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  // Fetch HGSS JP locales
  const jpHgssLocales = await prisma.cardLocale.findMany({
    where: { setId: { in: JP_HGSS_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  const allJpLocales = [...jpLLocales, ...jpHgssLocales];
  const allEnLocales = enHgssLocales; // EN only = HGSS EN

  // Fetch L LogicalCards
  const lLcards = await prisma.logicalCard.findMany({
    where: { cardPackId: { in: JP_L_GROUP_IDS } },
    select: { id: true, primarySetId: true, primaryNumber: true, cardPackId: true, hp: true, types: true, attacks: true, abilities: true, subtypes: true, illustrator: true, rarityId: true, pokedexNumbers: true, supertype: true, nameKo: true },
  });

  // Fetch HGSS EN LogicalCards
  const hgssLcards = await prisma.logicalCard.findMany({
    where: { cardPackId: { in: HGSS_SET_KEYS.map(k => `og-${k}`) } },
    select: { id: true, primarySetId: true, primaryNumber: true, cardPackId: true, hp: true, types: true, attacks: true, abilities: true, subtypes: true, illustrator: true, rarityId: true, pokedexNumbers: true, supertype: true, nameKo: true },
  });

  const allLcards = [...lLcards, ...hgssLcards];

  // tcgdex coverage
  const JP_L_DB_COUNTS: Record<string, number> = {
    "jp-tcg-L1a": 142, "jp-tcg-L1b": 141, "jp-tcg-L2": 19, "jp-tcg-LL": 40, "jp-tcg-L3": 161,
  };
  const tcgdexCoverage = JP_L_SET_IDS.map(setId => {
    const actual = jpLLocales.filter(c => c.setId === setId).length;
    return { setId, dbCount: JP_L_DB_COUNTS[setId] ?? 0, tcgdexCount: actual };
  });

  // Run sections
  const resA = await sectionA(allEnLocales, allJpLocales);
  const resB = await sectionB(allLcards);
  const resC = await sectionC(allEnLocales, allJpLocales, allSets);
  const resE = await sectionE(allEnLocales, allJpLocales);
  const resF = await sectionF(allLcards, [...allEnLocales, ...allJpLocales]);
  const resG = await sectionG(hgssLcards, allEnLocales);
  const resH = await sectionH(allLcards);

  const report = buildReport({
    setDefs: allSets,
    sectionA: resA,
    sectionB: resB,
    sectionC: resC,
    sectionE: resE,
    sectionF: resF,
    sectionG: resG,
    sectionH: resH,
    tcgdexCoverage,
  });

  const outPath = path.join(process.cwd(), "docs", "phase-a-verification-lhgss.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\n✓ Report saved: ${outPath}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
