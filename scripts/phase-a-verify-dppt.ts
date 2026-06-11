/**
 * Phase A Verification: DP1~7 + PL1~4 (Diamond & Pearl / Platinum era)
 *
 * Sections:
 *   A) Image liveness — EN (pokemontcg.io URLs) + JP (archives.bulbagarden.net URLs)
 *   B) Field completeness audit per set
 *   C) ID contiguity check (gaps/duplicates)
 *   E) Missing cards (NULL imageSmall)
 *   F) Supertype classification per set
 *   G) EN ↔ JP cross-check (locale pairing)
 *   H) Version availability (RegionCard language breakdown)
 *
 * Run: npx tsx scripts/phase-a-verify-dppt.ts
 * Output: docs/phase-a-verification-dppt.md
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

const DP_SET_KEYS = ["dp1","dp2","dp3","dp4","dp5","dp6","dp7"];
const PL_SET_KEYS = ["pl1","pl2","pl3","pl4"];
const ALL_SET_KEYS = [...DP_SET_KEYS, ...PL_SET_KEYS];

const EN_SET_IDS = ALL_SET_KEYS.map(k => `en-tcg-${k}`);
const JP_SET_IDS = ALL_SET_KEYS.map(k => `jp-tcg-${k}`);
const ALL_SET_IDS = [...EN_SET_IDS, ...JP_SET_IDS];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegionCardRow {
  id: string;
  name: string;
  setId: string;
  language: string;
  imageSmall: string | null;
}

interface ImageResult {
  id: string;
  name: string;
  setId: string;
  url: string;
  status: number;
  region: "EN" | "JP";
}

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

// ---------------------------------------------------------------------------
// Section A: Image liveness (EN + JP separate)
// ---------------------------------------------------------------------------

async function sectionA(enLocales: RegionCardRow[], jpLocales: RegionCardRow[]): Promise<{
  perSet: Map<string, { enOk: number; enFail: number; jpOk: number; jpFail: number }>;
  failures: ImageResult[];
}> {
  const allLocales = [
    ...enLocales.map(c => ({ ...c, region: "EN" as const })),
    ...jpLocales.map(c => ({ ...c, region: "JP" as const })),
  ];
  console.log(`\n[A] Image liveness — ${enLocales.length} EN + ${jpLocales.length} JP cards (10 concurrent)...`);

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

interface SetFieldStats {
  total: number;
  fields: Record<FieldKey, number>;
}

async function sectionB(lcards: LogicalCardRow[]): Promise<Map<string, SetFieldStats>> {
  console.log(`\n[B] Field completeness — ${lcards.length} LogicalCards...`);
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const perSet = new Map<string, SetFieldStats>();

  for (const card of lcards) {
    const setKey = (card.primarySetId ?? "").replace("en-tcg-", "");
    if (!perSet.has(setKey)) {
      perSet.set(setKey, { total: 0, fields: Object.fromEntries(FIELDS.map(f => [f, 0])) as Record<FieldKey, number> });
    }
    const s = perSet.get(setKey)!;
    s.total++;
    for (const f of FIELDS) {
      if (isPresent(card, f)) s.fields[f]++;
    }
  }

  for (const [setKey, stats] of perSet) {
    console.log(`  [B] ${setKey}: ${stats.total} cards, hp=${pct(stats.fields.hp, stats.total)}, attacks=${pct(stats.fields.attacks, stats.total)}, illustrator=${pct(stats.fields.illustrator, stats.total)}`);
  }
  return perSet;
}

// ---------------------------------------------------------------------------
// Section C: ID contiguity
// ---------------------------------------------------------------------------

interface ContiguityResult {
  setKey: string;
  region: string;
  cardCount: number;
  actual: number;
  gaps: number[];
  duplicates: number[];
}

async function sectionC(
  enLocales: RegionCardRow[],
  jpLocales: RegionCardRow[],
  sets: { id: string; cardCount: number | null }[]
): Promise<ContiguityResult[]> {
  console.log(`\n[C] ID contiguity...`);
  const results: ContiguityResult[] = [];
  const setCountMap = new Map(sets.map(s => [s.id, s.cardCount ?? 0]));

  function check(locales: RegionCardRow[], region: string): void {
    const bySet = new Map<string, number[]>();
    for (const card of locales) {
      const setKey = card.setId;
      const numMatch = card.id.match(/-(\d+)$/);
      if (!numMatch) continue;
      const num = parseInt(numMatch[1], 10);
      if (!bySet.has(setKey)) bySet.set(setKey, []);
      bySet.get(setKey)!.push(num);
    }
    for (const [setId, nums] of bySet) {
      const count = setCountMap.get(setId) ?? nums.length;
      const key = setId.replace(/^(?:en|jp)-tcg-/, "");
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

async function sectionE(enLocales: RegionCardRow[], jpLocales: RegionCardRow[]): Promise<{
  enMissing: RegionCardRow[];
  jpMissing: RegionCardRow[];
}> {
  const enMissing = enLocales.filter(c => !c.imageSmall);
  const jpMissing = jpLocales.filter(c => !c.imageSmall);
  console.log(`\n[E] Missing imageSmall — EN: ${enMissing.length}, JP: ${jpMissing.length}`);
  return { enMissing, jpMissing };
}

// ---------------------------------------------------------------------------
// Section F: Supertype classification
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
    nameMap.set(cl.id.replace("en-tcg-", "lc-en-tcg-"), cl.name);
  }

  const bySet = new Map<string, SupertypeStats>();
  for (const card of lcards) {
    const setKey = (card.primarySetId ?? "").replace("en-tcg-", "");
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
// Section G: EN ↔ JP locale pairing
// ---------------------------------------------------------------------------

interface LocalePairingResult {
  setKey: string;
  enCount: number;
  jpCount: number;
  paired: number;
  enOnly: number;
  jpOnly: number;
}

async function sectionG(
  lcards: LogicalCardRow[],
  enLocales: RegionCardRow[],
  jpLocales: RegionCardRow[]
): Promise<LocalePairingResult[]> {
  console.log(`\n[G] EN ↔ JP locale pairing...`);

  const enByLC = new Map<string, string>();
  for (const cl of enLocales) {
    const lc = cl.id.replace("en-tcg-", "lc-en-tcg-");
    enByLC.set(lc, cl.id);
  }
  const jpByLC = new Map<string, string>();
  for (const cl of jpLocales) {
    // JP locale links to same logicalCardId
    jpByLC.set(cl.id, cl.id);
  }

  // Get all JP RegionCard logicalCardIds
  const jpLocalesByLC = await prisma.regionCard.findMany({
    where: { setId: { in: JP_SET_IDS } },
    select: { logicalCardId: true, setId: true },
  });
  const jpLCSet = new Set(jpLocalesByLC.map(r => r.logicalCardId));

  const bySet = new Map<string, LocalePairingResult>();

  for (const card of lcards) {
    const setKey = (card.primarySetId ?? "").replace("en-tcg-", "");
    if (!bySet.has(setKey)) {
      bySet.set(setKey, { setKey, enCount: 0, jpCount: 0, paired: 0, enOnly: 0, jpOnly: 0 });
    }
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
    console.log(`  [G] ${r.setKey}: EN=${r.enCount}, JP=${r.jpCount}, paired=${r.paired}, EN-only=${r.enOnly}, JP-only=${r.jpOnly}`);
  }
  return [...bySet.values()];
}

// ---------------------------------------------------------------------------
// Section H: Version availability
// ---------------------------------------------------------------------------

interface LocaleStats {
  setKey: string;
  patterns: Map<string, number>;
}

async function sectionH(lcards: LogicalCardRow[]): Promise<LocaleStats[]> {
  console.log(`\n[H] Version availability...`);
  const lcIds = lcards.map(c => c.id);
  const localeRows = await prisma.regionCard.findMany({
    where: { logicalCardId: { in: lcIds } },
    select: { logicalCardId: true, language: true },
  });

  const byLcId = new Map<string, string[]>();
  for (const row of localeRows) {
    if (!byLcId.has(row.logicalCardId)) byLcId.set(row.logicalCardId, []);
    byLcId.get(row.logicalCardId)!.push(row.language);
  }

  const bySet = new Map<string, LocaleStats>();
  for (const card of lcards) {
    const setKey = (card.primarySetId ?? "").replace("en-tcg-", "");
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
  sectionE: { enMissing: RegionCardRow[]; jpMissing: RegionCardRow[] };
  sectionF: SupertypeStats[];
  sectionG: LocalePairingResult[];
  sectionH: LocaleStats[];
}): string {
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const lines: string[] = [];
  const now = new Date().toISOString().replace("T"," ").substring(0,19) + " UTC";

  const enSets = data.setDefs.filter(s => s.region === "EN");
  const totalCards = enSets.reduce((a, s) => a + (s.cardCount ?? 0), 0);

  lines.push(`# Phase A Verification: DP1~7 + PL1~4 (Diamond & Pearl / Platinum)`);
  lines.push(`\n생성 일시: ${now}\n`);
  lines.push(`대상: dp1~dp7 (Diamond & Pearl) + pl1~pl4 (Platinum). EN ${totalCards}장 + JP overlay.\n`);

  const setNameMap = new Map(data.setDefs.map(s => [s.id, s.name]));

  // ── Section A ──
  lines.push(`## A) 이미지 라이브니스 (Image Liveness)`);
  lines.push(`\nEN(pokemontcg.io) 및 JP(archives.bulbagarden.net) 이미지 HTTP 상태 점검 (HEAD, 10 concurrent).\n`);
  const aHeaders = ["세트", "EN 이름", "EN OK", "EN 실패", "JP OK", "JP 실패", "EN 성공률", "JP 성공률"];
  const aRows = ALL_SET_KEYS.map(k => {
    const s = data.sectionA.perSet.get(k) ?? { enOk: 0, enFail: 0, jpOk: 0, jpFail: 0 };
    const enTotal = s.enOk + s.enFail;
    const jpTotal = s.jpOk + s.jpFail;
    return [k, setNameMap.get(`en-tcg-${k}`) ?? k, String(s.enOk), String(s.enFail), String(s.jpOk), String(s.jpFail), pct(s.enOk, enTotal), pct(s.jpOk, jpTotal)];
  });
  lines.push(mdTable(aHeaders, aRows));

  const totalEnOk = [...data.sectionA.perSet.values()].reduce((a,s) => a+s.enOk, 0);
  const totalEnFail = [...data.sectionA.perSet.values()].reduce((a,s) => a+s.enFail, 0);
  const totalJpOk = [...data.sectionA.perSet.values()].reduce((a,s) => a+s.jpOk, 0);
  const totalJpFail = [...data.sectionA.perSet.values()].reduce((a,s) => a+s.jpFail, 0);
  lines.push(`\n**EN 전체:** ${totalEnOk}/${totalEnOk+totalEnFail} (${pct(totalEnOk,totalEnOk+totalEnFail)})`);
  lines.push(`**JP 전체:** ${totalJpOk}/${totalJpOk+totalJpFail} (${pct(totalJpOk,totalJpOk+totalJpFail)})\n`);

  if (data.sectionA.failures.length > 0) {
    lines.push(`### 실패 목록 (${data.sectionA.failures.length}건)`);
    lines.push(mdTable(["ID","이름","Region","URL","HTTP"], data.sectionA.failures.map(f => [f.id,f.name,f.region,f.url||"(null)",String(f.status)])));
  } else {
    lines.push(`> 모든 이미지 정상 (실패 없음).`);
  }

  // ── Section B ──
  lines.push(`\n## B) 필드 완성도 감사 (Field Completeness)`);
  lines.push(`\n각 LogicalCard 필드의 채움률 (%).\n`);
  const bHeaders = ["세트","총계",...FIELDS];
  const bRows = ALL_SET_KEYS.map(k => {
    const stats = data.sectionB.get(k);
    if (!stats) return [k,"0",...FIELDS.map(()=>"—")];
    return [k,String(stats.total),...FIELDS.map(f=>pct(stats.fields[f],stats.total))];
  });
  lines.push(mdTable(bHeaders, bRows));

  // ── Section C ──
  lines.push(`\n## C) 인덱스 연속성 (ID Contiguity)`);
  lines.push(`\n각 세트의 RegionCard ID가 001부터 N까지 연속되는지 점검.\n`);
  const cHeaders = ["세트","Region","cardCount","실제","갭","중복","상태"];
  const cRows = data.sectionC.map(r => {
    const status = r.gaps.length === 0 && r.duplicates.length === 0 ? "✓" : "!";
    return [r.setKey, r.region, String(r.cardCount), String(r.actual), String(r.gaps.length), String(r.duplicates.length), status];
  });
  lines.push(mdTable(cHeaders, cRows));

  for (const r of data.sectionC) {
    if (r.gaps.length > 0 && r.gaps.length <= 20) {
      lines.push(`\n**${r.region} ${r.setKey} 갭:** ${r.gaps.map(n=>String(n).padStart(3,"0")).join(", ")}`);
    } else if (r.gaps.length > 20) {
      lines.push(`\n**${r.region} ${r.setKey} 갭:** ${r.gaps.length}건 (첫 5: ${r.gaps.slice(0,5).map(n=>String(n).padStart(3,"0")).join(", ")}...)`);
    }
  }

  // ── Section E ──
  lines.push(`\n## E) 누락 이미지 카드`);
  lines.push(`\nimageSmall이 NULL인 RegionCard.\n`);
  if (data.sectionE.enMissing.length === 0 && data.sectionE.jpMissing.length === 0) {
    lines.push(`> 누락 이미지 없음 — 모든 카드에 imageSmall URL 존재.`);
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
  lines.push(`\n각 세트의 LogicalCard.supertype 값 분포.\n`);
  const allSt = new Set<string>();
  for (const s of data.sectionF) for (const k of s.counts.keys()) allSt.add(k);
  const stypes = [...allSt].sort();
  lines.push(mdTable(["세트","합계",...stypes], data.sectionF.map(s=>{
    const total = [...s.counts.values()].reduce((a,b)=>a+b,0);
    return [s.setKey, String(total), ...stypes.map(t=>String(s.counts.get(t)??0))];
  })));
  const nullCards = data.sectionF.flatMap(s=>s.nullCards);
  if (nullCards.length > 0) {
    lines.push(`\n### Null supertype 카드 (${nullCards.length}건)`);
    lines.push(mdTable(["LogicalCard ID","이름"], nullCards.map(c=>[c.id,c.name])));
  } else {
    lines.push(`\n> 모든 카드에 supertype 존재.`);
  }

  // ── Section G ──
  lines.push(`\n## G) EN ↔ JP 로케일 대응`);
  lines.push(`\n각 LogicalCard의 EN/JP RegionCard 보유 현황.\n`);
  lines.push(mdTable(
    ["세트","EN 카드","JP 카드","EN+JP 양쪽","EN만","JP만"],
    data.sectionG.map(r=>[r.setKey,String(r.enCount),String(r.jpCount),String(r.paired),String(r.enOnly),String(r.jpOnly)])
  ));
  const totalPaired = data.sectionG.reduce((a,r)=>a+r.paired,0);
  const totalEnOnly = data.sectionG.reduce((a,r)=>a+r.enOnly,0);
  lines.push(`\n**전체 양쪽 보유:** ${totalPaired} / EN만: ${totalEnOnly}`);

  // ── Section H ──
  lines.push(`\n## H) 버전 가용성 (RegionCard 언어 분포)`);
  lines.push(`\n각 LogicalCard의 RegionCard 언어 조합.\n`);
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

  // ── Recommended Actions ──
  lines.push(`\n## 권장 액션 (Recommended Actions)`);
  const actions: { priority: string; action: string }[] = [];

  if (data.sectionA.failures.length > 0) {
    actions.push({ priority: "P1", action: `이미지 HTTP 비200 ${data.sectionA.failures.length}건 — URL 재확인` });
  }
  if (data.sectionE.enMissing.length > 0) {
    actions.push({ priority: "P1", action: `EN imageSmall 누락 ${data.sectionE.enMissing.length}건 — pokemontcg.io 재동기화` });
  }
  if (data.sectionE.jpMissing.length > 0) {
    actions.push({ priority: "P2", action: `JP imageSmall 누락 ${data.sectionE.jpMissing.length}건 — Bulbapedia 재탐색 필요` });
  }
  const gapSets = data.sectionC.filter(r=>r.gaps.length>0);
  if (gapSets.length>0) {
    actions.push({ priority: "P2", action: `ID 갭 세트: ${gapSets.map(r=>`${r.region} ${r.setKey}(${r.gaps.length})`).join(", ")}` });
  }
  const nullSupertype = data.sectionF.reduce((a,s)=>a+s.nullCards.length,0);
  if (nullSupertype>0) {
    actions.push({ priority: "P2", action: `supertype null ${nullSupertype}건 — 수동 분류 필요` });
  }
  const lowIllustrator: string[] = [];
  for (const [k,stats] of data.sectionB) {
    const rate = stats.total > 0 ? stats.fields.illustrator/stats.total : 1;
    if (rate < 0.5) lowIllustrator.push(`${k}(${pct(stats.fields.illustrator,stats.total)})`);
  }
  if (lowIllustrator.length>0) {
    actions.push({ priority: "P3", action: `illustrator 50% 미만: ${lowIllustrator.join(", ")}` });
  }
  actions.push({ priority: "P3", action: `nameKo 미입력 — PokeAPI enrich-nameko-pokeapi.ts 에 og-dp*/og-pl* 추가 후 실행` });

  lines.push(`\n| 우선순위 | 액션 |`);
  lines.push(`| --- | --- |`);
  for (const a of actions) lines.push(`| **${a.priority}** | ${a.action} |`);

  lines.push(`\n---`);
  lines.push(`*자동 생성: scripts/phase-a-verify-dppt.ts*`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Phase A Verification: DP1~7 + PL1~4 ===\n");

  const sets = await prisma.set.findMany({
    where: { id: { in: ALL_SET_IDS } },
    select: { id: true, name: true, cardCount: true, region: true },
    orderBy: { id: "asc" },
  });
  console.log(`Loaded: ${sets.length} sets`);

  const enLocales = await prisma.regionCard.findMany({
    where: { setId: { in: EN_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
    orderBy: { id: "asc" },
  });
  const jpLocales = await prisma.regionCard.findMany({
    where: { setId: { in: JP_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
    orderBy: { id: "asc" },
  });
  console.log(`RegionCard: ${enLocales.length} EN, ${jpLocales.length} JP`);

  const lcards = await prisma.logicalCard.findMany({
    where: { primarySetId: { in: EN_SET_IDS } },
    select: {
      id: true, primarySetId: true, primaryNumber: true, hp: true,
      types: true, attacks: true, abilities: true, subtypes: true,
      illustrator: true, rarityId: true, pokedexNumbers: true, supertype: true, nameKo: true,
    },
    orderBy: { id: "asc" },
  });
  console.log(`LogicalCard: ${lcards.length}`);

  const resA = await sectionA(enLocales, jpLocales);
  const resB = await sectionB(lcards);
  const resC = await sectionC(enLocales, jpLocales, sets);
  const resE = await sectionE(enLocales, jpLocales);
  const resF = await sectionF(lcards, enLocales);
  const resG = await sectionG(lcards, enLocales, jpLocales);
  const resH = await sectionH(lcards);

  const report = buildReport({
    setDefs: sets,
    sectionA: resA,
    sectionB: resB,
    sectionC: resC,
    sectionE: resE,
    sectionF: resF,
    sectionG: resG,
    sectionH: resH,
  });

  const outPath = path.join(__dirname, "..", "docs", "phase-a-verification-dppt.md");
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\nReport written: ${outPath}`);

  // Console summary
  console.log("\n=== SUMMARY ===");
  console.log(`Sets loaded: ${sets.length} (EN: ${sets.filter(s=>s.region==="EN").length}, JP: ${sets.filter(s=>s.region==="JP").length})`);
  console.log(`EN cards: ${enLocales.length}, JP cards: ${jpLocales.length}`);
  const enOk = [...resA.perSet.values()].reduce((a,s)=>a+s.enOk,0);
  const jpOk = [...resA.perSet.values()].reduce((a,s)=>a+s.jpOk,0);
  console.log(`A) EN images: ${enOk}/${enLocales.length} OK, JP images: ${jpOk}/${jpLocales.length} OK`);
  console.log(`C) Gaps: ${resC.filter(r=>r.gaps.length>0).map(r=>`${r.region} ${r.setKey}(${r.gaps.length})`).join(", ") || "none"}`);
  console.log(`E) Missing: EN=${resE.enMissing.length}, JP=${resE.jpMissing.length}`);
  console.log(`F) Null supertype: ${resF.reduce((a,s)=>a+s.nullCards.length,0)}`);
  const paired = resG.reduce((a,r)=>a+r.paired,0);
  console.log(`G) EN+JP paired: ${paired}/${lcards.length}`);

  if (resA.failures.length===0 && resE.enMissing.length===0 && resC.filter(r=>r.gaps.length>0).length===0) {
    console.log(`\n  All critical checks CLEAN.`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
