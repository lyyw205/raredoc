/**
 * S6H(백은의 랜스 / 白銀のランス) JP 희귀도 스크램블 교정 — KR(이미 트래커와 정확 일치=ground-truth)에 정렬.
 * 라인: はくばバドレックス(Ice Rider Calyrex)·サダイジャ(Sandaconda)·トルネロス(Tornadus) V·VMAX.
 *   근거: KR S6H = 트래커(C30/U23/R8/RR6/RRR3/SR13/HR8/UR4) 정확 일치(독립 ground-truth) + 보편규칙(V=RR·VMAX=RRR base / V풀아트=SR / VMAX레인보우=HR)
 *   + 자매팩 S6K 공식(pokemon-card.com) 확정 패턴 동일 + 메모 project_s6h_silverlance_scramble(이미지검증) + 본 5 base카드 공식 재확인.
 *   공식은 HR/UR(#84-95) 미카탈로그(최상위 시크릿 누락) → KR=트래커 + 규칙으로 확정.
 * og-s6h 비동결. from-가드. 레어도만 변경(연결 불변). 실행: npx tsx scripts/fix-s6h-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
};

const SET_ID = "jp-tcg-S6H";
const FIXES: { num: number; from: string; to: string; note: string }[] = [
  { num: 28, from: "Double Rare", to: "Triple Rare", note: "はくばバドレックスVMAX base = RRR" },
  { num: 44, from: "Super Rare", to: "Triple Rare", note: "サダイジャVMAX base = RRR" },
  { num: 57, from: "Super Rare", to: "Double Rare", note: "トルネロスV base = RR" },
  { num: 58, from: "Double Rare", to: "Triple Rare", note: "トルネロスVMAX base = RRR" },
  { num: 76, from: "Double Rare", to: "Super Rare", note: "サダイジャV 풀아트 = SR" },
  { num: 84, from: "Triple Rare", to: "Hyper Rare", note: "はくばバドレックスVMAX 레인보우 = HR" },
  { num: 85, from: "Super Rare", to: "Hyper Rare", note: "はくばバドレックスVMAX 레인보우 = HR" },
  { num: 86, from: "Triple Rare", to: "Hyper Rare", note: "サダイジャVMAX 레인보우 = HR" },
  { num: 87, from: "Triple Rare", to: "Hyper Rare", note: "トルネロスVMAX 레인보우 = HR" },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S6H JP 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
    for (const setId of [SET_ID, "kr-s6"]) {
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
