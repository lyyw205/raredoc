/**
 * XY7(バンデットリング/밴디트링) JP 희귀도 + cardCount.
 *  · #93 ゲンシカイオーガEX·#94 ゲンシグラードンEX·#95 メガレックウザEX null → Ultra Rare(시크릿 골드EX). 교정시 UR 2→5 = 트래커 UR5 일치.
 *  · cardCount 95(stale)→97. date 2015-06-20 정상.
 *  ※잔여 C/U 1장차(DB C37/U24 vs 트래커 C36/U25)=Common1장이 실제Uncommon, 저우선 C/U배치감사로 이월.
 *  ※KR(92)은 UR5 시크릿 무수집(#93-97 부재)이라 JP만 교정. og-xy7 비동결. from-가드(null).
 * 실행: npx tsx scripts/fix-xy7.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const LCS = ["lc-jp-tcg-XY7-093", "lc-jp-tcg-XY7-094", "lc-jp-tcg-XY7-095"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const ur = await prisma.rarity.findFirst({ where: { code: "Ultra Rare" } });
  if (!ur) { console.log("🔴 UR 레어도 없음"); return; }
  console.log(`■ XY7 #93-95 null→UR + cardCount | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const lc of LCS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-XY7", cardId: lc }, include: { rarity: true } });
    if (!rc) { console.log(`  ~ ${lc}: 없음`); continue; }
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === "Ultra Rare") { console.log(`  = #${rc.numberInt} ${rc.name}: 이미 UR`); continue; }
    if (cur !== "(null)") { console.log(`  ⚠️ #${rc.numberInt} ${rc.name}: 현재 ${cur} ≠ null → skip(안전)`); continue; }
    console.log(`  ✔ #${rc.numberInt} ${rc.name}: null → Ultra Rare`);
    changed++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: ur.id } });
  }
  if (APPLY) {
    const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY7" } });
    await prisma.set.update({ where: { id: "jp-tcg-XY7" }, data: { cardCount: actual } });
    console.log(`\n✅ ${changed}장 교정 + cardCount→${actual}`);
    const urN = await prisma.regionCard.count({ where: { setId: "jp-tcg-XY7", rarityId: ur.id } });
    console.log(`  jp-tcg-XY7 UR=${urN}`);
  } else console.log(`\n(dry-run) ${changed}장. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
