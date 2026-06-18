/**
 * SMC + SMA KR ハウ↔リーリエ 스왑 교정(가나다 릴리에<하우 vs JP ハウ<リーリエ 역전, 체계적).
 * 이미지 검증완: kr-smc-017/kr-sma-047=릴리에(Lillie), kr-smc-020/kr-sma-050=하우(Hau).
 *  SMC: 릴리에 #018→#021(リーリエ), 하우 #021→#018(ハウ)
 *  SMA: 릴리에 #055(スカル団)→#057(リーリエ), 하우 #057→#056(ハウ). スカル団のしたっぱ(#055)는 kr-sma 미수록 → KR없음.
 * 안전검사. sm-decks 동결 → --allow-protected (사용자 요청).
 * Run: npx tsx scripts/fix-smc-sma-kr-swap.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const FIX = [
  { id: "kr-smc-017", kr: "릴리에", from: "lc-jp-tcg-SMC-018", to: "lc-jp-tcg-SMC-021", jp: "SMC リーリエ" },
  { id: "kr-smc-020", kr: "하우",   from: "lc-jp-tcg-SMC-021", to: "lc-jp-tcg-SMC-018", jp: "SMC ハウ" },
  { id: "kr-sma-047", kr: "릴리에", from: "lc-jp-tcg-SMA-055", to: "lc-jp-tcg-SMA-057", jp: "SMA リーリエ" },
  { id: "kr-sma-050", kr: "하우",   from: "lc-jp-tcg-SMA-057", to: "lc-jp-tcg-SMA-056", jp: "SMA ハウ" },
];

async function main() {
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-SMC", "kr-smc", "jp-tcg-SMA", "kr-sma"] } }, select: { cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-smc-sma-kr-swap" });
  console.log(`■ SMC + SMA KR ハウ↔リーリエ 스왑 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const f of FIX) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id }, select: { cardId: true, name: true } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음`); continue; }
    if (rc.cardId !== f.from) { console.log(`  ⚠️ ${f.id}(${rc.name}): ${rc.cardId} ≠ ${f.from} → skip(안전)`); continue; }
    console.log(`  ✔ ${f.kr} [${f.id}]: ${f.from} → ${f.to} (${f.jp})`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { cardId: f.to } });
  }
  if (APPLY) {
    console.log("\n· 검증");
    for (const [sid, n] of [["jp-tcg-SMC", "018"], ["jp-tcg-SMC", "021"], ["jp-tcg-SMA", "055"], ["jp-tcg-SMA", "056"], ["jp-tcg-SMA", "057"]] as const) {
      const jp = await prisma.regionCard.findFirst({ where: { setId: sid, number: n }, select: { name: true, cardId: true } });
      const kr = await prisma.regionCard.findFirst({ where: { cardId: jp!.cardId!, region: "KR" }, select: { name: true } });
      console.log(`  ${sid}#${n} ${jp?.name} → KR ${kr ? kr.name : "(없음)"}`);
    }
  } else console.log("\n적용: --apply --allow-protected");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
