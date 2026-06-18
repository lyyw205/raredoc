/**
 * SM6(禁断の光/금단의 빛) 희귀도 스크램블 교정 — JP공식(pokemon-card.com pg=552) 전수실측 기준.
 * 트래커 C44/U32/R10/RR5/PR3/SR8/HR5/UR3=110 vs DB C45/U34/R8/RR5/PR2/... → 4장 오분류:
 *   · #14 マフォクシー/마폭시   Uncommon → Rare
 *   · #56 アクジキング/악식킹    Common   → Rare
 *   · #86 カルネ/카르네(KR#89)   Uncommon → Rare
 *   · #89 フラダリ◇/플라드리◇(KR#90) Rare → Prism Rare  (3번째 ◇, ic_prismstar 공식확인; ボルケニオン◇#27·ディアンシー◇#51와 함께)
 * 교정후 JP=트래커 완전일치(110). + jp-tcg-SM6 cardCount 102(stale,시크릿前)→110.
 * ★EN(en-tcg-sm6)은 자체 레어도체계라 제외(이 검증은 JP트래커 기준). KR은 JP 로컬라이즈=동일체계라 포함.
 * 매칭=logicalCardId(JP/KR 공유 lc-orphan). from-가드 + ◇마커가드. og-sm6 비동결.
 * 실행: npx tsx scripts/fix-sm6-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const RARE = "cmpp4wykt000cyjurmsot429m";
const PR   = "cmpp4wyvm001gyjuruksmugim";
const SETS = ["jp-tcg-SM6", "kr-sm6"]; // en-tcg-sm6 제외(별도 레어도)

const FIXES: { lc: string; toId: string; toCode: string; from: string[]; marker: RegExp | null; label: string }[] = [
  { lc: "lc-orphan-jp-tcg-SM6-14", toId: RARE, toCode: "Rare",       from: ["Uncommon"], marker: null,                  label: "マフォクシー/마폭시 (U→R)" },
  { lc: "lc-orphan-jp-tcg-SM6-56", toId: RARE, toCode: "Rare",       from: ["Common"],   marker: null,                  label: "アクジキング/악식킹 (C→R)" },
  { lc: "lc-orphan-jp-tcg-SM6-86", toId: RARE, toCode: "Rare",       from: ["Uncommon"], marker: null,                  label: "カルネ/카르네 (U→R)" },
  { lc: "lc-orphan-jp-tcg-SM6-89", toId: PR,   toCode: "Prism Rare", from: ["Rare"],     marker: /프리즘스타|prismstar/, label: "フラダリ◇/플라드리◇ (R→PR)" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM6 희귀도 스크램블 교정 | ${FIXES.length}장 × {jp,kr} | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const f of FIXES) {
    const rows = await prisma.regionCard.findMany({ where: { cardId: f.lc, setId: { in: SETS } }, include: { rarity: true } });
    if (!rows.length) { console.log(`  ~ ${f.lc}: 대상행 없음`); continue; }
    for (const rc of rows) {
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === f.toCode) { console.log(`  = [${rc.setId} #${rc.numberInt}] ${f.label}: 이미 ${f.toCode}`); continue; }
      if (!f.from.includes(cur)) { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${f.label}: 현재 ${cur} ∉ {${f.from.join(",")}} → skip(안전)`); continue; }
      if (f.marker && !f.marker.test(rc.name)) { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${f.label}: ◇마커 없음 → skip(안전)`); continue; }
      console.log(`  ✔ [${rc.setId} #${rc.numberInt}] ${rc.name.replace(/<[^>]+>/g,'◇')}: ${cur} → ${f.toCode}`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: f.toId } });
    }
  }
  if (APPLY) {
    const actual = await prisma.regionCard.count({ where: { setId: "jp-tcg-SM6" } });
    await prisma.set.update({ where: { id: "jp-tcg-SM6" }, data: { cardCount: actual } });
    console.log(`\n✅ ${changed}행 교정 + jp-tcg-SM6 cardCount→${actual}`);
    console.log("=== 검증(JP 희귀도 분포) ===");
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-SM6" }, _count: true });
    const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.id, r.code]));
    dist.map((d) => `${rmap[d.rarityId ?? ""] ?? "(null)"}=${d._count}`).sort().forEach((s) => console.log(`  ${s}`));
  } else console.log(`\n(dry-run) 변경예정 ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
