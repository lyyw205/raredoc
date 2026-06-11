/**
 * Phase A Verification: PMCG1~6 (457 cards) comprehensive audit
 *
 * Sections:
 *   A) Image liveness (HEAD check via curl, 10 concurrent)
 *   B) Field completeness audit per set
 *   C) ID contiguity check (gaps/duplicates)
 *   E) PMCG5/6 missing 18 cards — tcgdex probe
 *   F) supertype classification per set
 *   G) EN Base Set cross-check (PMCG1 only)
 *   H) Version availability (RegionCard language breakdown)
 *
 * Run: npx tsx scripts/phase-a-verify-pmcg.ts
 * Output: docs/phase-a-verification-pmcg.md
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

/** Run tasks with max concurrency */
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
  const cols = headers.length;
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
// Section E: PMCG5/6 missing 18 cards — tcgdex probe
// ---------------------------------------------------------------------------

interface MissingCardProbe {
  set: string;
  number: string;
  name: string;
  tcgdexStatus: number;
  tcgdexName?: string;
  tcgdexRarity?: string;
  tcgdexTypes?: string[];
  inDb: boolean;
}

const PMCG5_MISSING = [
  { number: "085", name: "霧" },
  { number: "086", name: "ミスティの願い" },
  { number: "087", name: "カオスジム" },
  { number: "088", name: "秘密の使命" },
  { number: "089", name: "ブロック" },
  { number: "090", name: "ブロックの保護" },
  { number: "091", name: "レジスタンスジム" },
  { number: "092", name: "中佐" },
  { number: "093", name: "Surgeの秘密計画中" },
  { number: "094", name: "除去ジムはありません" },
  { number: "095", name: "ロケットのトレーニングジム" },
  { number: "096", name: "ロケットのtrap" },
];

const PMCG6_MISSING = [
  { number: "093", name: "ブレイン" },
  { number: "094", name: "コガ" },
  { number: "095", name: "ジョバンニ" },
  { number: "096", name: "ジョバンニの最後の手段" },
  { number: "097", name: "ビリディアンシティジム" },
  { number: "098", name: "サブリナ" },
];

