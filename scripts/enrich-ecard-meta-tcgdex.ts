/**
 * E1~5, VS1, web1 (e-Card era + 그 전후, 2001~2002) LogicalCard 메타를 tcgdex 에서 보강.
 * 이미지는 이미 tcgplayer-cdn 으로 채워져 있어 건너뜀.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const TARGET_SETS = ["e1","e2","e3","e4","e5","vs1","web1"];

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
  const source = await prisma.externalSource.upsert({
    where: { code: "tcgdex" },
    create: { code: "tcgdex", name: "TCGdex API", kind: "catalog", region: "GLOBAL", baseUrl: "https://api.tcgdex.net/v2", priority: 80 },
    update: {},
  });
  const unmatched = new Set<string>();
  let enriched = 0, skipped = 0, missing = 0, totalMap = 0;

  for (const setId of TARGET_SETS) {
    console.log(`─── ${setId} ───`);
    const sum = await fetchJson<{ cards: CardSummary[] }>(`https://api.tcgdex.net/v2/ja/sets/${setId}`);
    if (!sum) { console.log("  set fetch fail"); continue; }
    console.log(`  ${sum.cards.length} 카드`);

    for (const c of sum.cards) {
      // DB 의 setId 는 uppercase (E1, VS1, web1). tcgdex c.id 는 lowercase (e1-001).
      // 우리 LogicalCard id 패턴: lc-orphan-jp-tcg-{DB SetId}-{localId} 인지 확인 필요.
      // PMCG/NEO 패턴 따라가면 cardPack 의 DB setId 와 일치해야 함.
      // 실제 DB 카드 ID 패턴: jp-tcg-E1-001 (uppercase). 그래서 setId 변환.
      const dbSetCode = setId === "vs1" ? "VS1" : setId === "web1" ? "web1" : setId.toUpperCase();
      const ourLocaleId = `jp-tcg-${dbSetCode}-${c.localId.padStart(3, "0")}`;
      const ourLogicalId = `lc-orphan-${ourLocaleId}`;
      const lc = await prisma.logicalCard.findUnique({ where: { id: ourLogicalId } });
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
        await prisma.logicalCard.update({ where: { id: ourLogicalId }, data: update });
        enriched++;
      } else skipped++;

      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId: c.id } },
        create: {
          sourceId: source.id, externalId: c.id,
          logicalCardId: ourLogicalId, regionCardId: ourLocaleId,
          url: `https://api.tcgdex.net/v2/ja/cards/${c.id}`,
          verifiedBy: "auto:enrich-ecard-meta-tcgdex", confidence: 0.95,
        },
        update: { logicalCardId: ourLogicalId, regionCardId: ourLocaleId },
      });
      totalMap++;
    }
  }
  console.log(`\n── 결과 ──`);
  console.log(`  enriched: ${enriched}, skipped: ${skipped}, LogicalCard 누락: ${missing}, ExternalIdMapping: ${totalMap}`);
  if (unmatched.size > 0) {
    console.log(`  매칭 안된 rarity (${unmatched.size}):`);
    for (const r of unmatched) console.log(`    "${r}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
