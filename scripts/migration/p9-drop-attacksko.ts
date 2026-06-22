// ── P9 컬럼 드롭: Card.attacksKo·abilitiesKo (타겟 ALTER, 비가역) ──────────────────
// ★db push 금지: 선언적이라 schema 부재 테이블(_snap_p5_* 롤백 스냅샷)까지 DROP함.
//   대신 타겟 ALTER TABLE DROP COLUMN 으로 두 컬럼만 제거 → 스냅샷 보존. 이후 prisma generate.
//
// precondition(내장 게이트): 유효 attacksKo/abilitiesKo 전부 CardText(ko) 에 보존(갭0·불일치0).
//   p9-cardtext-attacks.ts 의 게이트와 동일 — 실패 시 드롭 거부.
//
// 실행: npx tsx scripts/migration/p9-drop-attacksko.ts            (dry-run)
//       npx tsx scripts/migration/p9-drop-attacksko.ts --apply    (비가역)
// 이후: npx prisma generate   (클라이언트에서 컬럼 제거 — schema.prisma 는 이미 제거됨)
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const q = async (sql: string): Promise<number> => {
  const r = (await prisma.$queryRawUnsafe(sql)) as { c: number }[];
  return Number(r[0]?.c ?? 0);
};

async function gatePass(): Promise<boolean> {
  // attacksKo 유효한데 CT(ko).attacks 없음
  const atkGap = await q(`SELECT count(*)::int c FROM "LogicalCard" lc
    WHERE lc."attacksKo" IS NOT NULL AND lc."attacksKo"::text NOT IN ('[]','{}','null')
      AND NOT EXISTS (SELECT 1 FROM "CardText" ct WHERE ct."logicalCardId"=lc.id AND ct.language='ko'
        AND ct.attacks IS NOT NULL AND ct.attacks::text NOT IN ('[]','{}','null'))`);
  const abiGap = await q(`SELECT count(*)::int c FROM "LogicalCard" lc
    WHERE lc."abilitiesKo" IS NOT NULL AND lc."abilitiesKo"::text NOT IN ('[]','{}','null')
      AND NOT EXISTS (SELECT 1 FROM "CardText" ct WHERE ct."logicalCardId"=lc.id AND ct.language='ko'
        AND ct.abilities IS NOT NULL AND ct.abilities::text NOT IN ('[]','{}','null'))`);
  const mismatch = await q(`SELECT count(*)::int c FROM "LogicalCard" lc
    JOIN "CardText" ct ON ct."logicalCardId"=lc.id AND ct.language='ko'
    WHERE (lc."attacksKo" IS NOT NULL AND lc."attacksKo"::text NOT IN ('[]','{}','null')
           AND ct.attacks IS NOT NULL AND lc."attacksKo"::text != ct.attacks::text)
       OR (lc."abilitiesKo" IS NOT NULL AND lc."abilitiesKo"::text NOT IN ('[]','{}','null')
           AND ct.abilities IS NOT NULL AND lc."abilitiesKo"::text != ct.abilities::text)`);
  console.log(`  게이트 — attacks 갭 ${atkGap} · abilities 갭 ${abiGap} · 불일치 ${mismatch} (전부 0 기대)`);
  return atkGap === 0 && abiGap === 0 && mismatch === 0;
}

async function colExists(col: string): Promise<boolean> {
  const r = (await prisma.$queryRawUnsafe(
    `SELECT count(*)::int c FROM information_schema.columns WHERE table_name='LogicalCard' AND column_name=$1`,
    col,
  )) as { c: number }[];
  return Number(r[0]?.c ?? 0) > 0;
}

async function main() {
  console.log(`\n════ P9 DROP attacksKo·abilitiesKo ${APPLY ? "★APPLY(비가역)" : "(dry-run)"} ════\n`);

  const [hasAtk, hasAbi] = [await colExists("attacksKo"), await colExists("abilitiesKo")];
  if (!hasAtk && !hasAbi) {
    console.log("✅ 두 컬럼 이미 없음 — no-op(멱등).");
    await prisma.$disconnect();
    return;
  }
  console.log(`  현재 컬럼: attacksKo=${hasAtk} · abilitiesKo=${hasAbi}`);

  // precondition 게이트
  if (!(await gatePass())) {
    console.error("\n🔴 GATE FAIL — 유효 데이터가 CardText 에 미보존. 드롭 거부(데이터 유실 방지).");
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log("  ✅ GATE PASS — 유효 데이터 전부 CardText(ko) 보존됨.");

  if (!APPLY) {
    console.log(`\n[dry-run] 실행할 SQL: ALTER TABLE "LogicalCard" DROP COLUMN "attacksKo", DROP COLUMN "abilitiesKo";`);
    console.log(`  ★_snap_p5_LogicalCard 에도 원본 보존(백업). db push 아닌 타겟 ALTER 라 스냅샷 무사.`);
    console.log(`  적용: --apply 후 prisma generate.`);
    await prisma.$disconnect();
    return;
  }

  const drops = [hasAtk ? `DROP COLUMN "attacksKo"` : null, hasAbi ? `DROP COLUMN "abilitiesKo"` : null].filter(Boolean);
  await prisma.$executeRawUnsafe(`ALTER TABLE "LogicalCard" ${drops.join(", ")}`);
  console.log(`\n✅ 드롭 완료: ${drops.join(", ")}`);
  console.log(`  다음: npx prisma generate (클라이언트 동기화) · 앱 tsc 확인.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
