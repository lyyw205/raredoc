/**
 * Phase KR-그룹화 MERGE — 확신 매칭(jp_unique + en_unique)만 실제 연결.
 *
 * 동작:
 *   1) 고아 KR CardLocale 을 형제(JP 우선, 없으면 EN) LogicalCard 로 re-point.
 *   2) 그 결과 자식(CardLocale) 0개가 된 옛 고아 LogicalCard 삭제.
 *      (사전 확인: 고아 KR LogicalCard 의존행 0건 — collection/trade/cardtext/tier/deck/ruling/ext)
 *
 * 안전:
 *   - --dry-run : 매핑 건수만 출력, 쓰기 없음.
 *   - 멱등: 이미 형제에 연결된 KR(=비고아)은 대상에서 자동 제외 → 재실행 무해.
 *   - 삭제는 "CardLocale 0개 + 의존행 0개" 인 LogicalCard 로 한정(다중 KR locale 보호).
 *
 * 실행: npx tsx scripts/group-kr-merge.ts --dry-run
 *       npx tsx scripts/group-kr-merge.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DRY = process.argv.includes("--dry-run");
const CHUNK = 4000;

type Map = { kr_locale_id: string; kr_lc: string; target_lc: string };

async function main() {
  const t0 = Date.now();

  // 확신 매핑(kr_locale_id → target LogicalCard) 산출
  const map = await prisma.$queryRawUnsafe<Map[]>(`
    WITH kr AS (
      SELECT cl.id kr_locale_id, cl."logicalCardId" kr_lc, cl."numberInt" num, s."setGroupId" sg
      FROM "CardLocale" cl JOIN "Set" s ON s.id=cl."setId"
      WHERE cl.region='KR'
    ),
    orphan AS (
      SELECT kr.* FROM kr
      WHERE kr.sg IS NOT NULL AND kr.num IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "CardLocale" sib
                        WHERE sib."logicalCardId"=kr.kr_lc AND sib.region IN ('EN','JP'))
    ),
    cand AS (
      SELECT s."setGroupId" sg, cl."numberInt" num, cl."logicalCardId" lc, cl.region
      FROM "CardLocale" cl JOIN "Set" s ON s.id=cl."setId"
      WHERE cl.region IN ('EN','JP') AND cl."numberInt" IS NOT NULL AND s."setGroupId" IS NOT NULL
    ),
    agg AS (
      SELECT o.kr_locale_id, o.kr_lc,
        count(DISTINCT c.lc) distinct_sib,
        count(DISTINCT c.lc) FILTER (WHERE c.region='JP') jp_sib,
        (array_agg(DISTINCT c.lc) FILTER (WHERE c.region='JP'))[1] jp_lc,
        (array_agg(DISTINCT c.lc))[1] any_lc
      FROM orphan o JOIN cand c ON c.sg=o.sg AND c.num=o.num
      GROUP BY o.kr_locale_id, o.kr_lc
    )
    SELECT kr_locale_id, kr_lc,
      CASE WHEN jp_sib=1 THEN jp_lc
           WHEN jp_sib=0 AND distinct_sib=1 THEN any_lc END AS target_lc
    FROM agg
    WHERE (jp_sib=1) OR (jp_sib=0 AND distinct_sib=1)
  `);

  // target 이 자기자신이면(이론상) 제외
  const rows = map.filter((m) => m.target_lc && m.target_lc !== m.kr_lc);
  console.log(`[plan] 확신 연결 대상 KR CardLocale: ${rows.length}`);

  if (DRY) {
    console.log("[dry-run] 쓰기 없음. 샘플 5건:");
    for (const r of rows.slice(0, 5)) console.log(`  ${r.kr_locale_id} : ${r.kr_lc} → ${r.target_lc}`);
    await prisma.$disconnect();
    return;
  }

  // 1) re-point (unnest 배열 벌크 업데이트, 청크)
  let repointed = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const ids = slice.map((r) => r.kr_locale_id);
    const targets = slice.map((r) => r.target_lc);
    const n = await prisma.$executeRawUnsafe(
      `UPDATE "CardLocale" cl SET "logicalCardId" = m.target
       FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS target) m
       WHERE cl.id = m.id`,
      ids, targets
    );
    repointed += n;
    console.log(`  re-point ... ${repointed}/${rows.length}`);
  }

  // 2) 빈 껍데기 LogicalCard 삭제 (CardLocale 0 + 의존행 0 인 것만)
  const oldLcs = [...new Set(rows.map((r) => r.kr_lc))];
  let deleted = 0;
  for (let i = 0; i < oldLcs.length; i += CHUNK) {
    const slice = oldLcs.slice(i, i + CHUNK);
    const n = await prisma.$executeRawUnsafe(
      `DELETE FROM "LogicalCard" lc
       WHERE lc.id = ANY($1::text[])
         AND NOT EXISTS (SELECT 1 FROM "CardLocale" x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "CollectionItem" x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "Trade" x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "CardText" x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "TierEntry" x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "DeckCard" x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "Ruling" x WHERE x."logicalCardId"=lc.id)
         AND NOT EXISTS (SELECT 1 FROM "ExternalIdMapping" x WHERE x."logicalCardId"=lc.id)`,
      slice
    );
    deleted += n;
    console.log(`  delete-orphan ... ${deleted}`);
  }

  // 3) 검증
  const orphanLeft = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`
    SELECT count(*) c FROM "CardLocale" kr
    WHERE kr.region='KR' AND NOT EXISTS (
      SELECT 1 FROM "CardLocale" s WHERE s."logicalCardId"=kr."logicalCardId" AND s.region IN ('EN','JP'))`);
  const krWithGame = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`
    SELECT count(*) c FROM "CardLocale" kr JOIN "LogicalCard" lc ON lc.id=kr."logicalCardId"
    WHERE kr.region='KR' AND lc.hp IS NOT NULL`);

  console.log("\n=== KR MERGE SUMMARY ===");
  console.log({
    durationSec: ((Date.now() - t0) / 1000).toFixed(1),
    repointed, deletedOrphanLogicalCards: deleted,
    krCardLocale_stillOrphan: Number(orphanLeft[0].c),
    krCardLocale_nowWithGameData: Number(krWithGame[0].c),
  });
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
