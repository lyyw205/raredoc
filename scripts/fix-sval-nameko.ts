/**
 * SVAL(스타터세트ex 뜨아거&전룡 / Fuecoco & Ampharos) nameKo 오염 교정.
 * 버그: jp-tcg-SVAL.nameKo 에 "꾸왁스&따라큐 ex"(Quaxly&Mimikyu, 다른 제품)가 잘못 들어감.
 *   - 검증: jp-tcg-SVAL 카드 #2 ホゲータ(Fuecoco)·#7 デンリュウex(Ampharos) → 종 확정.
 *   - 올바른 KR 제품명 = kr-sval.name = "스칼렛&바이올렛 스타터 세트 ex 「뜨아거&전룡 ex」".
 * sv-decks 는 비동결. nameKo 는 세트 메타데이터(카드연결 무관).
 * 실행: npx tsx scripts/fix-sval-nameko.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const KO = "스칼렛&바이올렛 스타터 세트 ex 「뜨아거&전룡 ex」";
const FIXES: { id: string; to: string; guardContains?: string }[] = [
  { id: "jp-tcg-SVAL", to: KO, guardContains: "꾸왁스" }, // 오염값(Quaxly)일 때만 교정
  { id: "kr-sval", to: KO }, // 현재 null → 자기 name 과 동일하게 채움
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SVAL nameKo 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const f of FIXES) {
    const cur = await prisma.set.findUnique({ where: { id: f.id }, select: { id: true, name: true, nameKo: true } });
    if (!cur) { console.log(`  ${f.id}: (없음) 건너뜀`); continue; }
    if (f.guardContains && !(cur.nameKo ?? "").includes(f.guardContains)) {
      console.log(`  ${f.id}: 가드 불일치(현재 nameKo="${cur.nameKo}") → 건너뜀`); continue;
    }
    console.log(`  ${f.id}: nameKo "${cur.nameKo}" → "${f.to}"`);
    if (APPLY) await prisma.set.update({ where: { id: f.id }, data: { nameKo: f.to } });
  }
  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: FIXES.map((f) => f.id) } }, select: { id: true, nameKo: true }, orderBy: { id: "asc" } });
    console.log("\n=== 검증 ===");
    rows.forEach((s) => console.log(`  ${s.id}: ${s.nameKo}`));
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
