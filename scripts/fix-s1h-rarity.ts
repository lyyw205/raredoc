/**
 * S1H(실드 / シールド) JP 희귀도 스크램블 교정 — KR(트래커 정확 일치=ground-truth)에 정렬.
 * 라인: モルペコ(Morpeko)·ザマゼンタ(Zamazenta)·カビゴン(Snorlax) V·VMAX + 골드 ザマゼンタV #73.
 *   근거: KR S1H=트래커(C26/U19/R7/RR6/RRR2/SR8/HR4/UR3=75) 정확 일치 + 보편규칙(V=RR·VMAX=RRR base / V풀아트=SR / VMAX레인보우=HR / 골드=UR) + 공식 base 스팟체크.
 *   ※ #58 エール団のしたっぱ·#59 マリィ(트레이너)는 KR 가나다재정렬로 같은번호=다른카드 → 건드리지 않음(둘 다 정답).
 * og-s1h 비동결. from-가드. 레어도만 변경(연결 불변). 실행: npx tsx scripts/fix-s1h-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
  "Ultra Rare": "cmpp4wyzt001wyjuriy5esk1h",
};

const SET_ID = "jp-tcg-S1H";
const FIXES: { num: number; from: string; to: string; note: string }[] = [
  { num: 19, from: "Triple Rare", to: "Double Rare", note: "モルペコV base = RR" },
  { num: 20, from: "Super Rare", to: "Triple Rare", note: "モルペコVMAX base = RRR" },
  { num: 44, from: "Super Rare", to: "Double Rare", note: "ザマゼンタV base = RR" },
  { num: 46, from: "Super Rare", to: "Triple Rare", note: "カビゴンVMAX base = RRR" },
  { num: 66, from: "Double Rare", to: "Super Rare", note: "カビゴンV 풀아트 = SR" },
  { num: 69, from: "Double Rare", to: "Hyper Rare", note: "モルペコVMAX 레인보우 = HR" },
  { num: 70, from: "Triple Rare", to: "Hyper Rare", note: "カビゴンVMAX 레인보우 = HR" },
  { num: 73, from: "Double Rare", to: "Ultra Rare", note: "ザマゼンタV 골드 = UR" },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S1H JP 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
    for (const setId of [SET_ID, "kr-s1h"]) {
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
