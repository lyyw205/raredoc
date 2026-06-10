// ── P7-S1 진단2: setGroupId 가 "앵커 locale(JP>KR>EN) 의 Set.setGroupId" 규칙으로 도출되는가 ──
// ③복수·④불일치 케이스가 이 규칙으로 설명되면 setGroupId 는 P2 없이 도출가능(앵커규칙 재배선).
// 실행: npx tsx scripts/migration/p7-setgroup-anchor-rule.ts
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

async function main() {
  console.log("════ P7-S1: 앵커규칙(JP>KR>EN) 도출 검증 ════\n");
  const lcs = await prisma.logicalCard.findMany({
    where: { setGroupId: { not: null }, locales: { some: {} } },
    select: { id: true, setGroupId: true,
      locales: { select: { region: true, set: { select: { id: true, setGroupId: true } } } } },
  });

  const prio = ["JP", "KR", "EN"];
  const anchorGroup = (lc: typeof lcs[0]) => {
    for (const r of prio) {
      const hit = lc.locales.find((l) => l.region === r && l.set?.setGroupId);
      if (hit) return hit.set!.setGroupId!;
    }
    // 앵커 없으면 아무 locale의 그룹
    return lc.locales.find((l) => l.set?.setGroupId)?.set?.setGroupId ?? null;
  };

  let match = 0, mismatch = 0, noDerive = 0;
  const mm: string[] = [];
  for (const lc of lcs) {
    const d = anchorGroup(lc);
    if (d == null) { noDerive++; continue; }
    if (d === lc.setGroupId) match++;
    else { mismatch++; if (mm.length < 20) {
      const locs = lc.locales.map((l) => `${l.region}:${l.set?.id}(${l.set?.setGroupId ?? "∅"})`).join(" ");
      mm.push(`${lc.id} setGroupId=${lc.setGroupId} ≠ 앵커도출=${d} | ${locs}`);
    } }
  }
  console.log(`대상 LC(setGroupId보유+locale보유) ${lcs.length}`);
  console.log(`  ✅ 앵커규칙 일치 ${match} (${((match / lcs.length) * 100).toFixed(2)}%)`);
  console.log(`  🔴 불일치 ${mismatch} · 도출불가 ${noDerive}`);
  if (mm.length) console.log("\n  불일치 표본:\n    " + mm.join("\n    "));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
