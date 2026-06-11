/**
 * 제너릭 Card 메타 보강 (tcgdex API) — 11개 per-era 스크립트 중 "set-summary + null-only fill"
 * 패턴을 공유하는 8개 era 를 하나로 통합.
 *
 * 흡수된 era (8): pmcg, neo, ecard, pcg, l, xy, sm, swsh
 *   - 공통 골격: tcgdex 세트 요약(set summary)으로 카드목록을 가져와, 카드별로 DB Card 를 찾고
 *     "비어있는 필드만" 채운 뒤(null-only) ExternalIdMapping(source=tcgdex)을 upsert.
 *   - 채우는 필드(전부 null-only): hp, types, subtypes(stage→mapStageToSubtypes),
 *     pokedexNumbers(dexId), retreatCost(retreat), illustrator, evolvesFrom,
 *     supertype(=raw category), attacks, abilities, legalities, weakness, resistance, rarityId.
 *   - era 별로 다른 축은 전부 ERA 레지스트리로 파라미터화: 엔드포인트 언어(ja/en),
 *     세트맵, DB Card-id 도출식, ExternalIdMapping 의 externalId/regionCardId/confidence/verifiedBy,
 *     subtypes 매핑 테이블 변형, 카드 조회 fallback 전략.
 *
 * 별도 유지(구조적 발산으로 미병합):
 *   - enrich-mega-meta-tcgdex.ts, enrich-sv-meta-tcgdex.ts:
 *       RegionCard(card.supertype=null) 쿼리 기반 + {tcgId}-{num} 직접 fetch + 7개 필드 "덮어쓰기"
 *       + supertype 매핑(Pokemon→Pokémon) + ExternalIdMapping 없음. 위 골격과 호환 불가.
 *   - enrich-adv-meta-tcgdex.ts:
 *       prisma 미사용 no-op 프로브(카드 수만 로그). 보강 로직 없음.
 *
 * CLI:
 *   npx tsx scripts/enrich-era-meta-tcgdex.ts --era=<pmcg|neo|ecard|pcg|l|xy|sm|swsh> [--set=<id>]
 *
 * ⚠ 원본은 dry-run 모드가 없었음 — 즉시 DB 에 기록함(--apply 불필요). 원본 동작을 그대로 보존하기 위해
 *   여기서도 기본 즉시 적용이며, --apply 플래그를 주더라도 동일하게 동작(무해한 no-op 플래그).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// ─── 공유 타입 ───
type CardSummary = { id: string; localId: string; name: string };
type CardDetail = {
  id: string; localId: string; name: string; category?: string;
  illustrator?: string | null; rarity?: string | null; hp?: number | null;
  types?: string[]; stage?: string | null;
  attacks?: { cost?: string[]; name: string; effect?: string; damage?: string | number }[];
  retreat?: number | null; dexId?: number[];
  legal?: { standard?: boolean; expanded?: boolean };
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  evolveFrom?: string | null;
  abilities?: { name: string; effect: string; type: string }[];
};

// ─── 공유 유틸 ───
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 16 * 1024 * 1024 });
    if (!stdout) return null;
    return JSON.parse(stdout) as T;
  } catch { return null; }
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function formatTypeValue(rows?: { type: string; value: string }[]): string | null {
  if (!rows?.length) return null;
  return `${rows[0].type} ${rows[0].value}`.trim();
}

async function getRarityIdByName(nameEn: string): Promise<string | null> {
  const r = await prisma.rarity.findFirst({ where: { OR: [{ nameEn }, { code: nameEn }] } });
  return r?.id ?? null;
}

// stage→subtypes 매핑 테이블 변형 (era 별 보유 키 차이 보존)
const STAGE_BASE: Record<string, string> = {
  Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", "Stage 1": "Stage 1", "Stage 2": "Stage 2",
};
const STAGE_XY: Record<string, string> = {
  ...STAGE_BASE,
  BREAK: "BREAK", EX: "EX", Mega: "Mega", GX: "GX", LevelUp: "Level-Up",
};
const STAGE_SM: Record<string, string> = {
  ...STAGE_XY,
  "TAG TEAM": "TAG TEAM", LEGEND: "LEGEND", V: "V", VMAX: "VMAX",
};
const STAGE_SWSH: Record<string, string> = {
  ...STAGE_SM,
  VSTAR: "VSTAR", Radiant: "Radiant",
  "Single Strike": "Single Strike", "Rapid Strike": "Rapid Strike", "Fusion Strike": "Fusion Strike",
};

function mapStageToSubtypes(stage: string | null | undefined, table: Record<string, string>): string[] {
  if (!stage) return [];
  return [table[stage] ?? stage];
}

// ─── era 레지스트리 ───
type SetEntry = {
  // 세트 요약 fetch 에 쓰는 tcgdex 세트 ID
  tcgId: string;
  // DB Card/RegionCard id 도출용 세트 코드 (era 마다 의미가 약간 다름)
  dbCode: string;
};
type EraConfig = {
  lang: "ja" | "en";
  sets: SetEntry[];
  subtypeTable: Record<string, string>;
  confidence: number;
  verifiedBy: string;
  /**
   * 세트요약 fetch URL 의 세트 ID 변형. (neo 는 대문자, 나머지는 tcgId 그대로)
   */
  summaryId?: (tcgId: string) => string;
  /**
   * tcgdex 카드 c → DB Card 를 찾고, ExternalIdMapping 의 externalId/regionCardId 를 구성.
   * 반환 null 이면 해당 카드 누락(missing) 처리.
   */
  resolve: (c: CardSummary, s: SetEntry) => Promise<{
    card: { id: string } & CardRecord;
    externalId: string;
    regionCardId: string | null;
  } | null>;
  /** --set=<value> 필터: (set, value) → 이 세트를 포함할지 */
  setMatch?: (s: SetEntry, value: string) => boolean;
};

