// ── P9 컬럼 드롭: Card.cardPackId(@map setGroupId) + ExternalIdMapping.cardPackId(setGroupId) ──
// 팩소속 직교화(orthogonalization). 가변·재포인트 대상이던 LogicalCard.setGroupId 를 제거하고,
//   카드의 팩소속은 불변 물리관계 Set.cardPackId(앵커 JP>KR>EN)로만 도출한다(queries.ts lcIdsInPack).
// ★db push 금지: 선언적이라 schema 부재 테이블(_snap_p5_* 롤백 스냅샷)까지 DROP 함.
//   대신 타겟 ALTER TABLE DROP COLUMN 으로 두 컬럼만 제거 → 스냅샷 보존. 의존 인덱스·FK 는 자동 캐스케이드.
//
// precondition(expand-contract): 이 스크립트는 **스키마-제거 커밋이 프로덕션에 배포된 後** 실행한다.
//   배포 전 드롭 시, 옛 Prisma client(컬럼 select)가 깨진다. 코드측 read 청산은 tsc 0 으로 검증됨.
//   내장 게이트는 (a) 컬럼 존재 (b) 앵커 소스 Set.cardPackId 가 채워져 있는지(=직교화 후 팩소속 권위) 만 확인.
//
// 실행: npx tsx scripts/migration/p9-drop-cardpackid.ts            (dry-run)
//       npx tsx scripts/migration/p9-drop-cardpackid.ts --apply    (비가역)
// 이후: schema.prisma 는 이미 제거됨 → npx prisma generate (클라이언트 동기화) · 앱 tsc 확인.
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const q = async (sql: string): Promise<number> => {
  const r = (await prisma.$queryRawUnsafe(sql)) as { c: number }[];
  return Number(r[0]?.c ?? 0);
};
async function colExists(table: string, col: string): Promise<boolean> {
  const r = (await prisma.$queryRawUnsafe(
    `SELECT count(*)::int c FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    table,
    col,
  )) as { c: number }[];
  return Number(r[0]?.c ?? 0) > 0;
}

async function main() {
  console.log(`\n════ P9 DROP cardPackId(setGroupId) — 팩소속 직교화 ${APPLY ? "★APPLY(비가역)" : "(dry-run)"} ════\n`);

  const hasLc = await colExists("LogicalCard", "setGroupId");
  const hasEx = await colExists("ExternalIdMapping", "setGroupId");
  if (!hasLc && !hasEx) {
    console.log("✅ 두 컬럼 이미 없음 — no-op(멱등).");
    await prisma.$disconnect();
    return;
  }
  console.log(`  현재 컬럼: LogicalCard.setGroupId=${hasLc} · ExternalIdMapping.setGroupId=${hasEx}`);

  // 게이트: 앵커 소스(Set.cardPackId)가 살아있어야 직교화 후 팩소속을 도출할 수 있다.
  const setsWithPack = await q(`SELECT count(*)::int c FROM "Set" WHERE "setGroupId" IS NOT NULL`);
  const lcsNonNull = hasLc ? await q(`SELECT count(*)::int c FROM "LogicalCard" WHERE "setGroupId" IS NOT NULL`) : 0;
  const exNonNull = hasEx ? await q(`SELECT count(*)::int c FROM "ExternalIdMapping" WHERE "setGroupId" IS NOT NULL`) : 0;
  // 앵커로 팩이 도출되는 LC 수(검증용) — DROP 후 이 경로가 팩소속의 유일 권위.
  const lcsAnchorResolvable = await q(`
    SELECT count(DISTINCT cl."logicalCardId")::int c
    FROM "CardLocale" cl JOIN "Set" s ON s.id = cl."setId"
    WHERE s."setGroupId" IS NOT NULL`);
  console.log(`  앵커 소스 Set.cardPackId 보유 세트 = ${setsWithPack} (>0 필수)`);
  console.log(`  드롭될 LogicalCard.setGroupId non-null = ${lcsNonNull} (드리프트 가변값 — 폐기 대상)`);
  console.log(`  앵커(Set.cardPackId)로 팩 도출되는 LC = ${lcsAnchorResolvable} (직교화 후 팩소속 권위)`);
  console.log(`  드롭될 ExternalIdMapping.setGroupId non-null = ${exNonNull} (0 기대 — 미사용 컬럼)`);

  if (setsWithPack === 0) {
    console.error("\n🔴 GATE FAIL — Set.cardPackId 가 비어있다. 앵커 경로 부재 → 드롭 거부.");
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log("  ✅ GATE PASS — 앵커 소스 정상. 팩소속은 Set.cardPackId 로 도출 가능.");

  const stmts: string[] = [];
  if (hasLc) stmts.push(`ALTER TABLE "LogicalCard" DROP COLUMN "setGroupId"`);
  if (hasEx) stmts.push(`ALTER TABLE "ExternalIdMapping" DROP COLUMN "setGroupId"`);

  if (!APPLY) {
    console.log(`\n[dry-run] 실행할 SQL:`);
    stmts.forEach((s) => console.log(`  ${s};`));
    console.log(`  ★타겟 ALTER 라 _snap_p5_* 스냅샷·Set.setGroupId(유지)·SetGroup 모델 무사. 의존 인덱스/FK 자동 캐스케이드.`);
    console.log(`  적용: --apply (스키마-제거 커밋 배포 後).`);
    await prisma.$disconnect();
    return;
  }

  for (const s of stmts) {
    await prisma.$executeRawUnsafe(s);
    console.log(`  ✅ ${s}`);
  }
  console.log(`\n✅ 드롭 완료 (${stmts.length}). 팩소속 직교화 종료.`);
  console.log(`  다음: npx prisma generate (이미 schema 제거됨) · 앱 tsc 확인 · /dex·/test 라이브 점검.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
