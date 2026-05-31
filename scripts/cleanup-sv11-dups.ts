/**
 * SV11 중복 세트 정리 — jp-tcg-SV11B · jp-tcg-SV11W · kr-sv-black-bolt-white-flare
 *
 * 이 세 세트는 jp-sv-black-bolt-white-flare 합본에 의해 대체된 이전 import 잔재.
 * 데이터 0(게임데이터 없음), setGroupId=null 또는 빈 KR 껍데기.
 *
 * 동작:
 *   1) 의존행(CollectionItem/Trade/CardText/TierEntry/DeckCard/Ruling/ExternalIdMapping) 0 확인
 *      — 참조 있으면 해당 카드 skip+리포트.
 *   2) 안전한 CardLocale 삭제 → 자식 0 + 의존행 0 인 LogicalCard 삭제 → Set 레코드 삭제.
 *   멱등: 이미 없으면 0건 처리.
 *
 * 실행:
 *   npx tsx scripts/cleanup-sv11-dups.ts --dry-run
 *   npx tsx scripts/cleanup-sv11-dups.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");
const TARGET_SETS = ["jp-tcg-SV11B", "jp-tcg-SV11W", "kr-sv-black-bolt-white-flare"];

async function main() {
  const t0 = Date.now();

  // 1) 전체 의존행 카운트 확인
  type DepRow = { set_id: string; dep_type: string; c: number };
  const deps = await prisma.$queryRawUnsafe<DepRow[]>(`
    SELECT cl."setId" set_id, 'CollectionItem' dep_type, count(*)::int c
      FROM "CardLocale" cl JOIN "CollectionItem" x ON x."logicalCardId"=cl."logicalCardId"
      WHERE cl."setId" = ANY($1::text[]) GROUP BY cl."setId"
    UNION ALL
    SELECT cl."setId", 'Trade', count(*)::int FROM "CardLocale" cl JOIN "Trade" x ON x."logicalCardId"=cl."logicalCardId"
      WHERE cl."setId" = ANY($1::text[]) GROUP BY cl."setId"
    UNION ALL
    SELECT cl."setId", 'CardText', count(*)::int FROM "CardLocale" cl JOIN "CardText" x ON x."logicalCardId"=cl."logicalCardId"
      WHERE cl."setId" = ANY($1::text[]) GROUP BY cl."setId"
    UNION ALL
    SELECT cl."setId", 'TierEntry', count(*)::int FROM "CardLocale" cl JOIN "TierEntry" x ON x."logicalCardId"=cl."logicalCardId"
      WHERE cl."setId" = ANY($1::text[]) GROUP BY cl."setId"
    UNION ALL
    SELECT cl."setId", 'DeckCard', count(*)::int FROM "CardLocale" cl JOIN "DeckCard" x ON x."logicalCardId"=cl."logicalCardId"
      WHERE cl."setId" = ANY($1::text[]) GROUP BY cl."setId"
    UNION ALL
    SELECT cl."setId", 'Ruling', count(*)::int FROM "CardLocale" cl JOIN "Ruling" x ON x."logicalCardId"=cl."logicalCardId"
      WHERE cl."setId" = ANY($1::text[]) GROUP BY cl."setId"
    UNION ALL
    SELECT cl."setId", 'ExternalIdMapping', count(*)::int FROM "CardLocale" cl JOIN "ExternalIdMapping" x ON x."logicalCardId"=cl."logicalCardId"
      WHERE cl."setId" = ANY($1::text[]) GROUP BY cl."setId"
  `, TARGET_SETS);

  const withDeps = deps.filter((d) => d.c > 0);
  if (withDeps.length > 0) {
    console.warn("⚠ 의존행 있는 세트 — 수동 확인 필요:");
    withDeps.forEach((d) => console.warn(`  ${d.set_id} / ${d.dep_type}: ${d.c}건`));
  } else {
    console.log("[check] 의존행 0 ✓ — 전체 삭제 안전");
  }

  // 2) 삭제 대상 카운트
  type CountRow = { set_id: string; c: number };
  const counts = await prisma.$queryRawUnsafe<CountRow[]>(
    `SELECT "setId" set_id, count(*)::int c FROM "CardLocale" WHERE "setId" = ANY($1::text[]) GROUP BY "setId"`,
    TARGET_SETS
  );
  console.log("[plan] 삭제 대상 CardLocale:");
  counts.forEach((r) => console.log(`  ${r.set_id}: ${r.c}장`));
  const totalCards = counts.reduce((s, r) => s + r.c, 0);
  console.log(`  합계: ${totalCards}장`);

  if (DRY) {
    console.log("[dry-run] 쓰기 없음.");
    await prisma.$disconnect();
    return;
  }

  // 3) 삭제 실행: 의존행 없는 세트만 처리
  const safeSets = withDeps.length > 0
    ? TARGET_SETS.filter((s) => !withDeps.some((d) => d.set_id === s))
    : TARGET_SETS;

  // CardLocale 의 logicalCardId 수집 (삭제 전)
  const lcs = await prisma.$queryRawUnsafe<{ lc: string }[]>(
    `SELECT DISTINCT "logicalCardId" lc FROM "CardLocale" WHERE "setId" = ANY($1::text[])`,
    safeSets
  );
  const lcIds = lcs.map((r) => r.lc);
  console.log(`  대상 LogicalCard: ${lcIds.length}`);

  // CardLocale 삭제
  const clDel = await prisma.$executeRawUnsafe(
    `DELETE FROM "CardLocale" WHERE "setId" = ANY($1::text[])`,
    safeSets
  );
  console.log(`  CardLocale 삭제: ${clDel}`);

  // LogicalCard 삭제 (자식 0 + 의존행 0 인 것만)
  let lcDel = 0;
  const CHUNK = 500;
  for (let i = 0; i < lcIds.length; i += CHUNK) {
    const slice = lcIds.slice(i, i + CHUNK);
    const n = await prisma.$executeRawUnsafe(
      `DELETE FROM "LogicalCard" lc
       WHERE lc.id = ANY($1::text[])
         AND NOT EXISTS (SELECT 1 FROM "CardLocale"        x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "CollectionItem"    x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "Trade"             x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "CardText"          x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "TierEntry"         x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "DeckCard"          x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "Ruling"            x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "ExternalIdMapping" x WHERE x."logicalCardId"=lc.id)`,
      slice
    );
    lcDel += n;
  }
  console.log(`  LogicalCard 삭제: ${lcDel}`);

  // Set 레코드 삭제
  const setDel = await prisma.$executeRawUnsafe(
    `DELETE FROM "Set" WHERE id = ANY($1::text[])`,
    safeSets
  );
  console.log(`  Set 레코드 삭제: ${setDel}`);

  console.log("\n=== CLEANUP SUMMARY ===");
  console.log({
    durationSec: ((Date.now() - t0) / 1000).toFixed(1),
    setsDeleted: setDel,
    cardLocalesDeleted: clDel,
    logicalCardsDeleted: lcDel,
    skippedSets: withDeps.length > 0 ? withDeps.map((d) => d.set_id) : [],
  });

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
