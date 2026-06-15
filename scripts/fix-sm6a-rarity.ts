/**
 * SM6a(ドラゴンストーム/드래곤스톰) 희귀도 교정 — ワタル◇(Lance Prism Star)가 양국 Uncommon 오라벨 → Prism Rare.
 * 근거: SM6a 프리즘스타(◇) 2장 = ビクティニ◇(#4, 이미 PR) + ワタル◇(#50, U로 오라벨).
 *   트래커 PR2/U16 = 교정 후 일치(DB는 PR1/U17이었음). ◇마커(JP span pcg-prismstar / KR "(프리즘스타)")로 식별.
 * JP #50 ワタル◇ · KR #48 목호(프리즘스타)(=Lance, 가나다 재정렬로 번호다름, lc-orphan-...-50 미러).
 *   + jp-tcg-SM6a cardCount 59(stale, 시크릿前)→66 동기화. JP releaseDate 2018-04-06 정상.
 * og-sm6a 비동결. from-가드(U)+◇마커가드. 실행: npx tsx scripts/fix-sm6a-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const PR_ID = "cmpp4wyvm001gyjuruksmugim"; // Prism Rare
const FIXES: { setId: string; num: number }[] = [
  { setId: "jp-tcg-SM6a", num: 50 }, // ワタル◇
  { setId: "kr-sm6a", num: 48 },     // 목호(프리즘스타)
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM6a ワタル◇ U→PR 교정 + JP cardCount 동기화 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
    const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-SM6a" } });
    await prisma.set.update({ where: { id: "jp-tcg-SM6a" }, data: { cardCount: actual } });
    console.log(`\n✅ ${changed}장 교정 + jp-tcg-SM6a cardCount→${actual}`);
    for (const setId of ["jp-tcg-SM6a", "kr-sm6a"]) {
      const pr = await prisma.regionCard.count({ where: { setId, rarityId: PR_ID } });
      console.log(`  ${setId}: PR=${pr}`);
    }
  } else console.log(`\n(dry-run) 변경예정 ${changed}장. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