async function sectionE(lcards: LogicalCardRow[]): Promise<MissingCardProbe[]> {
  console.log(`\n[E] PMCG5/6 missing 18 cards — tcgdex probe...`);

  const dbIds = new Set(lcards.map(c => c.id));
  const results: MissingCardProbe[] = [];

  const allMissing = [
    ...PMCG5_MISSING.map(c => ({ ...c, set: "PMCG5" })),
    ...PMCG6_MISSING.map(c => ({ ...c, set: "PMCG6" })),
  ];

  for (const card of allMissing) {
    const url = `https://api.tcgdex.net/v2/ja/cards/${card.set}-${card.number}`;
    const { status, body } = await curlJson<{ name?: string; rarity?: string; types?: string[] }>(url);
    const dbId = `jp-tcg-${card.set}-${card.number}`;
    results.push({
      set: card.set,
      number: card.number,
      name: card.name,
      tcgdexStatus: status,
      tcgdexName: (body as { name?: string } | null)?.name,
      tcgdexRarity: (body as { rarity?: string } | null)?.rarity,
      tcgdexTypes: (body as { types?: string[] } | null)?.types,
      inDb: dbIds.has(`lc-orphan-${dbId}`) || dbIds.has(dbId),
    });
    console.log(`  [E] ${card.set}-${card.number} ${card.name}: tcgdex=${status}`);
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

  // Build LC id -> name map from RegionCard
  const nameMap = new Map<string, string>();
  for (const cl of locales) {
    // RegionCard id format: jp-tcg-PMCG1-001, LC id: lc-orphan-jp-tcg-PMCG1-001
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
// Section G: EN Base Set cross-check (PMCG1 only)
// ---------------------------------------------------------------------------

interface EnCard {
  id: string;
  name: string;
  nationalPokedexNumbers: number[];
  hp: string;
  attacks: unknown[] | null;
  supertype: string;
}

interface MismatchRow {
  jpId: string;
  jpName: string;
  jpHp: number | null;
  jpAttacks: number;
  enId: string;
  enName: string;
  enHp: string;
  enAttacks: number;
  mismatch: string[];
}

async function sectionG(lcards: LogicalCardRow[]): Promise<{ mismatches: MismatchRow[]; matched: number; unmatched: number; enTotal: number }> {
  console.log(`\n[G] EN Base Set cross-check (PMCG1)...`);

  const pmcg1 = lcards.filter(c => c.primarySetId === "jp-tcg-PMCG1" && Array.isArray(c.pokedexNumbers) && c.pokedexNumbers.length > 0);

  const url = "https://api.pokemontcg.io/v2/cards?q=set.id:base1&pageSize=250";
  const { status, body } = await curlJson<{ data: EnCard[] }>(url);
  await sleep(500);

  if (status !== 200 || !body?.data) {
    console.log(`  [G] pokemontcg.io returned ${status} — skipping`);
    return { mismatches: [], matched: 0, unmatched: pmcg1.length, enTotal: 0 };
  }

  const enCards = body.data;
  console.log(`  [G] pokemontcg.io: ${enCards.length} Base1 cards`);

  // Index EN cards by pokedex number (only Pokemon)
  const enByDex = new Map<number, EnCard[]>();
  for (const en of enCards) {
    if (en.supertype !== "Pokémon") continue;
    for (const dex of (en.nationalPokedexNumbers ?? [])) {
      if (!enByDex.has(dex)) enByDex.set(dex, []);
      enByDex.get(dex)!.push(en);
    }
  }

  const mismatches: MismatchRow[] = [];
  let matched = 0;
  let unmatched = 0;

  for (const jp of pmcg1) {
    if (jp.supertype !== "Pokemon") continue;
    const dex = jp.pokedexNumbers[0];
    const candidates = enByDex.get(dex) ?? [];
    if (candidates.length === 0) { unmatched++; continue; }
    // Pick best candidate (first match)
    const en = candidates[0];
    matched++;
    const mismatch: string[] = [];
    const jpHp = jp.hp;
    const enHp = parseInt(en.hp ?? "0", 10);
    if (jpHp != null && Math.abs(jpHp - enHp) > 0) {
      mismatch.push(`HP: JP=${jpHp} EN=${enHp}`);
    }
    const jpAtk = Array.isArray(jp.attacks) ? (jp.attacks as unknown[]).length : 0;
    const enAtk = Array.isArray(en.attacks) ? en.attacks.length : 0;
    if (jpAtk !== enAtk) {
      mismatch.push(`Attacks: JP=${jpAtk} EN=${enAtk}`);
    }
    if (mismatch.length > 0) {
      mismatches.push({
        jpId: jp.id,
        jpName: jp.id,
        jpHp,
        jpAttacks: jpAtk,
        enId: en.id,
        enName: en.name,
        enHp: en.hp,
        enAttacks: enAtk,
        mismatch,
      });
    }
  }

  console.log(`  [G] matched=${matched}, unmatched=${unmatched}, mismatches=${mismatches.length}`);
  return { mismatches, matched, unmatched, enTotal: enCards.length };
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

  // Fetch RegionCard rows for all PMCG logicalCardIds
  const lcIds = lcards.map(c => c.id);
  const localeRows = await prisma.regionCard.findMany({
    where: { logicalCardId: { in: lcIds } },
    select: { logicalCardId: true, language: true, setId: true },
  });

  // Group by logicalCardId -> languages
  const byLcId = new Map<string, string[]>();
  for (const row of localeRows) {
    if (!byLcId.has(row.logicalCardId)) byLcId.set(row.logicalCardId, []);
    byLcId.get(row.logicalCardId)!.push(row.language);
  }

  // Build stats per set
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
  sectionG: { mismatches: MismatchRow[]; matched: number; unmatched: number; enTotal: number };
  sectionH: LocaleStats[];
}): string {
  const SETS = ["PMCG1", "PMCG2", "PMCG3", "PMCG4", "PMCG5", "PMCG6"];
  const FIELDS: FieldKey[] = ["hp", "types", "attacks", "abilities", "subtypes", "illustrator", "rarityId", "pokedexNumbers", "supertype", "nameKo"];
  const lines: string[] = [];

  const now = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  lines.push(`# Phase A Verification: PMCG1~6`);
  lines.push(`\n생성 일시: ${now}\n`);
  lines.push(`대상: PMCG1~6 (일본판 구판, 1996~1999). 총 ${data.setDefs.reduce((a, s) => a + (s.cardCount ?? 0), 0)}장.\n`);

  // Helper to get set name
  const setName = (key: string) => data.setDefs.find(s => s.id === `jp-tcg-${key}`)?.name ?? key;

  // -------------------------
  // Section A
  // -------------------------
  lines.push(`## A) 이미지 라이브니스 (Image Liveness)`);
  lines.push(`\nSupabase Storage에 업로드된 카드 이미지 HTTP 상태 점검 (HEAD).\n`);
  const aHeaders = ["세트", "JP 이름", "총 카드", "HTTP 200", "실패", "성공률"];
  const aRows = SETS.map(s => {
    const stat = data.sectionA.perSet.get(s) ?? { ok: 0, fail: 0 };
    const total = stat.ok + stat.fail;
    return [s, setName(s), String(total), String(stat.ok), String(stat.fail), pct(stat.ok, total)];
  });
  lines.push(mdTable(aHeaders, aRows));

  const totalCards = data.setDefs.reduce((a, s) => a + (s.cardCount ?? 0), 0);
  const totalOk = SETS.reduce((a, s) => a + (data.sectionA.perSet.get(s)?.ok ?? 0), 0);
  lines.push(`\n**전체:** ${totalOk}/${totalCards} 이미지 정상 (${pct(totalOk, totalCards)})\n`);

  if (data.sectionA.failures.length > 0) {
    lines.push(`### 실패 목록 (${data.sectionA.failures.length}건)`);
    const fHeaders = ["ID", "이름", "URL", "HTTP 상태"];
    const fRows = data.sectionA.failures.map(f => [f.id, f.name, f.url, String(f.status)]);
    lines.push(mdTable(fHeaders, fRows));
  } else {
    lines.push(`> 모든 이미지 정상 (실패 없음).`);
  }

  // -------------------------
  // Section B
  // -------------------------
  lines.push(`\n## B) 필드 완성도 감사 (Field Completeness)`);
  lines.push(`\n각 LogicalCard 필드의 채움률 (%). `);
  lines.push(`※ nameKo는 이번 Phase에서 신규 추가 예정이므로 0% 예상.\n`);

  const bHeaders = ["세트", "총계", ...FIELDS];
  const bRows = SETS.map(s => {
    const stats = data.sectionB.get(s);
    if (!stats) return [s, "0", ...FIELDS.map(() => "—")];
    return [s, String(stats.total), ...FIELDS.map(f => pct(stats.fields[f], stats.total))];
  });
  lines.push(mdTable(bHeaders, bRows));

  // Highlight zero-fill fields (excluding nameKo and abilities)
  const concerning: string[] = [];
  for (const s of SETS) {
    const stats = data.sectionB.get(s);
    if (!stats) continue;
    for (const f of FIELDS) {
      if (f === "nameKo" || f === "abilities") continue; // expected low
      if (stats.fields[f] === 0) {
        concerning.push(`${s}.${f}`);
      }
    }
  }
  if (concerning.length > 0) {
    lines.push(`\n**주의:** 0% 필드: ${concerning.join(", ")}`);
  }

  // -------------------------
  // Section C
  // -------------------------
  lines.push(`\n## C) 인덱스 연속성 (ID Contiguity)`);
  lines.push(`\n각 세트의 카드 ID가 001부터 {cardCount}까지 연속되는지 점검.\n`);

  const cHeaders = ["세트", "cardCount", "실제 수", "갭 수", "중복 수", "상태"];
  const cRows = data.sectionC.map(r => {
    const status = r.gaps.length === 0 && r.duplicates.length === 0 ? "✓" : "!";
    return [r.setKey, String(r.cardCount), String(r.cardCount - r.gaps.length), String(r.gaps.length), String(r.duplicates.length), status];
  });
  lines.push(mdTable(cHeaders, cRows));

  for (const r of data.sectionC) {
    if (r.gaps.length > 0) {
      lines.push(`\n**${r.setKey} 갭:** ${r.gaps.map(n => String(n).padStart(3, "0")).join(", ")}`);
    }
    if (r.duplicates.length > 0) {
      lines.push(`\n**${r.setKey} 중복:** ${r.duplicates.map(n => String(n).padStart(3, "0")).join(", ")}`);
    }
  }

  // -------------------------
  // Section E
  // -------------------------
  lines.push(`\n## E) PMCG5/6 누락 18장 진단`);
  lines.push(`\nBulbapedia JP 섹션에 없어서 이미지 미확보된 카드 18장 — tcgdex API 직접 탐침.\n`);

  const eHeaders = ["세트", "번호", "예상 이름", "tcgdex 상태", "tcgdex 이름", "레어도", "타입", "DB 존재"];
  const eRows = data.sectionE.map(p => [
    p.set, p.number, p.name,
    String(p.tcgdexStatus),
    p.tcgdexName ?? "—",
    p.tcgdexRarity ?? "—",
    (p.tcgdexTypes ?? []).join("/") || "—",
    p.inDb ? "O" : "X",
  ]);
  lines.push(mdTable(eHeaders, eRows));

  const e200 = data.sectionE.filter(p => p.tcgdexStatus === 200).length;
  const e404 = data.sectionE.filter(p => p.tcgdexStatus === 404).length;
  const eOther = data.sectionE.length - e200 - e404;
  lines.push(`\n**요약:** tcgdex 200=${e200}, 404=${e404}, 기타=${eOther}`);
  if (e200 > 0) {
    lines.push(`> tcgdex에 존재하는 카드(${e200}건)는 이미지 소스 확보 후 재시도 가능.`);
  }
  if (e404 > 0) {
    lines.push(`> tcgdex 404(${e404}건)는 실제 phantom 카드이거나 세트 ID 매핑 오류 가능성.`);
  }

  // -------------------------
  // Section F
  // -------------------------
  lines.push(`\n## F) Supertype 분류`);
  lines.push(`\n각 세트의 LogicalCard.supertype 값 분포.\n`);

  const allSupertypes = new Set<string>();
  for (const stats of data.sectionF) {
    for (const k of stats.counts.keys()) allSupertypes.add(k);
  }
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
    const nHeaders = ["LogicalCard ID", "이름"];
    const nRows = nullCards.map(c => [c.id, c.name]);
    lines.push(mdTable(nHeaders, nRows));
  } else {
    lines.push(`\n> 모든 카드에 supertype 존재.`);
  }

  // -------------------------
  // Section G
  // -------------------------
  lines.push(`\n## G) EN Base Set 교차 검증 (PMCG1 only)`);
  lines.push(`\npokemontcg.io base1 세트 vs PMCG1 — HP·공격기 수 비교.\n`);
  lines.push(`> PMCG2~6 교차 검증은 이번 실행에서 제외 (API 호출 과다). 추후 별도 진행 예정.\n`);

  lines.push(`- pokemontcg.io base1 카드 수: ${data.sectionG.enTotal}`);
  lines.push(`- PMCG1 Pokemon (dex 있음): ${data.sectionG.matched + data.sectionG.unmatched}`);
  lines.push(`- 매칭 성공: ${data.sectionG.matched}`);
  lines.push(`- 매칭 실패 (EN 후보 없음): ${data.sectionG.unmatched}`);
  lines.push(`- 불일치 (HP or 공격기 차이): ${data.sectionG.mismatches.length}\n`);

  if (data.sectionG.mismatches.length > 0) {
    const gHeaders = ["JP ID", "JP HP", "JP 공격기", "EN ID", "EN 이름", "EN HP", "EN 공격기", "불일치 항목"];
    const gRows = data.sectionG.mismatches.map(m => [
      m.jpId, String(m.jpHp ?? "—"), String(m.jpAttacks),
      m.enId, m.enName, m.enHp, String(m.enAttacks),
      m.mismatch.join("; "),
    ]);
    lines.push(mdTable(gHeaders, gRows));
  } else {
    lines.push(`> 불일치 없음 (매칭된 카드 모두 HP·공격기 수 일치).`);
  }

  // -------------------------
  // Section H
  // -------------------------
  lines.push(`\n## H) 버전 가용성 (RegionCard 언어 분포)`);
  lines.push(`\n각 LogicalCard의 RegionCard 언어 조합. PMCG는 일본 원판이므로 대부분 "ja only" 예상.\n`);

  // Collect all patterns
  const allPatterns = new Set<string>();
  for (const stats of data.sectionH) {
    for (const k of stats.patterns.keys()) allPatterns.add(k);
  }
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
    const mHeaders = ["LogicalCard ID", "언어"];
    const mRows = allMulti.map(c => [c.id, c.langs.join(", ")]);
    lines.push(mdTable(mHeaders, mRows));
  } else {
    lines.push(`\n> 모든 PMCG 카드가 ja 단일 언어 — 정상.`);
  }

  // -------------------------
  // Recommended Actions
  // -------------------------
  lines.push(`\n## 권장 액션 (Recommended Actions)`);
  lines.push(``);

  const actions: { priority: string; action: string }[] = [];

  // Image failures
  if (data.sectionA.failures.length > 0) {
    actions.push({ priority: "P1", action: `이미지 미확보 ${data.sectionA.failures.length}건 — Supabase Storage 재업로드 필요` });
  }

  // Missing 18 cards with tcgdex 200
  const eRecoverable = data.sectionE.filter(p => p.tcgdexStatus === 200);
  if (eRecoverable.length > 0) {
    actions.push({ priority: "P1", action: `PMCG5/6 누락 ${eRecoverable.length}건 tcgdex에 존재 → 이미지 소스 별도 확보 후 재시도` });
  }

  // Phantom cards (tcgdex 404)
  const ePhantom = data.sectionE.filter(p => p.tcgdexStatus === 404);
  if (ePhantom.length > 0) {
    actions.push({ priority: "P2", action: `tcgdex 404 ${ePhantom.length}건 — Bulbapedia / 실물 카드 수 재확인 후 DB에서 제거 또는 유지 결정` });
  }

  // Field gaps
  const lowFields: string[] = [];
  for (const s of SETS) {
    const stats = data.sectionB.get(s);
    if (!stats) continue;
    for (const f of ["hp", "types", "attacks", "supertype"] as FieldKey[]) {
      const rate = stats.total > 0 ? (stats.fields[f] / stats.total) : 1;
      if (rate < 0.5) lowFields.push(`${s}.${f}(${pct(stats.fields[f], stats.total)})`);
    }
  }
  if (lowFields.length > 0) {
    actions.push({ priority: "P2", action: `필드 채움률 50% 미만: ${lowFields.join(", ")} — tcgdex 재보강 필요` });
  }

  // Illustrator missing
  const noIllustrator: string[] = [];
  for (const s of SETS) {
    const stats = data.sectionB.get(s);
    if (!stats) continue;
    const rate = stats.total > 0 ? (stats.fields["illustrator"] / stats.total) : 1;
    if (rate < 0.3) noIllustrator.push(`${s}(${pct(stats.fields["illustrator"], stats.total)})`);
  }
  if (noIllustrator.length > 0) {
    actions.push({ priority: "P3", action: `illustrator 채움률 낮음: ${noIllustrator.join(", ")} — tcgdex 지원 여부 확인` });
  }

  // Gaps
  const gapSets = data.sectionC.filter(r => r.gaps.length > 0);
  if (gapSets.length > 0) {
    actions.push({ priority: "P2", action: `ID 갭 존재 세트: ${gapSets.map(r => `${r.setKey}(${r.gaps.length}갭)`).join(", ")} — 카드 누락 또는 cardCount 불일치 확인` });
  }

  // Null supertype
  if (nullCards.length > 0) {
    actions.push({ priority: "P2", action: `supertype null ${nullCards.length}건 — Pokemon/Trainer/Energy 수동 분류 필요` });
  }

  // nameKo
  lines.push(`| 우선순위 | 액션 |`);
  lines.push(`| --- | --- |`);
  actions.push({ priority: "P3", action: `nameKo 필드 전체 미입력 (0%) — 한국어 카드명 번역/입력 Phase 시작` });
  // EN cross-check deferred
  actions.push({ priority: "P3", action: `PMCG2~6 EN 교차 검증 미실시 — 별도 스크립트 실행 필요` });

  for (const a of actions) {
    lines.push(`| **${a.priority}** | ${a.action} |`);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(`*자동 생성: scripts/phase-a-verify-pmcg.ts*`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Phase A Verification: PMCG1~6 ===\n");

  // Fetch all data
  const sets = await prisma.set.findMany({
    where: { id: { startsWith: "jp-tcg-PMCG" } },
    select: { id: true, name: true, cardCount: true },
    orderBy: { id: "asc" },
  });

  const locales = await prisma.regionCard.findMany({
    where: { setId: { startsWith: "jp-tcg-PMCG" } },
    select: { id: true, name: true, setId: true, imageSmall: true },
    orderBy: { id: "asc" },
  });

  const lcards = await prisma.logicalCard.findMany({
    where: { primarySetId: { startsWith: "jp-tcg-PMCG" } },
    select: {
      id: true,
      primarySetId: true,
      primaryNumber: true,
      hp: true,
      types: true,
      attacks: true,
      abilities: true,
      subtypes: true,
      illustrator: true,
      rarityId: true,
      pokedexNumbers: true,
      supertype: true,
      nameKo: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`Loaded: ${sets.length} sets, ${locales.length} RegionCard, ${lcards.length} LogicalCard`);

  // Run all sections
  const resA = await sectionA(locales);
  const resB = await sectionB(lcards);
  const resC = await sectionC(locales, sets);
  const resE = await sectionE(lcards);
  const resF = await sectionF(lcards, locales);
  const resG = await sectionG(lcards);
  const resH = await sectionH(lcards);

  // Build report
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

  const outPath = path.join(__dirname, "..", "docs", "phase-a-verification-pmcg.md");
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\nReport written: ${outPath}`);

  // Console summary
  console.log("\n=== SUMMARY ===");
  const totalCards = locales.length;
  const totalOk = [...resA.perSet.values()].reduce((a, s) => a + s.ok, 0);
  console.log(`A) Images: ${totalOk}/${totalCards} OK (${resA.failures.length} failed)`);

  for (const [setKey, stats] of resB) {
    const hp = pct(stats.fields.hp, stats.total);
    const attacks = pct(stats.fields.attacks, stats.total);
    console.log(`B) ${setKey}: hp=${hp} attacks=${attacks} nameKo=${pct(stats.fields.nameKo, stats.total)}`);
  }

  const gapCount = resC.reduce((a, r) => a + r.gaps.length, 0);
  const dupCount = resC.reduce((a, r) => a + r.duplicates.length, 0);
  console.log(`C) Contiguity: ${gapCount} gaps, ${dupCount} duplicates`);

  const e200 = resE.filter(p => p.tcgdexStatus === 200).length;
  const e404 = resE.filter(p => p.tcgdexStatus === 404).length;
  console.log(`E) Missing 18: tcgdex 200=${e200}, 404=${e404}`);

  const nullSupertype = resF.reduce((a, s) => a + s.nullCards.length, 0);
  console.log(`F) Null supertype: ${nullSupertype} cards`);

  console.log(`G) EN cross-check: matched=${resG.matched}, mismatches=${resG.mismatches.length}`);

  const multiLocale = resH.reduce((a, s) => a + s.multiLocale.length, 0);
  console.log(`H) Multi-locale cards: ${multiLocale}`);

  console.log("\n=== CRITICAL FINDINGS ===");
  if (resA.failures.length > 0) console.log(`! ${resA.failures.length} images returning non-200`);
  if (e200 > 0) console.log(`! ${e200} missing cards exist in tcgdex — recoverable`);
  if (e404 > 0) console.log(`! ${e404} missing cards not in tcgdex — phantom cards`);
  if (gapCount > 0) console.log(`! ${gapCount} ID gaps across sets`);
  if (nullSupertype > 0) console.log(`! ${nullSupertype} cards with null supertype`);
  if (resG.mismatches.length > 0) console.log(`! ${resG.mismatches.length} HP/attack mismatches vs EN Base Set`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
