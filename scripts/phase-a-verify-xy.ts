/**
 * Phase A Verification: XY sets (xyp, xy0, xy1~xy12, dc1, g1 + JP og-xy* + og-cp*)
 *
 * Sections:
 *   0) Per-set card counts & logo status
 *   A) Image liveness — EN (pokemontcg.io URLs), JP (tcgplayer/Supabase)
 *   B) Field completeness audit per CardPack
 *   C) ID contiguity check (gaps/duplicates)
 *   E) Missing cards (NULL imageSmall)
 *   F) Supertype classification per CardPack
 *   H) Version availability (RegionCard language breakdown)
 *
 * Run: npx tsx scripts/phase-a-verify-xy.ts
 * Output: docs/phase-a-verification-xy.md
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
const execFileP = promisify(execFile);

// ---------------------------------------------------------------------------
// Set definitions
// ---------------------------------------------------------------------------

const XY_GROUP_IDS = [
  "og-xy1a", "og-xy1b", "og-xy2", "og-xy3", "og-xy4", "og-xy5a",
  "og-cp1", "og-xy6", "og-xy7", "og-cp2", "og-xy8a", "og-xy8b",
  "og-xy9", "og-cp3", "og-xy10", "og-cp4", "og-xy11a", "og-cp5", "og-cp6",
  "og-xyp", "og-xy0", "og-g1",
];

const EN_XY_SET_IDS = [
  "en-tcg-xyp", "en-tcg-xy0",
  "en-tcg-xy1", "en-tcg-xy2", "en-tcg-xy3", "en-tcg-xy4", "en-tcg-xy5",
  "en-tcg-dc1", "en-tcg-xy6", "en-tcg-xy7", "en-tcg-xy8", "en-tcg-xy9",
  "en-tcg-xy10", "en-tcg-xy11", "en-tcg-xy12", "en-tcg-g1",
];

const JP_XY_SET_IDS = [
  "jp-tcg-XY1a", "jp-tcg-XY1b", "jp-tcg-XY2", "jp-tcg-XY3", "jp-tcg-XY4",
  "jp-tcg-XY5a", "jp-tcg-XY6", "jp-tcg-XY7", "jp-tcg-XY8a", "jp-tcg-XY8b",
  "jp-tcg-XY9", "jp-tcg-XY10", "jp-tcg-XY11a",
  "jp-tcg-CP1", "jp-tcg-CP2", "jp-tcg-CP3", "jp-tcg-CP4", "jp-tcg-CP5", "jp-tcg-CP6",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function curlHead(url: string): Promise<number> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "15", "--head", url]);
    return parseInt(stdout.trim(), 10) || 0;
  } catch { return 0; }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) { const idx = i++; results[idx] = await tasks[idx](); }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
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
// Types
// ---------------------------------------------------------------------------

interface RegionCardRow { id: string; name: string; setId: string; language: string; imageSmall: string | null; }
interface ImageResult { id: string; name: string; setId: string; url: string; status: number; region: "EN" | "JP"; }
interface CardRow {
  id: string; primarySetId: string | null; primaryNumber: string | null; cardPackId: string | null;
  hp: number | null; types: string[]; attacks: unknown; abilities: unknown;
  subtypes: string[]; illustrator: string | null; rarityId: string | null;
  pokedexNumbers: number[]; supertype: string | null; nameKo: string | null;
}
type FieldKey = "hp" | "types" | "attacks" | "abilities" | "subtypes" | "illustrator" | "rarityId" | "pokedexNumbers" | "supertype" | "nameKo";

function isPresent(card: CardRow, field: FieldKey): boolean {
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
// Section 0: Per-set counts
// ---------------------------------------------------------------------------

async function section0() {
  const rows: { setId: string; enCount: number; jpCount: number; logoUrl: string | null; symbolUrl: string | null; nameKo: string | null }[] = [];

  // EN sets
  for (const enId of EN_XY_SET_IDS) {
    const enCount = await prisma.regionCard.count({ where: { setId: enId } });
    const enSet = await prisma.set.findUnique({ where: { id: enId }, select: { logoUrl: true, symbolUrl: true, nameKo: true } });
    rows.push({ setId: enId.replace("en-tcg-", "EN:"), enCount, jpCount: 0, logoUrl: enSet?.logoUrl ?? null, symbolUrl: enSet?.symbolUrl ?? null, nameKo: enSet?.nameKo ?? null });
    console.log(`  [0] ${enId}: EN=${enCount}, logo=${!!enSet?.logoUrl}`);
  }

  // JP sets
  for (const jpId of JP_XY_SET_IDS) {
    const jpCount = await prisma.regionCard.count({ where: { setId: jpId } });
    const jpSet = await prisma.set.findUnique({ where: { id: jpId }, select: { logoUrl: true, symbolUrl: true, nameKo: true } });
    rows.push({ setId: jpId.replace("jp-tcg-", "JP:"), enCount: 0, jpCount, logoUrl: jpSet?.logoUrl ?? null, symbolUrl: jpSet?.symbolUrl ?? null, nameKo: jpSet?.nameKo ?? null });
    console.log(`  [0] ${jpId}: JP=${jpCount}, logo=${!!jpSet?.logoUrl}`);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Section A: Image liveness
// ---------------------------------------------------------------------------

interface PerSetImageStats { enOk: number; enFail: number; jpOk: number; jpFail: number; }

async function sectionA(enLocales: RegionCardRow[], jpLocales: RegionCardRow[]) {
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
  const perSet = new Map<string, PerSetImageStats>();
  const failures: ImageResult[] = [];

  for (const r of results) {
    const key = r.setId.replace(/^(?:en|jp|kr)-tcg-/, "");
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

async function sectionB(lcards: CardRow[]) {
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const perSet = new Map<string, SetFieldStats>();

  for (const card of lcards) {
    const setKey = card.cardPackId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
    if (!perSet.has(setKey)) perSet.set(setKey, { total: 0, fields: Object.fromEntries(FIELDS.map(f => [f, 0])) as Record<FieldKey, number> });
    const s = perSet.get(setKey)!;
    s.total++;
    for (const f of FIELDS) { if (isPresent(card, f)) s.fields[f]++; }
  }

  console.log(`\n[B] Field completeness — ${lcards.length} Cards`);
  for (const [setKey, stats] of perSet) {
    console.log(`  [B] ${setKey}: ${stats.total} cards, hp=${pct(stats.fields.hp, stats.total)}, illustrator=${pct(stats.fields.illustrator, stats.total)}`);
  }
  return perSet;
}

// ---------------------------------------------------------------------------
// Section C: ID contiguity
// ---------------------------------------------------------------------------

interface ContiguityResult { setKey: string; region: string; cardCount: number; actual: number; gaps: number[]; duplicates: number[]; }

async function sectionC(enLocales: RegionCardRow[], jpLocales: RegionCardRow[], sets: { id: string; cardCount: number | null }[]) {
  console.log(`\n[C] ID contiguity...`);
  const results: ContiguityResult[] = [];
  const setCountMap = new Map(sets.map(s => [s.id, s.cardCount ?? 0]));

  function check(locales: RegionCardRow[], region: string): void {
    const bySet = new Map<string, number[]>();
    for (const card of locales) {
      const numMatch = card.id.match(/-(\d+)$/);
      if (!numMatch) continue;
      if (!bySet.has(card.setId)) bySet.set(card.setId, []);
      bySet.get(card.setId)!.push(parseInt(numMatch[1], 10));
    }
    for (const [setId, nums] of bySet) {
      const count = setCountMap.get(setId) ?? nums.length;
      const key = setId.replace(/^(?:en|jp|kr)-tcg-/, "");
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

async function sectionE(enLocales: RegionCardRow[], jpLocales: RegionCardRow[]) {
  const enMissing = enLocales.filter(c => !c.imageSmall);
  const jpMissing = jpLocales.filter(c => !c.imageSmall);
  console.log(`\n[E] Missing imageSmall — EN: ${enMissing.length}, JP: ${jpMissing.length}`);
  return { enMissing, jpMissing };
}

// ---------------------------------------------------------------------------
// Section F: Supertype classification
// ---------------------------------------------------------------------------

interface SupertypeStats { setKey: string; counts: Map<string, number>; nullCards: { id: string; name: string }[]; }

async function sectionF(lcards: CardRow[], locales: RegionCardRow[]) {
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

  console.log(`\n[F] Supertype classification...`);
  for (const [, stats] of bySet) {
    console.log(`  [F] ${stats.setKey}:`, Object.fromEntries(stats.counts));
  }
  return [...bySet.values()];
}

// ---------------------------------------------------------------------------
// Section H: Version availability
// ---------------------------------------------------------------------------

interface LocaleStats { setKey: string; patterns: Map<string, number>; }

async function sectionH(allLcards: CardRow[]) {
  const lcIds = allLcards.map(c => c.id);
  const localeRows = await prisma.regionCard.findMany({
    where: { cardId: { in: lcIds } },
    select: { cardId: true, language: true },
  });

  const byLcId = new Map<string, string[]>();
  for (const row of localeRows) {
    if (!byLcId.has(row.cardId)) byLcId.set(row.cardId, []);
    byLcId.get(row.cardId)!.push(row.language);
  }

  const bySet = new Map<string, LocaleStats>();
  for (const card of allLcards) {
    const setKey = card.cardPackId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
    if (!bySet.has(setKey)) bySet.set(setKey, { setKey, patterns: new Map() });
    const s = bySet.get(setKey)!;
    const langs = (byLcId.get(card.id) ?? []).sort().join("+") || "(none)";
    s.patterns.set(langs, (s.patterns.get(langs) ?? 0) + 1);
  }

  console.log(`\n[H] Version availability...`);
  for (const [, stats] of bySet) {
    console.log(`  [H] ${stats.setKey}:`, Object.fromEntries(stats.patterns));
  }
  return [...bySet.values()];
}

// ---------------------------------------------------------------------------
// CardPack coverage check
// ---------------------------------------------------------------------------

async function sectionGroups() {
  const groups = await prisma.cardPack.findMany({
    where: { id: { in: XY_GROUP_IDS } },
    include: { sets: { select: { id: true, region: true, cardCount: true, logoUrl: true, symbolUrl: true, nameKo: true } } },
    orderBy: { order: "asc" },
  });
  return groups;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function buildReport(data: {
  groups: Awaited<ReturnType<typeof sectionGroups>>;
  counts0: Awaited<ReturnType<typeof section0>>;
  sectionA: { perSet: Map<string, PerSetImageStats>; failures: ImageResult[] };
  sectionB: Map<string, SetFieldStats>;
  sectionC: ContiguityResult[];
  sectionE: { enMissing: RegionCardRow[]; jpMissing: RegionCardRow[] };
  sectionF: SupertypeStats[];
  sectionH: LocaleStats[];
  allSets: { id: string; name: string; cardCount: number | null; region: string }[];
}): string {
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const lines: string[] = [];
  const now = new Date().toISOString().replace("T"," ").substring(0,19) + " UTC";

  lines.push(`# Phase A Verification: XY Sets`);
  lines.push(`\n생성 일시: ${now}\n`);
  lines.push(`대상: XY era (og-xy1a ~ og-cp6, og-xyp, og-xy0, og-g1) — 22 SetGroups.\n`);

  // ── Section 0: CardPack coverage ──
  lines.push(`## 0) CardPack 커버리지`);
  lines.push(mdTable(
    ["SetGroup", "nameJa", "nameKo", "Sets (region:count)"],
    data.groups.map(g => [
      g.id,
      g.nameJa ?? "—",
      g.nameKo ?? "—",
      g.sets.map(s => `${s.region}:${s.cardCount}`).join(", ") || "(none)",
    ])
  ));

  // ── Section 0b: Per-set counts ──
  lines.push(`\n## 0b) 세트별 카드 수 & 로고`);
  lines.push(mdTable(
    ["세트", "카드 수", "로고", "심볼", "nameKo"],
    data.counts0.map(r => [r.setId, String(r.enCount || r.jpCount), r.logoUrl ? "✓" : "✗", r.symbolUrl ? "✓" : "✗", r.nameKo ?? "—"])
  ));

  // ── Section A ──
  lines.push(`\n## A) 이미지 라이브니스`);
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
  const bKeys = [...data.sectionB.keys()].sort();
  lines.push(mdTable(
    ["SetGroup","총계",...FIELDS],
    bKeys.map(k => {
      const stats = data.sectionB.get(k)!;
      return [k, String(stats.total), ...FIELDS.map(f=>pct(stats.fields[f],stats.total))];
    })
  ));

  // ── Section C ──
  lines.push(`\n## C) 인덱스 연속성`);
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
  lines.push(mdTable(["SetGroup","합계",...stypes], data.sectionF.map(s=>{
    const total = [...s.counts.values()].reduce((a,b)=>a+b,0);
    return [s.setKey, String(total), ...stypes.map(t=>String(s.counts.get(t)??0))];
  })));
  const nullCards = data.sectionF.flatMap(s=>s.nullCards);
  if (nullCards.length > 0) {
    lines.push(`\n### Null supertype (${Math.min(nullCards.length,30)}건 표시)`);
    lines.push(mdTable(["LogicalCard ID","이름"], nullCards.slice(0,30).map(c=>[c.id,c.name])));
    if (nullCards.length > 30) lines.push(`(... ${nullCards.length-30}건 생략)`);
  } else {
    lines.push(`\n> 모든 카드에 supertype 존재.`);
  }

  // ── Section G (deferred) ──
  lines.push(`\n## G) EN ↔ JP 로케일 대응`);
  lines.push(`\n> 섹션 G 는 defer. JP orphan Card ↔ EN Card 연결은 후속 작업.\n`);

  // ── Section H ──
  lines.push(`\n## H) 버전 가용성 (언어 조합)`);
  const allPatterns = new Set<string>();
  for (const s of data.sectionH) for (const k of s.patterns.keys()) allPatterns.add(k);
  const patterns = [...allPatterns].sort();
  lines.push(mdTable(
    ["SetGroup","총계",...patterns],
    data.sectionH.map(s=>{
      const total = [...s.patterns.values()].reduce((a,b)=>a+b,0);
      return [s.setKey, String(total), ...patterns.map(p=>String(s.patterns.get(p)??0))];
    })
  ));

  // ── EN↔JP Mapping summary ──
  lines.push(`\n## I) EN↔JP 매핑 결정 요약`);
  lines.push(`
| EN Set | JP CardPack | 비고 |
|--------|------------|------|
| en-tcg-xy1 | og-xy1a | EN 합본(146) → JP XY1a+XY1b(63+63). XY1b는 별도 CardPack 유지. |
| en-tcg-xy2 | og-xy2 | 1:1 매핑 |
| en-tcg-xy3 | og-xy3 | 1:1 매핑 |
| en-tcg-xy4 | og-xy4 | 1:1 매핑 |
| en-tcg-xy5 | og-xy5a | EN Primal Clash → JP TidalStorm (XY5b 없음 확인 필요) |
| en-tcg-dc1 | og-cp1 | Double Crisis → ダブルクライシス |
| en-tcg-xy6 | og-xy6 | 1:1 매핑 |
| en-tcg-xy7 | og-xy7 | 1:1 매핑 |
| en-tcg-xy8 | og-xy8a | EN 합본(162) → JP XY8a+XY8b. XY8b 별도 CardPack 유지. |
| en-tcg-xy9 | og-xy9 | 1:1 매핑 |
| en-tcg-xy10 | og-xy10 | 1:1 매핑 |
| en-tcg-xy11 | og-xy11a | EN Steam Siege → JP 冷酷の反逆者. CP5(재출시)는 og-cp5 별도. |
| en-tcg-xy12 | og-cp6 | EN Evolutions → JP 20th Anniversary |
| en-tcg-xyp | og-xyp | EN 전용 신규 CardPack |
| en-tcg-xy0 | og-xy0 | EN 전용 신규 CardPack |
| en-tcg-g1 | og-g1 | Generations ≠ ポケキュンコレクション → 별도 CardPack |
`);

  // ── Actions ──
  lines.push(`\n## 권장 액션`);
  const actions: { priority: string; action: string }[] = [];
  if (data.sectionA.failures.filter(f=>f.region==="EN").length > 0)
    actions.push({ priority: "P1", action: `EN 이미지 HTTP 비200 ${data.sectionA.failures.filter(f=>f.region==="EN").length}건` });
  if (data.sectionE.enMissing.length > 0)
    actions.push({ priority: "P1", action: `EN imageSmall 누락 ${data.sectionE.enMissing.length}건` });
  if (data.sectionE.jpMissing.length > 0)
    actions.push({ priority: "P2", action: `JP imageSmall 누락 ${data.sectionE.jpMissing.length}건 — Supabase 업로드 필요` });
  const gapSets = data.sectionC.filter(r=>r.gaps.length>0);
  if (gapSets.length>0)
    actions.push({ priority: "P2", action: `ID 갭: ${gapSets.map(r=>`${r.region} ${r.setKey}(${r.gaps.length})`).join(", ")}` });
  const nullSuper = data.sectionF.reduce((a,s)=>a+s.nullCards.length,0);
  if (nullSuper>0) actions.push({ priority: "P2", action: `supertype null ${nullSuper}건 — enrich-xy-meta-tcgdex 실행 필요` });
  const lowIll: string[] = [];
  for (const [k,stats] of data.sectionB) {
    const rate = stats.total > 0 ? stats.fields.illustrator/stats.total : 1;
    if (rate < 0.5) lowIll.push(`${k}(${pct(stats.fields.illustrator,stats.total)})`);
  }
  if (lowIll.length>0) actions.push({ priority: "P3", action: `illustrator 50% 미만: ${lowIll.join(", ")}` });

  if (actions.length === 0) {
    lines.push(`\n> 권장 액션 없음.`);
  } else {
    lines.push(mdTable(["우선순위","액션"], actions.map(a=>[a.priority, a.action])));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Phase A Verification: XY ===");

  const allSets = await prisma.set.findMany({
    where: { id: { in: [...EN_XY_SET_IDS, ...JP_XY_SET_IDS] } },
    select: { id: true, name: true, cardCount: true, region: true },
  });

  const enLocales = await prisma.regionCard.findMany({
    where: { setId: { in: EN_XY_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  const jpLocales = await prisma.regionCard.findMany({
    where: { setId: { in: JP_XY_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  const lcards = await prisma.card.findMany({
    where: { cardPackId: { in: XY_GROUP_IDS } },
    select: { id: true, primarySetId: true, primaryNumber: true, cardPackId: true, hp: true, types: true, attacks: true, abilities: true, subtypes: true, illustrator: true, rarityId: true, pokedexNumbers: true, supertype: true, nameKo: true },
  });

  console.log(`Loaded: ${enLocales.length} EN locales, ${jpLocales.length} JP locales, ${lcards.length} Cards`);

  const groups = await sectionGroups();
  const counts0 = await section0();
  const resA = await sectionA(enLocales, jpLocales);
  const resB = await sectionB(lcards);
  const resC = await sectionC(enLocales, jpLocales, allSets);
  const resE = await sectionE(enLocales, jpLocales);
  const resF = await sectionF(lcards, [...enLocales, ...jpLocales]);
  const resH = await sectionH(lcards);

  const report = buildReport({
    groups, counts0,
    sectionA: resA, sectionB: resB, sectionC: resC,
    sectionE: resE, sectionF: resF, sectionH: resH,
    allSets,
  });

  const outPath = path.join(process.cwd(), "docs", "phase-a-verification-xy.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\n✓ Report saved: ${outPath}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
