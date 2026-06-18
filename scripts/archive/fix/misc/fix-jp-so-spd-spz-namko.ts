/**
 * jp-tcg-SO/SPD/SPZ 의 nameKo 오염 교정 — 셋 다 SA 스타터("V 번개")의 한글명이 잘못 복사돼 있음.
 * 한국 정발명(KR region 세트 kr-so/kr-spd/kr-spz 권위 + 리서치 pokemoncard.co.kr 확인)으로 정정.
 * nameKo + titleCleanKo(「」 추출) 만 변경 — 카드 연결 무변경.
 * Run: npx tsx scripts/fix-jp-so-spd-spz-namko.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const ALLOW = hasAllowProtectedFlag();

const FIX: Record<string, string> = {
  "jp-tcg-SO": "소드&실드 스페셜 덱 세트 「리자몽 VSTAR VS 레쿠쟈 VMAX」",
  "jp-tcg-SPD": "소드&실드 VSTAR & VMAX 하이클래스 덱 「테오키스」",
  "jp-tcg-SPZ": "소드&실드 VSTAR & VMAX 하이클래스 덱 「제라오라」",
};
const clean = (s: string) => s.match(/「([^」]+)」/)?.[1] ?? s;

async function main() {
  const ids = Object.keys(FIX);
  const sets = await prisma.set.findMany({ where: { id: { in: ids } }, select: { id: true, code: true, nameKo: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow: ALLOW, dryRun: !APPLY, tool: "fix-jp-so-spd-spz" });

  console.log(`\n${APPLY ? "✅ APPLY" : "🔍 DRY-RUN"}`);
  for (const s of sets) {
    const nameKo = FIX[s.id];
    console.log(`  ${s.id} (${s.code})`);
    console.log(`    nameKo: "${s.nameKo}" → "${nameKo}"`);
    console.log(`    titleCleanKo → "${clean(nameKo)}"`);
    if (APPLY) await prisma.set.update({ where: { id: s.id }, data: { nameKo, titleCleanKo: clean(nameKo) } });
  }
  if (!APPLY) console.log("\n적용: --apply [--allow-protected]");
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
