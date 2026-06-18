/**
 * L1b = ソウルシルバーコレクション (SoulSilver Collection, LEGEND era, 2009-10-09) 정밀 교정.
 *  (A) cardCount 70→71 (DB는 이미 71행 보유, 필드만 stale).
 *  (B) Super Rare(4)→Rare Prime: #9 メガニウム·#17 バクフーン·#37 クロバット·#61 リングマ (HGSS SoulSilver Prime 4종).
 *  (C) null #71 アルフの石版(Alph Lithograph) → Rare Secret (071/070 시크릿).
 *  (D) Rare(20)→真Rare10/RareHolo10 분리: TO_RARE_HOLO (리서치 wf wg3xwoj03 결과로 확정).
 *  교정후 C24/U20/Rare10/RareHolo10/RarePrime4/LEGEND2/RareSecret1 = 71 (트래커 정확매칭).
 *  실행: npx tsx scripts/fix-l1b.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const PRIME_NUMS = [9, 17, 37, 61];
// wf wg3xwoj03 (3/3 만장일치, tcgcollector×2 + Bulbapedia raw): Rare Holo 10장
const TO_RARE_HOLO: number[] = [13, 21, 23, 25, 27, 31, 33, 43, 47, 49];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-L1b" }, select: { cardPackId: true, cardCount: true } });
  assertWritable([s?.cardPackId], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-l1b" });
  const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.code, r.id]));
  const idToCode = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));

  console.log(`■ L1b(SoulSilver Collection) 정밀교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  // (A) cardCount
  console.log(`· cardCount: ${s?.cardCount} → 71`);
  if (APPLY && s?.cardCount !== 71) await prisma.set.update({ where: { id: "jp-tcg-L1b" }, data: { cardCount: 71 } });

  const move = async (nums: number[], toCode: string, expectFrom: string) => {
    for (const n of nums) {
      const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-L1b", numberInt: n }, include: { rarity: true } });
      if (!rc) { console.log(`  🔴 #${n} 없음`); continue; }
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === toCode) { console.log(`  = #${n} ${rc.name}: 이미 ${toCode}`); continue; }
      if (cur !== expectFrom) { console.log(`  ⚠️ #${n} ${rc.name}: 현재 ${cur}≠${expectFrom} → skip(안전)`); continue; }
      console.log(`  ✔ #${n} ${rc.name}: ${cur} → ${toCode}`);
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: rmap[toCode] } });
    }
  };

  console.log("\n· Super Rare → Rare Prime (4)"); await move(PRIME_NUMS, "Rare Prime", "Super Rare");
  console.log("· null → Rare Secret (#71)"); await move([71], "Rare Secret", "(null)");
  console.log(`· Rare → Rare Holo (${TO_RARE_HOLO.length})`);
  if (!TO_RARE_HOLO.length) console.log("  ⚠️ TO_RARE_HOLO 비어있음 — 리서치 결과 입력 필요");
  await move(TO_RARE_HOLO, "Rare Holo", "Rare");

  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-L1b" }, _count: true });
    console.log("\n  L1b 최종:", dist.map((d) => `${d.rarityId ? idToCode[d.rarityId] : "null"}=${d._count}`).sort().join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
