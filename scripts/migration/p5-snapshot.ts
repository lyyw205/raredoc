// P5 SNAP — collapse 직전 DB 내부 스냅샷(서버사이드 CREATE TABLE AS SELECT).
//
// pg_dump 불가(서버 PG17 > 클라 pg_dump16) → P5 가 변경하는 모든 테이블의 사전 상태를
//   `_snap_p5_<table>` 로 복제. 서버사이드라 버전무관·전송없음. 복원=scripts/migration/p5-restore.ts.
//
// ★P5 가 변경하는 테이블만(나머지·거대 테이블 Price/MarketStat 은 RegionCard.id 불변이라 무변경 → 제외).
//   LogicalCard(DELETE) · CardLocale(UPDATE logicalCardId) · CardText(DELETE+UPDATE) ·
//   LogicalCardSpecies(DELETE+INSERT) · ExternalIdMapping(UPDATE) · DeckRecipeCard(UPDATE) ·
//   CollectionItem(UPDATE) · Ruling(UPDATE) · Trade(UPDATE).
//
// 실행: npx tsx scripts/migration/p5-snapshot.ts            (스냅샷 생성·멱등 DROP+CREATE)
//       npx tsx scripts/migration/p5-snapshot.ts --verify   (카운트 일치만 재확인)
//       npx tsx scripts/migration/p5-snapshot.ts --drop      (스냅샷 제거 — P5 무손실 확정 후)
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

const TABLES = [
  "LogicalCard",
  "CardLocale",
  "CardText",
  "LogicalCardSpecies",
  "ExternalIdMapping",
  "DeckRecipeCard",
  "CollectionItem",
  "Ruling",
  "Trade",
] as const;

const VERIFY = process.argv.includes("--verify");
const DROP = process.argv.includes("--drop");

const snapName = (t: string) => `_snap_p5_${t}`;

async function count(table: string): Promise<number> {
  const r = (await prisma.$queryRawUnsafe(`SELECT count(*)::int c FROM "${table}"`)) as { c: number }[];
  return Number(r[0]?.c ?? 0);
}
async function exists(table: string): Promise<boolean> {
  const r = (await prisma.$queryRawUnsafe(`SELECT (to_regclass('"${table}"') IS NOT NULL) e`)) as { e: boolean }[];
  return Boolean(r[0]?.e);
}

async function main() {
  if (DROP) {
    console.log("\n════ P5 SNAP 제거 ════");
    for (const t of TABLES) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${snapName(t)}"`);
      console.log(`  DROP ${snapName(t)}`);
    }
    console.log("✅ 스냅샷 테이블 제거 완료.");
    await prisma.$disconnect();
    return;
  }

  if (VERIFY) {
    console.log("\n════ P5 SNAP 검증(카운트 일치) ════");
    let ok = true;
    for (const t of TABLES) {
      const sn = snapName(t);
      if (!(await exists(sn))) { console.log(`  🔴 ${sn}: 없음`); ok = false; continue; }
      const [src, snap] = [await count(t), await count(sn)];
      const match = src === snap;
      if (!match) ok = false;
      console.log(`  ${match ? "✅" : "🔴"} ${t}: 원본 ${src} · 스냅 ${snap}${match ? "" : " ← 불일치"}`);
    }
    console.log(ok ? "\n✅ 스냅샷 일치(=collapse 전 상태). 단, P5 적용 후엔 원본이 변하므로 적용 전에만 일치." : "\n🔴 불일치 발견");
    await prisma.$disconnect();
    return;
  }

  console.log("\n════ P5 SNAP 생성 (collapse 직전 사전 상태 복제) ════\n");
  const report: { table: string; rows: number }[] = [];
  for (const t of TABLES) {
    const sn = snapName(t);
    // 멱등: 기존 스냅 제거 후 재생성
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${sn}"`);
    await prisma.$executeRawUnsafe(`CREATE TABLE "${sn}" AS SELECT * FROM "${t}"`);
    const [src, snap] = [await count(t), await count(sn)];
    if (src !== snap) throw new Error(`스냅샷 카운트 불일치 ${t}: 원본 ${src} ≠ 스냅 ${snap}`);
    report.push({ table: t, rows: snap });
    console.log(`  ✅ ${sn}  (${snap}행)`);
  }
  const total = report.reduce((s, r) => s + r.rows, 0);
  console.log(`\n✅ P5 SNAP 완료 — ${TABLES.length}개 테이블 · 총 ${total}행 복제(서버사이드).`);
  console.log(`   복원: scripts/migration/p5-restore.ts  ·  확정 후 제거: --drop`);
  console.log(`   ※ 외층 안전망으로 Supabase 대시보드 일일 백업/PITR 도 병행 권장.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
