/**
 * SM5M(ウルトラムーン/울트라문) 프리즘스타 교정 — 3번째 ◇가 양국 Uncommon 오라벨 → Prism Rare.
 *   · #65(JP)/#66(KR) 超ブーストエネルギー◇ / 초 부스트 에너지(프리즘스타) (lc-orphan-jp-tcg-SM5M-65)
 * 근거: SM5M ◇ 3장 = ギラティナ◇#30·ルナアーラ◇#32(이미 PR) + 超ブーストエネルギー◇(U로 오라벨).
 *   트래커 PR3/U20 = 교정 후 일치(DB는 PR2/U21). ◇마커(JP span / KR "(프리즘스타)")로 식별.
 *   + jp-tcg-SM5M cardCount 72(stale,시크릿前)→78. JP date 2017-12-08 정상. KR clean(72=78−HR3−UR3, dedup無).
 * ★EN(en-tcg-sm5 울트라프리즘)은 별도 레어도라 제외. og-sm5m 비동결. from-가드(U)+◇마커.
 * 실행: npx tsx scripts/fix-sm5m-pr.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const PR = "cmpp4wyvm001gyjuruksmugim"; // Prism Rare
const SETS = ["jp-tcg-SM5M", "kr-sm5m"];
const LC = "lc-orphan-jp-tcg-SM5M-65";

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM5M 超ブーストエネルギー◇ U→PR | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  const rows = await prisma.regionCard.findMany({ where: { cardId: LC, setId: { in: SETS } }, include: { rarity: true } });
  for (const rc of rows) {
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === "Prism Rare") { console.log(`  = [${rc.setId} #${rc.numberInt}] ${rc.name}: 이미 PR`); continue; }
    if (cur !== "Uncommon") { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${rc.name}: 현재 ${cur} ≠ Uncommon → skip(안전)`); continue; }
    if (!/프리즘스타|prismstar/.test(rc.name)) { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${rc.name}: ◇마커 없음 → skip(안전)`); continue; }
    console.log(`  ✔ [${rc.setId} #${rc.numberInt}] ${rc.name.replace(/<[^>]+>/g,'◇')}: Uncommon → Prism Rare`);
    changed++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: PR } });
  }
  if (APPLY) {
    const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-SM5M" } });
    await prisma.set.update({ where: { id: "jp-tcg-SM5M" }, data: { cardCount: actual } });
    console.log(`\n✅ ${changed}행 교정 + jp-tcg-SM5M cardCount→${actual}`);
    for (const setId of SETS) {
      const pr = await prisma.regionCard.count({ where: { setId, rarityId: PR } });
      const u = await prisma.regionCard.count({ where: { setId, rarity: { code: "Uncommon" } } });
      console.log(`  ${setId}: PR=${pr} U=${u}`);
    }
  } else console.log(`\n(dry-run) 변경예정 ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
