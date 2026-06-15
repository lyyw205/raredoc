/**
 * KR 세트 메타데이터 일괄 교정(재사용) — 카드연결 무관(동결 영향 없음).
 *  · cardCount → 실제 CardLocale 수로 동기화(stale 메타 정정)
 *  · releaseDate → date 지정 시 설정(placeholder 1970 교체)
 * JOBS 만 갈아끼워 팩별로 사용. 출처는 note 에 남길 것.
 * 실행: npx tsx scripts/fix-kr-set-meta.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const JOBS: { id: string; date?: string; note: string }[] = [
  { id: "jp-tcg-BW7", note: "프라스마게일(Plasma Gale) JP — cardCount 70(stale, base /070만)→79(실제 rows=트래커 79). base70(#1-70)+시크릿9(#71-79=SR6/UR3). 레어도 C34/U20/R16/SR6/UR3 완비(별도 공식검증). date 2012-09-14 정상" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ KR 세트 메타 교정 | ${JOBS.length}개 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const j of JOBS) {
    const s = await prisma.set.findUnique({ where: { id: j.id }, select: { cardCount: true, releaseDate: true } });
    if (!s) { console.log(`  ${j.id}: 없음 → 건너뜀`); continue; }
    const actual = await prisma.regionCard.count({ where: { setId: j.id } });
    const datePart = j.date ? ` | releaseDate ${s.releaseDate?.toISOString().slice(0, 10)}→${j.date}` : "";
    console.log(`  ${j.id}: cardCount ${s.cardCount}→${actual}${datePart}  (${j.note})`);
    if (!APPLY) continue;
    const data: any = { cardCount: actual };
    if (j.date) data.releaseDate = new Date(`${j.date}T00:00:00Z`);
    await prisma.set.update({ where: { id: j.id }, data });
  }
  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: JOBS.map((j) => j.id) } }, select: { id: true, cardCount: true, releaseDate: true }, orderBy: { id: "asc" } });
    console.log("\n=== 검증 ===");
    rows.forEach((s) => console.log(`  ${s.id}: cardCount=${s.cardCount}, releaseDate=${s.releaseDate?.toISOString().slice(0, 10)}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
