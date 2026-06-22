// ── P9 긴급 복구: attacksKo·abilitiesKo 드롭 되돌림 ────────────────────────────────
// 사고: 배포(master) Prisma 클라이언트가 loadCardByLocaleId 에서 card:{include}(broad)로
//   모든 Card 스칼라(attacksKo/abilitiesKo 포함)를 SELECT 하는데, 운영 DB 에서 그 컬럼을
//   드롭(b25cc4c)하여 라이브 카드상세/검색 쿼리가 깨짐. expand-contract 위반(코드 배포 前 드롭).
// 복구: 컬럼 재추가(nullable) + _snap_p5_LogicalCard 에서 데이터 복원 → 배포 클라이언트 SELECT 회복.
//   재드롭은 브랜치(컬럼 미참조 클라이언트) 배포 後로 연기.
// 실행: npx tsx scripts/migration/p9-revert-attacksko-drop.ts --apply
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

async function colExists(col: string): Promise<boolean> {
  const r = (await prisma.$queryRawUnsafe(
    `SELECT count(*)::int c FROM information_schema.columns WHERE table_name='LogicalCard' AND column_name=$1`, col,
  )) as { c: number }[];
  return Number(r[0]?.c ?? 0) > 0;
}
async function q(sql: string): Promise<number> {
  const r = (await prisma.$queryRawUnsafe(sql)) as { c: number }[];
  return Number(r[0]?.c ?? 0);
}

async function main() {
  console.log(`\n════ P9 REVERT (attacksKo·abilitiesKo 재추가) ${APPLY ? "★APPLY" : "(dry-run)"} ════\n`);
  const [hasAtk, hasAbi] = [await colExists("attacksKo"), await colExists("abilitiesKo")];
  console.log(`  현재: attacksKo=${hasAtk} · abilitiesKo=${hasAbi}`);
  if (hasAtk && hasAbi) { console.log("  이미 둘 다 존재 — no-op."); await prisma.$disconnect(); return; }

  if (!(await colExists("attacksKo") && await colExists("abilitiesKo"))) {
    // 스냅샷 존재 확인(데이터 복원원)
    const snap = await q(`SELECT (to_regclass('"_snap_p5_LogicalCard"') IS NOT NULL)::int c`);
    if (!snap) { console.error("🔴 _snap_p5_LogicalCard 없음 — 데이터 복원 불가(빈 컬럼만 재추가됨)."); }
  }

  if (!APPLY) {
    console.log(`\n[dry-run] ALTER TABLE "LogicalCard" ADD COLUMN IF NOT EXISTS "attacksKo" JSONB, ADD COLUMN IF NOT EXISTS "abilitiesKo" JSONB;`);
    console.log(`          UPDATE ... FROM "_snap_p5_LogicalCard" (데이터 복원)`);
    await prisma.$disconnect(); return;
  }

  // 1) 컬럼 재추가(멱등)
  await prisma.$executeRawUnsafe(`ALTER TABLE "LogicalCard" ADD COLUMN IF NOT EXISTS "attacksKo" JSONB, ADD COLUMN IF NOT EXISTS "abilitiesKo" JSONB`);
  console.log("  ✅ 컬럼 재추가(nullable).");

  // 2) 스냅샷에서 데이터 복원(survivor 만; 비대표는 collapse 로 삭제됨)
  const restored = await prisma.$executeRawUnsafe(
    `UPDATE "LogicalCard" lc SET "attacksKo"=s."attacksKo", "abilitiesKo"=s."abilitiesKo"
     FROM "_snap_p5_LogicalCard" s WHERE lc.id=s.id
       AND (s."attacksKo" IS NOT NULL OR s."abilitiesKo" IS NOT NULL)`,
  );
  console.log(`  ✅ 데이터 복원 ${restored}행(스냅샷 기준).`);

  const atkN = await q(`SELECT count(*)::int c FROM "LogicalCard" WHERE "attacksKo" IS NOT NULL`);
  const abiN = await q(`SELECT count(*)::int c FROM "LogicalCard" WHERE "abilitiesKo" IS NOT NULL`);
  console.log(`\n  복원 후: attacksKo NOT NULL ${atkN} · abilitiesKo NOT NULL ${abiN}`);
  console.log(`  다음: schema.prisma 에 컬럼 재추가 + prisma generate (브랜치 일치). 라이브 회복 확인.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
