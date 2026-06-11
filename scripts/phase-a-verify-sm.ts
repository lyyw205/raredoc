/**
 * Phase A Verification: SM sets (og-sm* + og-sn* + og-smp + og-sma)
 *
 * Sections:
 *   0) Per-set card counts & logo status
 *   A) Image liveness — EN (pokemontcg.io URLs), JP
 *   B) Field completeness audit per CardPack
 *   C) ID contiguity check (gaps/duplicates)
 *   E) Missing cards (NULL imageSmall)
 *   F) Supertype classification per CardPack
 *   H) Version availability (RegionCard language breakdown)
 *
 * Run: npx tsx scripts/phase-a-verify-sm.ts
 * Output: docs/phase-a-verification-sm.md
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
const execFileP = promisify(execFile);

const SM_GROUP_IDS = [
  "og-sm0",
  "og-sm1s", "og-sm1m", "og-sm1+",
  "og-sm2k", "og-sm2l", "og-sm2+",
  "og-sm3h", "og-sm3n", "og-sm3+",
  "og-sm4s", "og-sm4a", "og-sm4+",
  "og-sm5s", "og-sm5m", "og-sm5+",
  "og-sm6",  "og-sm6a", "og-sm6b",
  "og-sm7",  "og-sm7a", "og-sm7b",
  "og-sm8",  "og-sm8a", "og-sm8b",
  "og-sm9",  "og-sm9a", "og-sm9b",
  "og-sm10", "og-sm10b",
  "og-sm11a","og-sm11b",
  "og-sm12", "og-sm12a",
  "og-smp2",
  "og-sn10a","og-sn11",
  "og-smp",  "og-sma",
];

const EN_SM_SET_IDS = [
  "en-tcg-smp", "en-tcg-sma",
  "en-tcg-sm1", "en-tcg-sm2", "en-tcg-sm3", "en-tcg-sm35",
  "en-tcg-sm4", "en-tcg-sm5", "en-tcg-sm6", "en-tcg-sm75",
  "en-tcg-sm7", "en-tcg-sm8", "en-tcg-sm115",
  "en-tcg-sm9", "en-tcg-det1",
  "en-tcg-sm10", "en-tcg-sm11", "en-tcg-sm12",
];

const JP_SM_SET_IDS = [
  "jp-tcg-SM0",
  "jp-tcg-SM1s", "jp-tcg-SM1m", "jp-tcg-SM1+",
  "jp-tcg-SM2K", "jp-tcg-SM2L", "jp-tcg-sm2+",
  "jp-tcg-SM3H", "jp-tcg-SM3N", "jp-tcg-SM3+",
  "jp-tcg-SM4S", "jp-tcg-SM4A", "jp-tcg-SM4+",
  "jp-tcg-SM5S", "jp-tcg-SM5M", "jp-tcg-SM5+",
  "jp-tcg-SM6",  "jp-tcg-SM6a", "jp-tcg-SM6b",
  "jp-tcg-SM7",  "jp-tcg-SM7a", "jp-tcg-SM7b",
  "jp-tcg-SM8",  "jp-tcg-SM8a", "jp-tcg-SM8b",
  "jp-tcg-SM9",  "jp-tcg-SM9a", "jp-tcg-SM9b",
  "jp-tcg-SM10", "jp-tcg-SM10b",
  "jp-tcg-SM11a","jp-tcg-SM11b",
  "jp-tcg-SM12", "jp-tcg-SM12a",
  "jp-tcg-SMP2",
  "jp-tcg-sn10a","jp-tcg-sn11",
];

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

async function section0() {
  const rows: { setId: string; count: number; logoUrl: string | null; symbolUrl: string | null; nameKo: string | null }[] = [];

  for (const enId of EN_SM_SET_IDS) {
    const count = await prisma.regionCard.count({ where: { setId: enId } });
    const s = await prisma.set.findUnique({ where: { id: enId }, select: { logoUrl: true, symbolUrl: true, nameKo: true } });
    rows.push({ setId: enId.replace("en-tcg-", "EN:"), count, logoUrl: s?.logoUrl ?? null, symbolUrl: s?.symbolUrl ?? null, nameKo: s?.nameKo ?? null });
    console.log(`  [0] ${enId}: count=${count}, logo=${!!s?.logoUrl}`);
  }

  for (const jpId of JP_SM_SET_IDS) {
    const count = await prisma.regionCard.count({ where: { setId: jpId } });
    const s = await prisma.set.findUnique({ where: { id: jpId }, select: { logoUrl: true, symbolUrl: true, nameKo: true } });
    rows.push({ setId: jpId.replace("jp-tcg-", "JP:"), count, logoUrl: s?.logoUrl ?? null, symbolUrl: s?.symbolUrl ?? null, nameKo: s?.nameKo ?? null });
    console.log(`  [0] ${jpId}: count=${count}, logo=${!!s?.logoUrl}`);
  }

  return rows;
}

interface PerSetImageStats { enOk: number; enFail: number; jpOk: number; jpFail: number; }

async function sectionA(enLocales: RegionCardRow[], jpLocales: RegionCardRow[]) {
  // Sample: check up to 20 random EN images (avoid rate limit)
  const enSample = enLocales.filter(c => c.imageSmall).slice(0, 20);
  const jpSample = jpLocales.filter(c => c.imageSmall).slice(0, 20);
  const allSample = [
    ...enSample.map(c => ({ ...c, region: "EN" as const })),
    ...jpSample.map(c => ({ ...c, region: "JP" as const })),
  ];
  console.log(`\n[A] Image liveness sample — ${enSample.length} EN + ${jpSample.length} JP (5 concurrent)...`);

  const tasks = allSample.map(card => async (): Promise<ImageResult> => {
    const url = card.imageSmall ?? "";
    const status = url ? await curlHead(url) : 0;
    await sleep(100);
    return { id: card.id, name: card.name, setId: card.setId, url, status, region: card.region };
  });

  const results = await pLimit(tasks, 5);
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
  console.log(`  [A] sample: ${totalOk}/${allSample.length} OK, ${failures.length} failed`);

  // Full counts (no liveness check — just null check)
  const enMissingImg = enLocales.filter(c => !c.imageSmall).length;
  const jpMissingImg = jpLocales.filter(c => !c.imageSmall).length;
  console.log(`  [A] EN imageSmall null: ${enMissingImg}/${enLocales.length}`);
  console.log(`  [A] JP imageSmall null: ${jpMissingImg}/${jpLocales.length}`);

  return { perSet, failures, enTotal: enLocales.length, jpTotal: jpLocales.length, enMissingImg, jpMissingImg };
}

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
    console.log(`  [B] ${setKey}: ${stats.total} cards, hp=${pct(stats.fields.hp, stats.total)}, illustrator=${pct(stats.fields.illustrator, stats.total)}, nameKo=${pct(stats.fields.nameKo, stats.total)}`);
  }
  return perSet;
}

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

async function sectionE(enLocales: RegionCardRow[], jpLocales: RegionCardRow[]) {
  const enMissing = enLocales.filter(c => !c.imageSmall);
  const jpMissing = jpLocales.filter(c => !c.imageSmall);
  console.log(`\n[E] Missing imageSmall — EN: ${enMissing.length}, JP: ${jpMissing.length}`);
  return { enMissing, jpMissing };
}

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

async function sectionGroups() {
  const groups = await prisma.cardPack.findMany({
    where: { id: { in: SM_GROUP_IDS } },
    include: { sets: { select: { id: true, region: true, cardCount: true, logoUrl: true, symbolUrl: true, nameKo: true } } },
    orderBy: { order: "asc" },
  });
  return groups;
}

function buildReport(data: {
  groups: Awaited<ReturnType<typeof sectionGroups>>;
  counts0: Awaited<ReturnType<typeof section0>>;
  sectionA: Awaited<ReturnType<typeof sectionA>>;
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

  lines.push(`# Phase A Verification: SM Sets`);
  lines.push(`\n생성 일시: ${now}\n`);
  lines.push(`대상: SM era (썬·문, 2017~2019) — ${SM_GROUP_IDS.length} SetGroups.\n`);

  lines.push(`## 0) CardPack 커버리지`);
  lines.push(mdTable(
    ["SetGroup", "nameJa", "nameKo", "Sets (region:count)"],
    data.groups.map(g => [
      g.id,
      g.nameJa ?? "—",
      g.nameKo ?? "—",
      g.sets.map(s => `${s.region}:${s.cardCount ?? 0}`).join(", ") || "(none)",
    ])
  ));

  lines.push(`\n## 0b) 세트별 카드 수 & 로고`);
  lines.push(mdTable(
    ["세트", "카드 수", "로고", "심볼", "nameKo"],
    data.counts0.map(r => [r.setId, String(r.count), r.logoUrl ? "✓" : "✗", r.symbolUrl ? "✓" : "✗", r.nameKo ?? "—"])
  ));

  lines.push(`\n## A) 이미지 라이브니스 (샘플 40장)`);
  const aKeys = [...new Set([...data.sectionA.perSet.keys()])].sort();
  if (aKeys.length > 0) {
    lines.push(mdTable(
      ["세트","EN OK","EN 실패","JP OK","JP 실패"],
      aKeys.map(k => {
        const s = data.sectionA.perSet.get(k) ?? { enOk: 0, enFail: 0, jpOk: 0, jpFail: 0 };
        return [k, String(s.enOk), String(s.enFail), String(s.jpOk), String(s.jpFail)];
      })
    ));
  }
  lines.push(`\n**EN imageSmall null:** ${data.sectionA.enMissingImg}/${data.sectionA.enTotal}`);
  lines.push(`**JP imageSmall null:** ${data.sectionA.jpMissingImg}/${data.sectionA.jpTotal}`);

  if (data.sectionA.failures.length > 0) {
    lines.push(`\n### 샘플 실패 목록 (${data.sectionA.failures.length}건)`);
    lines.push(mdTable(["ID","이름","Region","URL","HTTP"], data.sectionA.failures.map(f=>[f.id,f.name,f.region,f.url||"(null)",String(f.status)])));
  } else {
    lines.push(`\n> 샘플 이미지 모두 정상.`);
  }

  lines.push(`\n## B) 필드 완성도`);
  const bKeys = [...data.sectionB.keys()].sort();
  lines.push(mdTable(
    ["SetGroup","총계",...FIELDS],
    bKeys.map(k => {
      const stats = data.sectionB.get(k)!;
      return [k, String(stats.total), ...FIELDS.map(f=>pct(stats.fields[f],stats.total))];
    })
  ));

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

  lines.push(`\n## E) 누락 이미지 카드`);
  if (data.sectionE.enMissing.length === 0 && data.sectionE.jpMissing.length === 0) {
    lines.push(`\n> 누락 이미지 없음.`);
  } else {
    if (data.sectionE.enMissing.length > 0) {
      lines.push(`\n### EN 누락 (${data.sectionE.enMissing.length}건)`);
      lines.push(mdTable(["ID","이름","세트"], data.sectionE.enMissing.slice(0,50).map(c=>[c.id,c.name,c.setId])));
      if (data.sectionE.enMissing.length > 50) lines.push(`(... ${data.sectionE.enMissing.length-50}건 생략)`);
    }
    if (data.sectionE.jpMissing.length > 0) {
      lines.push(`\n### JP 누락 (${data.sectionE.jpMissing.length}건)`);
      lines.push(mdTable(["ID","이름","세트"], data.sectionE.jpMissing.slice(0,50).map(c=>[c.id,c.name,c.setId])));
      if (data.sectionE.jpMissing.length > 50) lines.push(`(... ${data.sectionE.jpMissing.length-50}건 생략)`);
    }
  }

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

  lines.push(`\n## I) EN↔JP 매핑 결정 요약`);
  lines.push(`
| EN Set | JP CardPack | 비고 |
|--------|------------|------|
| en-tcg-sm1   | og-sm1s  | EN 합본(173) → JP SM1s+SM1m+SM1+. SM1m/SM1+ 별도 CardPack 유지. |
| en-tcg-sm2   | og-sm2k  | EN 합본(180) → JP SM2K+SM2L |
| en-tcg-sm3   | og-sm3h  | EN 합본(177) → JP SM3H+SM3N |
| en-tcg-sm35  | og-sm3+  | Shining Legends = JP ひかる伝説 |
| en-tcg-sm4   | og-sm4s  | EN 합본(126) → JP SM4S+SM4A. SM4+(GXバトルブースト) JP-only. |
| en-tcg-sm5   | og-sm5s  | EN 합본(178) → JP SM5S+SM5M |
| en-tcg-sm6   | og-sm6   | 1:1 매핑 |
| en-tcg-sm75  | og-sm6a  | Dragon Majesty = JP ドラゴンストーム |
| en-tcg-sm7   | og-sm7   | 1:1 매핑 |
| en-tcg-sm8   | og-sm8   | 1:1 매핑 |
| en-tcg-sm115 | og-sm8b  | Hidden Fates = JP GXウルトラシャイニ |
| en-tcg-sma   | og-sma   | Shiny Vault — EN-only 신규 CardPack |
| en-tcg-sm9   | og-sm9   | 1:1 매핑 |
| en-tcg-det1  | og-smp2  | Detective Pikachu = JP 名探偵ピカチュウ |
| en-tcg-sm10  | og-sm10  | 1:1 매핑 |
| en-tcg-sm11  | og-sm11a | EN 합본(260) → JP SM11a+SM11b |
| en-tcg-sm12  | og-sm12  | 1:1 매핑 |
| en-tcg-smp   | og-smp   | SM Black Star Promos — EN-only 신규 CardPack |
`);

  lines.push(`\n## CardPack nameKo 커버리지`);
  const noNameKo = data.groups.filter(g => !g.nameKo);
  if (noNameKo.length === 0) {
    lines.push(`\n> 전체 ${data.groups.length}개 CardPack nameKo 완비.`);
  } else {
    lines.push(`\n> nameKo 미설정 ${noNameKo.length}개: ${noNameKo.map(g=>g.id).join(", ")}`);
  }

  // Actions
  lines.push(`\n## 권장 액션`);
  const actions: { priority: string; action: string }[] = [];
  if (data.sectionA.enMissingImg > 0)
    actions.push({ priority: "P1", action: `EN imageSmall null ${data.sectionA.enMissingImg}건 — sync-sm-pokemontcgio 재실행 필요` });
  if (data.sectionA.failures.filter(f=>f.region==="EN").length > 0)
    actions.push({ priority: "P1", action: `EN 이미지 HTTP 비200 ${data.sectionA.failures.filter(f=>f.region==="EN").length}건` });
  if (data.sectionE.jpMissing.length > 0)
    actions.push({ priority: "P2", action: `JP imageSmall 누락 ${data.sectionE.jpMissing.length}건 — Supabase 업로드 필요` });
  const gapSets = data.sectionC.filter(r=>r.gaps.length>0);
  if (gapSets.length>0)
    actions.push({ priority: "P2", action: `ID 갭: ${gapSets.map(r=>`${r.region} ${r.setKey}(${r.gaps.length})`).join(", ")}` });
  const nullSuper = data.sectionF.reduce((a,s)=>a+s.nullCards.length,0);
  if (nullSuper>0) actions.push({ priority: "P2", action: `supertype null ${nullSuper}건 — enrich-sm-meta-tcgdex 실행 필요` });
  const lowIll: string[] = [];
  for (const [k,stats] of data.sectionB) {
    const rate = stats.total > 0 ? stats.fields.illustrator/stats.total : 1;
    if (rate < 0.5) lowIll.push(`${k}(${pct(stats.fields.illustrator,stats.total)})`);
  }
  if (lowIll.length>0) actions.push({ priority: "P3", action: `illustrator 50% 미만: ${lowIll.join(", ")}` });
  const noKo = data.groups.filter(g => !g.nameKo);
  if (noKo.length > 0) actions.push({ priority: "P2", action: `nameKo 미설정 CardPack ${noKo.length}개: ${noKo.map(g=>g.id).join(", ")}` });

  if (actions.length === 0) {
    lines.push(`\n> 권장 액션 없음.`);
  } else {
    lines.push(mdTable(["우선순위","액션"], actions.map(a=>[a.priority, a.action])));
  }

  return lines.join("\n");
}

async function main() {
  console.log("=== Phase A Verification: SM ===");

  const allSets = await prisma.set.findMany({
    where: { id: { in: [...EN_SM_SET_IDS, ...JP_SM_SET_IDS] } },
    select: { id: true, name: true, cardCount: true, region: true },
  });

  const enLocales = await prisma.regionCard.findMany({
    where: { setId: { in: EN_SM_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  const jpLocales = await prisma.regionCard.findMany({
    where: { setId: { in: JP_SM_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  const lcards = await prisma.card.findMany({
    where: { cardPackId: { in: SM_GROUP_IDS } },
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

  const outPath = path.join(process.cwd(), "docs", "phase-a-verification-sm.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\n✓ Report saved: ${outPath}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
