/**
 * SV11 KR/EN → JP black-bolt-white-flare 그룹화.
 *
 * 동작:
 *   1) kr-sv11b #N → JP id LIKE '%-SV11B-%' numberInt=N  (이름검증: KR=일본어, JP=일본어 → 일치 확인)
 *   2) kr-sv11w #N → JP id LIKE '%-SV11W-%' numberInt=N  (이름검증)
 *   3) zsv10pt5 #N → JP '%-SV11B-%' numberInt=N          (EN=영문명, 이름검증 불가 → numberInt만)
 *   4) rsv10pt5 #N → JP '%-SV11W-%' numberInt=N          (EN=영문명, numberInt만)
 *   5) re-point 후 고아 LogicalCard(자식0+의존행0) 삭제. 멱등.
 *
 * 실행:
 *   npx tsx scripts/group-sv11-kr-en.ts --dry-run
 *   npx tsx scripts/group-sv11-kr-en.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");
const CHUNK = 500;

type Row = {
  locale_id: string;
  old_lc: string;
  target_lc: string;
  src_name: string;
  jp_name: string;
};

/** KR 세트 — 이름 검증 포함 */
async function buildKrMap(krSetId: string, jpPrefix: string): Promise<{ valid: Row[]; skipped: Row[] }> {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `
    SELECT
      kr.id              AS locale_id,
      kr."logicalCardId" AS old_lc,
      jp."logicalCardId" AS target_lc,
      kr.name            AS src_name,
      jp.name            AS jp_name
    FROM "CardLocale" kr
    JOIN "CardLocale" jp
      ON jp."setId" = 'jp-sv-black-bolt-white-flare'
     AND jp.id LIKE $1
     AND jp."numberInt" = kr."numberInt"
    WHERE kr."setId" = $2
      AND kr."numberInt" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "CardLocale" sib
        WHERE sib."logicalCardId" = kr."logicalCardId" AND sib.region = 'JP'
      )
    `,
    jpPrefix + "%",
    krSetId
  );
  const valid: Row[] = [];
  const skipped: Row[] = [];
  for (const r of rows) {
    if (r.src_name !== r.jp_name) skipped.push(r);
    else valid.push(r);
  }
  return { valid, skipped };
}

/** EN 세트 — numberInt만 매칭, 이름검증 없음 */
async function buildEnMap(enSetId: string, jpPrefix: string): Promise<Row[]> {
  return prisma.$queryRawUnsafe<Row[]>(
    `
    SELECT
      en.id              AS locale_id,
      en."logicalCardId" AS old_lc,
      jp."logicalCardId" AS target_lc,
      en.name            AS src_name,
      jp.name            AS jp_name
    FROM "CardLocale" en
    JOIN "CardLocale" jp
      ON jp."setId" = 'jp-sv-black-bolt-white-flare'
     AND jp.id LIKE $1
     AND jp."numberInt" = en."numberInt"
    WHERE en."setId" = $2
      AND en."numberInt" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "CardLocale" sib
        WHERE sib."logicalCardId" = en."logicalCardId" AND sib.region = 'JP'
      )
    `,
    jpPrefix + "%",
    enSetId
  );
}

