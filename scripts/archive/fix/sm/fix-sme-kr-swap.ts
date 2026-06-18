/**
 * SME(jp-tcg-SME) KR ハウ↔リーリエ 스왑 교정 — kr-sme 릴리에/하우가 JP ハウ/リーリエ에 교차연결.
 * 이미지 검증: kr-sme#018=릴리에(Lillie 일러), kr-sme#020=하우(Hau 일러) 확인 완료.
 *  · 릴리에(kr-sme-018): lc-jp-tcg-SME-018(ハウ) → lc-jp-tcg-SME-020(リーリエ)
 *  · 하우(kr-sme-020):   lc-jp-tcg-SME-020(リーリエ) → lc-jp-tcg-SME-018(ハウ)
 * 안전검사. sm-decks 동결 → --allow-protected (사용자 요청).
 * Run: npx tsx scripts/fix-sme-kr-swap.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const FIX = [
  { id: "kr-sme-018", kr: "릴리에", from: "lc-jp-tcg-SME-018", to: "lc-jp-tcg-SME-020", jp: "リーリエ" },
  { id: "kr-sme-020", kr: "하우",   from: "lc-jp-tcg-SME-020", to: "lc-jp-tcg-SME-018", jp: "ハウ" },
];

async function main() {
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-SME", "kr-sme"] } }, select: { cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sme-kr-swap" });
  console.log(`■ SME KR ハウ↔リーリエ 스왑 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const f of FIX) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id }, select: { cardId: true, name: true } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음`); continue; }
    if (rc.cardId !== f.from) { console.log(`  ⚠️ ${f.id}(${rc.name}): ${rc.cardId} ≠ ${f.from} → skip(안전)`); continue; }
    console.log(`  ✔ ${f.kr} [${f.id}]: ${f.from} → ${f.to} (${f.jp})`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { cardId: f.to } });
  }
  if (APPLY) {
    console.log("\n· 검증");
    for (const n of ["018", "020"]) {
      const jp = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-SME", number: n }, select: { name: true, cardId: true } });
      const kr = await prisma.regionCard.findFirst({ where: { cardId: jp!.cardId!, region: "KR" }, select: { name: true } });
      console.log(`  SME#${n} ${jp?.name} → KR ${kr ? kr.name : "(없음)"}`);
    }
  } else console.log("\n적용: --apply --allow-protected");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
