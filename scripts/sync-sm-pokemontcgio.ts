/**
 * Phase 1 Step 1: SM EN card sync from pokemontcg.io
 *
 * Sets (18): sm1~sm12, smp, sma, sm35, sm75, sm115, det1
 *
 * EN → JP SetGroup mapping:
 *   sm1   → og-sm1s  (Sun & Moon EN 합본: JP コレクションサン+コレクションムーン+サン&ムーン)
 *           attach to og-sm1s (first JP group of the trilogy)
 *   sm2   → og-sm2k  (Guardians Rising 합본: JP アローラの月光+キミを待つ島々 → attach to og-sm2k)
 *   sm3   → og-sm3h  (Burning Shadows 합본: JP 闘う虹を見たか+光を喰らう闇 → attach to og-sm3h)
 *   sm35  → og-sm3+  (Shining Legends = JP ひかる伝説)
 *   sm4   → og-sm4s  (Crimson Invasion 합본: JP 覚醒の勇者+超次元の暴獣 → attach to og-sm4s)
 *   sm4+  NOTE: GXバトルブースト = og-sm4+ (JP-only, no EN counterpart)
 *   sm5   → og-sm5s  (Ultra Prism 합본: JP ウルトラサン+ウルトラムーン → attach to og-sm5s)
 *   sm6   → og-sm6   (Forbidden Light = JP 禁断の光)
 *   sm75  → og-sm6a  (Dragon Majesty = JP ドラゴンストーム)
 *   sm7   → og-sm7   (Celestial Storm = JP 裂空のカリスマ)
 *   sm8   → og-sm8   (Lost Thunder = JP 超爆インパクト)
 *   sm115 → og-sm8b  (Hidden Fates = JP GXウルトラシャイニ)
 *   sma   → og-sma   (Hidden Fates Shiny Vault — EN-only, new SetGroup)
 *   sm9   → og-sm9   (Team Up = JP タッグボルト)
 *   det1  → og-smp2  (Detective Pikachu = JP 名探偵ピカチュウ)
 *   sm10  → og-sm10  (Unbroken Bonds = JP ダブルブレイズ)
 *   sm11  → og-sm11a (Unified Minds 합본: JP リミックスバウト+ドリームリーグ → attach to og-sm11a)
 *   sm12  → og-sm12  (Cosmic Eclipse = JP オルタージェネシス)
 *   smp   → og-smp   (SM Black Star Promos — EN-only, new SetGroup)
 *
 * Run: npx tsx scripts/sync-sm-pokemontcgio.ts [--set=sm1]
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
  groupId: string;
  createGroup: boolean;
  groupNameEn?: string;
  groupNameJa?: string;
}

const SETS: SetDef[] = [
  // EN-only new SetGroups
  { id: "smp",   name: "SM Black Star Promos",      series: "Sun & Moon", era: "SM (썬·문)", release: "2017-02-03", cards: 250, order: 500, groupId: "og-smp",  createGroup: true,  groupNameEn: "SM Black Star Promos" },
  { id: "sma",   name: "Hidden Fates: Shiny Vault",  series: "Sun & Moon", era: "SM (썬·문)", release: "2019-08-23", cards: 94,  order: 501, groupId: "og-sma",  createGroup: true,  groupNameEn: "Hidden Fates: Shiny Vault" },

  // EN → existing JP SetGroups
  { id: "sm1",   name: "Sun & Moon",                 series: "Sun & Moon", era: "SM (썬·문)", release: "2017-02-03", cards: 173, order: 0, groupId: "og-sm1s",  createGroup: false },
  { id: "sm2",   name: "Guardians Rising",            series: "Sun & Moon", era: "SM (썬·문)", release: "2017-05-05", cards: 180, order: 0, groupId: "og-sm2k",  createGroup: false },
  { id: "sm3",   name: "Burning Shadows",             series: "Sun & Moon", era: "SM (썬·문)", release: "2017-08-05", cards: 177, order: 0, groupId: "og-sm3h",  createGroup: false },
  { id: "sm35",  name: "Shining Legends",             series: "Sun & Moon", era: "SM (썬·문)", release: "2017-10-06", cards: 81,  order: 0, groupId: "og-sm3+",  createGroup: false },
  { id: "sm4",   name: "Crimson Invasion",            series: "Sun & Moon", era: "SM (썬·문)", release: "2017-11-03", cards: 126, order: 0, groupId: "og-sm4s",  createGroup: false },
  { id: "sm5",   name: "Ultra Prism",                 series: "Sun & Moon", era: "SM (썬·문)", release: "2018-02-02", cards: 178, order: 0, groupId: "og-sm5s",  createGroup: false },
  { id: "sm6",   name: "Forbidden Light",             series: "Sun & Moon", era: "SM (썬·문)", release: "2018-05-04", cards: 150, order: 0, groupId: "og-sm6",   createGroup: false },
  { id: "sm75",  name: "Dragon Majesty",              series: "Sun & Moon", era: "SM (썬·문)", release: "2018-09-07", cards: 80,  order: 0, groupId: "og-sm6a",  createGroup: false },
  { id: "sm7",   name: "Celestial Storm",             series: "Sun & Moon", era: "SM (썬·문)", release: "2018-08-03", cards: 187, order: 0, groupId: "og-sm7",   createGroup: false },
  { id: "sm8",   name: "Lost Thunder",                series: "Sun & Moon", era: "SM (썬·문)", release: "2018-11-02", cards: 240, order: 0, groupId: "og-sm8",   createGroup: false },
  { id: "sm115", name: "Hidden Fates",                series: "Sun & Moon", era: "SM (썬·문)", release: "2019-08-23", cards: 69,  order: 0, groupId: "og-sm8b",  createGroup: false },
  { id: "sm9",   name: "Team Up",                     series: "Sun & Moon", era: "SM (썬·문)", release: "2019-02-01", cards: 198, order: 0, groupId: "og-sm9",   createGroup: false },
  { id: "det1",  name: "Detective Pikachu",           series: "Sun & Moon", era: "SM (썬·문)", release: "2019-04-05", cards: 18,  order: 0, groupId: "og-smp2",  createGroup: false },
  { id: "sm10",  name: "Unbroken Bonds",              series: "Sun & Moon", era: "SM (썬·문)", release: "2019-05-03", cards: 234, order: 0, groupId: "og-sm10",  createGroup: false },
  { id: "sm11",  name: "Unified Minds",               series: "Sun & Moon", era: "SM (썬·문)", release: "2019-08-02", cards: 260, order: 0, groupId: "og-sm11a", createGroup: false },
  { id: "sm12",  name: "Cosmic Eclipse",              series: "Sun & Moon", era: "SM (썬·문)", release: "2019-11-01", cards: 272, order: 0, groupId: "og-sm12",  createGroup: false },
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
    await sleep(300);
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
  await sleep(300);
  if (!apiSet?.data) { console.log("  ✗ Failed to fetch set details"); return { ok: 0, skip: 0, fail: 1 }; }
  const setData = apiSet.data;

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
    const grp = await prisma.setGroup.findUnique({ where: { id: groupId } });
    if (!grp) { console.log(`  ✗ SetGroup ${groupId} 없음 — skip`); return { ok: 0, skip: 0, fail: 1 }; }
    console.log(`  ✓ SetGroup ${groupId} (existing)`);
  }

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

  console.log(`  Fetching cards...`);
  const cards = await getAllCards(setId);
  console.log(`  Fetched ${cards.length} cards`);
  await sleep(300);

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
          verifiedBy: "auto:sync-sm-pokemontcgio", confidence: 0.95,
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

  console.log(`=== SM EN Sync (${setsToRun.length} sets) ===`);
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
