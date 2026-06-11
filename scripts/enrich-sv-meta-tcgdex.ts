/**
 * SV era Card 메타를 tcgdex JP 엔드포인트에서 보강.
 *
 * 대상: supertype이 null인 SV Card (JP orphan 카드)
 * tcgdex JP 세트: sv1~sv3, sv3a, sv4~sv4a, sv5M/sv5K/sv5a, sv6/sv6a,
 *                sv7/sv7a, sv8/sv8a, sv8a2, sv9/sv9a, sv10, svP, svD
 *
 * Run: npx tsx scripts/enrich-sv-meta-tcgdex.ts [--set=sv1]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// tcgdex JP set ID → DB set ID mapping
// DB JP setIds follow pattern jp-sv-{slug} (not jp-tcg-SV*)
// ⚠️ 분할(half) 세트는 반드시 분할 DB세트(jp-tcg-SV*)에 매핑할 것. 합본(jp-sv-*)에 매핑하면
//    같은 번호 2장이 한쪽 tcgId 로만 fetch 돼 dex/일러가 충돌·오염됨(2026-06-02 Paldea/Paradox 사고).
//    분할 적재는 scripts/recollect-split-jp-tcgdex.ts 사용 권장(번호충돌 원천 불가).
const TARGET_SETS = [
  // Main series JP sets — tcgdex JP IDs (uppercase) → DB jp-sv-* IDs
  { tcgId: "SV1S",  dbSetId: "jp-tcg-SV1S",              lang: "ja" },   // スカーレットex (half) → 분할
  { tcgId: "SV1V",  dbSetId: "jp-tcg-SV1V",              lang: "ja" },   // バイオレットex (half) → 분할
  { tcgId: "SV1a",  dbSetId: "jp-sv-triplet-beat",       lang: "ja" },   // トリプレットビート
  { tcgId: "SV2P",  dbSetId: "jp-tcg-SV2P",              lang: "ja" },   // スノーハザード (half) → 분할
  { tcgId: "SV2D",  dbSetId: "jp-tcg-SV2D",              lang: "ja" },   // クレイバースト (half) → 분할
  { tcgId: "SV2a",  dbSetId: "jp-sv-151",                lang: "ja" },   // ポケモンカード151
  { tcgId: "SV3",   dbSetId: "jp-sv-obsidian-flames",    lang: "ja" },   // 黒炎の支配者
  { tcgId: "SV3a",  dbSetId: "jp-sv-raging-surf",        lang: "ja" },   // レイジングサーフ
  { tcgId: "SV4K",  dbSetId: "jp-tcg-SV4K",              lang: "ja" },   // 古代の咆哮 (half) → 분할
  { tcgId: "SV4M",  dbSetId: "jp-tcg-SV4M",              lang: "ja" },   // 未来の一閃 (half) → 분할
  { tcgId: "SV4a",  dbSetId: "jp-sv-paldean-fates",      lang: "ja" },   // シャイニートレジャーex
  { tcgId: "SV5K",  dbSetId: "jp-sv-temporal-forces",    lang: "ja" },   // ワイルドフォース (half)
  { tcgId: "SV5M",  dbSetId: "jp-sv-temporal-forces",    lang: "ja" },   // サイバージャッジ (half)
  { tcgId: "SV5a",  dbSetId: "jp-sv-crimson-haze",       lang: "ja" },   // クリムゾンヘイズ
  { tcgId: "SV6",   dbSetId: "jp-sv-twilight-masquerade",lang: "ja" },   // 変幻の仮面
  { tcgId: "SV6a",  dbSetId: "jp-sv-shrouded-fable",     lang: "ja" },   // ナイトワンダラー
  { tcgId: "SV7",   dbSetId: "jp-sv-stellar-crown",      lang: "ja" },   // ステラミラクル
  { tcgId: "SVK",   dbSetId: "jp-tcg-SVK",               lang: "ja" },   // デッキビルドBOX
  { tcgId: "SVLN",  dbSetId: "jp-tcg-SVLN",              lang: "ja" },   // スターターセット ニンフィア
  { tcgId: "SVLS",  dbSetId: "jp-tcg-SVLS",              lang: "ja" },   // スターターセット ソウブレイズ
  { tcgId: "SV7a",  dbSetId: "jp-sv-paradise-dragona",   lang: "ja" },   // 楽園ドラゴーナ
  { tcgId: "SV8",   dbSetId: "jp-sv-surging-sparks",     lang: "ja" },   // 超電ブレイカー
  { tcgId: "SV8a",  dbSetId: "jp-sv-prismatic-evolutions",lang: "ja" },  // テラスタルフェスex
  { tcgId: "SV9",   dbSetId: "jp-sv-journey-together",   lang: "ja" },   // バトルパートナーズ
  { tcgId: "SV9a",  dbSetId: "jp-sv-heatwave-arena",     lang: "ja" },   // 熱風のアリーナ
  { tcgId: "SV10",  dbSetId: "jp-sv-destined-rivals",    lang: "ja" },   // ロケット団の栄光
  { tcgId: "SV11W", dbSetId: "jp-sv-black-bolt-white-flare", lang: "ja" },  // ホワイトフレア
  { tcgId: "SV11B", dbSetId: "jp-sv-black-bolt-white-flare", lang: "ja" },  // ブラックボルト
];

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

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(stdout) as T;
  } catch { return null; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function padNum(n: string): string {
  const int = parseInt(n, 10);
  if (!isNaN(int)) return String(int).padStart(3, "0");
  return n.padStart(3, "0");
}

async function enrichSet(tcgId: string, dbSetId: string, lang: string) {
  console.log(`\n─── tcgdex:${tcgId}(${lang}) → DB:${dbSetId} ───`);

  // Load all RegionCards for this DB set that need enrichment
  const locales = await prisma.regionCard.findMany({
    where: {
      setId: dbSetId,
      card: { supertype: null },  // only enrich missing supertype
    },
    select: { id: true, cardId: true, number: true },
  });

  if (locales.length === 0) {
    console.log(`  DB set ${dbSetId}: 보강 대상 없음 — skip`);
    return { ok: 0, skip: 1, fail: 0 };
  }

  console.log(`  ${locales.length}장 보강 대상`);
  let ok = 0, skip = 0, fail = 0;

  for (const cl of locales) {
    if (!cl.cardId || !cl.number) { skip++; continue; }

    // Fetch card detail from tcgdex using {tcgId}-{localId}
    const detailUrl = `https://api.tcgdex.net/v2/${lang}/cards/${tcgId}-${cl.number}`;
    const detail = await fetchJson<CardDetail>(detailUrl);
    await sleep(100);
    if (!detail) {
      // Try without leading zeros
      const numInt = parseInt(cl.number, 10);
      if (!isNaN(numInt)) {
        const altUrl = `https://api.tcgdex.net/v2/${lang}/cards/${tcgId}-${numInt}`;
        const altDetail = await fetchJson<CardDetail>(altUrl);
        await sleep(80);
        if (!altDetail) { fail++; continue; }
        await applyDetail(cl.cardId, altDetail);
        ok++;
        if (ok % 100 === 0) console.log(`  ... ${ok} 업데이트됨`);
        continue;
      }
      fail++; continue;
    }

    await applyDetail(cl.cardId, detail);
    ok++;
    if (ok % 100 === 0) console.log(`  ... ${ok} 업데이트됨`);
  }

  console.log(`  tcgdex:${tcgId}: ok=${ok} skip=${skip} fail=${fail}`);
  return { ok, skip, fail };
}

async function applyDetail(cardId: string, detail: CardDetail) {
  const category = detail.category;
  const supertype = category === "Pokemon" ? "Pokémon"
    : category === "Trainer" ? "Trainer"
    : category === "Energy" ? "Energy"
    : null;

  const update: Record<string, unknown> = {};
  if (supertype) update.supertype = supertype;
  if (detail.types?.length) update.types = detail.types;
  if (detail.illustrator) update.illustrator = detail.illustrator;
  if (detail.hp != null) update.hp = detail.hp;
  if (detail.retreat != null) update.retreatCost = detail.retreat;
  if (detail.dexId?.length) update.pokedexNumbers = detail.dexId;
  if (detail.evolveFrom) update.evolvesFrom = detail.evolveFrom;

  if (Object.keys(update).length > 0) {
    await prisma.card.update({ where: { id: cardId }, data: update });
  }
}

async function main() {
  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg
    ? TARGET_SETS.filter(s => s.tcgId === arg.slice("--set=".length))
    : TARGET_SETS;

  console.log(`=== SV Meta Enrich via tcgdex (${setsToRun.length} sets) ===`);
  let totals = { ok: 0, skip: 0, fail: 0 };

  for (const { tcgId, dbSetId, lang } of setsToRun) {
    const r = await enrichSet(tcgId, dbSetId, lang);
    totals.ok += r.ok; totals.skip += r.skip; totals.fail += r.fail;
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  업데이트: ${totals.ok}`);
  console.log(`  스킵: ${totals.skip}`);
  console.log(`  실패: ${totals.fail}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
