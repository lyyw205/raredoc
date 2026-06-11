/**
 * L1a, L1b, L2, LL, L3 (HGSS era JP) LogicalCard 메타를 tcgdex 에서 보강.
 * tcgdex 보유: L1a=71, L1b=71, L2=19, LL=40, L3=81 (DB cardCount 기준 부분 커버).
 * 이미지는 tcgplayer-cdn 403이므로 skip. illustrator는 scrape-l-illustrator-bulbapedia.ts 에서.
 *
 * Run: npx tsx scripts/enrich-l-meta-tcgdex.ts [--set=L1a]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const TARGET_SETS = ["L1a", "L1b", "L2", "LL", "L3"];

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
    if (!stdout) return null;
    return JSON.parse(stdout) as T;
  } catch { return null; }
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function mapStageToSubtypes(stage: string | null | undefined): string[] {
  if (!stage) return [];
  const m: Record<string, string> = { Basic: "Basic", Stage1: "Stage 1", Stage2: "Stage 2", "Stage 1": "Stage 1", "Stage 2": "Stage 2" };
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

async function main() {
  const arg = process.argv.find(a => a.startsWith("--set="));
  const setsToRun = arg
    ? TARGET_SETS.filter(s => s.toLowerCase() === arg.slice("--set=".length).toLowerCase())
    : TARGET_SETS;

  const source = await prisma.externalSource.upsert({
    where: { code: "tcgdex" },
    create: { code: "tcgdex", name: "TCGdex API", kind: "catalog", region: "GLOBAL", baseUrl: "https://api.tcgdex.net/v2", priority: 80 },
    update: {},
  });

  const unmatched = new Set<string>();
  let totalEnriched = 0, totalSkipped = 0, totalMissing = 0;

  for (const setId of setsToRun) {
    console.log(`\n─── ${setId} ───`);
    const sum = await fetchJson<{ cards: CardSummary[] }>(`https://api.tcgdex.net/v2/ja/sets/${setId}`);
    if (!sum) { console.log("  set fetch fail"); continue; }
    console.log(`  tcgdex: ${sum.cards.length} cards`);

    let enriched = 0, skipped = 0, missing = 0;

    for (const c of sum.cards) {
      // DB setId is uppercase: L1a, L1b, L2, LL, L3
      // tcgdex localId e.g. "001" — our RegionCard id: jp-tcg-L1a-001 or jp-tcg-L1a-1
      const numPadded = c.localId.padStart(3, "0");
      const ourLocaleIdPadded = `jp-tcg-${setId}-${numPadded}`;
      const ourLocaleIdUnpadded = `jp-tcg-${setId}-${parseInt(c.localId, 10)}`;
      const ourLogicalIdPadded = `lc-orphan-${ourLocaleIdPadded}`;
      const ourLogicalIdUnpadded = `lc-orphan-${ourLocaleIdUnpadded}`;

      // Try padded first, then unpadded
      let lc = await prisma.logicalCard.findUnique({ where: { id: ourLogicalIdPadded } });
      if (!lc) lc = await prisma.logicalCard.findUnique({ where: { id: ourLogicalIdUnpadded } });
      if (!lc) {
        // Also try without lc-orphan prefix pattern (cards may use different id scheme)
        lc = await prisma.logicalCard.findFirst({ where: { primarySetId: `jp-tcg-${setId}`, primaryNumber: numPadded } });
      }
      if (!lc) { missing++; continue; }

      const d = await fetchJson<CardDetail>(`https://api.tcgdex.net/v2/ja/cards/${c.id}`);
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
      } else {
        skipped++;
      }

      // ExternalIdMapping
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId: c.id } },
        create: {
          sourceId: source.id,
          externalId: c.id,
          logicalCardId: lc.id,
          url: `https://api.tcgdex.net/v2/ja/cards/${c.id}`,
          verifiedBy: "auto:enrich-l-meta-tcgdex",
          confidence: 0.9,
        },
        update: { logicalCardId: lc.id },
      });
    }

    console.log(`  enriched=${enriched} skipped=${skipped} missing=${missing}`);
    totalEnriched += enriched; totalSkipped += skipped; totalMissing += missing;
  }

  if (unmatched.size > 0) console.log(`\n미매칭 rarity: ${[...unmatched].join(", ")}`);
  console.log(`\n══════ 결과 ══════`);
  console.log(`  enriched: ${totalEnriched}`);
  console.log(`  skipped:  ${totalSkipped}`);
  console.log(`  missing:  ${totalMissing}`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
