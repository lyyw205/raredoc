/**
 * Set.nameKo 일괄 교정(재사용) — 오염/누락된 한국 제품명 정정.
 * 배경: 일부 jp-tcg 스타터/덱 세트가 nameKo="소드&실드 스타터 세트 V 번개"(옛 제품 복사 오류)로 들어감.
 *   JP 세트의 nameKo = 해당 KR 트윈 제품명이어야 함.
 * guardContains 가 있으면 현재 nameKo 가 그 문자열을 포함할 때만 교정(오염값만 안전 교체).
 * 실행: npx tsx scripts/fix-set-nameko.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const JOBS: { id: string; to: string; guardContains?: string }[] = [
  { id: "jp-tcg-SML", to: "썬&문 패밀리 포켓몬 카드 게임", guardContains: "랜덤" }, // ファミリーポケモンカードゲーム; nameKo "랜덤30장덱" 오매칭 교정(SH 패턴)
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ Set nameKo 교정 | ${JOBS.length}개 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const j of JOBS) {
    const cur = await prisma.set.findUnique({ where: { id: j.id }, select: { id: true, nameKo: true } });
    if (!cur) { console.log(`  ${j.id}: 없음 → skip`); continue; }
    if (j.guardContains && !(cur.nameKo ?? "").includes(j.guardContains)) {
      console.log(`  ${j.id}: 가드 불일치(현재="${cur.nameKo}") → skip`); continue;
    }
    console.log(`  ${j.id}: "${cur.nameKo}" → "${j.to}"`);
    if (APPLY) await prisma.set.update({ where: { id: j.id }, data: { nameKo: j.to } });
  }
  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: JOBS.map((j) => j.id) } }, select: { id: true, nameKo: true }, orderBy: { id: "asc" } });
    console.log("\n=== 검증 ===");
    rows.forEach((s) => console.log(`  ${s.id}: ${s.nameKo}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
