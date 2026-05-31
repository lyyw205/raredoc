/**
 * Phase 1 Step 1: SwSh EN card sync from pokemontcg.io
 *
 * Sets (25): swsh1~swsh12pt5, swshp, swsh35, swsh45, swsh45sv, swsh9tg, swsh10tg,
 *            swsh11tg, swsh12tg, swsh12pt5gg, cel25, cel25c, pgo
 *
 * EN → JP SetGroup mapping:
 *   swsh1       → og-s1w   (Sword & Shield EN 합본: JP ソード+シールド)
 *   swsh2       → og-s2    (Rebel Clash = JP 反逆クラッシュ, 1:1)
 *   swsh3       → og-s2a   (Darkness Ablaze 합본: JP 爆炎ウォーカー+ムゲンゾーン)
 *   swsh35      → og-swsh35 (Champion's Path — JP 対応なし, new SetGroup)
 *   swsh4       → og-s3a   (Vivid Voltage 합본: JP 仰天のボルテッカー+伝説の鼓動)
 *   swsh45      → og-s4a   (Shining Fates = JP シャイニースターV, 1:1)
 *   swsh45sv    → og-swsh45sv (Shining Fates Shiny Vault — EN-only, new SetGroup)
 *   swsh5       → og-s5i   (Battle Styles 합본: JP 一撃マスター+連撃マスター)
 *   swsh6       → og-s6h   (Chilling Reign 합본: JP 白銀のランス+漆黒のガイスト)
 *   swsh7       → og-s7r   (Evolving Skies 합본: JP 蒼空ストリーム+摩天パーフェクト+双璧のファイター+イーブイヒーローズ)
 *   cel25       → og-s8a   (Celebrations = JP 25th アニバーサリーコレクション, 1:1)
 *   cel25c      → og-cel25c (Celebrations: Classic Collection — EN-only, new SetGroup)
 *   swsh8       → og-s8    (Fusion Strike = JP フュージョンアーツ, 1:1)
 *   swsh9       → og-s9    (Brilliant Stars = JP スターバース, 1:1)
 *   swsh9tg     → og-swsh9tg (Brilliant Stars Trainer Gallery — EN-only, new SetGroup)
 *   swsh10      → og-s10d  (Astral Radiance 합본: JP タイムゲイザー+スペースジャグラー)
 *   swsh10tg    → og-swsh10tg (Astral Radiance Trainer Gallery — EN-only, new SetGroup)
 *   pgo         → og-s10b  (Pokémon GO = JP Pokémon GO, 1:1)
 *   swsh11      → og-s10a  (Lost Origin 합본: JP ダークファンタズマ+バトルリージョン+...)
 *   swsh11tg    → og-swsh11tg (Lost Origin Trainer Gallery — EN-only, new SetGroup)
 *   swsh12      → og-s11a  (Silver Tempest 합본: JP 白熱のアルカナ+パラダイムトリガー)
 *   swsh12tg    → og-swsh12tg (Silver Tempest Trainer Gallery — EN-only, new SetGroup)
 *   swsh12pt5   → og-s12a  (Crown Zenith = JP VSTARユニバース, 1:1)
 *   swsh12pt5gg → og-swsh12pt5gg (Crown Zenith Galarian Gallery — EN-only, new SetGroup)
 *   swshp       → og-swshp (SWSH Black Star Promos — EN-only, new SetGroup)
 *
 * Run: npx tsx scripts/sync-swsh-pokemontcgio.ts [--set=swsh1]
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

const ERA = "S (소드·실드)";

const SETS: SetDef[] = [
  // EN-only new SetGroups
  { id: "swshp",       name: "SWSH Black Star Promos",               series: "Sword & Shield", era: ERA, release: "2019-11-15", cards: 307, order: 600, groupId: "og-swshp",       createGroup: true,  groupNameEn: "SWSH Black Star Promos" },
  { id: "swsh35",      name: "Champion's Path",                      series: "Sword & Shield", era: ERA, release: "2020-09-25", cards: 80,  order: 601, groupId: "og-swsh35",      createGroup: true,  groupNameEn: "Champion's Path" },
  { id: "swsh45sv",    name: "Shining Fates: Shiny Vault",           series: "Sword & Shield", era: ERA, release: "2021-02-19", cards: 122, order: 602, groupId: "og-swsh45sv",    createGroup: true,  groupNameEn: "Shining Fates: Shiny Vault" },
  { id: "cel25c",      name: "Celebrations: Classic Collection",     series: "Sword & Shield", era: ERA, release: "2021-10-08", cards: 25,  order: 603, groupId: "og-cel25c",      createGroup: true,  groupNameEn: "Celebrations: Classic Collection" },
  { id: "swsh9tg",     name: "Brilliant Stars Trainer Gallery",      series: "Sword & Shield", era: ERA, release: "2022-02-25", cards: 30,  order: 604, groupId: "og-swsh9tg",     createGroup: true,  groupNameEn: "Brilliant Stars Trainer Gallery" },
  { id: "swsh10tg",    name: "Astral Radiance Trainer Gallery",      series: "Sword & Shield", era: ERA, release: "2022-05-27", cards: 30,  order: 605, groupId: "og-swsh10tg",    createGroup: true,  groupNameEn: "Astral Radiance Trainer Gallery" },
  { id: "swsh11tg",    name: "Lost Origin Trainer Gallery",          series: "Sword & Shield", era: ERA, release: "2022-09-09", cards: 30,  order: 606, groupId: "og-swsh11tg",    createGroup: true,  groupNameEn: "Lost Origin Trainer Gallery" },
  { id: "swsh12tg",    name: "Silver Tempest Trainer Gallery",       series: "Sword & Shield", era: ERA, release: "2022-11-11", cards: 30,  order: 607, groupId: "og-swsh12tg",    createGroup: true,  groupNameEn: "Silver Tempest Trainer Gallery" },
  { id: "swsh12pt5gg", name: "Crown Zenith Galarian Gallery",        series: "Sword & Shield", era: ERA, release: "2023-01-20", cards: 70,  order: 608, groupId: "og-swsh12pt5gg", createGroup: true,  groupNameEn: "Crown Zenith Galarian Gallery" },

  // EN → existing JP SetGroups
  { id: "swsh1",       name: "Sword & Shield",       series: "Sword & Shield", era: ERA, release: "2020-02-07", cards: 216, order: 0, groupId: "og-s1w",  createGroup: false },
  { id: "swsh2",       name: "Rebel Clash",          series: "Sword & Shield", era: ERA, release: "2020-05-01", cards: 209, order: 0, groupId: "og-s2",   createGroup: false },
  { id: "swsh3",       name: "Darkness Ablaze",      series: "Sword & Shield", era: ERA, release: "2020-08-14", cards: 201, order: 0, groupId: "og-s2a",  createGroup: false },
  { id: "swsh4",       name: "Vivid Voltage",        series: "Sword & Shield", era: ERA, release: "2020-11-13", cards: 203, order: 0, groupId: "og-s3a",  createGroup: false },
  { id: "swsh45",      name: "Shining Fates",        series: "Sword & Shield", era: ERA, release: "2021-02-19", cards: 73,  order: 0, groupId: "og-s4a",  createGroup: false },
  { id: "swsh5",       name: "Battle Styles",        series: "Sword & Shield", era: ERA, release: "2021-03-19", cards: 183, order: 0, groupId: "og-s5i",  createGroup: false },
  { id: "swsh6",       name: "Chilling Reign",       series: "Sword & Shield", era: ERA, release: "2021-06-18", cards: 233, order: 0, groupId: "og-s6h",  createGroup: false },
  { id: "swsh7",       name: "Evolving Skies",       series: "Sword & Shield", era: ERA, release: "2021-08-27", cards: 237, order: 0, groupId: "og-s7r",  createGroup: false },
  { id: "cel25",       name: "Celebrations",         series: "Sword & Shield", era: ERA, release: "2021-10-08", cards: 25,  order: 0, groupId: "og-s8a",  createGroup: false },
  { id: "swsh8",       name: "Fusion Strike",        series: "Sword & Shield", era: ERA, release: "2021-11-12", cards: 284, order: 0, groupId: "og-s8",   createGroup: false },
  { id: "swsh9",       name: "Brilliant Stars",      series: "Sword & Shield", era: ERA, release: "2022-02-25", cards: 186, order: 0, groupId: "og-s9",   createGroup: false },
  { id: "swsh10",      name: "Astral Radiance",      series: "Sword & Shield", era: ERA, release: "2022-05-27", cards: 246, order: 0, groupId: "og-s10d", createGroup: false },
  { id: "pgo",         name: "Pokémon GO",            series: "Sword & Shield", era: ERA, release: "2022-07-01", cards: 88,  order: 0, groupId: "og-s10b", createGroup: false },
  { id: "swsh11",      name: "Lost Origin",          series: "Sword & Shield", era: ERA, release: "2022-09-09", cards: 217, order: 0, groupId: "og-s10a", createGroup: false },
  { id: "swsh12",      name: "Silver Tempest",       series: "Sword & Shield", era: ERA, release: "2022-11-11", cards: 245, order: 0, groupId: "og-s11a", createGroup: false },
  { id: "swsh12pt5",   name: "Crown Zenith",         series: "Sword & Shield", era: ERA, release: "2023-01-20", cards: 230, order: 0, groupId: "og-s12a", createGroup: false },
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
          verifiedBy: "auto:sync-swsh-pokemontcgio", confidence: 0.95,
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

  console.log(`=== SwSh EN Sync (${setsToRun.length} sets) ===`);
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
