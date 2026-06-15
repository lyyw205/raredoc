/**
 * S3(무한존 / ムゲンゾーン) JP 희귀도 스크램블 교정 — KR(트래커 정확 일치=ground-truth)에 정렬.
 * 라인: カジリガメ(Drednaw)·ムゲンダイナ(Eternatus)·ハッサム(Scizor)·ボーマンダ(Salamence) V·VMAX (전부 포켓몬).
 *   근거: KR S3=트래커(C44/U34/R10/RR8/RRR4/SR10/HR6/UR3=119) 정확 일치 + 보편규칙(V=RR·VMAX=RRR base / V풀아트=SR / VMAX레인보우=HR) + 공식 base 재확인.
 * og-s3 비동결. from-가드. 레어도만 변경(연결 불변). 실행: npx tsx scripts/fix-s3-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
};

const SET_ID = "jp-tcg-S3";
const FIXES: { num: number; from: string; to: string; note: string }[] = [
  { num: 26, from: "Triple Rare", to: "Double Rare", note: "カジリガメV base = RR" },
  { num: 27, from: "Super Rare", to: "Triple Rare", note: "カジリガメVMAX base = RRR" },
  { num: 64, from: "Triple Rare", to: "Double Rare", note: "ムゲンダイナV base = RR" },
  { num: 65, from: "Super Rare", to: "Triple Rare", note: "ムゲンダイナVMAX base = RRR" },
  { num: 67, from: "Super Rare", to: "Triple Rare", note: "ハッサムVMAX base = RRR" },
  { num: 80, from: "Super Rare", to: "Double Rare", note: "ボーマンダV base = RR" },
  { num: 81, from: "Double Rare", to: "Triple Rare", note: "ボーマンダVMAX base = RRR" },
  { num: 107, from: "Double Rare", to: "Super Rare", note: "ハッサムV 풀아트 = SR" },
  { num: 111, from: "Double Rare", to: "Hyper Rare", note: "カジリガメVMAX 레인보우 = HR" },
  { num: 112, from: "Double Rare", to: "Hyper Rare", note: "ムゲンダイナVMAX 레인보우 = HR" },
  { num: 113, from: "Triple Rare", to: "Hyper Rare", note: "ハッサムVMAX 레인보우 = HR" },
  { num: 114, from: "Triple Rare", to: "Hyper Rare", note: "ボーマンダVMAX 레인보우 = HR" },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S3 JP 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
    for (const setId of [SET_ID, "kr-s3"]) {
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
