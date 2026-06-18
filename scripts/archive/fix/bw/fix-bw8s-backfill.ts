/**
 * BW8S(ラセンフォース/Spiral Force) base 레어도 백필 + kr-bw8(Bolt) KR발매일 — 공식(pg=373, high conf).
 *  · jp-tcg-BW8S base #1-51 = C24/U16/R11 (공식 전수확정). 현재 null49(미수집) → 백필. #52-58 SR4/UR3 기존유지(공식 BW트윈 시크릿 미등재).
 *    교정후 C24/U16/R11/SR4/UR3=58 트래커 완전일치.
 *  · kr-bw8(=Bolt 트윈) releaseDate 2012-12-14(=JP날짜 오입력)→2013-05-01 (namu 국기태그 high conf, 트윈공통 KR날짜).
 *  ※KR 스파이럴포스(kr-bw8s) 세트 부재=미수집(별도). og-bw8s 비동결. 실행: npx tsx scripts/fix-bw8s-backfill.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const MAP: Record<string, number[]> = {
  Common: [1,3,4,7,8,10,11,13,14,17,18,20,21,26,28,29,30,31,34,35,40,42,43,45],
  Uncommon: [2,15,16,22,23,24,32,36,37,41,44,46,47,48,49,51],
  Rare: [5,6,9,12,19,25,27,33,38,39,50],
};

async function main() {
  const APPLY = process.argv.includes("--apply");
  const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.code, r.id]));
  const numToId = new Map<number, string>();
  for (const [code, nums] of Object.entries(MAP)) for (const n of nums) numToId.set(n, rmap[code]);
  console.log(`■ BW8S base 레어도 백필(C24/U16/R11) + kr-bw8 date | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  const rows = await prisma.regionCard.findMany({ where: { setId: "jp-tcg-BW8S", numberInt: { lte: 51 } }, include: { rarity: true } });
  let changed = 0, already = 0;
  for (const rc of rows) {
    const want = numToId.get(rc.numberInt);
    if (!want) { console.log(`  ~ #${rc.numberInt} 맵없음`); continue; }
    if (rc.rarityId === want) { already++; continue; }
    changed++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: want } });
  }
  console.log(`  base 백필 ${changed}행 (이미일치 ${already})`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "kr-bw8" }, data: { releaseDate: new Date("2013-05-01T00:00:00Z") } });
    console.log("  kr-bw8(Bolt) date→2013-05-01");
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-BW8S" }, _count: true });
    console.log("  BW8S 분포:", dist.map((d)=>`${Object.keys(rmap).find(k=>rmap[k]===d.rarityId)??"null"}=${d._count}`).sort().join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
