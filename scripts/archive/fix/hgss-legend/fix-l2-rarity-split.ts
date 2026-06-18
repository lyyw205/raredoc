/**
 * L2 = よみがえる伝説 (Reviving Legends) 레어도 정밀 매칭 — 리서치 wf wbfk7r7u1(high conf, tcgcollector+Bulbapedia 일치).
 *  · Rare→Rare Holo 10장: #4·11·24·32·37·43·46·48·61·62 (나머지 12장 真Rare 유지)
 *  · #81 アルフの石版: null→Rare Secret
 *  (C/U는 이미 트래커 일치=무변경.) 교정후 C26/U22/Rare12/RareHolo10/RarePrime4/LEGEND6/RareSecret1=81.
 *  실행: npx tsx scripts/fix-l2-rarity-split.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const TO_RARE_HOLO = [4, 11, 24, 32, 37, 43, 46, 48, 61, 62];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-L2" }, select: { cardPackId: true } });
  assertWritable([s?.cardPackId], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-l2-rarity" });
  const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.code, r.id]));
  const idToCode = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));

  console.log(`■ L2 레어도 정밀매칭 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  const move = async (nums: number[], toCode: string, expectFrom: string) => {
    for (const n of nums) {
      const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-L2", numberInt: n }, include: { rarity: true } });
      if (!rc) { console.log(`  🔴 #${n} 없음`); continue; }
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === toCode) { console.log(`  = #${n} ${rc.name}: 이미 ${toCode}`); continue; }
      if (cur !== expectFrom) { console.log(`  ⚠️ #${n} ${rc.name}: 현재 ${cur}≠${expectFrom} → skip(안전)`); continue; }
      console.log(`  ✔ #${n} ${rc.name}: ${cur} → ${toCode}`);
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: rmap[toCode] } });
    }
  };
  console.log("· Rare → Rare Holo (10)"); await move(TO_RARE_HOLO, "Rare Holo", "Rare");
  console.log("· null → Rare Secret (#81)"); await move([81], "Rare Secret", "(null)");

  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-L2" }, _count: true });
    console.log("\n  L2 최종:", dist.map((d)=>`${d.rarityId?idToCode[d.rarityId]:"null"}=${d._count}`).sort().join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
