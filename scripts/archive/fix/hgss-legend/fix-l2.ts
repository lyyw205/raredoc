/**
 * L2 = よみがえる伝説 (Reviving Legends, LEGEND era, 2010-02-11) 명확 교정분.
 *  (A) jp-tcg-L2 cardCount 80(stale)→81.
 *  (B) Super Rare(4)→Rare Prime: #15 キングドラ·#20 ランターン·#44 バンギラス·#47 ハガネール = Prime.
 *  ※ C/U는 이미 트래커 일치(C26/U22). Rare 분리(22→真Rare12+RareHolo10)·null #81 アルフの石版 = per-card 워크플로 대기.
 *  ※ LEGEND 시대 KR 없음(JP+EN). 실행: npx tsx scripts/fix-l2.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const PRIME_NUMS = [15, 20, 44, 47];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-L2" }, select: { cardPackId: true } });
  assertWritable([s?.cardPackId], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-l2" });
  const primeId = (await prisma.rarity.findFirst({ where: { code: "Rare Prime" } }))?.id;
  if (!primeId) throw new Error("Rare Prime 없음");

  console.log(`■ L2(Reviving Legends) 명확교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  const rows = await prisma.regionCard.count({ where: { setId: "jp-tcg-L2" } });
  const meta = await prisma.set.findUnique({ where: { id: "jp-tcg-L2" }, select: { cardCount: true } });
  console.log(`· (A) cardCount ${meta?.cardCount} → ${rows}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-L2" }, data: { cardCount: rows } });

  console.log("· (B) Super Rare → Rare Prime (4)");
  for (const n of PRIME_NUMS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-L2", numberInt: n }, include: { rarity: true } });
    if (!rc) { console.log(`  🔴 #${n} 없음`); continue; }
    if (rc.rarity?.code !== "Super Rare") { console.log(`  ⚠️ #${n} ${rc.name}: ${rc.rarity?.code ?? "null"}≠Super Rare → skip`); continue; }
    console.log(`  ✔ #${n} ${rc.name}: Super Rare → Rare Prime`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: primeId } });
  }
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-L2" }, _count: true });
    const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));
    console.log("\n  L2 분포:", dist.map((d)=>`${d.rarityId?rmap[d.rarityId]:"null"}=${d._count}`).join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
