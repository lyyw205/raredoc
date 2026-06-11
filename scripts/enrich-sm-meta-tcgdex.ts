/**
 * SM era LogicalCard 메타를 tcgdex EN 엔드포인트에서 보강.
 *
 * 매칭 전략: EN tcgdex localId(number) → EN DB RegionCard → LogicalCard
 * SM sets: sm1~sm12, smp, sm35, sm75, sm115, det1, sma
 *
 * Run: npx tsx scripts/enrich-sm-meta-tcgdex.ts [--set=sm1]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// EN tcgdex set ID → EN DB set ID
// SM sets where tcgdex has data
const TARGET_SETS = [
  { tcgId: "sm1",   dbSetId: "en-tcg-sm1"   },
  { tcgId: "sm2",   dbSetId: "en-tcg-sm2"   },
  { tcgId: "sm3",   dbSetId: "en-tcg-sm3"   },
  { tcgId: "sm35",  dbSetId: "en-tcg-sm35"  },
  { tcgId: "sm4",   dbSetId: "en-tcg-sm4"   },
  { tcgId: "sm5",   dbSetId: "en-tcg-sm5"   },
  { tcgId: "sm6",   dbSetId: "en-tcg-sm6"   },
  { tcgId: "sm75",  dbSetId: "en-tcg-sm75"  },
  { tcgId: "sm7",   dbSetId: "en-tcg-sm7"   },
  { tcgId: "sm8",   dbSetId: "en-tcg-sm8"   },
  { tcgId: "sm115", dbSetId: "en-tcg-sm115" },
  { tcgId: "sma",   dbSetId: "en-tcg-sma"   },
  { tcgId: "sm9",   dbSetId: "en-tcg-sm9"   },
  { tcgId: "det1",  dbSetId: "en-tcg-det1"  },
  { tcgId: "sm10",  dbSetId: "en-tcg-sm10"  },
  { tcgId: "sm11",  dbSetId: "en-tcg-sm11"  },
  { tcgId: "sm12",  dbSetId: "en-tcg-sm12"  },
  { tcgId: "smp",   dbSetId: "en-tcg-smp"   },
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
    "LEGEND": "LEGEND", "V": "V", "VMAX": "VMAX",
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
    ? TARGET_SETS.filter(s => s.tcgId.toLowerCase() === arg.slice("--set=".length).toLowerCase())
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

      // Find LogicalCard — first try direct EN lc ID, then via locale
      let lc = await prisma.logicalCard.findUnique({ where: { id: lcId } });
      if (!lc) {
        const locale = await prisma.regionCard.findUnique({
          where: { id: enLocaleId },
          select: { logicalCardId: true },
        });
        if (locale) {
          lc = await prisma.logicalCard.findUnique({ where: { id: locale.logicalCardId } });
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
        await prisma.logicalCard.update({ where: { id: lc.id }, data: update });
        enriched++;
      } else skipped++;

      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId: `${c.id}::en-${dbSetId}` } },
        create: {
          sourceId: source.id,
          externalId: `${c.id}::en-${dbSetId}`,
          logicalCardId: lc.id,
          regionCardId: enLocaleId,
          url: `https://api.tcgdex.net/v2/en/cards/${c.id}`,
          verifiedBy: "auto:enrich-sm-meta-tcgdex",
          confidence: 0.90,
          notes: `EN tcgdex ${c.id} mapped to EN ${dbSetId} by number ${c.localId}`,
        },
        update: { logicalCardId: lc.id, regionCardId: enLocaleId },
      });
      totalMap++;
    }
    console.log(`  → enriched: ${enriched}, skipped: ${skipped}, missing: ${missing}`);
  }

  console.log(`\n── 전체 결과 ──`);
  console.log(`  enriched: ${enriched}`);
  console.log(`  already-filled (skipped): ${skipped}`);
  console.log(`  LogicalCard 누락: ${missing}`);
  console.log(`  ExternalIdMapping: ${totalMap}`);
  if (unmatched.size > 0) {
    console.log(`  매칭 안된 rarity (${unmatched.size}):`);
    for (const r of unmatched) console.log(`    "${r}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
