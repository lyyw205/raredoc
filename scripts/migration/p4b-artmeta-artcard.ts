// ── P4b: art메타(types·flavorText) LogicalCard → ArtCard 복제 ──────────────────
// 아트별 메타. ArtCard 한 묶음의 멤버 LC들은 같은 카드(같은 그림)라 types 균일.
// 대표 멤버(types있음·flavor있음 우선) 1개에서 복사. illustrator는 P4-ArtCard에서 이미 채움.
// flavorText 는 LogicalCard.flavorText(=EN정규 폴백) 그대로 → ArtCard EN 폴백(H9 사다리 최하).
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p4b-artmeta-artcard.ts [--apply]
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
const APPLY = process.argv.includes("--apply");
const c = async (sql: string) => Number(((await prisma.$queryRawUnsafe(sql)) as any[])[0]?.c ?? 0);

async function main() {
  console.log(`【P4b art메타→ArtCard】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  const totalAC = await c(`SELECT count(*)::int c FROM "ArtCard"`);
  const memberTypes = await c(`SELECT count(DISTINCT "artCardId")::int c FROM "LogicalCard" WHERE "artCardId" IS NOT NULL AND array_length(types,1) > 0`);
  console.log(`  ArtCard ${totalAC} · 멤버 types보유 ArtCard ${memberTypes}`);

  // types 멤버간 불일치(같은 ArtCard인데 type집합 다름) 점검 — 0 기대(같은카드)
  const inconsistent = await c(`
    SELECT count(*)::int c FROM (
      SELECT "artCardId" FROM "LogicalCard" WHERE "artCardId" IS NOT NULL AND array_length(types,1)>0
      GROUP BY "artCardId" HAVING count(DISTINCT array_to_string(types,'|')) > 1
    ) t`);
  console.log(`  ⚠ types 멤버불일치 ArtCard: ${inconsistent} (0기대 — 같은아트=같은타입)`);

  if (!APPLY) { console.log("  (dry-run — 변경 0. --apply 로 적용)"); await prisma.$disconnect(); return; }

  // 대표 멤버에서 복사: types있음·flavor있음 우선
  const n = await prisma.$executeRawUnsafe(`
    UPDATE "ArtCard" a SET types = r.types, "flavorText" = r."flavorText"
    FROM (
      SELECT DISTINCT ON (lc."artCardId") lc."artCardId" aid, lc.types, lc."flavorText"
      FROM "LogicalCard" lc WHERE lc."artCardId" IS NOT NULL
      ORDER BY lc."artCardId", (array_length(lc.types,1) IS NULL), (lc."flavorText" IS NULL), lc.id
    ) r WHERE a.id = r.aid`);
  console.log(`  ✅ 복제 ${n} ArtCard`);

  // 검증: ArtCard.types 가 멤버 types 와 일치(대표값) · types 채워진 ArtCard 수
  const filled = await c(`SELECT count(*)::int c FROM "ArtCard" WHERE array_length(types,1) > 0`);
  const mismatch = await c(`
    SELECT count(*)::int c FROM "ArtCard" a JOIN "LogicalCard" lc ON lc."artCardId"=a.id
    WHERE array_length(a.types,1)>0 AND array_length(lc.types,1)>0
      AND array_to_string(a.types,'|') <> array_to_string(lc.types,'|')`);
  console.log(`  검증 — types 채워진 ArtCard ${filled} · 멤버와 불일치 ${mismatch}(0기대, 단 멤버불일치 ${inconsistent}건은 대표값차이 가능)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
