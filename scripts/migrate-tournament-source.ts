/**
 * P0 백필 (1회성, 멱등) — docs/meta-pipeline-multisource.md §2
 *
 * 실행: npx tsx scripts/migrate-tournament-source.ts [--dry-run]
 *
 * 1. limitlessId 보유 Tournament → source/sourceId/metaRegion/level/externalUrl 채움
 *    (realOnly 판별이 limitlessId → source not null 로 교체되므로 선행 필수)
 * 2. DeckArchetype 본체 집계값(=INTL 의미 고정) → ArchetypeRegionStat(region="INTL") 복사
 *    - tournamentCount 는 standings 에서 deckKey 별 distinct tournament 수로 산출
 * 3. 기존 standings 의 playerUsername 은 sync 재실행 시 자연 백필 (여기선 건드리지 않음)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  // 1. Tournament source 백필
  const legacy = await prisma.tournament.findMany({
    where: { limitlessId: { not: null }, source: null },
    select: { id: true, limitlessId: true },
  });
  for (const t of legacy) {
    if (dryRun) {
      console.log(`[dry] tournament ${t.id} → source=limitless-play sourceId=${t.limitlessId}`);
      continue;
    }
    await prisma.tournament.update({
      where: { id: t.id },
      data: {
        source: "limitless-play",
        sourceId: t.limitlessId,
        metaRegion: "INTL",
        level: "online",
        externalUrl: `https://play.limitlesstcg.com/tournament/${t.limitlessId}`,
      },
    });
  }
  console.log(`[migrate] Tournament source 백필: ${legacy.length}건`);

  // 2. ArchetypeRegionStat(INTL) 미러 생성 — 본체 집계 컬럼 복사
  const archetypes = await prisma.deckArchetype.findMany({
    where: { sampleSize: { gt: 0 } }, // 실집계 행만 (목업 제외)
  });

  // tournamentCount: deckKey 별 distinct tournament (실데이터 대회 한정)
  const rows = await prisma.tournamentStanding.findMany({
    where: { deckKey: { not: null }, tournament: { limitlessId: { not: null } } },
    select: { deckKey: true, tournamentId: true },
  });
  const tcount = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.deckKey) continue;
    if (!tcount.has(r.deckKey)) tcount.set(r.deckKey, new Set());
    tcount.get(r.deckKey)!.add(r.tournamentId);
  }

  let statUpserts = 0;
  for (const a of archetypes) {
    const stat = {
      tier: a.tier,
      usageRate: a.usageRate,
      winCount: a.winCount,
      avgRank: a.avgRank,
      winRate: a.winRate,
      conversion: a.conversion,
      consistency: a.consistency,
      sampleSize: a.sampleSize,
      tournamentCount: tcount.get(a.id)?.size ?? 0,
      isUnderdog: a.isUnderdog,
      isTrap: a.isTrap,
      isMetaCounter: a.isMetaCounter,
    };
    if (dryRun) {
      console.log(`[dry] regionStat INTL ${a.id} sample=${stat.sampleSize} t=${stat.tournamentCount}`);
      continue;
    }
    await prisma.archetypeRegionStat.upsert({
      where: { archetypeId_region: { archetypeId: a.id, region: "INTL" } },
      create: { archetypeId: a.id, region: "INTL", ...stat },
      update: stat,
    });
    statUpserts++;
  }
  console.log(`[migrate] ArchetypeRegionStat(INTL): ${dryRun ? archetypes.length + " (dry)" : statUpserts}건`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