async function main() {
  const t0 = Date.now();

  const { valid: krBValid, skipped: krBSkip } = await buildKrMap("kr-sv11b", "jp-sv-black-bolt-white-flare-SV11B-");
  const { valid: krWValid, skipped: krWSkip } = await buildKrMap("kr-sv11w", "jp-sv-black-bolt-white-flare-SV11W-");
  const enBRows = await buildEnMap("zsv10pt5", "jp-sv-black-bolt-white-flare-SV11B-");
  const enWRows = await buildEnMap("rsv10pt5", "jp-sv-black-bolt-white-flare-SV11W-");

  console.log(`[plan] kr-sv11b valid=${krBValid.length} skip=${krBSkip.length}`);
  console.log(`[plan] kr-sv11w valid=${krWValid.length} skip=${krWSkip.length}`);
  console.log(`[plan] zsv10pt5(EN B) valid=${enBRows.length}`);
  console.log(`[plan] rsv10pt5(EN W) valid=${enWRows.length}`);

  if (krBSkip.length) {
    console.warn(`⚠ kr-sv11b 이름 불일치 SKIP ${krBSkip.length}건:`);
    krBSkip.forEach((r) => console.warn(`  ${r.locale_id}: KR="${r.src_name}" JP="${r.jp_name}"`));
  }
  if (krWSkip.length) {
    console.warn(`⚠ kr-sv11w 이름 불일치 SKIP ${krWSkip.length}건:`);
    krWSkip.forEach((r) => console.warn(`  ${r.locale_id}: KR="${r.src_name}" JP="${r.jp_name}"`));
  }

  if (DRY) {
    console.log("\n[dry-run] 쓰기 없음. 샘플:");
    console.log("kr-sv11b(5):", krBValid.slice(0, 5).map((r) => `${r.locale_id}→${r.target_lc} "${r.src_name}"`));
    console.log("kr-sv11w(5):", krWValid.slice(0, 5).map((r) => `${r.locale_id}→${r.target_lc} "${r.src_name}"`));
    console.log("zsv10pt5(5):", enBRows.slice(0, 5).map((r) => `${r.locale_id}→${r.target_lc} EN="${r.src_name}" JP="${r.jp_name}"`));
    console.log("rsv10pt5(5):", enWRows.slice(0, 5).map((r) => `${r.locale_id}→${r.target_lc} EN="${r.src_name}" JP="${r.jp_name}"`));
    await prisma.$disconnect();
    return;
  }

  const allValid = [...krBValid, ...krWValid, ...enBRows, ...enWRows];
  // filter out self-pointers (safety)
  const toUpdate = allValid.filter((r) => r.target_lc && r.target_lc !== r.old_lc);

  // 1) re-point
  let repointed = 0;
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const slice = toUpdate.slice(i, i + CHUNK);
    const ids = slice.map((r) => r.locale_id);
    const targets = slice.map((r) => r.target_lc);
    const n = await prisma.$executeRawUnsafe(
      `UPDATE "CardLocale" cl SET "logicalCardId" = m.target
       FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS target) m
       WHERE cl.id = m.id`,
      ids, targets
    );
    repointed += n;
    process.stdout.write(`  re-point ... ${repointed}/${toUpdate.length}\r`);
  }
  console.log(`\n  re-point 완료: ${repointed}`);

  // 2) 고아 LogicalCard 삭제
  const oldLcs = [...new Set(toUpdate.map((r) => r.old_lc))];
  let lcDel = 0;
  for (let i = 0; i < oldLcs.length; i += CHUNK) {
    const slice = oldLcs.slice(i, i + CHUNK);
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
  console.log(`  고아 LogicalCard 삭제: ${lcDel}`);

  // 3) 검증
  type ORow = { set_id: string; c: number };
  const orphLeft = await prisma.$queryRawUnsafe<ORow[]>(`
    SELECT cl."setId" set_id, count(*)::int c
    FROM "CardLocale" cl
    WHERE cl."setId" IN ('kr-sv11b','kr-sv11w','zsv10pt5','rsv10pt5')
      AND NOT EXISTS (
        SELECT 1 FROM "CardLocale" s
        WHERE s."logicalCardId"=cl."logicalCardId" AND s.region='JP'
      )
    GROUP BY cl."setId"
  `);

  console.log("\n=== SV11 GROUP SUMMARY ===");
  console.log({
    durationSec: ((Date.now() - t0) / 1000).toFixed(1),
    repointed,
    deletedOrphanLogicalCards: lcDel,
    krSv11bMapped: krBValid.length,
    krSv11wMapped: krWValid.length,
    enBlackBoltMapped: enBRows.length,
    enWhiteFlareMapped: enWRows.length,
    krSv11bSkip: krBSkip.length,
    krSv11wSkip: krWSkip.length,
    stillOrphan: orphLeft,
  });

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
