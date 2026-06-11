/**
 * Phase 1: DP + Platinum EN card sync from pokemontcg.io
 *
 * Sets: dp1~dp7 (Diamond & Pearl), pl1~pl4 (Platinum)
 * - Creates CardPack (og-{setId}, era "DP"/"Pt")
 * - Creates EN Set (en-tcg-{setId})
 * - Creates LogicalCard (lc-en-tcg-{setId}-{num})
 * - Creates EN CardLocale (en-tcg-{setId}-{num})
 * - Creates ExternalIdMapping (source=pokemontcg_io)
 *
 * Uses curl for HTTP (WSL ETIMEDOUT safe). Rate: 5 req/sec.
 * Run: npx tsx scripts/sync-dppt-pokemontcgio.ts [--set=dp1]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const API_BASE = "https://api.pokemontcg.io/v2";
const USER_AGENT = "raredoc-sync/0.1";

// DP/Pt sets to register
const SETS = [
  { id: "dp1", name: "Diamond & Pearl",       series: "Diamond & Pearl", era: "DP", release: "2007-05-01", cards: 130, order: 200 },
  { id: "dp2", name: "Mysterious Treasures",  series: "Diamond & Pearl", era: "DP", release: "2007-08-01", cards: 123, order: 201 },
  { id: "dp3", name: "Secret Wonders",        series: "Diamond & Pearl", era: "DP", release: "2007-11-01", cards: 132, order: 202 },
  { id: "dp4", name: "Great Encounters",      series: "Diamond & Pearl", era: "DP", release: "2008-02-01", cards: 106, order: 203 },
  { id: "dp5", name: "Majestic Dawn",         series: "Diamond & Pearl", era: "DP", release: "2008-05-01", cards: 100, order: 204 },
  { id: "dp6", name: "Legends Awakened",      series: "Diamond & Pearl", era: "DP", release: "2008-08-01", cards: 146, order: 205 },
  { id: "dp7", name: "Stormfront",            series: "Diamond & Pearl", era: "DP", release: "2008-11-01", cards: 100, order: 206 },
  { id: "pl1", name: "Platinum",              series: "Platinum",        era: "Pt", release: "2009-02-11", cards: 127, order: 210 },
  { id: "pl2", name: "Rising Rivals",         series: "Platinum",        era: "Pt", release: "2009-05-16", cards: 111, order: 211 },
  { id: "pl3", name: "Supreme Victors",       series: "Platinum",        era: "Pt", release: "2009-08-19", cards: 147, order: 212 },
  { id: "pl4", name: "Arceus",               series: "Platinum",        era: "Pt", release: "2009-11-04", cards: 99,  order: 213 },
];

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP(
      "curl",
      ["-sSL", "--max-time", "30", "-A", USER_AGENT, url],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    if (!stdout) return null;
    return JSON.parse(stdout) as T;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// pokemontcg.io API types
// ---------------------------------------------------------------------------

interface TCGSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: { symbol: string; logo: string };
}

interface TCGCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  artist?: string;
  set: { id: string; name: string };
  images: { small: string; large: string };
  hp?: string;
  evolvesFrom?: string;
  evolvesTo?: string[];
  abilities?: { name: string; text: string; type: string }[];
  attacks?: { name: string; cost?: string[]; convertedEnergyCost?: number; damage?: string; text?: string }[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: { standard?: string; expanded?: string; unlimited?: string };
  regulationMark?: string;
  rules?: string[];
}

interface ListResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function padNum(n: string): string {
  // pokemontcg.io numbers can be "1", "001", "SH1", etc.
  const int = parseInt(n, 10);
  if (!isNaN(int)) return String(int).padStart(3, "0");
  return n.padStart(3, "0");
}

async function getAllCards(setId: string): Promise<TCGCard[]> {
  const all: TCGCard[] = [];
  let page = 1;
  while (true) {
    const url = `${API_BASE}/cards?q=set.id:${setId}&pageSize=250&page=${page}`;
    const resp = await fetchJson<ListResponse<TCGCard>>(url);
    if (!resp || !resp.data || resp.data.length === 0) break;
    all.push(...resp.data);
    await sleep(200); // 5 req/sec cap
    if (all.length >= resp.totalCount) break;
    page++;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

async function syncSet(setDef: typeof SETS[number], rarityMap: Map<string, string>, sourceId: string) {
  const setId = setDef.id;
  const groupId = `og-${setId}`;
  const enSetId = `en-tcg-${setId}`;

  console.log(`\n─── ${setId}  (${setDef.name}) ───`);

  // 1. Fetch set details from pokemontcg.io
  const apiSet = await fetchJson<{ data: TCGSet }>(`${API_BASE}/sets/${setId}`);
  await sleep(200);
  if (!apiSet?.data) {
    console.log(`  ✗ Failed to fetch set details`);
    return { ok: 0, skip: 0, fail: 1 };
  }
  const setData = apiSet.data;

  // 2. Upsert CardPack
  await prisma.cardPack.upsert({
    where: { id: groupId },
    create: {
      id: groupId,
      era: setDef.era,
      nameEn: setDef.name,
      releaseDate: new Date(setDef.release),
      order: setDef.order,
    },
    update: {
      era: setDef.era,
      nameEn: setDef.name,
      releaseDate: new Date(setDef.release),
      order: setDef.order,
    },
  });
  console.log(`  ✓ CardPack ${groupId}`);

  // 3. Upsert EN Set
  await prisma.set.upsert({
    where: { id: enSetId },
    create: {
      id: enSetId,
      name: setDef.name,
      series: setDef.series,
      releaseDate: new Date(setDef.release),
      cardCount: setData.total,
      logoUrl: setData.images.logo,
      symbolUrl: setData.images.symbol,
      region: "EN",
      cardPackId: groupId,
    },
    update: {
      name: setDef.name,
      series: setDef.series,
      releaseDate: new Date(setDef.release),
      cardCount: setData.total,
      logoUrl: setData.images.logo,
      symbolUrl: setData.images.symbol,
      region: "EN",
      cardPackId: groupId,
    },
  });
  console.log(`  ✓ Set ${enSetId} (${setData.total} cards total)`);

  // 4. Fetch all cards
  console.log(`  Fetching cards...`);
  const cards = await getAllCards(setId);
  console.log(`  Fetched ${cards.length} cards`);

  let ok = 0, skip = 0, fail = 0;

  for (const card of cards) {
    const numPadded = padNum(card.number);
    const lcId = `lc-en-tcg-${setId}-${numPadded}`;
    const clId = `en-tcg-${setId}-${numPadded}`;

    // Rarity lookup by code matching pokemontcg.io rarity string
    const rarityId = card.rarity ? rarityMap.get(card.rarity) ?? null : null;

    // Weakness / Resistance (first entry only)
    const weakness = card.weaknesses?.[0]
      ? `${card.weaknesses[0].type} ${card.weaknesses[0].value}`
      : null;
    const resistance = card.resistances?.[0]
      ? `${card.resistances[0].type} ${card.resistances[0].value}`
      : null;

    try {
      // 5a. Upsert LogicalCard
      await prisma.logicalCard.upsert({
        where: { id: lcId },
        create: {
          id: lcId,
          cardPackId: groupId,
          primarySetId: enSetId,
          primaryNumber: numPadded,
          primaryNumberInt: parseInt(numPadded, 10) || null,
          hp: card.hp ? parseInt(card.hp, 10) || null : null,
          types: card.types ?? [],
          subtypes: card.subtypes ?? [],
          supertype: card.supertype ?? null,
          ...(card.attacks ? { attacks: card.attacks as never } : {}),
          ...(card.abilities ? { abilities: card.abilities as never } : {}),
          retreatCost: card.convertedRetreatCost ?? null,
          weakness,
          resistance,
          evolvesFrom: card.evolvesFrom ?? null,
          evolvesTo: card.evolvesTo ?? [],
          regulationMark: card.regulationMark ?? null,
          flavorText: card.flavorText ?? null,
          rules: card.rules ?? [],
          pokedexNumbers: card.nationalPokedexNumbers ?? [],
          illustrator: card.artist ?? null,
          rarityId,
          ...(card.legalities ? { legalities: card.legalities as never } : {}),
        },
        update: {
          cardPackId: groupId,
          primarySetId: enSetId,
          primaryNumber: numPadded,
          primaryNumberInt: parseInt(numPadded, 10) || null,
          hp: card.hp ? parseInt(card.hp, 10) || null : null,
          types: card.types ?? [],
          subtypes: card.subtypes ?? [],
          supertype: card.supertype ?? null,
          ...(card.attacks ? { attacks: card.attacks as never } : {}),
          ...(card.abilities ? { abilities: card.abilities as never } : {}),
          retreatCost: card.convertedRetreatCost ?? null,
          weakness,
          resistance,
          evolvesFrom: card.evolvesFrom ?? null,
          evolvesTo: card.evolvesTo ?? [],
          regulationMark: card.regulationMark ?? null,
          flavorText: card.flavorText ?? null,
          rules: card.rules ?? [],
          pokedexNumbers: card.nationalPokedexNumbers ?? [],
          illustrator: card.artist ?? null,
          rarityId,
          ...(card.legalities ? { legalities: card.legalities as never } : {}),
        },
      });

      // 5b. Upsert EN CardLocale
      await prisma.cardLocale.upsert({
        where: { id: clId },
        create: {
          id: clId,
          logicalCardId: lcId,
          language: "en",
          region: "EN",
          setId: enSetId,
          number: numPadded,
          numberInt: parseInt(numPadded, 10) || null,
          name: card.name,
          flavorText: card.flavorText ?? null,
          imageSmall: card.images.small,
          imageLarge: card.images.large,
        },
        update: {
          logicalCardId: lcId,
          number: numPadded,
          numberInt: parseInt(numPadded, 10) || null,
          name: card.name,
          flavorText: card.flavorText ?? null,
          imageSmall: card.images.small,
          imageLarge: card.images.large,
        },
      });

      // 5c. Upsert ExternalIdMapping (pokemontcg_io)
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId, externalId: card.id } },
        create: {
          sourceId,
          externalId: card.id,
          cardLocaleId: clId,
          logicalCardId: lcId,
          url: `https://pokemontcg.io/cards/${card.id}`,
          verifiedBy: "auto:sync-dppt-pokemontcgio",
          confidence: 0.95,
        },
        update: {
          cardLocaleId: clId,
          logicalCardId: lcId,
        },
      });

      ok++;
    } catch (e) {
      console.log(`  ✗ [${numPadded}] ${card.name}: ${e}`);
      fail++;
    }
  }

  console.log(`  ${setId}: ok=${ok} skip=${skip} fail=${fail}`);
  return { ok, skip, fail };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--set="));
  const setsToRun = arg
    ? SETS.filter((s) => s.id === arg.slice("--set=".length).toLowerCase())
    : SETS;

  // Load rarity map (code → id)
  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rarityMap = new Map(rarities.map((r) => [r.code, r.id]));

  // Load pokemontcg_io source
  const source = await prisma.externalSource.findUniqueOrThrow({ where: { code: "pokemontcg_io" } });

  console.log(`=== DP/Pt EN Sync (${setsToRun.length} sets) ===`);
  let totals = { ok: 0, skip: 0, fail: 0 };

  for (const setDef of setsToRun) {
    const r = await syncSet(setDef, rarityMap, source.id);
    totals.ok += r.ok;
    totals.skip += r.skip;
    totals.fail += r.fail;
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  성공: ${totals.ok}`);
  console.log(`  스킵: ${totals.skip}`);
  console.log(`  실패: ${totals.fail}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
