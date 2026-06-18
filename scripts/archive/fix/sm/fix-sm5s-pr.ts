/**
 * SM5S(ウルトラサン/울트라썬) 프리즘스타 교정 — 3번째 ◇가 양국 Uncommon 오라벨 → Prism Rare.
 *   · #59(JP)/#62(KR) アカギ◇ / 태홍(프리즘스타) (Cyrus, lc-orphan-jp-tcg-SM5S-59)
 * 근거: SM5S ◇ 3장 = ダークライ◇#31·ソルガレオ◇#43(이미 PR) + アカギ◇(U로 오라벨).
 *   트래커 PR3/U20 = 교정 후 일치(DB는 PR2/U21). ◇마커로 식별. SM5M과 동일패턴(쌍둥이팩).
 *   + jp-tcg-SM5S cardCount 72(stale)→78. JP date 2017-12-08 정상. KR clean(72=78−HR3−UR3, dedup無).
 * ★EN(en-tcg-sm5)은 별도 레어도라 제외. og-sm5s 비동결. from-가드(U)+◇마커.
 * 실행: npx tsx scripts/fix-sm5s-pr.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const PR = "cmpp4wyvm001gyjuruksmugim"; // Prism Rare
const SETS = ["jp-tcg-SM5S", "kr-sm5s"];
const LC = "lc-orphan-jp-tcg-SM5S-59";

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM5S アカギ◇ U→PR | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
    const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-SM5S" } });
    await prisma.set.update({ where: { id: "jp-tcg-SM5S" }, data: { cardCount: actual } });
    console.log(`\n✅ ${changed}행 교정 + jp-tcg-SM5S cardCount→${actual}`);
    for (const setId of SETS) {
      const pr = await prisma.regionCard.count({ where: { setId, rarityId: PR } });
      const u = await prisma.regionCard.count({ where: { setId, rarity: { code: "Uncommon" } } });
      console.log(`  ${setId}: PR=${pr} U=${u}`);
    }
  } else console.log(`\n(dry-run) 변경예정 ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
