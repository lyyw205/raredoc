/**
 * CP2(伝説キラコレクション) 레어도 백필 + KR발매일 — 공식(pg=421, high conf) 카드별 레어도 확정.
 *  · DB가 전부 null이었음(오류). 공식 C12/U3/R10/RR2=27(트래커 일치). 27장 번호별 백필(양국, numberInt 매칭).
 *    RR=#8 ピカチュウEX·#12 フーパEX. U=#4/7/26. (CP5와 달리 CP2는 레어도 있음.)
 *  · kr-cp2 releaseDate → 2015-11-05 (namu 국기태그 high conf).
 * og-cp2 비동결. from-가드(null). 실행: npx tsx scripts/fix-cp2-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const MAP: Record<string, number[]> = {
  Common: [1,3,6,10,11,13,14,15,16,22,25,27],
  Uncommon: [4,7,26],
  Rare: [2,5,9,17,18,19,20,21,23,24],
  "Double Rare": [8,12],
};
const SETS = ["jp-tcg-CP2", "kr-cp2"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.code, r.id]));
  // number → rarityId
  const numToId = new Map<number, string>();
  for (const [code, nums] of Object.entries(MAP)) { for (const n of nums) numToId.set(n, rmap[code]); }
  console.log(`■ CP2 레어도 백필(C12/U3/R10/RR2) + KR date | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0, skipped = 0;
  for (const setId of SETS) {
    const rows = await prisma.regionCard.findMany({ where: { setId }, include: { rarity: true } });
    for (const rc of rows) {
      const want = numToId.get(rc.numberInt);
      if (!want) { console.log(`  ~ ${setId} #${rc.numberInt}: 맵에 없음`); continue; }
      const cur = rc.rarity?.code ?? "(null)";
      if (rc.rarityId === want) { skipped++; continue; }
      if (cur !== "(null)") { console.log(`  ⚠️ ${setId} #${rc.numberInt} ${rc.name}: 현재 ${cur}≠null → skip(안전)`); continue; }
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: want } });
    }
  }
  console.log(`  백필 ${changed}행 (이미일치 ${skipped})`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "kr-cp2" }, data: { releaseDate: new Date("2015-11-05T00:00:00Z") } });
    console.log("  kr-cp2 date→2015-11-05");
    console.log("\n=== 검증 ===");
    for (const setId of SETS) {
      const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId }, _count: true });
      console.log(`  ${setId}:`, dist.map((d)=>`${Object.keys(rmap).find(k=>rmap[k]===d.rarityId)??"null"}=${d._count}`).sort().join(" "));
    }
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
