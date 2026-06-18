/**
 * SM5+(ウルトラフォース/울트라포스) 프리즘스타 희귀도 교정 — 2장이 양국 null → Prism Rare.
 *   · #37 アルセウス◇ / 아르세우스(프리즘스타)  (lc-jp-tcg-SM5+-037)
 *   · #48 ビーストエネルギー◇ / 비스트에너지(프리즘스타) (lc-jp-tcg-SM5+-048)
 * 근거: 트래커 PR2인데 DB PR0(둘 다 null). KR엔 "(프리즘스타)" 마커 있음 = 확정. JP는 마커 누락 → 함께 추가.
 *   둘 다 울트라포스의 알려진 ◇ 2장(아르세우스◇·비스트에너지◇). 매칭=logicalCardId(JP/KR 공유).
 * ※ 이 팩의 JP 번호시프트/누락 5장·KR dedup 은 공식검증 후 별도. (cardCount 미변경)
 * og-sm5+ 비동결. from-가드(null) + LC한정. 실행: npx tsx scripts/fix-sm5plus-pr.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const PR = "cmpp4wyvm001gyjuruksmugim"; // Prism Rare
const SETS = ["jp-tcg-SM5+", "kr-sm5+"];
const LCS = ["lc-jp-tcg-SM5+-037", "lc-jp-tcg-SM5+-048"];
// JP 이름 ◇마커 백필(KR엔 이미 (프리즘스타) 있음)
const JP_NAME_FIX: { num: number; from: string; to: string }[] = [
  { num: 37, from: "アルセウス", to: 'アルセウス<span class="pcg pcg-prismstar"></span>' },
  { num: 48, from: "ビーストエネルギー", to: 'ビーストエネルギー<span class="pcg pcg-prismstar"></span>' },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM5+ 프리즘스타 2장 → Prism Rare (+JP ◇마커) | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const lc of LCS) {
    const rows = await prisma.regionCard.findMany({ where: { cardId: lc, setId: { in: SETS } }, include: { rarity: true } });
    if (!rows.length) { console.log(`  ~ ${lc}: 대상행 없음`); continue; }
    for (const rc of rows) {
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === "Prism Rare") { console.log(`  = [${rc.setId} #${rc.numberInt}] ${rc.name}: 이미 PR`); continue; }
      if (cur !== "(null)") { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${rc.name}: 현재 ${cur} ≠ null → skip(안전)`); continue; }
      console.log(`  ✔ [${rc.setId} #${rc.numberInt}] ${rc.name.replace(/<[^>]+>/g,'◇')}: null → Prism Rare`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: PR } });
    }
  }
  // JP ◇마커 백필
  for (const f of JP_NAME_FIX) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: "jp-tcg-SM5+", numberInt: f.num } });
    if (!rc) { console.log(`  ~ jp #${f.num}: 없음`); continue; }
    if (rc.name === f.to) { console.log(`  = jp #${f.num}: ◇마커 이미 있음`); continue; }
    if (rc.name !== f.from) { console.log(`  ⚠️ jp #${f.num}: 이름 '${rc.name}' ≠ '${f.from}' → skip(안전)`); continue; }
    console.log(`  ✔ jp #${f.num} 이름: '${f.from}' → '${f.from}◇'`);
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { name: f.to } });
  }
  if (APPLY) {
    console.log(`\n✅ PR ${changed}행 교정`);
    for (const setId of SETS) {
      const pr = await prisma.regionCard.count({ where: { setId, rarityId: PR } });
      console.log(`  ${setId}: PR=${pr}`);
    }
  } else console.log(`\n(dry-run) PR 변경예정 ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
