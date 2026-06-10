// ── P6: oracle 본문 LogicalCard → GameCard 복제 (형제 권위선택) ────────────────
// N개 LC→1 GC. effectSig(hp+공격damage+공격수+능력수)로 묶여 형제 거의 일치(genuine 충돌 0~6).
// 대표 = 가장 채워진 멤버(attacks·abilities·weakness·rules·retreat 있는 순). 그 멤버의 oracle 전체 복사.
// 9컬럼: retreatCost·weakness·resistance·evolvesFrom·evolvesTo·abilities·attacks·legalities·rules.
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p6-oracle-gamecard.ts [--apply]
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
const APPLY = process.argv.includes("--apply");
const c = async (sql: string) => Number(((await prisma.$queryRawUnsafe(sql)) as any[])[0]?.c ?? 0);

const REP_SQL = `
  SELECT DISTINCT ON (lc."gameCardId") lc."gameCardId" gid,
    lc."retreatCost", lc.weakness, lc.resistance, lc."evolvesFrom", lc."evolvesTo",
    lc.abilities, lc.attacks, lc.legalities, lc.rules
  FROM "LogicalCard" lc WHERE lc."gameCardId" IS NOT NULL
  ORDER BY lc."gameCardId",
    (lc.attacks IS NULL), (lc.abilities IS NULL), (lc.weakness IS NULL),
    (array_length(lc.rules,1) IS NULL), (lc."retreatCost" IS NULL), lc.id`;

async function main() {
  console.log(`【P6 oracle→GameCard】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  const gc = await c(`SELECT count(*)::int c FROM "GameCard"`);
  const gcAttacks = await c(`SELECT count(DISTINCT "gameCardId")::int c FROM "LogicalCard" WHERE "gameCardId" IS NOT NULL AND attacks IS NOT NULL`);
  console.log(`  GameCard ${gc} · 멤버 attacks보유 GC ${gcAttacks}`);

  if (!APPLY) { console.log("  (dry-run — 변경 0. --apply 로 적용)"); await prisma.$disconnect(); return; }

  const n = await prisma.$executeRawUnsafe(`
    UPDATE "GameCard" g SET
      "retreatCost"=r."retreatCost", weakness=r.weakness, resistance=r.resistance,
      "evolvesFrom"=r."evolvesFrom", "evolvesTo"=r."evolvesTo",
      abilities=r.abilities, attacks=r.attacks, legalities=r.legalities, rules=r.rules
    FROM (${REP_SQL}) r WHERE g.id = r.gid`);
  console.log(`  ✅ 복제 ${n} GameCard`);

  // 검증
  const filledAttacks = await c(`SELECT count(*)::int c FROM "GameCard" WHERE attacks IS NOT NULL`);
  // 컬럼-분산 갭: GC.attacks NULL 인데 멤버엔 attacks 있는 경우(대표가 못 담은 split)
  const gapAttacks = await c(`SELECT count(*)::int c FROM "GameCard" g WHERE g.attacks IS NULL AND EXISTS (SELECT 1 FROM "LogicalCard" lc WHERE lc."gameCardId"=g.id AND lc.attacks IS NOT NULL)`);
  const gapWeak = await c(`SELECT count(*)::int c FROM "GameCard" g WHERE g.weakness IS NULL AND EXISTS (SELECT 1 FROM "LogicalCard" lc WHERE lc."gameCardId"=g.id AND lc.weakness IS NOT NULL)`);
  const gapRetreat = await c(`SELECT count(*)::int c FROM "GameCard" g WHERE g."retreatCost" IS NULL AND EXISTS (SELECT 1 FROM "LogicalCard" lc WHERE lc."gameCardId"=g.id AND lc."retreatCost" IS NOT NULL)`);
  console.log(`  검증 — GC.attacks 채워짐 ${filledAttacks}/${gcAttacks}`);
  console.log(`  컬럼-분산 갭(대표가 못담음): attacks ${gapAttacks} · weakness ${gapWeak} · retreat ${gapRetreat} (0~소수 기대)`);
  // 형제 attacks 진짜불일치(damage집합 다른 멤버 공존) — effectSig가 잡았어야
  const conflict = await c(`
    SELECT count(*)::int c FROM (
      SELECT "gameCardId" FROM "LogicalCard" WHERE "gameCardId" IS NOT NULL AND attacks IS NOT NULL
      GROUP BY "gameCardId" HAVING count(DISTINCT attacks::text) > 1
    ) t`);
  console.log(`  형제 attacks 본문불일치 GC: ${conflict} (effectSig는 damage집합만 봐서 텍스트차 가능 — 대표=가장채워진것)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