// DB Card 에서 읽어야 하는 null-only 판정 필드
type CardRecord = {
  id: string;
  hp: number | null;
  types: string[];
  subtypes: string[];
  pokedexNumbers: number[];
  retreatCost: number | null;
  illustrator: string | null;
  evolvesFrom: string | null;
  supertype: string | null;
  attacks: unknown | null;
  abilities: unknown | null;
  legalities: unknown | null;
  weakness: string | null;
  resistance: string | null;
  rarityId: string | null;
};

const CARD_SELECT = {
  id: true, hp: true, types: true, subtypes: true, pokedexNumbers: true,
  retreatCost: true, illustrator: true, evolvesFrom: true, supertype: true,
  attacks: true, abilities: true, legalities: true, weakness: true,
  resistance: true, rarityId: true,
} as const;

function findCardById(id: string) {
  return prisma.card.findUnique({ where: { id }, select: CARD_SELECT }) as Promise<CardRecord | null>;
}

function pad3(n: string): string {
  const int = parseInt(n, 10);
  if (!isNaN(int)) return String(int).padStart(3, "0");
  return n.padStart(3, "0");
}

// helper: pmcg/neo/ecard/pcg 공통 — lc-orphan-jp-tcg-{...} 패턴
function jaOrphan(localeIdOf: (c: CardSummary, s: SetEntry) => string | null) {
  return async (c: CardSummary, s: SetEntry) => {
    const ourLocaleId = localeIdOf(c, s);
    if (ourLocaleId == null) return null;
    const ourLogicalId = `lc-orphan-${ourLocaleId}`;
    const card = await findCardById(ourLogicalId);
    if (!card) return null;
    return { card: { ...card, id: ourLogicalId }, externalId: c.id, regionCardId: ourLocaleId };
  };
}

