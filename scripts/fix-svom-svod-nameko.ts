/**
 * SVOM/SVOD(JP 스타터덱) Set.nameKo 교정.
 * 두 JP 세트의 nameKo 가 다른 스타터(꾸왁스&따라큐 ex)로 복붙 오류 → KR 트윈 기준 올바른 값으로 교정.
 *   jp-tcg-SVOM → 「마리의 모르페코&오롱털 ex」  (kr-svom)
 *   jp-tcg-SVOD → 「성호의 메탕&메타그로스 ex」  (kr-svod)
 * sv-decks 는 비동결이지만 표준 가드 적용. 실행: npx tsx scripts/fix-svom-svod-nameko.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const WRONG = "스칼렛&바이올렛 스타터 세트 ex 「꾸왁스&따라큐 ex」";
const FIXES = [
  { id: "jp-tcg-SVOM", to: "스칼렛&바이올렛 스타터 세트 ex 「마리의 모르페코&오롱털 ex」" },
  { id: "jp-tcg-SVOD", to: "스칼렛&바이올렛 스타터 세트 ex 「성호의 메탕&메타그로스 ex」" },
] as const;

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable(["sv-decks"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-svom-svod-nameko" });
  console.log(`■ SVOM/SVOD nameKo 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  let problems = 0;
  for (const f of FIXES) {
    const s = await prisma.set.findUnique({ where: { id: f.id }, select: { id: true, nameKo: true, code: true } });
    if (!s) { console.log(`  ✗ ${f.id} 없음`); problems++; continue; }
    const wrongOk = s.nameKo === WRONG;
    console.log(`  ${f.id} (code=${s.code})`);
    console.log(`     현재: ${s.nameKo}`);
    console.log(`     교정: ${f.to}  | 현재값=오류값 검증 ${wrongOk ? "OK" : "⚠ 불일치(이미 다름)"}`);
    if (s.nameKo === f.to) { console.log(`     (이미 올바름 — 스킵)`); continue; }
    if (APPLY) { await prisma.set.update({ where: { id: f.id }, data: { nameKo: f.to } }); console.log(`     ✓ 적용`); }
  }
  console.log(APPLY ? "\n적용 완료" : "\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
