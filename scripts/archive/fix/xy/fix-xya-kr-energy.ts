/**
 * kr-xya 기본에너지 충돌 교정(XYC 동일패턴) — 2장이 #1/#2 + 리자몽/M리자몽 LC를 잘못 공유.
 * JP 구조: #22 基本炎(lc-jp-tcg-XYA-022)·#23 基本悪(lc-jp-tcg-XYA-023). KR도 그 위치로:
 *   · 기본 불꽃 에너지: #1→#22, lc-jp-tcg-XYA-001→lc-jp-tcg-XYA-022
 *   · 기본 악 에너지:   #2→#23, lc-jp-tcg-XYA-002→lc-jp-tcg-XYA-023
 * 실행: npx tsx scripts/fix-xya-kr-energy.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const FIXES = [
  { name: "기본 불꽃 에너지", fromN: 1, fromLc: "lc-jp-tcg-XYA-001", toN: 22, toLc: "lc-jp-tcg-XYA-022" },
  { name: "기본 악 에너지", fromN: 2, fromLc: "lc-jp-tcg-XYA-002", toN: 23, toLc: "lc-jp-tcg-XYA-023" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ kr-xya 기본에너지 충돌 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "kr-xya", name: f.name, numberInt: f.fromN, cardId: f.fromLc } });
    if (!rc) { console.log(`  🔴 ${f.name} (#${f.fromN}/${f.fromLc}) 못찾음 → skip`); continue; }
    const clash = await prisma.regionCard.findFirst({ where: { setId: "kr-xya", numberInt: f.toN } });
    if (clash) { console.log(`  🔴 #${f.toN} 이미 존재(${clash.name}) → skip`); continue; }
    console.log(`  ✔ ${f.name}: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }
  if (APPLY) {
    const rows = await prisma.regionCard.findMany({ where: { setId: "kr-xya" }, select: { numberInt: true } });
    const uniq = new Set(rows.map(r=>r.numberInt)).size;
    await prisma.set.update({ where: { id: "kr-xya" }, data: { cardCount: rows.length } });
    console.log(`\n=== 검증 === kr-xya rows=${rows.length}, distinct=${uniq}`);
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
