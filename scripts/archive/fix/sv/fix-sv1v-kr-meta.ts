/**
 * SV base KR 세트 메타데이터 교정 — 카드연결 무관(동결 영향 없음).
 * kr-sv1v(바이올렛 ex)·kr-sv1s(스칼렛 ex) 동시발매 base 2종:
 *  1) cardCount(105·107) → 108 (실제 CardLocale·공식 108장과 불일치한 stale 값)
 *  2) releaseDate 1970-01-01(placeholder) → 2023-03-15 (KR 정식 발매; namu 인포박스 JP1/20·KR3/15·US3/31)
 * 안전장치: 각 세트의 실제 CardLocale 수가 NEW_COUNT 와 같을 때만 적용.
 * 실행: npx tsx scripts/fix-sv1v-kr-meta.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const IDS = ["kr-sv1v", "kr-sv1s"];
const NEW_COUNT = 108;
const NEW_DATE = "2023-03-15";

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SV base KR 메타 교정 | ${IDS.length}개 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const id of IDS) {
    const before = await prisma.set.findUnique({ where: { id }, select: { id: true, cardCount: true, releaseDate: true } });
    if (!before) { console.log(`  ${id}: 없음 → 건너뜀`); continue; }
    const actual = await prisma.regionCard.count({ where: { setId: id } });
    console.log(`  ${id}: 실제 ${actual}장 | cardCount ${before.cardCount}→${NEW_COUNT} | releaseDate ${before.releaseDate?.toISOString().slice(0, 10)}→${NEW_DATE}`);
    if (actual !== NEW_COUNT) { console.log(`    ⚠️ 실제(${actual})≠NEW_COUNT(${NEW_COUNT}) → 건너뜀(수동확인)`); continue; }
    if (APPLY) await prisma.set.update({ where: { id }, data: { cardCount: NEW_COUNT, releaseDate: new Date(`${NEW_DATE}T00:00:00Z`) } });
  }
  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: IDS } }, select: { id: true, cardCount: true, releaseDate: true }, orderBy: { id: "asc" } });
    console.log("\n=== 검증 ===");
    rows.forEach((s) => console.log(`  ${s.id}: cardCount=${s.cardCount}, releaseDate=${s.releaseDate?.toISOString().slice(0, 10)}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
