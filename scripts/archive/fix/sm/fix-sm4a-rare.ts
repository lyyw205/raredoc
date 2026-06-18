/**
 * SM4A(超次元の暴獣/초차원의 침략자) 희귀도 교정 — #36 ゼルネアス/제르네아스 Common → Rare.
 * 근거: JP공식 pokemon-card.com(pg=541) 실측 R=7(트래커 일치)인데 DB R=6. 차집합 1장=#36 ゼルネアス(DB Common→공식 R).
 *   기존 DB R 6장(#13,14,16,27,32,40) 전부 공식 R 재확인. og-sm4a 비동결. 매칭=LC, from-가드(Common).
 * 실행: npx tsx scripts/fix-sm4a-rare.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const RARE = "cmpp4wykt000cyjurmsot429m";
const SETS = ["jp-tcg-SM4A", "kr-sm4a"];
const LC = "lc-orphan-jp-tcg-SM4A-36";

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM4A #36 ゼルネアス Common→Rare | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  const rows = await prisma.regionCard.findMany({ where: { cardId: LC, setId: { in: SETS } }, include: { rarity: true } });
  for (const rc of rows) {
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === "Rare") { console.log(`  = [${rc.setId} #${rc.numberInt}] ${rc.name}: 이미 Rare`); continue; }
    if (cur !== "Common") { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${rc.name}: 현재 ${cur} ≠ Common → skip(안전)`); continue; }
    console.log(`  ✔ [${rc.setId} #${rc.numberInt}] ${rc.name}: Common → Rare`);
    changed++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: RARE } });
  }
  if (APPLY) console.log(`\n✅ ${changed}행 교정`);
  else console.log(`\n(dry-run) 변경예정 ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
