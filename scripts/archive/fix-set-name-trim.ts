/**
 * Set.name / nameKo 의 오타성 공백 정리(재사용) — 메타데이터(연결 무관, 동결 영향 없음).
 * 예: kr-sg "「인텔리레온 VMAX 」"(닫는 괄호 앞 군더더기 공백) → "「인텔리레온 VMAX」".
 * from-가드: 현재 name 이 from 과 정확히 일치할 때만 교체.
 * 실행: npx tsx scripts/fix-set-name-trim.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const JOBS: { id: string; from: string; to: string }[] = [
  {
    id: "jp-tcg-SD",
    from: "Vスタートデッキ無色 イーブイ", // 135장 = 9덱 번들인데 이브이덱 이름만 붙어 오해소지
    to: "Vスタートデッキ", // 시리즈 일반명(트래커 "V Starter Decks")
  },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ Set name 공백 정리 | ${JOBS.length}개 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const j of JOBS) {
    const cur = await prisma.set.findUnique({ where: { id: j.id }, select: { id: true, name: true, nameKo: true } });
    if (!cur) { console.log(`  ${j.id}: 없음 → skip`); continue; }
    if (cur.name !== j.from) { console.log(`  ${j.id}: from 불일치(현재="${cur.name}") → skip`); continue; }
    const data: any = { name: j.to };
    if (cur.nameKo === j.from) data.nameKo = j.to;
    console.log(`  ${j.id}: name "${cur.name}" → "${j.to}"${data.nameKo ? " (+nameKo)" : ""}`);
    if (APPLY) await prisma.set.update({ where: { id: j.id }, data });
  }
  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: JOBS.map((j) => j.id) } }, select: { id: true, name: true, nameKo: true }, orderBy: { id: "asc" } });
    console.log("\n=== 검증 ===");
    rows.forEach((s) => console.log(`  ${s.id}: name="${s.name}" nameKo="${s.nameKo}"`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
