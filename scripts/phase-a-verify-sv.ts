/**
 * Phase A Verification: SV + MEGA sets
 *
 * Sections:
 *   0) Per-set card counts & logo status
 *   A) Image liveness sample
 *   B) Field completeness audit per CardPack
 *   C) ID contiguity check
 *   E) Missing cards (NULL imageSmall)
 *   F) Supertype classification per CardPack
 *   H) Version availability (language breakdown)
 *
 * Run: npx tsx scripts/phase-a-verify-sv.ts
 * Output: docs/phase-a-verification-sv.md
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
const execFileP = promisify(execFile);

const SV_GROUP_IDS = [
  "sv-base", "sv-triplet-beat", "sv-paldea-evolved",
  "sv-151", "sv-obsidian-flames", "sv-raging-surf",
  "sv-paradox-rift", "sv-paldean-fates", "sv-temporal-forces",
  "sv-crimson-haze", "sv-twilight-masquerade", "sv-shrouded-fable",
  "og-svk", "og-svln", "og-svls",
  "sv-stellar-crown", "sv-paradise-dragona", "sv-surging-sparks",
  "sv-prismatic-evolutions", "sv-journey-together", "sv-heatwave-arena",
  "sv-destined-rivals", "sv-black-bolt-white-flare",
];

const MEGA_GROUP_IDS = [
  "mega-brave-symphonia", "mega-infernox", "mega-dream-ex",
  "mega-munikisuzero", "mega-ninja-spinner", "mega-abyss-eye",
];

const ALL_GROUP_IDS = [...SV_GROUP_IDS, ...MEGA_GROUP_IDS];

const EN_SV_SET_IDS = [
  "sv1", "sv2", "sv3", "sv3pt5", "sv4", "sv4pt5",
  "sv5", "sv6", "sv6pt5", "sv7", "sv8", "sv8pt5",
  "sv9", "sv10", "svp",
  "zsv10pt5", "rsv10pt5",  // Black Bolt & White Flare
];

const JP_SV_SET_IDS = [
  "jp-sv-base", "jp-sv-triplet-beat", "jp-sv-paldea-evolved",
  "jp-sv-151", "jp-sv-obsidian-flames", "jp-sv-raging-surf",
  "jp-sv-paradox-rift", "jp-sv-paldean-fates", "jp-sv-temporal-forces",
  "jp-sv-crimson-haze", "jp-sv-twilight-masquerade", "jp-sv-shrouded-fable",
  "jp-tcg-SVK", "jp-tcg-SVLN", "jp-tcg-SVLS",
  "jp-sv-stellar-crown", "jp-sv-paradise-dragona", "jp-sv-surging-sparks",
  "jp-sv-prismatic-evolutions", "jp-sv-journey-together", "jp-sv-heatwave-arena",
  "jp-sv-destined-rivals", "jp-sv-black-bolt-white-flare",
];

const JP_MEGA_SET_IDS = [
  "jp-mega-brave-symphonia", "jp-mega-infernox", "jp-mega-dream-ex",
  "jp-mega-munikisuzero", "jp-mega-ninja-spinner", "jp-mega-abyss-eye",
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
interface LogicalCardRow {
  id: string; primarySetId: string | null; primaryNumber: string | null; cardPackId: string | null;
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

async function section0() {
  const rows: { setId: string; count: number; logoUrl: string | null; symbolUrl: string | null; nameKo: string | null }[] = [];

  for (const enId of EN_SV_SET_IDS) {
    const count = await prisma.regionCard.count({ where: { setId: enId } });
    const s = await prisma.set.findUnique({ where: { id: enId }, select: { logoUrl: true, symbolUrl: true, nameKo: true } });
    rows.push({ setId: `EN:${enId}`, count, logoUrl: s?.logoUrl ?? null, symbolUrl: s?.symbolUrl ?? null, nameKo: s?.nameKo ?? null });
    console.log(`  [0] ${enId}: count=${count}, logo=${!!s?.logoUrl}`);
  }

  for (const jpId of [...JP_SV_SET_IDS, ...JP_MEGA_SET_IDS]) {
    const count = await prisma.regionCard.count({ where: { setId: jpId } });
    const s = await prisma.set.findUnique({ where: { id: jpId }, select: { logoUrl: true, symbolUrl: true, nameKo: true } });
    rows.push({ setId: `JP:${jpId}`, count, logoUrl: s?.logoUrl ?? null, symbolUrl: s?.symbolUrl ?? null, nameKo: s?.nameKo ?? null });
    console.log(`  [0] ${jpId}: count=${count}, logo=${!!s?.logoUrl}`);
  }

  return rows;
}

interface PerSetImageStats { enOk: number; enFail: number; jpOk: number; jpFail: number; }

async function sectionA(enLocales: RegionCardRow[], jpLocales: RegionCardRow[]) {
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
    const key = r.setId.replace(/^(?:en|jp|kr)-(?:tcg|sv|mega)-/, "");
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

  const enMissingImg = enLocales.filter(c => !c.imageSmall).length;
  const jpMissingImg = jpLocales.filter(c => !c.imageSmall).length;
  console.log(`  [E] EN imageSmall null: ${enMissingImg}/${enLocales.length}`);
  console.log(`  [E] JP imageSmall null: ${jpMissingImg}/${jpLocales.length}`);

  return { perSet, failures, enTotal: enLocales.length, jpTotal: jpLocales.length, enMissingImg, jpMissingImg };
}

interface SetFieldStats { total: number; fields: Record<FieldKey, number>; }

async function sectionB(lcards: LogicalCardRow[]) {
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const perSet = new Map<string, SetFieldStats>();

  for (const card of lcards) {
    const setKey = card.cardPackId ?? (card.primarySetId ?? "").replace(/^en-tcg-/, "");
    if (!perSet.has(setKey)) perSet.set(setKey, { total: 0, fields: Object.fromEntries(FIELDS.map(f => [f, 0])) as Record<FieldKey, number> });
    const s = perSet.get(setKey)!;
    s.total++;
    for (const f of FIELDS) { if (isPresent(card, f)) s.fields[f]++; }
  }

  console.log(`\n[B] Field completeness — ${lcards.length} LogicalCards`);
  for (const [setKey, stats] of perSet) {
    console.log(`  [B] ${setKey}: ${stats.total} cards, supertype=${pct(stats.fields.supertype, stats.total)}, nameKo=${pct(stats.fields.nameKo, stats.total)}`);
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
      const key = setId.replace(/^(?:en|jp|kr)-(?:tcg|sv|mega)-/, "");
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

async function sectionF(lcards: LogicalCardRow[], locales: RegionCardRow[]) {
  const nameMap = new Map<string, string>();
  for (const cl of locales) { nameMap.set(cl.id, cl.name); }

  const bySet = new Map<string, SupertypeStats>();
  for (const card of lcards) {
    const setKey = card.cardPackId ?? (card.primarySetId ?? "").replace(/^[a-z]+-tcg-/, "");
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

async function sectionH(allLcards: LogicalCardRow[]) {
  const lcIds = allLcards.map(c => c.id);
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
  for (const card of allLcards) {
    const setKey = card.cardPackId ?? (card.primarySetId ?? "").replace(/^[a-z]+-tcg-/, "");
    if (!bySet.has(setKey)) bySet.set(setKey, { setKey, patterns: new Map() });
    const s = bySet.get(setKey)!;
    const langs = (byLcId.get(card.id) ?? []).sort().join("+") || "(none)";
    s.patterns.set(langs, (s.patterns.get(langs) ?? 0) + 1);
  }

  console.log(`\n[H] Version availability...`);
  for (const [, stats] of bySet) {
    const langTotals = new Map<string, number>();
    for (const [combo, cnt] of stats.patterns) {
      for (const lang of combo.split("+")) {
        langTotals.set(lang, (langTotals.get(lang) ?? 0) + cnt);
      }
    }
    console.log(`  [H] ${stats.setKey}:`, Object.fromEntries(langTotals));
  }
  return [...bySet.values()];
}

async function sectionGroups() {
  const groups = await prisma.cardPack.findMany({
    where: { id: { in: ALL_GROUP_IDS } },
    include: { sets: { select: { id: true, region: true, cardCount: true, logoUrl: true, symbolUrl: true, nameKo: true } } },
    orderBy: { releaseDate: "asc" },
  });
  return groups;
}

function buildReport(data: {
  groups: Awaited<ReturnType<typeof sectionGroups>>;
  counts0: Awaited<ReturnType<typeof section0>>;
  imgData: Awaited<ReturnType<typeof sectionA>>;
  fieldData: Map<string, SetFieldStats>;
  contiguity: ContiguityResult[];
  missing: { enMissing: RegionCardRow[]; jpMissing: RegionCardRow[] };
  supertypes: SupertypeStats[];
  versions: LocaleStats[];
  totalLcards: number;
}): string {
  const lines: string[] = [];
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  lines.push(`# Phase A Verification: SV + MEGA Sets\n`);
  lines.push(`생성 일시: ${now} UTC\n`);
  lines.push(`대상: SV era (스칼렛·바이올렛, 2023~) ${SV_GROUP_IDS.length}개 + MEGA era ${MEGA_GROUP_IDS.length}개 CardPack.\n`);

  // Section 0
  lines.push(`## 0) CardPack 커버리지`);
  const grpRows = data.groups.map(sg => {
    const sets = sg.sets.map(s => {
      const count = data.counts0.find(r => r.setId === `EN:${s.id}` || r.setId === `JP:${s.id}`)?.count ?? "?";
      return `${s.region}:${count}`;
    }).join(", ");
    return [sg.id, sg.nameJa ?? "—", sg.nameKo ?? "—", sets];
  });
  lines.push(mdTable(["SetGroup","nameJa","nameKo","Sets (region:count)"], grpRows));
  lines.push("");

  // Section 0b
  lines.push(`## 0b) 세트별 카드 수 & 로고`);
  const s0rows = data.counts0.map(r => [
    r.setId,
    String(r.count),
    r.logoUrl ? "✓" : "✗",
    r.symbolUrl ? "✓" : "✗",
    r.nameKo ?? "—",
  ]);
  lines.push(mdTable(["세트","카드 수","로고","심볼","nameKo"], s0rows));
  lines.push("");

  // Section A
  lines.push(`## A) 이미지 라이브니스 (샘플 40장)`);
  const aRows: string[][] = [];
  for (const [setKey, stats] of data.imgData.perSet) {
    aRows.push([setKey, String(stats.enOk), String(stats.enFail), String(stats.jpOk), String(stats.jpFail)]);
  }
  if (aRows.length) lines.push(mdTable(["세트","EN OK","EN 실패","JP OK","JP 실패"], aRows));
  lines.push(`\n**EN imageSmall null:** ${data.imgData.enMissingImg}/${data.imgData.enTotal}`);
  lines.push(`**JP imageSmall null:** ${data.imgData.jpMissingImg}/${data.imgData.jpTotal}\n`);
  if (data.imgData.failures.length === 0) lines.push(`> 샘플 이미지 모두 정상.\n`);
  else {
    lines.push(`> ⚠ 실패 ${data.imgData.failures.length}건:`);
    for (const f of data.imgData.failures.slice(0, 5)) lines.push(`> - ${f.id}: ${f.url} (HTTP ${f.status})`);
    lines.push("");
  }

  // Section B
  lines.push(`## B) 필드 완성도`);
  const FIELDS: FieldKey[] = ["hp","types","attacks","abilities","subtypes","illustrator","rarityId","pokedexNumbers","supertype","nameKo"];
  const bRows: string[][] = [];
  for (const [setKey, stats] of data.fieldData) {
    bRows.push([
      setKey, String(stats.total),
      pct(stats.fields.hp, stats.total),
      pct(stats.fields.types, stats.total),
      pct(stats.fields.attacks, stats.total),
      pct(stats.fields.abilities, stats.total),
      pct(stats.fields.subtypes, stats.total),
      pct(stats.fields.illustrator, stats.total),
      pct(stats.fields.rarityId, stats.total),
      pct(stats.fields.pokedexNumbers, stats.total),
      pct(stats.fields.supertype, stats.total),
      pct(stats.fields.nameKo, stats.total),
    ]);
  }
  lines.push(mdTable(["SetGroup","총계",...FIELDS], bRows));
  lines.push("");

  // Section C
  lines.push(`## C) 인덱스 연속성`);
  const cRows = data.contiguity.map(r => [
    r.setKey, r.region, String(r.cardCount), String(r.actual),
    String(r.gaps.length), String(r.duplicates.length),
    r.gaps.length === 0 && r.duplicates.length === 0 ? "✓" : "!",
  ]);
  lines.push(mdTable(["세트","Region","cardCount","실제","갭","중복","상태"], cRows));
  for (const r of data.contiguity.filter(r => r.gaps.length > 0)) {
    const gapStr = r.gaps.length > 10 ? `${r.gaps.length}건 (첫 5: ${r.gaps.slice(0,5).map(n => String(n).padStart(3,"0")).join(", ")}...)` : r.gaps.map(n => String(n).padStart(3,"0")).join(", ");
    lines.push(`\n**${r.region} ${r.setKey} 갭:** ${gapStr}`);
  }
  lines.push("");

  // Section E
  lines.push(`## E) 누락 이미지 카드`);
  if (data.missing.enMissing.length === 0) lines.push(`EN 누락 없음.\n`);
  else {
    lines.push(`### EN 누락 (${data.missing.enMissing.length}건)`);
    const eRows = data.missing.enMissing.slice(0, 50).map(c => [c.id, c.name, c.setId]);
    lines.push(mdTable(["ID","이름","세트"], eRows));
    if (data.missing.enMissing.length > 50) lines.push(`(... ${data.missing.enMissing.length - 50}건 생략)`);
    lines.push("");
  }
  if (data.missing.jpMissing.length === 0) lines.push(`JP 누락 없음.\n`);
  else {
    lines.push(`### JP 누락 (${data.missing.jpMissing.length}건)`);
    const eRows = data.missing.jpMissing.slice(0, 50).map(c => [c.id, c.name, c.setId]);
    lines.push(mdTable(["ID","이름","세트"], eRows));
    if (data.missing.jpMissing.length > 50) lines.push(`(... ${data.missing.jpMissing.length - 50}건 생략)`);
    lines.push("");
  }

  // Section F
  lines.push(`## F) Supertype 분류`);
  const fRows = data.supertypes.map(s => {
    const counts = Object.fromEntries(s.counts);
    return [
      s.setKey,
      String(s.nullCards.length + [...s.counts.values()].reduce((a,b)=>a+b,0) - s.nullCards.length),
      String(counts["(null)"] ?? 0),
      String(counts["Energy"] ?? 0),
      String(counts["Pokémon"] ?? 0),
      String(counts["Trainer"] ?? 0),
    ];
  });
  lines.push(mdTable(["SetGroup","합계","(null)","Energy","Pokémon","Trainer"], fRows));
  const totalNull = data.supertypes.reduce((sum, s) => sum + s.nullCards.length, 0);
  if (totalNull > 0) {
    lines.push(`\n### Null supertype (30건 표시)`);
    const nullCards = data.supertypes.flatMap(s => s.nullCards).slice(0, 30);
    lines.push(mdTable(["LogicalCard ID","이름"], nullCards.map(c => [c.id, c.name])));
    if (totalNull > 30) lines.push(`(... ${totalNull - 30}건 생략)`);
  }
  lines.push("");

  // Section H
  lines.push(`## H) 버전 가용성 (언어 조합)`);
  const hRows = data.versions.map(s => {
    const langTotals = new Map<string, number>();
    for (const [combo, cnt] of s.patterns) {
      for (const lang of combo.split("+").filter(l => l !== "(none)")) {
        langTotals.set(lang, (langTotals.get(lang) ?? 0) + cnt);
      }
    }
    const total = [...s.patterns.values()].reduce((a, b) => a + b, 0);
    return [s.setKey, String(total),
      String(langTotals.get("en") ?? 0),
      String(langTotals.get("ja") ?? 0),
      String(langTotals.get("ko") ?? 0),
    ];
  });
  lines.push(mdTable(["SetGroup","총계","en","ja","ko"], hRows));
  lines.push("");

  // Recommendations
  lines.push(`## 권장 액션`);
  const actions: [string, string][] = [];
  const totalNullSuper = data.supertypes.reduce((sum, s) => sum + s.nullCards.length, 0);
  if (totalNullSuper > 0) actions.push(["P2", `supertype null ${totalNullSuper}건 — enrich-*-meta-tcgdex 실행 필요`]);
  if (data.imgData.jpMissingImg > 0) actions.push(["P2", `JP imageSmall 누락 ${data.imgData.jpMissingImg}건`]);
  if (data.imgData.enMissingImg > 0) actions.push(["P2", `EN imageSmall 누락 ${data.imgData.enMissingImg}건`]);
  const missingNameKo = data.groups.filter(sg => !sg.nameKo);
  if (missingNameKo.length > 0) actions.push(["P2", `nameKo 미설정 CardPack ${missingNameKo.length}개: ${missingNameKo.map(sg=>sg.id).join(", ")}`]);
  const gapSets = data.contiguity.filter(r => r.gaps.length > 0);
  if (gapSets.length > 0) actions.push(["P2", `ID 갭: ${gapSets.map(r=>`${r.region} ${r.setKey}(${r.gaps.length})`).join(", ")}`]);
  if (actions.length === 0) actions.push(["P0", "모든 검증 통과 — 추가 액션 없음"]);
  lines.push(mdTable(["우선순위","액션"], actions));
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log("=== Phase A Verification: SV + MEGA ===");

  const groups = await sectionGroups();

  // Load all RegionCards for SV EN sets
  const enLocales: RegionCardRow[] = await prisma.regionCard.findMany({
    where: { setId: { in: EN_SV_SET_IDS } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  // Load all RegionCards for SV JP + MEGA JP sets
  const jpLocales: RegionCardRow[] = await prisma.regionCard.findMany({
    where: { setId: { in: [...JP_SV_SET_IDS, ...JP_MEGA_SET_IDS] } },
    select: { id: true, name: true, setId: true, language: true, imageSmall: true },
  });

  console.log(`Loaded: ${enLocales.length} EN locales, ${jpLocales.length} JP locales`);

  // Load all LogicalCards for SV + MEGA
  const lcards: LogicalCardRow[] = await prisma.logicalCard.findMany({
    where: { cardPackId: { in: ALL_GROUP_IDS } },
    select: {
      id: true, primarySetId: true, primaryNumber: true, cardPackId: true,
      hp: true, types: true, attacks: true, abilities: true,
      subtypes: true, illustrator: true, rarityId: true,
      pokedexNumbers: true, supertype: true, nameKo: true,
    },
  });
  console.log(`Loaded: ${lcards.length} LogicalCards`);

  const allSets = await prisma.set.findMany({
    where: { cardPackId: { in: ALL_GROUP_IDS } },
    select: { id: true, cardCount: true },
  });

  const counts0 = await section0();
  const imgData = await sectionA(enLocales, jpLocales);
  const fieldData = await sectionB(lcards);
  const contiguity = await sectionC(enLocales, jpLocales, allSets);
  const missing = await sectionE(enLocales, jpLocales);
  const supertypes = await sectionF(lcards, [...enLocales, ...jpLocales]);
  const versions = await sectionH(lcards);

  const report = buildReport({ groups, counts0, imgData, fieldData, contiguity, missing, supertypes, versions, totalLcards: lcards.length });

  const outPath = path.join(process.cwd(), "docs", "phase-a-verification-sv.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\n✓ Report saved: ${outPath}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
