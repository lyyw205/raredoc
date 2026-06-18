/**
 * VSTAR 유니버스(S12a) 세트 메타데이터 교정 — 카드연결 무관(og-s12a 비동결).
 *  · jp-tcg-S12a.cardCount 254 → 262 (실제 CardLocale·트래커와 불일치 stale)
 *  · kr-s12a.cardCount   252 → 262 (동일)
 *  · kr-s12a.releaseDate 1970-01-01 → 2023-01-13 (KR 정식; namu 인포박스 JP12/2·KR1/13·US(Crown Zenith)1/20)
 * 안전: cardCount 는 각 세트 실제 CardLocale 수와 같을 때만 적용.
 * 실행: npx tsx scripts/fix-s12a-meta.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const COUNT_IDS = ["jp-tcg-S12a", "kr-s12a"];
const KR_ID = "kr-s12a";
const KR_DATE = "2023-01-13";

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S12a 메타 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const id of COUNT_IDS) {
    const s = await prisma.set.findUnique({ where: { id }, select: { cardCount: true } });
    const actual = await prisma.regionCard.count({ where: { setId: id } });
    const datePart = id === KR_ID ? ` | releaseDate→${KR_DATE}` : "";
    console.log(`  ${id}: cardCount ${s?.cardCount}→${actual}${datePart}`);
    if (!APPLY) continue;
    const data: any = { cardCount: actual };
    if (id === KR_ID) data.releaseDate = new Date(`${KR_DATE}T00:00:00Z`);
    await prisma.set.update({ where: { id }, data });
  }
  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: COUNT_IDS } }, select: { id: true, cardCount: true, releaseDate: true }, orderBy: { id: "asc" } });
    console.log("\n=== 검증 ===");
    rows.forEach((s) => console.log(`  ${s.id}: cardCount=${s.cardCount}, releaseDate=${s.releaseDate?.toISOString().slice(0, 10)}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
