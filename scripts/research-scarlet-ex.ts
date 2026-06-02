/**
 * Read-only deep research for SV1S "Scarlet ex".
 *
 * Fetches:
 * - JP SV1S/SV1V from TCGdex API (metadata-rich reference)
 * - EN sv1 from pokemontcg.io API
 * - KR SV1S from Pokemon Korea official card search/detail pages
 * - current raredoc DB records for sv-base / jp-sv-base / kr-sv1s / sv1
 *
 * Writes compact evidence + mismatch summary to docs/pack-audit/.
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import { prisma } from "../src/lib/prisma";

const execFileP = promisify(execFile);
const OUT_DIR = path.join(process.cwd(), "docs", "pack-audit");
const UA = "Mozilla/5.0 (raredoc scarlet-ex research)";

type Json = Record<string, any>;

async function curl(args: string[], maxBuffer = 32 * 1024 * 1024): Promise<string> {
  const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "30", ...args], { maxBuffer });
  return stdout;
}

async function fetchJson<T = any>(url: string): Promise<T> {
  return JSON.parse(await curl([url])) as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function between(src: string, start: string, end: string): string {
  const i = src.indexOf(start);
  if (i < 0) return "";
  const j = src.indexOf(end, i + start.length);
  return j < 0 ? src.slice(i + start.length) : src.slice(i + start.length, j);
}

function firstMatch(src: string, re: RegExp): string | null {
  const m = src.match(re);
  return m ? strip(m[1] ?? "") : null;
}

function normalizeRarity(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  const map: Record<string, string> = {
    C: "Common",
    U: "Uncommon",
    R: "Rare",
    RR: "Double Rare",
    AR: "Art Rare",
    SR: "Super Rare",
    SAR: "Special Art Rare",
    UR: "Ultra Rare",
    "Double rare": "Double Rare",
    "Art rare": "Art Rare",
    "Super rare": "Super Rare",
    "Special art rare": "Special Art Rare",
    "Ultra rare": "Ultra Rare",
  };
  return map[raw] ?? raw;
}

function supertypeFromTcgdex(category?: string): string | null {
  if (category === "Pokemon") return "Pokémon";
  if (category === "Trainer") return "Trainer";
  if (category === "Energy") return "Energy";
  return null;
}

async function fetchTcgdexSet(lang: string, setId: string) {
  const set = await fetchJson<Json>(`https://api.tcgdex.net/v2/${lang}/sets/${setId}`);
  const cards: Json[] = [];
  for (const c of set.cards ?? []) {
    const detail = await fetchJson<Json>(`https://api.tcgdex.net/v2/${lang}/cards/${c.id}`);
    cards.push(detail);
    if (cards.length % 40 === 0) console.log(`[tcgdex] ${setId}: ${cards.length}/${set.cards.length}`);
    await sleep(25);
  }
  return { set, cards };
}

async function fetchPokemonTcgSet(setId: string) {
  const set = await fetchJson<Json>(`https://api.pokemontcg.io/v2/sets/${setId}`);
  const cards: Json[] = [];
  let page = 1;
  while (true) {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}`;
    const res = await fetchJson<Json>(url);
    cards.push(...res.data);
    if (cards.length >= res.totalCount) break;
    page++;
  }
  return { set: set.data, cards };
}

async function fetchKrOfficialList(searchText: string) {
  const out: Json[] = [];
  for (let limit = 0; limit < 20; limit++) {
    const body = await curl([
      "-H", `User-Agent: ${UA}`,
      "-H", "Referer: https://pokemoncard.co.kr/cards?s=%EC%8A%A4%EC%B9%BC%EB%A0%9B%20ex",
      "-H", "X-Requested-With: XMLHttpRequest",
      "-X", "POST",
      "-F", "action=search_text_cards",
      "-F", `search_text=${searchText}`,
      "-F", "search_params=all",
      "-F", `limit=${limit}`,
      "https://pokemoncard.co.kr/v2/ajax2_dev2",
    ]);
    const json = JSON.parse(body);
    const values = Object.values(json.result ?? {}) as Json[];
    out.push(...values);
    if (values.length < 30) break;
  }
  return out;
}

function parseKrDetail(cardNum: string, html: string): Json {
  const pNum = html.match(/<span class="p_num">\s*(\d{3})\/(\d{3})<span id="no_wrap_by_admin">\s*([^<]*)<\/span>/);
  const headerBlock = between(html, '<div class="header">', '<div class="clearfix"></div>');
  const abilitiesBlock = between(html, '<div class="pokemon-abilities">', '<div class="clearfix"></div>');
  const statsBlock = between(html, '<div class="pokemon-stats">', '<div class="pokemon-detail txt_centre">');
  const dexBlock = between(html, '<div class="pokemon-detail txt_centre">', '<div id="detail_card_wrap"');

  const stat = (label: string) => {
    const blocks = statsBlock.split('<div class="stat"');
    const block = blocks.find((b) => b.includes(`<h4>${label}</h4>`)) ?? "";
    return {
      type: firstMatch(block, /title="([^"]+)"/),
      value: firstMatch(block, /<span>([^<]+)<\/span>/),
    };
  };

  const retreatTitle = firstMatch(statsBlock, /title="후퇴\s*:\s*([^"]*)"/);
  const retreatBlock = (statsBlock.split("<h4>후퇴</h4>")[1] ?? "").split("</div>")[0] ?? "";
  const retreatFromIcons = (retreatBlock.match(/type9\.png/g) ?? []).length;
  const attacks = [...abilitiesBlock.matchAll(/<div class="ability[\s\S]*?<\/div>\s*(?:<p>([\s\S]*?)<\/p>)?/g)]
    .map((m) => {
      const block = m[0];
      return {
        name: firstMatch(block, /<span class="skil_name">([^<]+)<\/span>/),
        damage: firstMatch(block, /<span class="plus">([^<]*)<\/span>/),
        text: m[1] ? strip(m[1]) : null,
        costKo: [...block.matchAll(/title="([^"]+)"/g)].map((x) => x[1]),
      };
    })
    .filter((a) => a.name);

  return {
    cardNum,
    sourceUrl: `https://pokemoncard.co.kr/cards/detail/${cardNum}`,
    image: firstMatch(html, /<img src="([^"]+)" class="feature_image"/),
    number: pNum?.[1] ?? null,
    printedTotal: pNum?.[2] ? Number(pNum[2]) : null,
    rarity: normalizeRarity(pNum?.[3]),
    rarityRaw: pNum?.[3]?.trim() ?? null,
    regulationMark: html.includes("/symbol/G.png") ? "G" : null,
    nameKo: firstMatch(headerBlock, /<span class="card-hp title">([^<]+)<\/span>/),
    hp: firstMatch(headerBlock, /<span class="hp_num">HP(\d+)<\/span>/),
    typeKo: firstMatch(headerBlock, /title="([^"]+)"/),
    kindKo: firstMatch(html, /<div class="pokemon-info">\s*카드 종류\s*:\s*([^<]+)<\/div>/),
    illustrator: firstMatch(html, /<p class="illustrator">일러스트<br\s*\/>([^<]+)<\/p>/),
    attacks,
    weakness: stat("약점"),
    resistance: stat("저항력"),
    retreatCost: retreatTitle && /^\d+$/.test(retreatTitle) ? Number(retreatTitle) : retreatFromIcons,
    productName: firstMatch(html, /<a href="\/cards\?s=[^"]+" class="search_href">([^<]+)<\/a>/),
    pokedexNumber: firstMatch(dexBlock, /No\.\s*(\d+)/),
    flavorTextKo: firstMatch(dexBlock, /<div class="col-md-8 col-xs-7 colsit">\s*<p>([\s\S]*?)<\/p>/),
  };
}

async function fetchKrOfficialDetails() {
  const list = await fetchKrOfficialList("스칼렛 ex");
  const cards: Json[] = [];
  for (const item of list) {
    const html = await curl([`https://pokemoncard.co.kr/cards/detail/${item.CardNum}`]);
    cards.push(parseKrDetail(item.CardNum, html));
    if (cards.length % 30 === 0) console.log(`[kr-official] ${cards.length}/${list.length}`);
    await sleep(25);
  }
  return { list, cards };
}

async function fetchDbPack() {
  const sets = await prisma.set.findMany({
    where: { id: { in: ["jp-sv-base", "kr-sv1s", "kr-sv1v", "sv1"] } },
    select: {
      id: true, name: true, region: true, code: true, cardCount: true,
      releaseDate: true, setGroupId: true, _count: { select: { localeCards: true } },
    },
    orderBy: { id: "asc" },
  });
  const locales = await prisma.cardLocale.findMany({
    where: { setId: { in: ["jp-sv-base", "kr-sv1s", "kr-sv1v", "sv1"] } },
    select: {
      id: true, language: true, region: true, setId: true, number: true, numberInt: true,
      name: true, imageSmall: true,
      logicalCard: {
        select: {
          id: true, primarySetId: true, primaryNumber: true, nameKo: true, supertype: true,
          subtypes: true, types: true, hp: true, retreatCost: true, weakness: true,
          resistance: true, regulationMark: true, illustrator: true, pokedexNumbers: true,
          attacks: true, abilities: true, flavorText: true,
          rarity: { select: { code: true } },
          texts: { where: { language: "ko" }, select: { name: true, source: true } },
        },
      },
    },
    orderBy: [{ setId: "asc" }, { numberInt: "asc" }, { id: "asc" }],
  });
  return { sets, locales };
}

function byLocalId(cards: Json[]) {
  return new Map(cards.map((c) => [String(c.localId ?? c.number).padStart(3, "0"), c]));
}

function summarizeDb(db: Awaited<ReturnType<typeof fetchDbPack>>, refs: Json) {
  const setById = Object.fromEntries(db.sets.map((s) => [s.id, s]));
  const bySet = new Map<string, Json[]>();
  for (const c of db.locales) {
    if (!bySet.has(c.setId)) bySet.set(c.setId, []);
    bySet.get(c.setId)!.push(c as Json);
  }

  const cardinality = [...bySet.entries()].map(([setId, cards]) => {
    const nums = new Set(cards.map((c) => c.numberInt).filter(Boolean));
    const max = Math.max(...[...nums]);
    const missing: number[] = [];
    for (let i = 1; i <= max; i++) if (!nums.has(i)) missing.push(i);
    return {
      setId,
      dbSet: setById[setId],
      count: cards.length,
      distinctNumbers: nums.size,
      minNumber: Math.min(...[...nums]),
      maxNumber: max,
      missing,
    };
  });

  const jpS = byLocalId(refs.jpSv1s.cards);
  const jpV = byLocalId(refs.jpSv1v.cards);
  const jpMismatches: Json[] = [];
  for (const row of bySet.get("jp-sv-base") ?? []) {
    const setCode = row.id.includes("SV1V") ? "SV1V" : row.id.includes("SV1S") ? "SV1S" : null;
    const ref = setCode === "SV1V" ? jpV.get(row.number) : jpS.get(row.number);
    if (!ref) continue;
    const lc = row.logicalCard;
    const expectedSuper = supertypeFromTcgdex(ref.category);
    const fields: string[] = [];
    if (row.name !== ref.name) fields.push("locale.name");
    if (lc.hp !== (ref.hp ?? null)) fields.push("hp");
    if ((lc.illustrator ?? null) !== (ref.illustrator ?? null)) fields.push("illustrator");
    if ((lc.rarity?.code ?? null) !== normalizeRarity(ref.rarity)) fields.push("rarity");
    if ((lc.supertype ?? null) !== expectedSuper) fields.push("supertype");
    if (JSON.stringify(lc.types ?? []) !== JSON.stringify(ref.types ?? [])) fields.push("types");
    if (fields.length) {
      jpMismatches.push({
        id: row.id, setCode, number: row.number, dbName: row.name, refName: ref.name,
        fields, db: {
          hp: lc.hp, illustrator: lc.illustrator, rarity: lc.rarity?.code ?? null,
          supertype: lc.supertype, types: lc.types, nameKo: lc.nameKo,
        },
        ref: {
          hp: ref.hp ?? null, illustrator: ref.illustrator ?? null, rarity: normalizeRarity(ref.rarity),
          supertype: expectedSuper, types: ref.types ?? [], dexId: ref.dexId ?? [],
        },
      });
    }
  }

  const kr = new Map(refs.krOfficial.cards.map((c: Json) => [c.number, c]));
  const krDb = new Map((bySet.get("kr-sv1s") ?? []).map((c) => [String(c.number).padStart(3, "0"), c]));
  const krMismatches: Json[] = [];
  for (const [num, ref] of kr) {
    const row = krDb.get(num);
    if (!row) {
      krMismatches.push({ number: num, type: "missing-db-card", refName: ref.nameKo, rarity: ref.rarity });
      continue;
    }
    const lc = row.logicalCard;
    const dbKo = lc.texts?.[0]?.name ?? lc.nameKo ?? null;
    const fields: string[] = [];
    if (dbKo !== ref.nameKo) fields.push("koName");
    if ((lc.rarity?.code ?? null) !== ref.rarity) fields.push("rarity");
    if (lc.hp !== (ref.hp ? Number(ref.hp) : null)) fields.push("hp-missing-or-different");
    if ((lc.illustrator ?? null) !== (ref.illustrator ?? null)) fields.push("illustrator-missing-or-different");
    if (fields.length) {
      krMismatches.push({
        number: num, type: "field-mismatch", fields, dbName: row.name, dbKo,
        refName: ref.nameKo, dbRarity: lc.rarity?.code ?? null, refRarity: ref.rarity,
        dbHp: lc.hp, refHp: ref.hp ? Number(ref.hp) : null,
        dbIllustrator: lc.illustrator, refIllustrator: ref.illustrator,
      });
    }
  }

  const enRows = bySet.get("sv1") ?? [];
  const enProblems = {
    count: enRows.length,
    hpPresent: enRows.filter((c) => c.logicalCard.hp != null).length,
    attacksArray: enRows.filter((c) => Array.isArray(c.logicalCard.attacks)).length,
    attacksScalar: enRows.filter((c) => c.logicalCard.attacks != null && !Array.isArray(c.logicalCard.attacks)).length,
    abilitiesArray: enRows.filter((c) => Array.isArray(c.logicalCard.abilities)).length,
    pokemonWithNullHp: enRows.filter((c) => c.logicalCard.supertype === "Pokémon" && c.logicalCard.hp == null).length,
  };

  return {
    cardinality,
    jpMismatches: {
      total: jpMismatches.length,
      sv1s: jpMismatches.filter((m) => m.setCode === "SV1S").length,
      sv1v: jpMismatches.filter((m) => m.setCode === "SV1V").length,
      samples: jpMismatches.slice(0, 30),
    },
    krMismatches: {
      total: krMismatches.length,
      missingNumbers: krMismatches.filter((m) => m.type === "missing-db-card").map((m) => m.number),
      samples: krMismatches.slice(0, 40),
    },
    enProblems,
  };
}

function compactTcgdexCard(c: Json) {
  return {
    id: c.id,
    number: c.localId,
    name: c.name,
    category: c.category,
    supertype: supertypeFromTcgdex(c.category),
    rarity: normalizeRarity(c.rarity),
    hp: c.hp ?? null,
    types: c.types ?? [],
    stage: c.stage ?? null,
    illustrator: c.illustrator ?? null,
    pokedexNumbers: c.dexId ?? [],
    attacks: c.attacks ?? [],
    abilities: c.abilities ?? [],
    weakness: c.weaknesses ?? [],
    resistance: c.resistances ?? [],
    retreatCost: c.retreat ?? null,
    regulationMark: c.regulationMark ?? null,
    flavorText: c.description ?? null,
  };
}

function compactEnCard(c: Json) {
  return {
    id: c.id,
    number: c.number,
    name: c.name,
    supertype: c.supertype,
    subtypes: c.subtypes ?? [],
    rarity: c.rarity ?? null,
    hp: c.hp ? Number(c.hp) : null,
    types: c.types ?? [],
    illustrator: c.artist ?? null,
    pokedexNumbers: c.nationalPokedexNumbers ?? [],
    attacks: c.attacks ?? [],
    abilities: c.abilities ?? [],
    weakness: c.weaknesses ?? [],
    resistance: c.resistances ?? [],
    retreatCost: c.convertedRetreatCost ?? null,
    regulationMark: c.regulationMark ?? null,
    flavorText: c.flavorText ?? null,
  };
}

function toMarkdown(report: Json) {
  const cardRows = (report.sourceData.jpSv1s.cards as Json[])
    .map((c) => `| ${c.number} | ${c.name} | ${c.rarity ?? ""} | ${c.supertype ?? ""} | ${c.hp ?? ""} | ${(c.types ?? []).join(",")} | ${c.illustrator ?? ""} |`)
    .join("\n");
  const krSamples = report.dbComparison.krMismatches.samples
    .map((m: Json) => `- #${m.number}: ${m.type}${m.fields ? ` (${m.fields.join(", ")})` : ""} DB="${m.dbKo ?? m.dbName ?? "-"}" REF="${m.refName}"`)
    .join("\n");
  const jpSamples = report.dbComparison.jpMismatches.samples
    .map((m: Json) => `- ${m.id}: ${m.fields.join(", ")} DB="${m.dbName}" REF="${m.refName}"`)
    .join("\n");

  return `# 스칼렛 ex 딥리서치 결과

생성: ${new Date().toISOString()}

## 버전 판정

| region | product | source set | 카드 구성 |
|---|---|---|---|
| JP | スカーレットex | SV1S | official ${report.sourceData.jpSv1s.set.cardCount.official}, total ${report.sourceData.jpSv1s.set.cardCount.total} |
| JP | バイオレットex | SV1V | 스칼렛 ex가 아니지만 현재 DB에서 같은 Set으로 합쳐져 있어 오염 검사용 포함 |
| KR | 스칼렛 ex | SV1S | official search detail ${report.sourceData.krOfficial.cards.length} |
| EN | Scarlet & Violet | sv1 | printed ${report.sourceData.enSv1.set.printedTotal}, total ${report.sourceData.enSv1.set.total}; 단독 Scarlet ex 없음 |

## raredoc 현재 DB 요약

${report.dbComparison.cardinality.map((c: Json) => `- ${c.setId}: count=${c.count}, distinctNumbers=${c.distinctNumbers}, missing=[${c.missing.join(",")}]`).join("\n")}

## 주요 불일치

- JP jp-sv-base mismatch: total=${report.dbComparison.jpMismatches.total}, SV1S=${report.dbComparison.jpMismatches.sv1s}, SV1V=${report.dbComparison.jpMismatches.sv1v}
- KR kr-sv1s mismatch: total=${report.dbComparison.krMismatches.total}, missingNumbers=[${report.dbComparison.krMismatches.missingNumbers.join(",")}]
- EN sv1: hpPresent=${report.dbComparison.enProblems.hpPresent}/${report.dbComparison.enProblems.count}, attacksArray=${report.dbComparison.enProblems.attacksArray}, attacksScalar=${report.dbComparison.enProblems.attacksScalar}, pokemonWithNullHp=${report.dbComparison.enProblems.pokemonWithNullHp}

## JP SV1S 카드 구성

| no | nameJa | rarity | supertype | hp | types | illustrator |
|---|---|---|---|---:|---|---|
${cardRows}

## mismatch samples

### JP samples
${jpSamples || "- none"}

### KR samples
${krSamples || "- none"}
`;
}

async function main() {
  console.log("[fetch] JP SV1S");
  const jpSv1s = await fetchTcgdexSet("ja", "SV1S");
  console.log("[fetch] JP SV1V");
  const jpSv1v = await fetchTcgdexSet("ja", "SV1V");
  console.log("[fetch] EN sv1");
  const enSv1 = await fetchPokemonTcgSet("sv1");
  console.log("[fetch] KR official SV1S");
  const krOfficial = await fetchKrOfficialDetails();
  console.log("[fetch] DB");
  const db = await fetchDbPack();

  const sourceData = {
    jpSv1s: { set: jpSv1s.set, cards: jpSv1s.cards.map(compactTcgdexCard) },
    jpSv1v: { set: jpSv1v.set, cards: jpSv1v.cards.map(compactTcgdexCard) },
    enSv1: { set: enSv1.set, cards: enSv1.cards.map(compactEnCard) },
    krOfficial,
  };
  const dbComparison = summarizeDb(db, { jpSv1s, jpSv1v, enSv1, krOfficial });
  const report = { generatedAt: new Date().toISOString(), sourceData, dbComparison };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "sv-scarlet-ex-research.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUT_DIR, "sv-scarlet-ex-research.md"), toMarkdown(report));
  console.log("[done] wrote docs/pack-audit/sv-scarlet-ex-research.{json,md}");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
