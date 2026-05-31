/**
 * KR m1l/m1s → JP mega-brave-symphonia 그룹화 (M1L/M1S 구분).
 *
 * 동작:
 *   1) kr-m1l 각 카드(numberInt=N) → JP 'jp-mega-brave-symphonia-M1L-*' AND numberInt=N 의 logicalCard re-point.
 *   2) kr-m1s 각 카드(numberInt=N) → JP 'jp-mega-brave-symphonia-M1S-*' AND numberInt=N 의 logicalCard re-point.
 *   3) 이름 일치 검증: KR 카드명(일본어) ≠ JP 카드명이면 skip+리포트.
 *   4) re-point 후 자식 0 + 의존행 0 인 고아 LogicalCard 삭제.
 *   멱등: 이미 JP sibling 있는 KR 카드는 제외.
 *
 * 실행:
 *   npx tsx scripts/group-m1-kr.ts --dry-run
 *   npx tsx scripts/group-m1-kr.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");
const CHUNK = 500;

type Row = {
  kr_locale_id: string;
  kr_lc: string;
  target_lc: string;
  kr_name: string;
  jp_name: string;
};

async function buildMap(krSetId: string, jpPrefix: string): Promise<Row[]> {
  // Find KR orphans (no JP sibling yet) for this set
  // Join to JP CardLocale by numberInt where id starts with jpPrefix
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `
    SELECT
      kr.id            AS kr_locale_id,
      kr."logicalCardId" AS kr_lc,
      jp."logicalCardId" AS target_lc,
      kr.name          AS kr_name,
      jp.name          AS jp_name
    FROM "CardLocale" kr
    JOIN "CardLocale" jp
      ON jp."setId" = 'jp-mega-brave-symphonia'
     AND jp.id LIKE $1
     AND jp."numberInt" = kr."numberInt"
    WHERE kr."setId" = $2
      AND kr."numberInt" IS NOT NULL
      -- only orphans (no JP sibling yet)
      AND NOT EXISTS (
        SELECT 1 FROM "CardLocale" sib
        WHERE sib."logicalCardId" = kr."logicalCardId"
          AND sib.region = 'JP'
      )
    `,
    jpPrefix + "%",
    krSetId
  );
  return rows;
}

async function main() {
  const t0 = Date.now();

  // Build maps for M1L and M1S
  const m1lRows = await buildMap("kr-m1l", "jp-mega-brave-symphonia-M1L-");
  const m1sRows = await buildMap("kr-m1s", "jp-mega-brave-symphonia-M1S-");

  console.log(`[plan] kr-m1l 후보: ${m1lRows.length}, kr-m1s 후보: ${m1sRows.length}`);

  // Safety check: name match (both Japanese, should be identical)
  const nameSkipM1l: Row[] = [];
  const nameSkipM1s: Row[] = [];
  const validM1l = m1lRows.filter((r) => {
    if (r.kr_name !== r.jp_name) { nameSkipM1l.push(r); return false; }
    return true;
  });
  const validM1s = m1sRows.filter((r) => {
    if (r.kr_name !== r.jp_name) { nameSkipM1s.push(r); return false; }
    return true;
  });

  if (nameSkipM1l.length) {
    console.warn(`⚠ kr-m1l 이름 불일치 SKIP ${nameSkipM1l.length}건:`);
    nameSkipM1l.forEach((r) => console.warn(`  ${r.kr_locale_id}: KR="${r.kr_name}" JP="${r.jp_name}"`));
  }
  if (nameSkipM1s.length) {
    console.warn(`⚠ kr-m1s 이름 불일치 SKIP ${nameSkipM1s.length}건:`);
    nameSkipM1s.forEach((r) => console.warn(`  ${r.kr_locale_id}: KR="${r.kr_name}" JP="${r.jp_name}"`));
  }

  console.log(`[plan] 확인 후 연결 대상: kr-m1l=${validM1l.length}, kr-m1s=${validM1s.length}`);

  if (DRY) {
    console.log("[dry-run] 쓰기 없음. 샘플(M1L 5건):");
    validM1l.slice(0, 5).forEach((r) => console.log(`  ${r.kr_locale_id} : ${r.kr_lc} → ${r.target_lc}  name="${r.kr_name}"`));
    console.log("샘플(M1S 5건):");
    validM1s.slice(0, 5).forEach((r) => console.log(`  ${r.kr_locale_id} : ${r.kr_lc} → ${r.target_lc}  name="${r.kr_name}"`));
    await prisma.$disconnect();
    return;
  }

  // 1) re-point
  const allValid = [...validM1l, ...validM1s];
  let repointed = 0;
  for (let i = 0; i < allValid.length; i += CHUNK) {
    const slice = allValid.slice(i, i + CHUNK);
    const ids = slice.map((r) => r.kr_locale_id);
    const targets = slice.map((r) => r.target_lc);
    const n = await prisma.$executeRawUnsafe(
      `UPDATE "CardLocale" cl SET "logicalCardId" = m.target
       FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS target) m
       WHERE cl.id = m.id`,
      ids,
      targets
    );
    repointed += n;
    process.stdout.write(`  re-point ... ${repointed}/${allValid.length}\r`);
  }
  console.log(`\n  re-point 완료: ${repointed}`);

  // 2) 빈 껍데기 LogicalCard 삭제
  const oldLcs = [...new Set(allValid.map((r) => r.kr_lc))];
  let deleted = 0;
  for (let i = 0; i < oldLcs.length; i += CHUNK) {
    const slice = oldLcs.slice(i, i + CHUNK);
    const n = await prisma.$executeRawUnsafe(
      `DELETE FROM "LogicalCard" lc
       WHERE lc.id = ANY($1::text[])
         AND NOT EXISTS (SELECT 1 FROM "CardLocale"       x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "CollectionItem"   x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "Trade"            x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "CardText"         x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "TierEntry"        x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "DeckCard"         x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "Ruling"           x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "ExternalIdMapping" x WHERE x."logicalCardId"=lc.id)`,
      slice
    );
    deleted += n;
  }
  console.log(`  고아 LogicalCard 삭제: ${deleted}`);

  // 3) 검증
  const orphanLeft = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`
    SELECT count(*) c FROM "CardLocale" kr
    WHERE kr."setId" IN ('kr-m1l','kr-m1s')
      AND NOT EXISTS (
        SELECT 1 FROM "CardLocale" s
        WHERE s."logicalCardId"=kr."logicalCardId" AND s.region='JP'
      )`);

  console.log("\n=== M1 KR GROUP SUMMARY ===");
  console.log({
    durationSec: ((Date.now() - t0) / 1000).toFixed(1),
    repointed,
    deletedOrphanLogicalCards: deleted,
    nameSkipM1l: nameSkipM1l.length,
    nameSkipM1s: nameSkipM1s.length,
    krM1l_validMapped: validM1l.length,
    krM1s_validMapped: validM1s.length,
    krM1lM1s_stillOrphan: Number(orphanLeft[0].c),
  });

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
