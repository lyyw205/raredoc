/**
 * SM8(超爆インパクト/버스트임팩트) 희귀도 교정 — 루자미네◇(Lusamine Prism Star)가 양국 Uncommon 오라벨 → Prism Rare.
 * 근거: SM8 프리즘스타(◇) 3장 = セレビィ◇·ヒートファクトリー◇·ルザミーネ◇. 앞 2장은 PR인데 ルザミーネ◇만 U였음.
 *   트래커 PR3/U33 = 교정 후 일치(DB는 PR2/U34였음). ◇마커(name pcg-prismstar / KR "프리즘스타")로 식별.
 * JP #92 · KR #89(트레이너 가나다 재정렬로 번호다름). + jp-tcg-SM8 cardCount 103→111 동기화.
 * og-sm8 비동결. from-가드(U). 실행: npx tsx scripts/fix-sm8-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const PR_ID = "cmpp4wyvm001gyjuruksmugim"; // Prism Rare
const FIXES: { setId: string; num: number }[] = [
  { setId: "jp-tcg-SM8", num: 92 }, // ルザミーネ◇
  { setId: "kr-sm8", num: 89 },     // 루자미네(프리즘스타)
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM8 루자미네◇ U→PR 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: f.setId, numberInt: f.num }, include: { rarity: true } });
    if (!rc) { console.log(`  ~ ${f.setId} #${f.num}: 없음`); continue; }
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === "Prism Rare") { console.log(`  = ${f.setId} #${f.num} ${rc.name}: 이미 PR`); continue; }
    if (cur !== "Uncommon") { console.log(`  ⚠️ ${f.setId} #${f.num} ${rc.name}: 현재 ${cur} ≠ Uncommon → skip`); continue; }
    if (!/프리즘스타|prismstar/.test(rc.name)) { console.log(`  ⚠️ ${f.setId} #${f.num} ${rc.name}: ◇마커 없음 → skip(안전)`); continue; }
    console.log(`  ${f.setId} #${f.num} ${rc.name.replace(/<[^>]+>/g,'◇')}: Uncommon → Prism Rare`);
    changed++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: PR_ID } });
  }
  if (APPLY) {
    const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-SM8" } });
    await prisma.set.update({ where: { id: "jp-tcg-SM8" }, data: { cardCount: actual } });
    console.log(`\n✅ ${changed}장 교정 + jp-tcg-SM8 cardCount→${actual}`);
    for (const setId of ["jp-tcg-SM8", "kr-sm8"]) {
      const pr = await prisma.regionCard.count({ where: { setId, rarityId: PR_ID } });
      console.log(`  ${setId}: PR=${pr}`);
    }
  } else console.log(`\n(dry-run) 변경예정 ${changed}장. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
