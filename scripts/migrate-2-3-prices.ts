/**
 * Phase 2.3 — Price 백필.
 *
 * 멱등 (재실행 안전 — 모든 Price.id 기준 update).
 *
 * 실행: npm run migrate:prices
 *
 * 규칙:
 *  - 모든 Price row:
 *    cardLocaleId = cardId   (CardLocale.id == 기존 Card.id 호환)
 *    sourceId     = PriceSource where code="tcgplayer" (현재 모든 Price.source="tcgplayer")
 *    condition    = "NM" (원본 정보 없음)
 *    gradingCompany/grade = null (그대로 둠)
 *
 *  - source != "tcgplayer" 인 row 가 발견되면 그 source 코드를 룩업해 sourceId 채움 (안전 fallback).
 *
 *  - 멱등: 트랜잭션 단위로 update.
 */
import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { prisma } from "@/lib/prisma";

async function withRetry<T>(fn: () => Promise<T>, label: string, max = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const msg = (e as Error)?.message ?? "";
      if (/max clients|too many connections|connection terminated|ECONNRESET|timeout/i.test(msg)) {
        const wait = 500 * Math.pow(2, i);
        console.warn(`[retry ${label}] ${msg} — waiting ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function main() {
  const t0 = Date.now();

  const priceSources = await prisma.priceSource.findMany({ select: { id: true, code: true } });
  const sourceMap = new Map(priceSources.map((s) => [s.code.toLowerCase(), s.id]));
  console.log("[init] PriceSource codes:", [...sourceMap.keys()]);
  const defaultSourceId = sourceMap.get("tcgplayer");
  if (!defaultSourceId) {
    throw new Error("PriceSource 'tcgplayer' not found. Seed prices first.");
  }

  const totalPrice = await prisma.price.count();
  console.log(`[init] Price rows = ${totalPrice}`);

  // 사전: source 별 분포
  const dist = await prisma.price.groupBy({ by: ["source"], _count: { _all: true } });
  console.log("[init] PRICE source dist:", dist);

  // 모든 cardLocaleId 존재 검증 — cardId 들이 CardLocale 에 다 있는지
  const missingLocale = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(`
    SELECT COUNT(*)::bigint as cnt
    FROM "Price" p
    LEFT JOIN "CardLocale" cl ON cl."id" = p."cardId"
    WHERE cl."id" IS NULL
  `);
  console.log("[init] Price rows whose cardId has NO matching CardLocale:", Number(missingLocale[0].cnt));

  // Bulk SQL: 모든 source 별로 sourceId 일괄 갱신 + cardLocaleId = cardId, condition = 'NM'.
  // 멱등 — 매 실행마다 같은 결과로 수렴.
  let updated = 0;
  let unknownSource = 0;
  for (const [code, srcId] of sourceMap.entries()) {
    const res = await withRetry(
      () => prisma.$executeRawUnsafe(
        `UPDATE "Price"
         SET "cardLocaleId" = "cardId",
             "sourceId" = $1,
             "condition" = COALESCE("condition", 'NM')
         WHERE LOWER("source") = $2`,
        srcId,
        code,
      ),
      `bulk update ${code}`,
    );
    console.log(`[bulk] source=${code} updated=${res}`);
    updated += res;
  }

  // 알 수 없는 source 가 남아 있는지: sourceId 가 여전히 NULL 인 row → defaultSourceId(tcgplayer) 로 채움.
  const unknownRes = await withRetry(
    () => prisma.$executeRawUnsafe(
      `UPDATE "Price"
       SET "cardLocaleId" = "cardId",
           "sourceId" = $1,
           "condition" = COALESCE("condition", 'NM')
       WHERE "sourceId" IS NULL`,
      defaultSourceId,
    ),
    `fallback unknown source`,
  );
  unknownSource = unknownRes;
  if (unknownRes > 0) console.log(`[bulk] unknown-source fallback (→ tcgplayer): ${unknownRes}`);

  // 검증: 모든 Price row 에 cardLocaleId/sourceId NOT NULL
  const checkNull = await prisma.$queryRawUnsafe<Array<{ nullLocale: bigint; nullSource: bigint }>>(`
    SELECT
      COUNT(*) FILTER (WHERE "cardLocaleId" IS NULL)::bigint as "nullLocale",
      COUNT(*) FILTER (WHERE "sourceId" IS NULL)::bigint as "nullSource"
    FROM "Price"
  `);
  const verify = checkNull[0];

  console.log("\n=== MIGRATE 2.3 PRICES — SUMMARY ===");
  console.log({
    durationSec: ((Date.now() - t0) / 1000).toFixed(1),
    pricesProcessed: updated,
    totalPrice: totalPrice,
    nullCardLocaleId: Number(verify.nullLocale),
    nullSourceId: Number(verify.nullSource),
    unknownSourceFallbacked: unknownSource,
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
