/**
 * S1a(VMAX라이징 / VMAXライジング) JP 희귀도 스크램블 교정 — KR(표준 분포=ground-truth)에 정렬.
 * 라인: ゴリランダー(Rillaboom)·エースバーン(Cinderace)·インテレオン(Inteleon) V·VMAX (SWSH 스타터 3종).
 *   근거: KR S1a=표준 SWSH 강화팩 분포(C30/U23/R8/RR6/RRR3/SR8/HR5/UR3=86, S2a와 동일) ground-truth + 보편규칙(V=RR·VMAX=RRR base / VMAX레인보우=HR) + 공식 base 스팟체크.
 * og-s1a 비동결. from-가드. 레어도만 변경(연결 불변). 실행: npx tsx scripts/fix-s1a-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
};

const SET_ID = "jp-tcg-S1a";
const FIXES: { num: number; from: string; to: string; note: string }[] = [
  { num: 8, from: "Triple Rare", to: "Double Rare", note: "ゴリランダーV base = RR" },
  { num: 9, from: "Super Rare", to: "Triple Rare", note: "ゴリランダーVMAX base = RRR" },
  { num: 16, from: "Triple Rare", to: "Double Rare", note: "エースバーンV base = RR" },
  { num: 17, from: "Super Rare", to: "Triple Rare", note: "エースバーンVMAX base = RRR" },
  { num: 22, from: "Triple Rare", to: "Double Rare", note: "インテレオンV base = RR" },
  { num: 23, from: "Super Rare", to: "Triple Rare", note: "インテレオンVMAX base = RRR" },
  { num: 79, from: "Double Rare", to: "Hyper Rare", note: "ゴリランダーVMAX 레인보우 = HR" },
  { num: 80, from: "Double Rare", to: "Hyper Rare", note: "エースバーンVMAX 레인보우 = HR" },
  { num: 81, from: "Double Rare", to: "Hyper Rare", note: "インテレオンVMAX 레인보우 = HR" },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S1a JP 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findFirst({ where: { setId: SET_ID, numberInt: f.num }, include: { rarity: true } });
    if (!rc) { console.log(`  ~ #${f.num}: 없음`); continue; }
    const cur = rc.rarity?.code ?? "(null)";
    if (cur === f.to) { console.log(`  = #${f.num} ${rc.name}: 이미 ${f.to}`); continue; }
    if (cur !== f.from) { console.log(`  ⚠️ #${f.num} ${rc.name}: 현재 ${cur} ≠ from ${f.from} → skip`); continue; }
    console.log(`  #${f.num} ${rc.name}: ${cur} → ${f.to}  (${f.note})`);
    changed++;
    if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: RID[f.to] } });
  }
  console.log(`\n${APPLY ? `✅ ${changed}장 교정` : `(dry-run) 변경예정 ${changed}장`}`);
  if (APPLY) {
    console.log("\n=== 교정 후 분포 ===");
    for (const setId of [SET_ID, "kr-s1a"]) {
      const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId }, _count: true });
      const rar = await prisma.rarity.findMany();
      const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
      const out = ORDER.map((code) => { const d = dist.find((x) => nm(x.rarityId) === code); return d ? `${code}:${d._count}` : null; }).filter(Boolean);
      console.log(`  ${setId}: ${out.join(" ")}`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
