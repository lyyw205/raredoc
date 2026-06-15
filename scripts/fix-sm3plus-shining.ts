/**
 * SM3+(ひかる伝説/빛나는 전설) ひかる(Shining) 8장 희귀도 라벨 — 양국 null → "Rare Shining".
 *   #4 ひかるセレビィ·#10 ひかるゲノセクト·#28 ひかるボルケニオン·#41 ひかるミュウ·#43 ひかるジラーチ·#57 ひかるレックウザ·#58 ひかるルギア·#59 ひかるアルセウス
 * 근거: 트래커 "Rare Shining" 티어. DB엔 이 8장이 null. 마커=이름에 ひかる/빛나는. 매칭=LC(JP/KR공유 lc-jp-tcg-SM3+-NNN).
 *   + jp-tcg-SM3+ cardCount 77(stale)→82. ※트래커 RareShining=9 vs DB ひかる8+UR1(#82 ミュウツーGX) 불일치는 공식확인중(이 스크립트는 8장만).
 * og-sm3+ 비동결. from-가드(null)+마커. 실행: npx tsx scripts/fix-sm3plus-shining.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const RARE_SHINING = "cmpp4wyou000ryjurov01v9da";
const SETS = ["jp-tcg-SM3+", "kr-sm3+"];
const LCS = [4,10,28,41,43,57,58,59].map((n) => `lc-jp-tcg-SM3+-${String(n).padStart(3,"0")}`);

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM3+ ひかる 8장 null→Rare Shining | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const lc of LCS) {
    const rows = await prisma.regionCard.findMany({ where: { cardId: lc, setId: { in: SETS } }, include: { rarity: true } });
    for (const rc of rows) {
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === "Rare Shining") { console.log(`  = [${rc.setId} #${rc.numberInt}] ${rc.name}: 이미 Rare Shining`); continue; }
      if (cur !== "(null)") { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${rc.name}: 현재 ${cur} ≠ null → skip(안전)`); continue; }
      if (!/ひかる|빛나는/.test(rc.name)) { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${rc.name}: ひかる마커 없음 → skip(안전)`); continue; }
      console.log(`  ✔ [${rc.setId} #${rc.numberInt}] ${rc.name}: null → Rare Shining`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: RARE_SHINING } });
    }
  }
  if (APPLY) {
    const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-SM3+" } });
    await prisma.set.update({ where: { id: "jp-tcg-SM3+" }, data: { cardCount: actual } });
    console.log(`\n✅ ${changed}행 교정 + jp-tcg-SM3+ cardCount→${actual}`);
    for (const setId of SETS) {
      const rs = await prisma.regionCard.count({ where: { setId, rarityId: RARE_SHINING } });
      console.log(`  ${setId}: Rare Shining=${rs}`);
    }
  } else console.log(`\n(dry-run) 변경예정 ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
