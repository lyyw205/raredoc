/**
 * BW8T(ライデンナックル/Bolt Knuckle) base 2장 레어도 백필 — null2 → C/U.
 *  · #51 プラズマエネルギー → Uncommon: BW8S #51(同카드)이 공식 U로 확정됨(트윈 공유 특수에너지).
 *  · #42 イーブイ → Common: 산식 확정(null2=1C+1U, #51=U → #42=C; 이브이=관례 Common).
 *  교정후 jp-tcg-BW8T = C24/U16/R11/SR4/UR3=58 트래커 완전일치.
 *  매칭=LC(jp/kr 공유 lc-jp-tcg-BW8T-*), from-가드(null). 실행: npx tsx scripts/fix-bw8t-backfill.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const SETS = ["jp-tcg-BW8T", "kr-bw8"];
const FIXES = [
  { lc: "lc-jp-tcg-BW8T-042", code: "Common", label: "イーブイ" },
  { lc: "lc-jp-tcg-BW8T-051", code: "Uncommon", label: "プラズマエネルギー" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const rmap = Object.fromEntries((await prisma.rarity.findMany()).map((r) => [r.code, r.id]));
  console.log(`■ BW8T base 2장 백필 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const f of FIXES) {
    const rows = await prisma.regionCard.findMany({ where: { cardId: f.lc, setId: { in: SETS } }, include: { rarity: true } });
    for (const rc of rows) {
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === f.code) { console.log(`  = [${rc.setId} #${rc.numberInt}] ${rc.name}: 이미 ${f.code}`); continue; }
      if (cur !== "(null)") { console.log(`  ⚠️ [${rc.setId} #${rc.numberInt}] ${rc.name}: 현재 ${cur}≠null → skip(안전)`); continue; }
      console.log(`  ✔ [${rc.setId} #${rc.numberInt}] ${rc.name}: null → ${f.code}`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: rmap[f.code] } });
    }
  }
  if (APPLY) {
    console.log(`\n✅ ${changed}행 백필`);
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-BW8T" }, _count: true });
    console.log("  BW8T 분포:", dist.map((d)=>`${Object.keys(rmap).find(k=>rmap[k]===d.rarityId)??"null"}=${d._count}`).sort().join(" "));
  } else console.log(`\n(dry-run) ${changed}행. --apply`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
