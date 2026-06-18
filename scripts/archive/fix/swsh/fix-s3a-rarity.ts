/**
 * S3a(전설의 고동 / 伝説の鼓動) JP 희귀도 스크램블 교정 — KR(트래커 정확 일치=ground-truth)에 정렬.
 * 라인: マホイップ(Alcremie)·セキタンザン(Coalossal)·トゲキッス(Togekiss) V·VMAX (전부 포켓몬, 트레이너 함정 없음).
 *   근거: KR S3a=트래커(C20/U29/R12/RR6/AR6/RRR3/SR9/HR6/UR3=94) 정확 일치 + 보편규칙(V=RR·VMAX=RRR base / VMAX레인보우=HR) + 공식 base 재확인.
 * og-s3a 비동결. from-가드. 레어도만 변경(연결 불변). 실행: npx tsx scripts/fix-s3a-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
};

const SET_ID = "jp-tcg-S3a";
const FIXES: { num: number; from: string; to: string; note: string }[] = [
  { num: 31, from: "Super Rare", to: "Double Rare", note: "マホイップV base = RR" },
  { num: 32, from: "Double Rare", to: "Triple Rare", note: "マホイップVMAX base = RRR" },
  { num: 42, from: "Triple Rare", to: "Double Rare", note: "セキタンザンV base = RR" },
  { num: 43, from: "Super Rare", to: "Triple Rare", note: "セキタンザンVMAX base = RRR" },
  { num: 58, from: "Super Rare", to: "Double Rare", note: "トゲキッスV base = RR" },
  { num: 59, from: "Double Rare", to: "Triple Rare", note: "トゲキッスVMAX base = RRR" },
  { num: 86, from: "Triple Rare", to: "Hyper Rare", note: "マホイップVMAX 레인보우 = HR" },
  { num: 87, from: "Double Rare", to: "Hyper Rare", note: "セキタンザンVMAX 레인보우 = HR" },
  { num: 88, from: "Triple Rare", to: "Hyper Rare", note: "トゲキッスVMAX 레인보우 = HR" },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Amazing Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S3a JP 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
    for (const setId of [SET_ID, "kr-s3a"]) {
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
