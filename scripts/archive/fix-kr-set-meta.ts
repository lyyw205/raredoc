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
  { id: "kr-dc", date: "2012-08-01", note: "드래곤 컬렉션 KR — 발매일 1970 placeholder→2012-08-01 (리서치 wf wdf3qr0dg high conf: pokemoncard.co.kr/card/12 '발매일 2012-08-01' + namu 인포박스). 카드 20장 LC 완벽정합·무레어도, cardCount 20 정상. JP(jp-tcg-DC)는 수정불필요" },
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
