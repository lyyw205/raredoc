/**
 * XY era (2013-2016) LogicalCard 메타를 tcgdex EN 엔드포인트에서 보강.
 *
 * tcgdex /ja/ 엔드포인트는 XY 카드 목록이 비어있어 /en/ 사용.
 * EN 카드 번호 = JP 카드 번호 (XY2 등 대응 세트는 번호 일치 확인됨).
 * CP 세트는 EN 대응 없으므로 tcgdex EN 에서 별도 처리 안함.
 *
 * 매칭 전략: EN tcgdex localId(number) → JP DB CardLocale.number → LogicalCard
 *
 * Run: npx tsx scripts/enrich-xy-meta-tcgdex.ts [--set=xy2]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// EN tcgdex set ID → JP DB set code (uppercase)
// Only sets where JP cards exist in DB and EN numbers match JP numbers
const TARGET_SETS = [
  { tcgId: "xy1",  dbCode: "XY1a", tcgNote: "EN xy1 maps to JP XY1a+XY1b; enrich XY1a only (overlap by number)" },
  { tcgId: "xy1",  dbCode: "XY1b", tcgNote: "XY1b numbers 001-063 same pool as XY1a from EN perspective" },
  { tcgId: "xy2",  dbCode: "XY2"  },
  { tcgId: "xy3",  dbCode: "XY3"  },
  { tcgId: "xy4",  dbCode: "XY4"  },
  { tcgId: "xy5",  dbCode: "XY5a", tcgNote: "EN xy5 Primal Clash maps to JP XY5a TidalStorm" },
  { tcgId: "xy6",  dbCode: "XY6"  },
  { tcgId: "xy7",  dbCode: "XY7"  },
  { tcgId: "xy8",  dbCode: "XY8a", tcgNote: "EN xy8 BREAKthrough maps to JP XY8a+XY8b; enrich both" },
  { tcgId: "xy8",  dbCode: "XY8b"  },
  { tcgId: "xy9",  dbCode: "XY9"  },
  { tcgId: "xy10", dbCode: "XY10" },
  { tcgId: "xy11", dbCode: "XY11a" },
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
    "LevelUp": "Level-Up",
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

// Cache EN set card lists to avoid double-fetching for sets shared across two JP sets (xy1, xy8)
const setCardCache = new Map<string, CardSummary[]>();

async function getSetCards(tcgId: string): Promise<CardSummary[]> {
  if (setCardCache.has(tcgId)) return setCardCache.get(tcgId)!;
  const sum = await fetchJson<{ cards: CardSummary[] }>(`https://api.tcgdex.net/v2/en/sets/${tcgId}`);
  const cards = sum?.cards ?? [];
  setCardCache.set(tcgId, cards);
  return cards;
}

async function main() {
  const source = await prisma.externalSource.upsert({
    where: { code: "tcgdex" },
    create: { code: "tcgdex", name: "TCGdex API", kind: "catalog", region: "GLOBAL", baseUrl: "https://api.tcgdex.net/v2", priority: 80 },
    update: {},
  });

  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg
    ? TARGET_SETS.filter(s => s.dbCode.toLowerCase() === arg.slice("--set=".length).toLowerCase())
    : TARGET_SETS;

  const unmatched = new Set<string>();
  let enriched = 0, skipped = 0, missing = 0, totalMap = 0;

  for (const { tcgId, dbCode } of setsToRun) {
    const jpSetId = `jp-tcg-${dbCode}`;
    console.log(`\n─── tcgId:${tcgId} → DB:${jpSetId} ───`);

    const cards = await getSetCards(tcgId);
    console.log(`  EN set cards: ${cards.length}`);

    if (cards.length === 0) {
      console.log("  ⚠ 카드 목록 비어있음 — SKIP");
      continue;
    }

    for (const c of cards) {
      // Match by number (not padded in DB for XY)
      const number = c.localId; // e.g. "1", "2", ...
      const ourLocaleId = `${jpSetId}-${number}`;
      const ourLogicalId = `lc-orphan-${ourLocaleId}`;

      const lc = await prisma.logicalCard.findUnique({ where: { id: ourLogicalId } });
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
        await prisma.logicalCard.update({ where: { id: ourLogicalId }, data: update });
        enriched++;
      } else skipped++;

      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId: `${c.id}::jp-${dbCode}` } },
        create: {
          sourceId: source.id,
          externalId: `${c.id}::jp-${dbCode}`,
          logicalCardId: ourLogicalId,
          cardLocaleId: ourLocaleId,
          url: `https://api.tcgdex.net/v2/en/cards/${c.id}`,
          verifiedBy: "auto:enrich-xy-meta-tcgdex",
          confidence: 0.90,
          notes: `EN tcgdex ${c.id} mapped to JP ${dbCode} by number ${number}`,
        },
        update: { logicalCardId: ourLogicalId, cardLocaleId: ourLocaleId },
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