const ERA: Record<string, EraConfig> = {
  // ── PMCG1~6: localeId = jp-tcg-{c.id} (tcgdex id 그대로), regionCardId 세팅, conf 0.95 ──
  pmcg: {
    lang: "ja",
    sets: ["PMCG1", "PMCG2", "PMCG3", "PMCG4", "PMCG5", "PMCG6"].map(t => ({ tcgId: t, dbCode: t })),
    subtypeTable: STAGE_BASE,
    confidence: 0.95,
    verifiedBy: "auto:enrich-pmcg-meta-tcgdex",
    setMatch: (s, v) => s.tcgId.toUpperCase() === v.toUpperCase(),
    resolve: jaOrphan((c) => `jp-tcg-${c.id}`),
  },

  // ── NEO1~4: 세트요약 URL 은 대문자, localeId = jp-tcg-{setId(lower)}-{padded} ──
  neo: {
    lang: "ja",
    sets: ["neo1", "neo2", "neo3", "neo4"].map(t => ({ tcgId: t, dbCode: t })),
    subtypeTable: STAGE_BASE,
    confidence: 0.95,
    verifiedBy: "auto:enrich-neo-meta-tcgdex",
    summaryId: (tcgId) => tcgId.toUpperCase(),
    resolve: jaOrphan((c, s) => `jp-tcg-${s.tcgId}-${c.localId.padStart(3, "0")}`),
  },

  // ── E1~5,VS1,web1: localeId = jp-tcg-{dbCode}-{padded}, dbCode 대소문자 보존 ──
  ecard: {
    lang: "ja",
    sets: ["e1", "e2", "e3", "e4", "e5", "vs1", "web1"].map(t => {
      const dbCode = t === "vs1" ? "VS1" : t === "web1" ? "web1" : t.toUpperCase();
      return { tcgId: t, dbCode };
    }),
    subtypeTable: STAGE_BASE,
    confidence: 0.95,
    verifiedBy: "auto:enrich-ecard-meta-tcgdex",
    resolve: jaOrphan((c, s) => `jp-tcg-${s.dbCode}-${c.localId.padStart(3, "0")}`),
  },

  // ── PCG1~9: localeId = jp-tcg-{dbCode}-{c.localId} (tcgdex localId 이미 패딩됨) ──
  pcg: {
    lang: "ja",
    sets: Array.from({ length: 9 }, (_, i) => ({ tcgId: `pcg${i + 1}`, dbCode: `PCG${i + 1}` })),
    subtypeTable: STAGE_BASE,
    confidence: 0.95,
    verifiedBy: "auto:enrich-pcg-meta-tcgdex",
    resolve: jaOrphan((c, s) => `jp-tcg-${s.dbCode}-${c.localId}`),
  },

  // ── L1a,L1b,L2,LL,L3: multi-strategy find (padded→unpadded→primarySet), regionCardId 없음, conf 0.9 ──
  l: {
    lang: "ja",
    sets: ["L1a", "L1b", "L2", "LL", "L3"].map(t => ({ tcgId: t, dbCode: t })),
    subtypeTable: STAGE_BASE,
    confidence: 0.9,
    verifiedBy: "auto:enrich-l-meta-tcgdex",
    setMatch: (s, v) => s.tcgId.toLowerCase() === v.toLowerCase(),
    resolve: async (c, s) => {
      const numPadded = c.localId.padStart(3, "0");
      const idPadded = `lc-orphan-jp-tcg-${s.tcgId}-${numPadded}`;
      const idUnpadded = `lc-orphan-jp-tcg-${s.tcgId}-${parseInt(c.localId, 10)}`;
      let card = await findCardById(idPadded);
      if (!card) card = await findCardById(idUnpadded);
      if (!card) {
        const found = await prisma.card.findFirst({
          where: { primarySetId: `jp-tcg-${s.tcgId}`, primaryNumber: numPadded },
          select: CARD_SELECT,
        }) as CardRecord | null;
        card = found;
      }
      if (!card) return null;
      // L era: ExternalIdMapping 에 regionCardId 미설정(원본 동작 보존)
      return { card, externalId: c.id, regionCardId: null };
    },
  },

  // ── XY: EN 엔드포인트, localeId = jp-tcg-{dbCode}-{number}(unpadded), externalId={c.id}::jp-{dbCode}, conf 0.9 ──
  // 여러 (tcgId→dbCode) 항목, --set=<dbCode> 필터
  xy: {
    lang: "en",
    sets: [
      { tcgId: "xy1", dbCode: "XY1a" }, { tcgId: "xy1", dbCode: "XY1b" },
      { tcgId: "xy2", dbCode: "XY2" }, { tcgId: "xy3", dbCode: "XY3" }, { tcgId: "xy4", dbCode: "XY4" },
      { tcgId: "xy5", dbCode: "XY5a" }, { tcgId: "xy6", dbCode: "XY6" }, { tcgId: "xy7", dbCode: "XY7" },
      { tcgId: "xy8", dbCode: "XY8a" }, { tcgId: "xy8", dbCode: "XY8b" }, { tcgId: "xy9", dbCode: "XY9" },
      { tcgId: "xy10", dbCode: "XY10" }, { tcgId: "xy11", dbCode: "XY11a" },
    ],
    subtypeTable: STAGE_XY,
    confidence: 0.9,
    verifiedBy: "auto:enrich-xy-meta-tcgdex",
    setMatch: (s, v) => s.dbCode.toLowerCase() === v.toLowerCase(),
    resolve: async (c, s) => {
      const number = c.localId; // unpadded
      const ourLocaleId = `jp-tcg-${s.dbCode}-${number}`;
      const ourLogicalId = `lc-orphan-${ourLocaleId}`;
      const card = await findCardById(ourLogicalId);
      if (!card) return null;
      return { card: { ...card, id: ourLogicalId }, externalId: `${c.id}::jp-${s.dbCode}`, regionCardId: ourLocaleId };
    },
  },

  // ── SM: EN, lc-{dbSetId}-{padded} → RegionCard fallback, externalId={c.id}::en-{dbSetId}, conf 0.9 ──
  sm: {
    lang: "en",
    sets: [
      "sm1", "sm2", "sm3", "sm35", "sm4", "sm5", "sm6", "sm75", "sm7", "sm8",
      "sm115", "sma", "sm9", "det1", "sm10", "sm11", "sm12", "smp",
    ].map(t => ({ tcgId: t, dbCode: `en-tcg-${t}` })),
    subtypeTable: STAGE_SM,
    confidence: 0.9,
    verifiedBy: "auto:enrich-sm-meta-tcgdex",
    setMatch: (s, v) => s.tcgId.toLowerCase() === v.toLowerCase(),
    resolve: enResolve("en-"),
  },

  // ── SwSh: EN, 동일한 lc-{dbSetId}-{padded} → RegionCard fallback. 일부 tcgId 가 .5 / dbSetId 비대칭 ──
  swsh: {
    lang: "en",
    sets: [
      { tcgId: "swshp", dbSetId: "en-tcg-swshp" },
      { tcgId: "swsh1", dbSetId: "en-tcg-swsh1" },
      { tcgId: "swsh2", dbSetId: "en-tcg-swsh2" },
      { tcgId: "swsh3", dbSetId: "en-tcg-swsh3" },
      { tcgId: "swsh3.5", dbSetId: "en-tcg-swsh35" },
      { tcgId: "swsh4", dbSetId: "en-tcg-swsh4" },
      { tcgId: "swsh4.5", dbSetId: "en-tcg-swsh45" },
      { tcgId: "swsh5", dbSetId: "en-tcg-swsh5" },
      { tcgId: "swsh6", dbSetId: "en-tcg-swsh6" },
      { tcgId: "swsh7", dbSetId: "en-tcg-swsh7" },
      { tcgId: "cel25", dbSetId: "en-tcg-cel25" },
      { tcgId: "swsh8", dbSetId: "en-tcg-swsh8" },
      { tcgId: "swsh9", dbSetId: "en-tcg-swsh9" },
      { tcgId: "swsh10", dbSetId: "en-tcg-swsh10" },
      { tcgId: "swsh10.5", dbSetId: "en-tcg-pgo" },
      { tcgId: "swsh11", dbSetId: "en-tcg-swsh11" },
      { tcgId: "swsh12", dbSetId: "en-tcg-swsh12" },
      { tcgId: "swsh12.5", dbSetId: "en-tcg-swsh12pt5" },
    ].map(x => ({ tcgId: x.tcgId, dbCode: x.dbSetId })),
    subtypeTable: STAGE_SWSH,
    confidence: 0.9,
    verifiedBy: "auto:enrich-swsh-meta-tcgdex",
    // 원본 swsh: --set 은 tcgId 또는 (dbSetId 에서 en-tcg- 제거한 슬러그) 둘 다 매치
    setMatch: (s, v) =>
      s.tcgId.toLowerCase() === v.toLowerCase() ||
      s.dbCode.replace("en-tcg-", "") === v.toLowerCase(),
    resolve: enResolve("en-"),
  },
};

