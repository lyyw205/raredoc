/**
 * Phase 1: HGSS EN card sync from pokemontcg.io
 *
 * Sets: hgss1~hgss4, hsp, col1 (HeartGold & SoulSilver series)
 * - Creates CardPack (og-{setId}, era "HGSS")
 * - Creates EN Set (en-tcg-{setId})
 * - Creates Card (lc-en-tcg-{setId}-{num})
 * - Creates EN RegionCard (en-tcg-{setId}-{num})
 * - Creates ExternalIdMapping (source=pokemontcg_io)
 *
 * Uses curl for HTTP. Rate: 5 req/sec.
 * Run: npx tsx scripts/sync-hgss-pokemontcgio.ts [--set=hgss1]
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const API_BASE = "https://api.pokemontcg.io/v2";
const USER_AGENT = "raredoc-sync/0.1";

const SETS = [
  { id: "hgss1", name: "HeartGold & SoulSilver", series: "HeartGold & SoulSilver", era: "HGSS", release: "2010-02-10", cards: 123, order: 220 },
  { id: "hsp",   name: "HGSS Black Star Promos",  series: "HeartGold & SoulSilver", era: "HGSS", release: "2010-02-10", cards: 25,  order: 221 },
  { id: "hgss2", name: "HS—Unleashed",            series: "HeartGold & SoulSilver", era: "HGSS", release: "2010-05-12", cards: 95,  order: 222 },
  { id: "hgss3", name: "HS—Undaunted",            series: "HeartGold & SoulSilver", era: "HGSS", release: "2010-08-18", cards: 90,  order: 223 },
  { id: "hgss4", name: "HS—Triumphant",           series: "HeartGold & SoulSilver", era: "HGSS", release: "2010-11-03", cards: 102, order: 224 },
  { id: "col1",  name: "Call of Legends",          series: "HeartGold & SoulSilver", era: "HGSS", release: "2011-02-09", cards: 95,  order: 225 },
];

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", USER_AGENT, url], { maxBuffer: 16 * 1024 * 1024 });
    if (!stdout) return null;
    return JSON.parse(stdout) as T;
  } catch { return null; }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface TCGSet {
  id: string; name: string; series: string;
  printedTotal: number; total: number; releaseDate: string;
  images: { symbol: string; logo: string };
}
interface TCGCard {
  id: string; name: string; number: string; rarity?: string;
  types?: string[]; supertype?: string; subtypes?: string[]; artist?: string;
  set: { id: string; name: string }; images: { small: string; large: string };
  hp?: string; evolvesFrom?: string; evolvesTo?: string[];
  abilities?: { name: string; text: string; type: string }[];
  attacks?: { name: string; cost?: string[]; convertedEnergyCost?: number; damage?: string; text?: string }[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  retreatCost?: string[]; convertedRetreatCost?: number;
  flavorText?: string; nationalPokedexNumbers?: number[];
  legalities?: { standard?: string; expanded?: string; unlimited?: string };
  regulationMark?: string; rules?: string[];
}
interface ListResponse<T> { data: T[]; page: number; pageSize: number; count: number; totalCount: number; }

function padNum(n: string): string {
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
    await sleep(200);
    if (all.length >= resp.totalCount) break;
    page++;
  }
  return all;
}

async function syncSet(setDef: typeof SETS[number], rarityMap: Map<string, string>, sourceId: string) {
  const setId = setDef.id;
  const groupId = `og-${setId}`;
  const enSetId = `en-tcg-${setId}`;

  console.log(`\n─── ${setId}  (${setDef.name}) ───`);

  const apiSet = await fetchJson<{ data: TCGSet }>(`${API_BASE}/sets/${setId}`);
  await sleep(200);
  if (!apiSet?.data) { console.log("  ✗ Failed to fetch set details"); return { ok: 0, skip: 0, fail: 1 }; }
  const setData = apiSet.data;

  // Upsert CardPack
  await prisma.cardPack.upsert({
    where: { id: groupId },
    create: { id: groupId, era: setDef.era, nameEn: setDef.name, releaseDate: new Date(setDef.release), order: setDef.order },
    update: { era: setDef.era, nameEn: setDef.name, releaseDate: new Date(setDef.release), order: setDef.order },
  });
  console.log(`  ✓ CardPack ${groupId}`);

  // Upsert EN Set
  await prisma.set.upsert({
    where: { id: enSetId },
    create: {
      id: enSetId, name: setDef.name, series: setDef.series,
      releaseDate: new Date(setDef.release), cardCount: setData.total,
      logoUrl: setData.images.logo, symbolUrl: setData.images.symbol,
      region: "EN", cardPackId: groupId,
    },
    update: {
      name: setDef.name, series: setDef.series,
      releaseDate: new Date(setDef.release), cardCount: setData.total,
      logoUrl: setData.images.logo, symbolUrl: setData.images.symbol,
      region: "EN", cardPackId: groupId,
    },
  });
  console.log(`  ✓ Set ${enSetId} (${setData.total} cards total)`);

  // Fetch all cards
  console.log(`  Fetching cards...`);
  const cards = await getAllCards(setId);
  console.log(`  Fetched ${cards.length} cards`);

  let ok = 0, skip = 0, fail = 0;

  for (const card of cards) {
    const numPadded = padNum(card.number);
    const lcId = `lc-en-tcg-${setId}-${numPadded}`;
    const clId = `en-tcg-${setId}-${numPadded}`;

    const rarityId = card.rarity ? rarityMap.get(card.rarity) ?? null : null;
    const weakness = card.weaknesses?.[0] ? `${card.weaknesses[0].type} ${card.weaknesses[0].value}` : null;
    const resistance = card.resistances?.[0] ? `${card.resistances[0].type} ${card.resistances[0].value}` : null;

    try {
      await prisma.card.upsert({
        where: { id: lcId },
        create: {
          id: lcId, cardPackId: groupId, primarySetId: enSetId, primaryNumber: numPadded,
          primaryNumberInt: parseInt(numPadded, 10) || null,
          hp: card.hp ? parseInt(card.hp, 10) || null : null,
          types: card.types ?? [], subtypes: card.subtypes ?? [],
          supertype: card.supertype ?? null,
          ...(card.attacks ? { attacks: card.attacks as never } : {}),
          ...(card.abilities ? { abilities: card.abilities as never } : {}),
          retreatCost: card.convertedRetreatCost ?? null,
          weakness, resistance,
          evolvesFrom: card.evolvesFrom ?? null, evolvesTo: card.evolvesTo ?? [],
          regulationMark: card.regulationMark ?? null, flavorText: card.flavorText ?? null,
          rules: card.rules ?? [], pokedexNumbers: card.nationalPokedexNumbers ?? [],
          illustrator: card.artist ?? null, rarityId,
          ...(card.legalities ? { legalities: card.legalities as never } : {}),
        },
        update: {
          cardPackId: groupId, primarySetId: enSetId, primaryNumber: numPadded,
          primaryNumberInt: parseInt(numPadded, 10) || null,
          hp: card.hp ? parseInt(card.hp, 10) || null : null,
          types: card.types ?? [], subtypes: card.subtypes ?? [],
          supertype: card.supertype ?? null,
          ...(card.attacks ? { attacks: card.attacks as never } : {}),
          ...(card.abilities ? { abilities: card.abilities as never } : {}),
          retreatCost: card.convertedRetreatCost ?? null,
          weakness, resistance,
          evolvesFrom: card.evolvesFrom ?? null, evolvesTo: card.evolvesTo ?? [],
          regulationMark: card.regulationMark ?? null, flavorText: card.flavorText ?? null,
          rules: card.rules ?? [], pokedexNumbers: card.nationalPokedexNumbers ?? [],
          illustrator: card.artist ?? null, rarityId,
          ...(card.legalities ? { legalities: card.legalities as never } : {}),
        },
      });

      await prisma.regionCard.upsert({
        where: { id: clId },
        create: {
          id: clId, cardId: lcId, language: "en", region: "EN",
          setId: enSetId, number: numPadded,
          numberInt: parseInt(numPadded, 10) || null,
          name: card.name, flavorText: card.flavorText ?? null,
          imageSmall: card.images.small, imageLarge: card.images.large,
        },
        update: {
          cardId: lcId, number: numPadded,
          numberInt: parseInt(numPadded, 10) || null,
          name: card.name, flavorText: card.flavorText ?? null,
          imageSmall: card.images.small, imageLarge: card.images.large,
        },
      });

      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId, externalId: card.id } },
        create: {
          sourceId, externalId: card.id, regionCardId: clId, cardId: lcId,
          url: `https://pokemontcg.io/cards/${card.id}`,
          verifiedBy: "auto:sync-hgss-pokemontcgio", confidence: 0.95,
        },
        update: { regionCardId: clId, cardId: lcId },
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

async function main() {
  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg ? SETS.filter(s => s.id === arg.slice("--set=".length).toLowerCase()) : SETS;

  const rarities = await prisma.rarity.findMany({ select: { id: true, code: true } });
  const rarityMap = new Map(rarities.map(r => [r.code, r.id]));

  const source = await prisma.externalSource.upsert({
    where: { code: "pokemontcg_io" },
    create: { code: "pokemontcg_io", name: "pokemontcg.io API", kind: "catalog", region: "EN", baseUrl: "https://api.pokemontcg.io/v2", priority: 90 },
    update: {},
  });

  console.log(`=== HGSS EN Sync (${setsToRun.length} sets) ===`);
  let totals = { ok: 0, skip: 0, fail: 0 };
  for (const setDef of setsToRun) {
    const r = await syncSet(setDef, rarityMap, source.id);
    totals.ok += r.ok; totals.skip += r.skip; totals.fail += r.fail;
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  성공: ${totals.ok}`);
  console.log(`  스킵: ${totals.skip}`);
  console.log(`  실패: ${totals.fail}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
