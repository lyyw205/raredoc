/**
 * SM0(ピカチュウと新しい仲間たち) 희귀도 정리 — 4장 Common → null(무레어도).
 * 근거: 트래커 "This set doesn't have any cards with a rarity"(Normal Holo 4, 레어도 티어 없음). 4장 인트로 프로모(レア도심볼 없음)인데 DB가 Common 오라벨.
 *   JP단독(kr-sm0 없음). 무레어도=null(강화확장팩 베이스·스타터·에너지와 동일 컨벤션). og-sm0 비동결. from-가드(Common).
 * 실행: npx tsx scripts/fix-sm0-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const rows = await prisma.regionCard.findMany({ where: { setId: "jp-tcg-SM0" }, include: { rarity: true } });
  console.log(`■ SM0 4장 Common→null | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const rc of rows) {
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === "(null)") { console.log(`  = #${rc.numberInt} ${rc.name}: 이미 null`); continue; }
    if (cur !== "Common") { console.log(`  ⚠️ #${rc.numberInt} ${rc.name}: 현재 ${cur} ≠ Common → skip(안전)`); continue; }
    console.log(`  ✔ #${rc.numberInt} ${rc.name}: Common → null`);
    changed++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: null } });
  }
  console.log(APPLY ? `\n✅ ${changed}행 null화` : `\n(dry-run) ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