// SM/SwSh 공용 EN resolve: lc-{dbSetId}-{padded} 직접 조회 후 RegionCard fallback
function enResolve(externalPrefix: "en-") {
  return async (c: CardSummary, s: SetEntry) => {
    const dbSetId = s.dbCode; // e.g. en-tcg-sm1
    const numPadded = pad3(c.localId);
    const enLocaleId = `${dbSetId}-${numPadded}`;
    const lcId = `lc-${enLocaleId}`;
    let card = await findCardById(lcId);
    if (!card) {
      const locale = await prisma.regionCard.findUnique({
        where: { id: enLocaleId },
        select: { cardId: true },
      });
      if (locale) card = await findCardById(locale.cardId);
    }
    if (!card) return null;
    return { card, externalId: `${c.id}::${externalPrefix}${dbSetId}`, regionCardId: enLocaleId };
  };
}

// ─── null-only 필드 채움 (8개 era 공통) ───
function buildUpdate(lc: CardRecord, d: CardDetail, table: Record<string, string>): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  if (lc.hp == null && d.hp != null) update.hp = d.hp;
  if (lc.types.length === 0 && d.types?.length) update.types = d.types;
  if (lc.subtypes.length === 0 && d.stage) update.subtypes = mapStageToSubtypes(d.stage, table);
  if (lc.pokedexNumbers.length === 0 && d.dexId?.length) update.pokedexNumbers = d.dexId;
  if (lc.retreatCost == null && d.retreat != null) update.retreatCost = d.retreat;
  if (lc.illustrator == null && d.illustrator) update.illustrator = d.illustrator;
  if (lc.evolvesFrom == null && d.evolveFrom) update.evolvesFrom = d.evolveFrom;
  if (lc.supertype == null && d.category) update.supertype = d.category;
  if (lc.attacks == null && d.attacks?.length) update.attacks = d.attacks as never;
  if (lc.abilities == null && d.abilities?.length) update.abilities = d.abilities as never;
  if (lc.legalities == null && d.legal) update.legalities = d.legal as never;
  if (lc.weakness == null) { const w = formatTypeValue(d.weaknesses); if (w) update.weakness = w; }
  if (lc.resistance == null) { const r = formatTypeValue(d.resistances); if (r) update.resistance = r; }
  return update;
}

