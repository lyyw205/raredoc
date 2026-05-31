/**
 * Phase 2: XY EN card sync from pokemontcg.io
 *
 * Sets: xyp, xy0, xy1~xy12, dc1, g1 (XY series, 16 sets)
 *
 * Mapping strategy:
 *   - xyp, xy0, g1 → NEW SetGroups (og-xyp, og-xy0, og-g1)
 *   - xy1  → existing og-xy1a  (EN合本 of JP XY1a+XY1b; attach to XY1a)
 *   - xy2  → existing og-xy2
 *   - xy3  → existing og-xy3
 *   - xy4  → existing og-xy4
 *   - xy5  → existing og-xy5a
 *   - dc1  → existing og-cp1
 *   - xy6  → existing og-xy6
 *   - xy7  → existing og-xy7
 *   - xy8  → existing og-xy8a  (EN合本 of JP XY8a+XY8b; attach to XY8a)
 *   - xy9  → existing og-xy9
 *   - xy10 → existing og-xy10
 *   - xy11 → existing og-xy11a (cp5 is separate JP-only reprint; not duplicated here)
 *   - xy12 → existing og-cp6   (Evolutions = 20th Anniversary JP)
 *
 * LogicalCard ID: lc-en-tcg-{setId}-{paddedNum}
 * CardLocale ID:  en-tcg-{setId}-{paddedNum}
 *
 * Run: npx tsx scripts/sync-xy-pokemontcgio.ts [--set=xy2]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const API_BASE = "https://api.pokemontcg.io/v2";
const USER_AGENT = "raredoc-sync/0.1";

interface SetDef {
  id: string;
  name: string;
  series: string;
  era: string;
  release: string;
  cards: number;
  order: number;
  groupId: string;           // og-* to attach to
  createGroup: boolean;      // true = create new SetGroup
  groupNameEn?: string;      // only if createGroup
  groupNameJa?: string;
}

const SETS: SetDef[] = [
  // EN-only new SetGroups
  { id: "xyp",  name: "XY Black Star Promos",  series: "XY", era: "XY", release: "2013-10-12", cards: 211, order: 126, groupId: "og-xyp",  createGroup: true,  groupNameEn: "XY Black Star Promos" },
  { id: "xy0",  name: "Kalos Starter Set",      series: "XY", era: "XY", release: "2013-11-08", cards: 39,  order: 127, groupId: "og-xy0",  createGroup: true,  groupNameEn: "Kalos Starter Set" },
  // g1 = Generations — not ポケキュンコレクション; create separate og-g1
  { id: "g1",   name: "Generations",            series: "XY", era: "XY", release: "2016-02-22", cards: 83,  order: 128, groupId: "og-g1",   createGroup: true,  groupNameEn: "Generations" },
  // EN → existing JP SetGroups
  { id: "xy1",  name: "XY",                     series: "XY", era: "XY", release: "2014-02-05", cards: 146, order: 0,   groupId: "og-xy1a", createGroup: false },
  { id: "xy2",  name: "Flashfire",              series: "XY", era: "XY", release: "2014-05-07", cards: 106, order: 0,   groupId: "og-xy2",  createGroup: false },
  { id: "xy3",  name: "Furious Fists",          series: "XY", era: "XY", release: "2014-08-13", cards: 111, order: 0,   groupId: "og-xy3",  createGroup: false },
  { id: "xy4",  name: "Phantom Forces",         series: "XY", era: "XY", release: "2014-11-05", cards: 119, order: 0,   groupId: "og-xy4",  createGroup: false },
  { id: "xy5",  name: "Primal Clash",           series: "XY", era: "XY", release: "2015-02-04", cards: 160, order: 0,   groupId: "og-xy5a", createGroup: false },
  { id: "dc1",  name: "Double Crisis",          series: "XY", era: "XY", release: "2015-03-25", cards: 34,  order: 0,   groupId: "og-cp1",  createGroup: false },
  { id: "xy6",  name: "Roaring Skies",          series: "XY", era: "XY", release: "2015-05-06", cards: 108, order: 0,   groupId: "og-xy6",  createGroup: false },
  { id: "xy7",  name: "Ancient Origins",        series: "XY", era: "XY", release: "2015-08-12", cards: 98,  order: 0,   groupId: "og-xy7",  createGroup: false },
  { id: "xy8",  name: "BREAKthrough",           series: "XY", era: "XY", release: "2015-11-04", cards: 162, order: 0,   groupId: "og-xy8a", createGroup: false },
  { id: "xy9",  name: "BREAKpoint",             series: "XY", era: "XY", release: "2016-02-03", cards: 122, order: 0,   groupId: "og-xy9",  createGroup: false },
  { id: "xy10", name: "Fates Collide",          series: "XY", era: "XY", release: "2016-05-02", cards: 124, order: 0,   groupId: "og-xy10", createGroup: false },
  { id: "xy11", name: "Steam Siege",            series: "XY", era: "XY", release: "2016-08-03", cards: 114, order: 0,   groupId: "og-xy11a",createGroup: false },
  { id: "xy12", name: "Evolutions",             series: "XY", era: "XY", release: "2016-11-02", cards: 108, order: 0,   groupId: "og-cp6",  createGroup: false },
];

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

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", "-A", USER_AGENT, url], { maxBuffer: 16 * 1024 * 1024 });
    if (!stdout) return null;
    return JSON.parse(stdout) as T;
  } catch { return null; }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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

async function syncSet(setDef: SetDef, rarityMap: Map<string, string>, sourceId: string) {
  const { id: setId, groupId, createGroup } = setDef;
  const enSetId = `en-tcg-${setId}`;

  console.log(`\n─── ${setId}  (${setDef.name}) → ${groupId} ───`);

  const apiSet = await fetchJson<{ data: TCGSet }>(`${API_BASE}/sets/${setId}`);
  await sleep(200);
  if (!apiSet?.data) { console.log("  ✗ Failed to fetch set details"); return { ok: 0, skip: 0, fail: 1 }; }
  const setData = apiSet.data;

  // Upsert SetGroup only if new
  if (createGroup) {
    await prisma.setGroup.upsert({
      where: { id: groupId },
      create: {
        id: groupId, era: setDef.era,
        nameEn: setDef.groupNameEn ?? setDef.name,
        nameJa: setDef.groupNameJa ?? null,
        releaseDate: new Date(setDef.release),
        order: setDef.order,
      },
      update: {
        era: setDef.era,
        nameEn: setDef.groupNameEn ?? setDef.name,
        releaseDate: new Date(setDef.release),
        order: setDef.order,
      },
    });
    console.log(`  ✓ SetGroup ${groupId} (new)`);
  } else {
    // Verify existing group exists
    const grp = await prisma.setGroup.findUnique({ where: { id: groupId } });
    if (!grp) { console.log(`  ✗ SetGroup ${groupId} 없음 — skip`); return { ok: 0, skip: 0, fail: 1 }; }
    console.log(`  ✓ SetGroup ${groupId} (existing)`);
  }

  // Upsert EN Set (hotlink logos — no Supabase upload for EN)
  await prisma.set.upsert({
    where: { id: enSetId },
    create: {
      id: enSetId, name: setDef.name, series: setDef.series,
      releaseDate: new Date(setDef.release), cardCount: setData.total,
      logoUrl: setData.images.logo, symbolUrl: setData.images.symbol,
      region: "EN", setGroupId: groupId,
    },
    update: {
      name: setDef.name, series: setDef.series,
      releaseDate: new Date(setDef.release), cardCount: setData.total,
      logoUrl: setData.images.logo, symbolUrl: setData.images.symbol,
      region: "EN", setGroupId: groupId,
    },
  });
  console.log(`  ✓ Set ${enSetId} (${setData.total} cards total, logo hotlinked)`);

  // Fetch all cards
  console.log(`  Fetching cards...`);
  const cards = await getAllCards(setId);
  console.log(`  Fetched ${cards.length} cards`);
  await sleep(200);

  let ok = 0, skip = 0, fail = 0;

  for (const card of cards) {
    const numPadded = padNum(card.number);
    const lcId = `lc-en-tcg-${setId}-${numPadded}`;
    const clId = `en-tcg-${setId}-${numPadded}`;

    const rarityId = card.rarity ? (rarityMap.get(card.rarity) ?? null) : null;
    const weakness = card.weaknesses?.[0] ? `${card.weaknesses[0].type} ${card.weaknesses[0].value}` : null;
    const resistance = card.resistances?.[0] ? `${card.resistances[0].type} ${card.resistances[0].value}` : null;

    try {
      await prisma.logicalCard.upsert({
        where: { id: lcId },
        create: {
          id: lcId, setGroupId: groupId, primarySetId: enSetId, primaryNumber: numPadded,
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
          setGroupId: groupId, primarySetId: enSetId, primaryNumber: numPadded,
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

      await prisma.cardLocale.upsert({
        where: { id: clId },
        create: {
          id: clId, logicalCardId: lcId, language: "en", region: "EN",
          setId: enSetId, number: numPadded,
          numberInt: parseInt(numPadded, 10) || null,
          name: card.name, flavorText: card.flavorText ?? null,
          imageSmall: card.images.small, imageLarge: card.images.large,
        },
        update: {
          logicalCardId: lcId, number: numPadded,
          numberInt: parseInt(numPadded, 10) || null,
          name: card.name, flavorText: card.flavorText ?? null,
          imageSmall: card.images.small, imageLarge: card.images.large,
        },
      });

      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId, externalId: card.id } },
        create: {
          sourceId, externalId: card.id, cardLocaleId: clId, logicalCardId: lcId,
          url: `https://pokemontcg.io/cards/${card.id}`,
          verifiedBy: "auto:sync-xy-pokemontcgio", confidence: 0.95,
        },
        update: { cardLocaleId: clId, logicalCardId: lcId },
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

  console.log(`=== XY EN Sync (${setsToRun.length} sets) ===`);
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
