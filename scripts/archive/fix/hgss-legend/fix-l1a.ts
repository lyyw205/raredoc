/**
 * L1a = ハートゴールドコレクション (HeartGold Collection, LEGEND era, 2009-10-09) 명확분.
 *  (B) Super Rare(4)→Rare Prime: #25·34·46·54. (cardCount 70=트래커 일치, C/U도 일치 → 무변경.)
 *  ※ Rare(20)→真Rare10/RareHolo10 분리는 per-card 워크플로 대기.
 *  실행: npx tsx scripts/fix-l1a.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const PRIME_NUMS = [25, 34, 46, 54];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-L1a" }, select: { cardPackId: true } });
  assertWritable([s?.cardPackId], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-l1a" });
  const primeId = (await prisma.rarity.findFirst({ where: { code: "Rare Prime" } }))?.id;
  if (!primeId) throw new Error("Rare Prime 없음");

  console.log(`■ L1a(HeartGold Collection) Prime교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const n of PRIME_NUMS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-L1a", numberInt: n }, include: { rarity: true } });
    if (!rc) { console.log(`  🔴 #${n} 없음`); continue; }
    if (rc.rarity?.code !== "Super Rare") { console.log(`  ⚠️ #${n} ${rc.name}: ${rc.rarity?.code ?? "null"}≠Super Rare → skip`); continue; }
    console.log(`  ✔ #${n} ${rc.name}: Super Rare → Rare Prime`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: primeId } });
  }
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-L1a" }, _count: true });
    const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));
    console.log("\n  L1a 분포:", dist.map((d)=>`${d.rarityId?rmap[d.rarityId]:"null"}=${d._count}`).join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
