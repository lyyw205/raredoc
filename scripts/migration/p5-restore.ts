// P5 복원 — `_snap_p5_*` 스냅샷으로 collapse 를 되돌린다(P5 가 잘못됐을 때).
//
// P5 가 건드린 9개 테이블을 스냅샷 상태로 **정합(reconcile)**: 누락행 재삽입 + 잉여행 삭제 + FK 되돌림.
//   FK 안전 순서: 부모(LogicalCard) 재삽입 먼저 → 자식 FK 되돌림/재삽입 → 복합PK 정합.
//   1 트랜잭션. dry-run 기본(무엇을 되돌릴지 카운트만). --apply 로만 실제 복원.
//
// ★현재(P5 적용 前)에 dry-run 하면 live==snap 이라 "되돌릴 것 0" 이 정상(로직 sanity).
// ★P5 적용 後 문제 발견 시 --apply 로 실행하면 스냅샷 시점으로 복귀.
//
// 실행: npx tsx scripts/migration/p5-restore.ts            (dry-run)
//       npx tsx scripts/migration/p5-restore.ts --apply
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const sn = (t: string) => `_snap_p5_${t}`;
async function c(sql: string): Promise<number> {
  const r = (await prisma.$queryRawUnsafe(sql)) as { c: number }[];
  return Number(r[0]?.c ?? 0);
}
async function exists(t: string): Promise<boolean> {
  const r = (await prisma.$queryRawUnsafe(`SELECT (to_regclass('"${t}"') IS NOT NULL) e`)) as { e: boolean }[];
  return Boolean(r[0]?.e);
}

// id-PK 자식 테이블(FK=logicalCardId): 되돌릴 항목 = 누락 재삽입 + FK 불일치 되돌림
const ID_FK_TABLES = ["CardLocale", "CardText", "ExternalIdMapping", "DeckRecipeCard", "CollectionItem", "Ruling", "Trade"] as const;

async function main() {
  console.log(`\n════ P5 복원 ${APPLY ? "★APPLY★" : "(dry-run)"} ════\n`);

  for (const t of ["LogicalCard", ...ID_FK_TABLES, "LogicalCardSpecies"]) {
    if (!(await exists(sn(t)))) {
      console.error(`🔴 스냅샷 ${sn(t)} 없음 — 복원 불가. p5-snapshot.ts 먼저.`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  // 진단(되돌릴 양)
  const missLC = await c(`SELECT count(*)::int c FROM "${sn("LogicalCard")}" s WHERE NOT EXISTS (SELECT 1 FROM "LogicalCard" l WHERE l.id=s.id)`);
  console.log(`[LogicalCard] 누락(재삽입 대상): ${missLC}`);
  const fkDiff: Record<string, { miss: number; diff: number }> = {};
  for (const t of ID_FK_TABLES) {
    const miss = await c(`SELECT count(*)::int c FROM "${sn(t)}" s WHERE NOT EXISTS (SELECT 1 FROM "${t}" x WHERE x.id=s.id)`);
    const diff = await c(`SELECT count(*)::int c FROM "${t}" x JOIN "${sn(t)}" s ON s.id=x.id WHERE x."logicalCardId" IS DISTINCT FROM s."logicalCardId"`);
    fkDiff[t] = { miss, diff };
    console.log(`[${t}] 누락 ${miss} · FK불일치 ${diff}`);
  }
  const spMiss = await c(`SELECT count(*)::int c FROM "${sn("LogicalCardSpecies")}" s WHERE NOT EXISTS (SELECT 1 FROM "LogicalCardSpecies" x WHERE x."logicalCardId"=s."logicalCardId" AND x."speciesId"=s."speciesId")`);
  const spExtra = await c(`SELECT count(*)::int c FROM "LogicalCardSpecies" x WHERE NOT EXISTS (SELECT 1 FROM "${sn("LogicalCardSpecies")}" s WHERE s."logicalCardId"=x."logicalCardId" AND s."speciesId"=x."speciesId")`);
  console.log(`[LogicalCardSpecies] 누락 ${spMiss} · 잉여 ${spExtra}`);

  const totalWork = missLC + Object.values(fkDiff).reduce((s, v) => s + v.miss + v.diff, 0) + spMiss + spExtra;
  if (totalWork === 0) {
    console.log(`\n✅ 되돌릴 것 0 — live 가 이미 스냅샷과 동일(=P5 미적용 또는 이미 복원됨). 정상.`);
    await prisma.$disconnect();
    return;
  }

  if (!APPLY) {
    console.log(`\n[dry-run] 총 ${totalWork}건 정합 필요. 복원하려면 --apply.`);
    await prisma.$disconnect();
    return;
  }

  // ── 복원 트랜잭션 (FK 안전 순서) ──
  await prisma.$transaction(async (tx) => {
    // 1) 부모 LogicalCard 누락행 재삽입 (자식이 가리킬 수 있게 먼저)
    await tx.$executeRawUnsafe(`INSERT INTO "LogicalCard" SELECT * FROM "${sn("LogicalCard")}" s WHERE NOT EXISTS (SELECT 1 FROM "LogicalCard" l WHERE l.id=s.id)`);

    // 2) id-PK 자식: 누락 재삽입 후 FK 되돌림
    for (const t of ID_FK_TABLES) {
      await tx.$executeRawUnsafe(`INSERT INTO "${t}" SELECT * FROM "${sn(t)}" s WHERE NOT EXISTS (SELECT 1 FROM "${t}" x WHERE x.id=s.id)`);
      await tx.$executeRawUnsafe(`UPDATE "${t}" x SET "logicalCardId"=s."logicalCardId" FROM "${sn(t)}" s WHERE x.id=s.id AND x."logicalCardId" IS DISTINCT FROM s."logicalCardId"`);
    }

    // 3) 복합PK LogicalCardSpecies: 잉여 삭제 + 누락 삽입
    await tx.$executeRawUnsafe(`DELETE FROM "LogicalCardSpecies" x WHERE NOT EXISTS (SELECT 1 FROM "${sn("LogicalCardSpecies")}" s WHERE s."logicalCardId"=x."logicalCardId" AND s."speciesId"=x."speciesId")`);
    await tx.$executeRawUnsafe(`INSERT INTO "LogicalCardSpecies" SELECT * FROM "${sn("LogicalCardSpecies")}" s WHERE NOT EXISTS (SELECT 1 FROM "LogicalCardSpecies" x WHERE x."logicalCardId"=s."logicalCardId" AND x."speciesId"=s."speciesId")`);

    // 4) 사후 단언: 각 테이블이 스냅샷과 행수 일치
    for (const t of ["LogicalCard", ...ID_FK_TABLES, "LogicalCardSpecies"]) {
      const live = await c2(tx, `SELECT count(*)::int c FROM "${t}"`);
      const snap = await c2(tx, `SELECT count(*)::int c FROM "${sn(t)}"`);
      if (live !== snap) throw new Error(`복원 단언 실패 ${t}: live ${live} ≠ snap ${snap} — 롤백`);
    }
    console.log(`  ✅ 복원 완료 — 전 테이블 스냅샷 행수 일치.`);
  }, { timeout: 600_000 });

  console.log(`\n✅ P5 복원 완료(스냅샷 시점 복귀). 다음: gate-fk --compare base 로 무결성 확인.`);
  await prisma.$disconnect();
}

async function c2(tx: { $queryRawUnsafe: (sql: string) => Promise<unknown> }, sql: string): Promise<number> {
  const r = (await tx.$queryRawUnsafe(sql)) as { c: number }[];
  return Number(r[0]?.c ?? 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
