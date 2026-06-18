/**
 * L3 = 頂上大激突 (Clash at the Summit, LEGEND era, 2010-07-08) 명확 교정분만.
 *  (A) jp-tcg-L3 cardCount 80(stale)→81 (실제 rows=트래커 Standard 81).
 *  (B) Super Rare(4) → Rare Prime: #6 メガヤンマ·#7 セレビィ·#27 マルマイン·#45 カイリキー = Prime 카드. "Super Rare"는 2010 시대착오, DB에 "Rare Prime" 코드 존재.
 *  ※ Rare/Rare Holo 분리(DB Rare22=트래커 Rare12+RareHolo10), C/U 1장차(DB C26/U22 vs 트래커 C27/U21), null #81 アルフの石版 = 사용자 결정/추가검증 대기(JP 공식은 홀로 미구분).
 *  ※ LEGEND 시대는 KR판 없음(JP+EN). 실행: npx tsx scripts/fix-l3.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const PRIME_NUMS = [6, 7, 27, 45];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const s = await prisma.set.findUnique({ where: { id: "jp-tcg-L3" }, select: { cardPackId: true } });
  assertWritable([s?.cardPackId], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-l3" });
  const primeId = (await prisma.rarity.findFirst({ where: { code: "Rare Prime" } }))?.id;
  if (!primeId) throw new Error("Rare Prime rarity 없음");

  console.log(`■ L3(Clash at the Summit) 명확교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  const rows = await prisma.regionCard.count({ where: { setId: "jp-tcg-L3" } });
  const meta = await prisma.set.findUnique({ where: { id: "jp-tcg-L3" }, select: { cardCount: true } });
  console.log(`· (A) cardCount ${meta?.cardCount} → ${rows}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-L3" }, data: { cardCount: rows } });

  console.log("· (B) Super Rare → Rare Prime (4)");
  for (const n of PRIME_NUMS) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-L3", numberInt: n }, include: { rarity: true } });
    if (!rc) { console.log(`  🔴 #${n} 없음`); continue; }
    if (rc.rarity?.code !== "Super Rare") { console.log(`  ⚠️ #${n} ${rc.name}: 현재 ${rc.rarity?.code ?? "null"}≠Super Rare → skip(안전)`); continue; }
    console.log(`  ✔ #${n} ${rc.name}: Super Rare → Rare Prime`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: primeId } });
  }

  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-L3" }, _count: true });
    const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));
    console.log("\n  L3 분포:", dist.map((d)=>`${d.rarityId?rmap[d.rarityId]:"null"}=${d._count}`).join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
