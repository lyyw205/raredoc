/**
 * KR 세트 발매일 교정 — placeholder(1970-01-01)로 들어간 한국판 세트의 실제 한국 발매일 설정.
 * 출처: 공식/나무위키 교차 확인. releaseDate 는 Set 메타데이터(동결 카드연결과 무관).
 * 실행: npx tsx scripts/fix-kr-releasedate.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// id → 한국 정식 발매일(YYYY-MM-DD, KST 자정 = UTC 저장)
const JOBS: { id: string; date: string; note: string }[] = [
  { id: "kr-so", date: "2022-12-16", note: "리자몽VSTAR VS 레쿠쟈VMAX 스페셜덱(SO) — KR 12/16 (공식 card/491·리테일러)" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ KR 세트 발매일 교정 | ${JOBS.length}개 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const j of JOBS) {
    const before = await prisma.set.findUnique({ where: { id: j.id }, select: { id: true, releaseDate: true } });
    const cur = before?.releaseDate ? before.releaseDate.toISOString().slice(0, 10) : "(없음)";
    console.log(`  ${j.id}: ${cur} → ${j.date}   ${j.note}`);
    if (APPLY) await prisma.set.update({ where: { id: j.id }, data: { releaseDate: new Date(`${j.date}T00:00:00Z`) } });
  }
  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: JOBS.map((j) => j.id) } }, select: { id: true, releaseDate: true }, orderBy: { id: "asc" } });
    console.log("\n=== 검증 ===");
    rows.forEach((s) => console.log(`  ${s.id}: ${s.releaseDate?.toISOString().slice(0, 10)}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
