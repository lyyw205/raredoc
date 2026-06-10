// ── P4a: art메타(rarityId·subtypes) LogicalCard → CardLocale 기계복제 ───────────
// 인쇄본별 art메타 하강. 정정 0(region rarity 정정은 P5.5). 1 LC=1 print-family라 한 LC의
// 모든 locale에 부모 동일값 복사(충돌 없음). 멱등(재실행 무해). 가역(P5 전 컬럼 DROP 가능).
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p4a-artmeta-cardlocale.ts [--apply]
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
const APPLY = process.argv.includes("--apply");
const c = async (sql: string) => Number(((await prisma.$queryRawUnsafe(sql)) as any[])[0]?.c ?? 0);

async function main() {
  console.log(`【P4a art메타→CardLocale】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  const totalCL = await c(`SELECT count(*)::int c FROM "CardLocale"`);
  // 부모 LC가 rarityId/subtypes 보유한 CL 규모(복사 대상)
  const parentRarity = await c(`SELECT count(*)::int c FROM "CardLocale" cl JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId" WHERE lc."rarityId" IS NOT NULL`);
  const parentSub = await c(`SELECT count(*)::int c FROM "CardLocale" cl JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId" WHERE array_length(lc.subtypes,1) > 0`);
  console.log(`  CardLocale ${totalCL} · 부모 rarity보유 ${parentRarity} · 부모 subtypes보유 ${parentSub}`);

  if (!APPLY) {
    // 현재 채워진 정도(재실행 시 멱등 확인용)
    const filledR = await c(`SELECT count(*)::int c FROM "CardLocale" WHERE "rarityId" IS NOT NULL`);
    console.log(`  현재 CL.rarityId 채워짐 ${filledR} → 적용 후 ${parentRarity} 예상`);
    console.log("  (dry-run — 변경 0. --apply 로 적용)");
    await prisma.$disconnect(); return;
  }

  // 일괄 복제: CardLocale.rarityId/subtypes = 부모 LogicalCard 값
  const n = await prisma.$executeRawUnsafe(
    `UPDATE "CardLocale" cl SET "rarityId" = lc."rarityId", "subtypes" = lc."subtypes"
     FROM "LogicalCard" lc WHERE lc.id = cl."logicalCardId"`);
  console.log(`  ✅ 복제 ${n} CardLocale`);

  // 검증: CardLocale ≠ 부모 (rarity/subtypes 불일치 = 0 이어야 정상)
  const mmR = await c(`SELECT count(*)::int c FROM "CardLocale" cl JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId" WHERE cl."rarityId" IS DISTINCT FROM lc."rarityId"`);
  const mmS = await c(`SELECT count(*)::int c FROM "CardLocale" cl JOIN "LogicalCard" lc ON lc.id=cl."logicalCardId" WHERE cl.subtypes <> lc.subtypes`);
  const filledR = await c(`SELECT count(*)::int c FROM "CardLocale" WHERE "rarityId" IS NOT NULL`);
  console.log(`  검증 — rarity 불일치 ${mmR}(0기대) · subtypes 불일치 ${mmS}(0기대) · CL.rarityId 채워짐 ${filledR}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
