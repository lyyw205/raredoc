/**
 * L3 = 頂上大激突 (Clash at the Summit) 레어도 정밀 매칭 — 리서치 wf wwh1l4kqy(high conf, tcgcollector per-card + Bulbapedia).
 *  · #24 ラブカス: Uncommon→Common (C26→27/U22→21, 트래커 일치)
 *  · Rare→Rare Holo 10장: #3·11·21·30·37·41·49·52·55·67 (나머지 12장 真Rare 유지)
 *  · #81 アルフの石版: null→Rare Secret (Alph Lithograph, 081/080 시크릿)
 *  교정후 C27/U21/Rare12/RareHolo10/RarePrime4/LEGEND6/RareSecret1 = 81 (트래커 정확매칭). cardCount81·Prime4는 fix-l3.ts에서 적용완.
 *  실행: npx tsx scripts/fix-l3-rarity-split.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const TO_RARE_HOLO = [3, 11, 21, 30, 37, 41, 49, 52, 55, 67]; // from Rare
const TO_COMMON = [24];                                        // from Uncommon
const CARD81 = { n: 81, to: "Rare Secret", fromNull: true };

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-L3" }, select: { cardPackId: true } });
  assertWritable([s?.cardPackId], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-l3-rarity" });
  const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.code, r.id]));
  const idToCode = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));

  console.log(`■ L3 레어도 정밀매칭 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  const move = async (nums: number[], toCode: string, expectFrom: string) => {
    for (const n of nums) {
      const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-L3", numberInt: n }, include: { rarity: true } });
      if (!rc) { console.log(`  🔴 #${n} 없음`); continue; }
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === toCode) { console.log(`  = #${n} ${rc.name}: 이미 ${toCode}`); continue; }
      if (cur !== expectFrom) { console.log(`  ⚠️ #${n} ${rc.name}: 현재 ${cur}≠${expectFrom} → skip(안전)`); continue; }
      console.log(`  ✔ #${n} ${rc.name}: ${cur} → ${toCode}`);
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: rmap[toCode] } });
    }
  };

  console.log("· Rare → Rare Holo (10)"); await move(TO_RARE_HOLO, "Rare Holo", "Rare");
  console.log("· Uncommon → Common (1)"); await move(TO_COMMON, "Common", "Uncommon");
  console.log("· null → Rare Secret (#81)"); await move([CARD81.n], "Rare Secret", "(null)");

  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-L3" }, _count: true });
    console.log("\n  L3 최종:", dist.map((d)=>`${d.rarityId?idToCode[d.rarityId]:"null"}=${d._count}`).sort().join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
