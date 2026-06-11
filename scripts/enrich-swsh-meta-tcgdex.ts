/**
 * SwSh era Card 메타를 tcgdex EN 엔드포인트에서 보강.
 *
 * 매칭 전략: EN tcgdex localId(number) → EN DB RegionCard → Card
 * SwSh sets: swsh1~swsh12pt5, swshp, swsh35, swsh45, swsh45sv, cel25, cel25c, pgo
 *            swsh9tg, swsh10tg, swsh11tg, swsh12tg, swsh12pt5gg
 *
 * Run: npx tsx scripts/enrich-swsh-meta-tcgdex.ts [--set=swsh1]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// tcgdex EN set ID → DB set ID mapping
const TARGET_SETS = [
  { tcgId: "swshp",       dbSetId: "en-tcg-swshp"       },
  { tcgId: "swsh1",       dbSetId: "en-tcg-swsh1"       },
  { tcgId: "swsh2",       dbSetId: "en-tcg-swsh2"       },
  { tcgId: "swsh3",       dbSetId: "en-tcg-swsh3"       },
  { tcgId: "swsh3.5",     dbSetId: "en-tcg-swsh35"      },
  { tcgId: "swsh4",       dbSetId: "en-tcg-swsh4"       },
  { tcgId: "swsh4.5",     dbSetId: "en-tcg-swsh45"      },
  { tcgId: "swsh5",       dbSetId: "en-tcg-swsh5"       },
  { tcgId: "swsh6",       dbSetId: "en-tcg-swsh6"       },
  { tcgId: "swsh7",       dbSetId: "en-tcg-swsh7"       },
  { tcgId: "cel25",       dbSetId: "en-tcg-cel25"       },
  { tcgId: "swsh8",       dbSetId: "en-tcg-swsh8"       },
  { tcgId: "swsh9",       dbSetId: "en-tcg-swsh9"       },
  { tcgId: "swsh10",      dbSetId: "en-tcg-swsh10"      },
  { tcgId: "swsh10.5",    dbSetId: "en-tcg-pgo"         },
  { tcgId: "swsh11",      dbSetId: "en-tcg-swsh11"      },
  { tcgId: "swsh12",      dbSetId: "en-tcg-swsh12"      },
  { tcgId: "swsh12.5",    dbSetId: "en-tcg-swsh12pt5"   },
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

function mapStageToSubtypes(stage: string | null | undefined): string[] {
  if (!stage) return [];
  const m: Record<string, string> = {
    Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2",
    "Stage 1": "Stage 1", "Stage 2": "Stage 2",
    "BREAK": "BREAK", "EX": "EX", "Mega": "Mega", "GX": "GX",
    "LevelUp": "Level-Up", "TAG TEAM": "TAG TEAM",
    "LEGEND": "LEGEND", "V": "V", "VMAX": "VMAX", "VSTAR": "VSTAR",
    "Radiant": "Radiant", "Single Strike": "Single Strike",
    "Rapid Strike": "Rapid Strike", "Fusion Strike": "Fusion Strike",
  };
  return [m[stage] ?? stage];
}

function formatTypeValue(rows?: { type: string; value: string }[]): string | null {
  if (!rows?.length) return null;
  return `${rows[0].type} ${rows[0].value}`.trim();
}

async function getRarityIdByName(nameEn: string): Promise<string | null> {
  const r = await prisma.rarity.findFirst({ where: { OR: [{ nameEn }, { code: nameEn }] } });
  return r?.id ?? null;
}

const setCardCache = new Map<string, CardSummary[]>();

async function getSetCards(tcgId: string): Promise<CardSummary[]> {
  if (setCardCache.has(tcgId)) return setCardCache.get(tcgId)!;
  const sum = await fetchJson<{ cards: CardSummary[] }>(`https://api.tcgdex.net/v2/en/sets/${tcgId}`);
  const cards = sum?.cards ?? [];
  setCardCache.set(tcgId, cards);
  return cards;
}

function padNum(n: string): string {
  const int = parseInt(n, 10);
  if (!isNaN(int)) return String(int).padStart(3, "0");
  return n.padStart(3, "0");
}

async function main() {
  const source = await prisma.externalSource.upsert({
    where: { code: "tcgdex" },
    create: { code: "tcgdex", name: "TCGdex API", kind: "catalog", region: "GLOBAL", baseUrl: "https://api.tcgdex.net/v2", priority: 80 },
    update: {},
  });

  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg
    ? TARGET_SETS.filter(s => s.tcgId.toLowerCase() === arg.slice("--set=".length).toLowerCase() ||
                               s.dbSetId.replace("en-tcg-", "") === arg.slice("--set=".length).toLowerCase())
    : TARGET_SETS;

  const unmatched = new Set<string>();
  let enriched = 0, skipped = 0, missing = 0, totalMap = 0;

  for (const { tcgId, dbSetId } of setsToRun) {
    console.log(`\n─── tcgId:${tcgId} → DB:${dbSetId} ───`);

    const cards = await getSetCards(tcgId);
    console.log(`  tcgdex EN cards: ${cards.length}`);

    if (cards.length === 0) {
      console.log("  ⚠ 카드 목록 비어있음 — SKIP");
      continue;
    }

    for (const c of cards) {
      const numPadded = padNum(c.localId);
      const enLocaleId = `${dbSetId}-${numPadded}`;
      const lcId = `lc-${enLocaleId}`;

      let lc = await prisma.card.findUnique({ where: { id: lcId } });
      if (!lc) {
        const locale = await prisma.regionCard.findUnique({
          where: { id: enLocaleId },
          select: { cardId: true },
        });
        if (locale) {
          lc = await prisma.card.findUnique({ where: { id: locale.cardId } });
        }
      }
      if (!lc) { missing++; continue; }

      const d = await fetchJson<CardDetail>(`https://api.tcgdex.net/v2/en/cards/${c.id}`);
      await sleep(80);
      if (!d) continue;

      const update: Record<string, unknown> = {};
      if (lc.hp == null && d.hp != null) update.hp = d.hp;
      if (lc.types.length === 0 && d.types?.length) update.types = d.types;
      if (lc.subtypes.length === 0 && d.stage) update.subtypes = mapStageToSubtypes(d.stage);
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
      if (lc.rarityId == null && d.rarity) {
        const rid = await getRarityIdByName(d.rarity);
        if (rid) update.rarityId = rid; else unmatched.add(d.rarity);
      }

      if (Object.keys(update).length > 0) {
        await prisma.card.update({ where: { id: lc.id }, data: update });
        enriched++;
      } else skipped++;

      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId: `${c.id}::en-${dbSetId}` } },
        create: {
          sourceId: source.id,
          externalId: `${c.id}::en-${dbSetId}`,
          cardId: lc.id,
          regionCardId: enLocaleId,
          url: `https://api.tcgdex.net/v2/en/cards/${c.id}`,
          verifiedBy: "auto:enrich-swsh-meta-tcgdex",
          confidence: 0.90,
          notes: `EN tcgdex ${c.id} mapped to EN ${dbSetId} by number ${c.localId}`,
        },
        update: { cardId: lc.id, regionCardId: enLocaleId },
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
