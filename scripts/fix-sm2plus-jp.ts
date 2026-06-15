/**
 * SM2+(新たなる試練の向こう/새로운 시련) JP 교정 — 강화확장팩.
 *  · #7 カプ・ブルルGX null → Double Rare(RR): 베이스 GX 6장 중 유일하게 null이었음(#10/18/29/34/40은 RR). 교정시 트래커 null47/RR6/SR8/HR6/UR3=70 완전일치.
 *  · jp-tcg-sm2+ cardCount 61(stale)→70(actual). code 'sm2+'(소문자)→'SM2+'.
 *  ※ id 'jp-tcg-sm2+'(소문자, LC도 lc-jp-tcg-sm2+-*) 는 마이그 위험으로 보류(최종점검). 이름교정은 공식확인 후 별도.
 * og-sm2+ 비동결. from-가드(null). 실행: npx tsx scripts/fix-sm2plus-jp.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SET = "jp-tcg-sm2+";
const LC = "lc-jp-tcg-sm2+-007"; // カプ・ブルルGX

async function main() {
  const APPLY = process.argv.includes("--apply");
  const rr = await prisma.rarity.findFirst({ where: { code: "Double Rare" } });
  if (!rr) { console.log("🔴 Double Rare 레어도 없음"); return; }
  console.log(`■ SM2+ JP 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  // 1) #7 카푸브루루GX null→RR
  const rc = await prisma.regionCard.findFirst({ where: { setId: SET, cardId: LC }, include: { rarity: true } });
  if (!rc) { console.log(`  🔴 ${LC} 없음`); }
  else {
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === "Double Rare") console.log(`  = #${rc.numberInt} ${rc.name}: 이미 RR`);
    else if (cur !== "(null)") console.log(`  ⚠️ #${rc.numberInt} ${rc.name}: 현재 ${cur} ≠ null → skip(안전)`);
    else if (!/GX/.test(rc.name)) console.log(`  ⚠️ #${rc.numberInt} ${rc.name}: GX 아님 → skip(안전)`);
    else { console.log(`  ✔ #${rc.numberInt} ${rc.name}: null → Double Rare`); if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: rr.id } }); }
  }
  // 2) cardCount + code
  if (APPLY) {
    const actual = await prisma.regionCard.count({ where: { setId: SET } });
    await prisma.set.update({ where: { id: SET }, data: { cardCount: actual, code: "SM2+" } });
    const s = await prisma.set.findUnique({ where: { id: SET }, select: { cardCount: true, code: true } });
    console.log(`\n✅ cardCount→${s?.cardCount}, code→${s?.code}`);
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: SET }, _count: true });
    const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));
    console.log("  JP 분포:", dist.map((d) => `${rmap[d.rarityId ?? ""] ?? "null"}=${d._count}`).sort().join(" "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
