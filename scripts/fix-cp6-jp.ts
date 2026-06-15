/**
 * CP6(拡張パック 20th Anniversary) JP 희귀도 교정 — 2장 null → Uncommon.
 *   #101 ナッシー[Exeggutor], #102 イマクニ?のドードー (lc-jp-tcg-CP6-101/-102)
 * 근거: 트래커 C30/U32/R14/RR14/SR13=103. DB는 C30/U30/R14/RR14/SR13 + null2. C/R/RR/SR 전부 일치하고 U만 2부족 →
 *   null 2장이 Uncommon(산식 확정). 교정시 JP 트래커 완전일치.
 * ※ KR(kr-cp6 113)은 중복 없는 하이브리드(JP+EN Evolutions 야도란EX라인+기본에너지9)라 dedup 불필요·미변경.
 * og-cp6 비동결. from-가드(null). 실행: npx tsx scripts/fix-cp6-jp.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SETID = "jp-tcg-CP6";
const LCS = ["lc-jp-tcg-CP6-101", "lc-jp-tcg-CP6-102"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const u = await prisma.rarity.findFirst({ where: { code: "Uncommon" } });
  if (!u) { console.log("🔴 Uncommon 레어도 없음"); return; }
  console.log(`■ CP6 #101/#102 null→Uncommon | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const lc of LCS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SETID, cardId: lc }, include: { rarity: true } });
    if (!rc) { console.log(`  ~ ${lc}: 없음`); continue; }
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === "Uncommon") { console.log(`  = #${rc.numberInt} ${rc.name}: 이미 Uncommon`); continue; }
    if (cur !== "(null)") { console.log(`  ⚠️ #${rc.numberInt} ${rc.name}: 현재 ${cur} ≠ null → skip(안전)`); continue; }
    console.log(`  ✔ #${rc.numberInt} ${rc.name}: null → Uncommon`);
    changed++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: u.id } });
  }
  if (APPLY) {
    console.log(`\n✅ ${changed}행 교정`);
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: SETID }, _count: true });
    const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));
    console.log("  JP 분포:", dist.map((d) => `${rmap[d.rarityId ?? ""] ?? "null"}=${d._count}`).sort().join(" "));
  } else console.log(`\n(dry-run) ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
