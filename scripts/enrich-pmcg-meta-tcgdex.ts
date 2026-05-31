/**
 * PMCG1~6 (구판, 1996~1999 일본판) 의 LogicalCard 메타를 tcgdex API 에서 보강.
 *
 * - 채우는 필드: hp, types, subtypes(stage), attacks(JSON), retreatCost,
 *   pokedexNumbers(dexId), illustrator, legalities, rarityId (Rarity.nameEn 매치).
 * - 정책: 기존 값이 비어있을 때만 채움. 덮어쓰지 않음.
 * - 매핑: ExternalIdMapping(source=tcgdex, externalId=PMCG{n}-{localId}, logicalCardId).
 *
 * 호출 빈도: 카드당 1 GET. 457 카드 × ~200ms = 약 90초. 사이사이 100ms 슬립.
 *
 * 실행: `npx tsx scripts/enrich-pmcg-meta-tcgdex.ts [--set=PMCG1]`
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const TARGET_SETS = ["PMCG1", "PMCG2", "PMCG3", "PMCG4", "PMCG5", "PMCG6"];

type TcgdexCardSummary = { id: string; localId: string; name: string };
type TcgdexCardDetail = {
  id: string;
  localId: string;
  name: string;
  category?: string;
  illustrator?: string | null;
  rarity?: string | null;
  hp?: number | null;
  types?: string[];
  stage?: string | null;
  attacks?: { cost?: string[]; name: string; effect?: string; damage?: string | number }[];
  retreat?: number | null;
  dexId?: number[];
  legal?: { standard?: boolean; expanded?: boolean };
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  evolveFrom?: string | null;
  abilities?: { name: string; effect: string; type: string }[];
};

import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

// WSL 환경에서 node fetch/https 가 tcgdex 에 ETIMEDOUT.
// curl 은 정상 동작이라 curl 로 shell out.
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const { stdout } = await execFileP("curl", ["-sSL", "--max-time", "20", url]);
    if (!stdout) return null;
    return JSON.parse(stdout) as T;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mapStageToSubtypes(stage: string | null | undefined): string[] {
  if (!stage) return [];
  const m: Record<string, string> = {
    Basic: "Basic",
    Stage1: "Stage 1",
    Stage2: "Stage 2",
    "Stage 1": "Stage 1",
    "Stage 2": "Stage 2",
  };
  return [m[stage] ?? stage];
}

function formatTypeValue(rows?: { type: string; value: string }[]): string | null {
  if (!rows || rows.length === 0) return null;
  return `${rows[0].type} ${rows[0].value}`.trim();
}

async function getRarityIdByName(nameEn: string): Promise<string | null> {
  // 정확 매치 우선, 없으면 code 매치, 없으면 null
  const byName = await prisma.rarity.findFirst({ where: { nameEn } });
  if (byName) return byName.id;
  const byCode = await prisma.rarity.findFirst({ where: { code: nameEn } });
  return byCode?.id ?? null;
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--set="));
  const setsToRun = arg ? [arg.slice("--set=".length).toUpperCase()] : TARGET_SETS;
  console.log(`대상 세트: ${setsToRun.join(", ")}\n`);

  // tcgdex 출처 row 확보
  const source = await prisma.externalSource.upsert({
    where: { code: "tcgdex" },
    create: {
      code: "tcgdex",
      name: "TCGdex API",
      kind: "catalog",
      region: "GLOBAL",
      baseUrl: "https://api.tcgdex.net/v2",
      priority: 80,
    },
    update: {},
  });

  const unmatchedRarities = new Set<string>();
  let totalEnriched = 0;
  let totalMappings = 0;
  let totalSkipped = 0;
  let totalMissingLc = 0;

  for (const setId of setsToRun) {
    console.log(`─── ${setId} ───`);
    const setSummary = await fetchJson<{ cards: TcgdexCardSummary[] }>(
      `https://api.tcgdex.net/v2/ja/sets/${setId}`
    );
    if (!setSummary) {
      console.log(`  set fetch 실패`);
      continue;
    }
    console.log(`  ${setSummary.cards.length} 카드`);

    for (const c of setSummary.cards) {
      const ourLocaleId = `jp-tcg-${c.id}`;
      const ourLogicalId = `lc-orphan-${ourLocaleId}`;

      const lc = await prisma.logicalCard.findUnique({ where: { id: ourLogicalId } });
      if (!lc) {
        totalMissingLc++;
        continue;
      }

      const detail = await fetchJson<TcgdexCardDetail>(
        `https://api.tcgdex.net/v2/ja/cards/${c.id}`
      );
      await sleep(80);
      if (!detail) {
        console.log(`  ⚠ ${c.id} 상세 실패`);
        continue;
      }

      // 매핑 규칙: 비어있을 때만 채움
      const update: Record<string, unknown> = {};
      if (lc.hp == null && detail.hp != null) update.hp = detail.hp;
      if (lc.types.length === 0 && detail.types?.length) update.types = detail.types;
      if (lc.subtypes.length === 0 && detail.stage) update.subtypes = mapStageToSubtypes(detail.stage);
      if (lc.pokedexNumbers.length === 0 && detail.dexId?.length) update.pokedexNumbers = detail.dexId;
      if (lc.retreatCost == null && detail.retreat != null) update.retreatCost = detail.retreat;
      if (lc.illustrator == null && detail.illustrator) update.illustrator = detail.illustrator;
      if (lc.evolvesFrom == null && detail.evolveFrom) update.evolvesFrom = detail.evolveFrom;
      if (lc.supertype == null && detail.category) update.supertype = detail.category;
      if (lc.attacks == null && detail.attacks?.length) update.attacks = detail.attacks as never;
      if (lc.abilities == null && detail.abilities?.length) update.abilities = detail.abilities as never;
      if (lc.legalities == null && detail.legal) update.legalities = detail.legal as never;
      if (lc.weakness == null) {
        const w = formatTypeValue(detail.weaknesses);
        if (w) update.weakness = w;
      }
      if (lc.resistance == null) {
        const r = formatTypeValue(detail.resistances);
        if (r) update.resistance = r;
      }
      if (lc.rarityId == null && detail.rarity) {
        const rid = await getRarityIdByName(detail.rarity);
        if (rid) update.rarityId = rid;
        else unmatchedRarities.add(detail.rarity);
      }

      if (Object.keys(update).length > 0) {
        await prisma.logicalCard.update({ where: { id: ourLogicalId }, data: update });
        totalEnriched++;
      } else {
        totalSkipped++;
      }

      // ExternalIdMapping 등록 (idempotent)
      await prisma.externalIdMapping.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId: c.id } },
        create: {
          sourceId: source.id,
          externalId: c.id,
          logicalCardId: ourLogicalId,
          cardLocaleId: ourLocaleId,
          url: `https://api.tcgdex.net/v2/ja/cards/${c.id}`,
          verifiedBy: "auto:enrich-pmcg-meta-tcgdex",
          confidence: 0.95,
        },
        update: { logicalCardId: ourLogicalId, cardLocaleId: ourLocaleId },
      });
      totalMappings++;
    }
  }

  console.log(`\n── 결과 ──`);
  console.log(`  업데이트한 LogicalCard: ${totalEnriched}`);
  console.log(`  변경 없음 (이미 채워짐): ${totalSkipped}`);
  console.log(`  LogicalCard 누락: ${totalMissingLc}`);
  console.log(`  ExternalIdMapping 등록/갱신: ${totalMappings}`);
  if (unmatchedRarities.size > 0) {
    console.log(`  ⚠ 매칭 안된 rarity (${unmatchedRarities.size}):`);
    for (const r of unmatchedRarities) console.log(`     "${r}"`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