async function main() {
  const eraArg = process.argv.find(a => a.startsWith("--era="));
  const era = eraArg?.slice("--era=".length);
  if (!era || !(era in ERA)) {
    console.error(`--era=<${Object.keys(ERA).join("|")}> 필요`);
    process.exit(1);
  }
  const cfg = ERA[era];

  const setArg = process.argv.find(a => a.startsWith("--set="));
  const setVal = setArg?.slice("--set=".length);
  const sets = setVal
    ? cfg.sets.filter(s => (cfg.setMatch ?? ((x, v) => x.tcgId.toLowerCase() === v.toLowerCase()))(s, setVal))
    : cfg.sets;

  console.log(`=== enrich-era-meta-tcgdex --era=${era} (${sets.length} sets, lang=${cfg.lang}) ===`);

  const source = await prisma.externalSource.upsert({
    where: { code: "tcgdex" },
    create: { code: "tcgdex", name: "TCGdex API", kind: "catalog", region: "GLOBAL", baseUrl: "https://api.tcgdex.net/v2", priority: 80 },
    update: {},
  });

  const unmatched = new Set<string>();
  let enriched = 0, skipped = 0, missing = 0, totalMap = 0;
  const summaryCache = new Map<string, CardSummary[]>();

  for (const s of sets) {
    const summaryId = (cfg.summaryId ?? ((t: string) => t))(s.tcgId);
    console.log(`\n─── ${era}:${s.tcgId} → ${s.dbCode} ───`);

    let cards = summaryCache.get(summaryId);
    if (!cards) {
      const sum = await fetchJson<{ cards: CardSummary[] }>(`https://api.tcgdex.net/v2/${cfg.lang}/sets/${summaryId}`);
      if (!sum) { console.log("  set fetch fail"); continue; }
      cards = sum.cards ?? [];
      summaryCache.set(summaryId, cards);
    }
    console.log(`  ${cards.length} 카드`);
    if (cards.length === 0) { console.log("  ⚠ 카드 목록 비어있음 — SKIP"); continue; }

    for (const c of cards) {
      const resolved = await cfg.resolve(c, s);
      if (!resolved) { missing++; continue; }
      const { card: lc, externalId, regionCardId } = resolved;

      const d = await fetchJson<CardDetail>(`https://api.tcgdex.net/v2/${cfg.lang}/cards/${c.id}`);
      await sleep(80);
      if (!d) continue;

      const update = buildUpdate(lc, d, cfg.subtypeTable);
      if (lc.rarityId == null && d.rarity) {
        const rid = await getRarityIdByName(d.rarity);
        if (rid) update.rarityId = rid; else unmatched.add(d.rarity);
      }

      if (Object.keys(update).length > 0) {
        await prisma.card.update({ where: { id: lc.id }, data: update });
        enriched++;
      } else skipped++;

      const createData: Record<string, unknown> = {
        sourceId: source.id,
        externalId,
        cardId: lc.id,
        url: `https://api.tcgdex.net/v2/${cfg.lang}/cards/${c.id}`,
        verifiedBy: cfg.verifiedBy,
        confidence: cfg.confidence,
      };
      const updateData: Record<string, unknown> = { cardId: lc.id };
      if (regionCardId != null) {
        createData.regionCardId = regionCardId;
        updateData.regionCardId = regionCardId;
      }
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId } },
        create: createData as never,
        update: updateData,
      });
      totalMap++;
    }
    console.log(`  → enriched: ${enriched}, skipped: ${skipped}, missing: ${missing}`);
  }

  console.log(`\n── 전체 결과 ──`);
  console.log(`  enriched: ${enriched}`);
  console.log(`  already-filled (skipped): ${skipped}`);
  console.log(`  Card 누락: ${missing}`);
  console.log(`  ExternalIdMapping: ${totalMap}`);
  if (unmatched.size > 0) {
    console.log(`  매칭 안된 rarity (${unmatched.size}):`);
    for (const r of unmatched) console.log(`    "${r}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
