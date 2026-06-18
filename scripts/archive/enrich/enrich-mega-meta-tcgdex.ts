/**
 * MEGA era Card 메타를 tcgdex JP 엔드포인트에서 보강.
 *
 * 커버 가능한 세트:
 *   M1L (メガブレイブ) + M1S (メガシンフォニア) → mega-brave-symphonia
 *   M2  (インフェルノX)                          → mega-infernox
 *   M3  (ムニキスゼロ)                           → mega-munikisuzero
 *
 * 커버 불가 (tcgdex 미수록):
 *   mega-dream-ex, mega-ninja-spinner, mega-abyss-eye
 *   → 이 3개는 TCGPlayer sourced EN cards — 별도 처리 필요
 *
 * Run: npx tsx scripts/enrich-mega-meta-tcgdex.ts
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// tcgdex JP set ID → DB RegionCard setId mapping
// mega-brave-symphonia has sub-IDs: M1L-### and M1S-###
const TARGET_SETS = [
  { tcgId: "M1L", dbSetId: "jp-mega-brave-symphonia", cardIdPrefix: "jp-mega-brave-symphonia-M1L-", lang: "ja" },
  { tcgId: "M1S", dbSetId: "jp-mega-brave-symphonia", cardIdPrefix: "jp-mega-brave-symphonia-M1S-", lang: "ja" },
  { tcgId: "M2",  dbSetId: "jp-mega-infernox",        cardIdPrefix: "jp-mega-infernox-",           lang: "ja" },
  { tcgId: "M3",  dbSetId: "jp-mega-munikisuzero",    cardIdPrefix: "jp-mega-munikisuzero-",       lang: "ja" },
];

type CardDetail = {
  id: string; localId: string; name: string; category?: string;
  illustrator?: string | null; hp?: number | null;
  types?: string[]; stage?: string | null;
  attacks?: { cost?: string[]; name: string; effect?: string; damage?: string | number }[];
  retreat?: number | null; dexId?: number[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  evolveFrom?: string | null;
  abilities?: { name: string; effect: string; type: string }[];
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url], { maxBuffer: 8 * 1024 * 1024 });
    return JSON.parse(stdout) as T;
  } catch { return null; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function padNum(n: string): string {
  const int = parseInt(n, 10);
  if (!isNaN(int)) return String(int).padStart(3, "0");
  return n.padStart(3, "0");
}

async function enrichSet(tcgId: string, dbSetId: string, cardIdPrefix: string, lang: string) {
  console.log(`\n─── tcgdex:${tcgId} → DB prefix:${cardIdPrefix} ───`);

  // Get cards from DB that use this prefix and need supertype
  const locales = await prisma.regionCard.findMany({
    where: {
      id: { startsWith: cardIdPrefix },
      card: { supertype: null },
    },
    select: { id: true, cardId: true, number: true },
  });

  if (locales.length === 0) {
    console.log(`  보강 대상 없음 — skip`);
    return { ok: 0, skip: 1, fail: 0 };
  }

  console.log(`  ${locales.length}장 보강 대상`);
  let ok = 0, skip = 0, fail = 0;

  for (const cl of locales) {
    if (!cl.cardId || !cl.number) { skip++; continue; }

    const numPadded = padNum(cl.number);
    const detailUrl = `https://api.tcgdex.net/v2/${lang}/cards/${tcgId}-${numPadded}`;
    const detail = await fetchJson<CardDetail>(detailUrl);
    await sleep(100);
    if (!detail) { fail++; continue; }

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
      await prisma.card.update({ where: { id: cl.cardId }, data: update });
    }
    ok++;
    if (ok % 50 === 0) console.log(`  ... ${ok} 업데이트됨`);
  }

  console.log(`  ${tcgId}: ok=${ok} skip=${skip} fail=${fail}`);
  return { ok, skip, fail };
}

async function main() {
  console.log("=== MEGA Meta Enrich via tcgdex ===");
  let totals = { ok: 0, skip: 0, fail: 0 };

  for (const { tcgId, dbSetId, cardIdPrefix, lang } of TARGET_SETS) {
    const r = await enrichSet(tcgId, dbSetId, cardIdPrefix, lang);
    totals.ok += r.ok; totals.skip += r.skip; totals.fail += r.fail;
  }

  console.log(`\n══════ 전체 결과 ══════`);
  console.log(`  업데이트: ${totals.ok}`);
  console.log(`  스킵: ${totals.skip}`);
  console.log(`  실패: ${totals.fail}`);
  console.log(`\n⚠ tcgdex 미수록: mega-dream-ex, mega-ninja-spinner, mega-abyss-eye (별도 처리 필요)`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
