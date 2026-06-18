/**
 * L1a = ハートゴールドコレクション (HeartGold Collection) 레어도 정밀 매칭 — 리서치 wf wz79gqdgr(high conf, tcgcollector; Bulba 부분교차).
 *  · Rare→Rare Holo 10장: #8·11·14·29·37·39·41·49·51·59 (나머지 10장 真Rare 유지). 시크릿 없음.
 *  교정후 C24/U20/Rare10/RareHolo10/RarePrime4/LEGEND2 = 70 (트래커 정확매칭). Prime4는 fix-l1a.ts 적용완.
 *  실행: npx tsx scripts/fix-l1a-rarity-split.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const TO_RARE_HOLO = [8, 11, 14, 29, 37, 39, 41, 49, 51, 59];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-L1a" }, select: { cardPackId: true } });
  assertWritable([s?.cardPackId], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-l1a-rarity" });
  const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.code, r.id]));
  const idToCode = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));

  console.log(`■ L1a 레어도 정밀매칭 | ${APPLY ? "★APPLY" : "(dry-run)"}\n· Rare → Rare Holo (10)`);
  for (const n of TO_RARE_HOLO) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-L1a", numberInt: n }, include: { rarity: true } });
    if (!rc) { console.log(`  🔴 #${n} 없음`); continue; }
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === "Rare Holo") { console.log(`  = #${n} ${rc.name}: 이미 Rare Holo`); continue; }
    if (cur !== "Rare") { console.log(`  ⚠️ #${n} ${rc.name}: ${cur}≠Rare → skip(안전)`); continue; }
    console.log(`  ✔ #${n} ${rc.name}: Rare → Rare Holo`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: rmap["Rare Holo"] } });
  }
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-L1a" }, _count: true });
    console.log("\n  L1a 최종:", dist.map((d)=>`${d.rarityId?idToCode[d.rarityId]:"null"}=${d._count}`).sort().join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
