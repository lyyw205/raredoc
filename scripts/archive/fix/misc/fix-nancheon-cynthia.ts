/**
 * ★자기교정: 난천 = 시로나(Cynthia, JP シロナ)의 한국 정발명임을 이미지로 확정.
 * 앞선 SMN/SMK/SMI untangle에서 "난천=Nanu(다른 카드)"로 오인해 シロナ에서 잘못 언링크했음 → 복구.
 * 3개 세트 모두 kr 난천 → 해당 세트 シロナ LC 로 재연결. 안전검사(현재=내가 만든 단독 lc).
 * sm-decks 동결 → --allow-protected. 이미지검증: SMI/SMN/SMK 난천 전부 Cynthia 일러 확인 완료.
 * Run: npx tsx scripts/fix-nancheon-cynthia.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const APPLY = process.argv.includes("--apply");
const FIX = [
  { id: "kr-smi-031", from: "lc-kr-smi-031", to: "lc-jp-tcg-SMI-033", set: "SMI" },
  { id: "kr-smk-021", from: "lc-kr-smk-021", to: "lc-jp-tcg-SMK-023", set: "SMK" },
  { id: "kr-smn-033", from: "lc-kr-smn-033", to: "lc-jp-tcg-SMN-024", set: "SMN" },
];

async function main() {
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-SMI", "kr-smi", "jp-tcg-SMK", "kr-smk", "jp-tcg-SMN", "kr-smn"] } }, select: { cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-nancheon-cynthia" });
  console.log(`■ 난천=시로나(Cynthia) 복구 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  for (const f of FIX) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id }, select: { cardId: true, name: true } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음`); continue; }
    if (rc.cardId !== f.from) { console.log(`  ⚠️ ${f.id}(${rc.name}): ${rc.cardId} ≠ ${f.from} → skip(안전)`); continue; }
    console.log(`  ✔ ${f.set} ${rc.name} [${f.id}]: ${f.from} → ${f.to} (シロナ에 복구)`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { cardId: f.to } });
  }

  if (APPLY) {
    console.log("\n· 검증");
    for (const [sid, n] of [["jp-tcg-SMI", "033"], ["jp-tcg-SMK", "023"], ["jp-tcg-SMN", "024"]] as const) {
      const jp = await prisma.regionCard.findFirst({ where: { setId: sid, number: n }, select: { name: true, cardId: true } });
      const kr = await prisma.regionCard.findFirst({ where: { cardId: jp!.cardId!, region: "KR" }, select: { name: true } });
      console.log(`  ${sid}#${n} ${jp?.name} → KR ${kr ? kr.name : "(없음)"}`);
    }
  } else console.log("\n적용: --apply --allow-protected");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); });
