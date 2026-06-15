/**
 * S7D(마천퍼펙트) 희귀도 스크램블 교정 — 루가루간/다스트다스/쥬라르돈 V·VMAX 10장.
 * 근거: project_s7d_towering_scramble 메모(이미지검증) + 보편규칙(베이스 V=RR·VMAX=RRR) + 시크릿블록구조(#68-79 SR·#80-86 HR)
 *   + 트래커 완전 reconcile(교정 후 RR6·RRR3·SR12·HR7·UR4, 계산검증). C/U는 이미 일치(29/21). #90 골드UR 에너지.
 * from-가드. KR id=kr-s7(code S7). og-s7d 비동결.
 * 실행: npx tsx scripts/fix-s7d-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SET_IDS = ["jp-tcg-S7D", "kr-s7"];
const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
  "Ultra Rare": "cmpp4wyzt001wyjuriy5esk1h",
};
const FIXES: { num: number; from: string; to: string }[] = [
  { num: 24, from: "Super Rare", to: "Double Rare" },   // 루가루간V 베이스
  { num: 25, from: "Double Rare", to: "Triple Rare" },  // 루가루간VMAX 베이스
  { num: 31, from: "Super Rare", to: "Triple Rare" },   // 다스트다스VMAX 베이스
  { num: 48, from: "Super Rare", to: "Double Rare" },   // 쥬라르돈V 베이스
  { num: 72, from: "Double Rare", to: "Super Rare" },   // 다스트다스V 풀아트
  { num: 76, from: "Triple Rare", to: "Super Rare" },   // 쥬라르돈V 풀아트
  { num: 80, from: "Super Rare", to: "Hyper Rare" },    // 루가루간VMAX 레인보우 (JP는 1차 Triple→HR 완료; from=KR 잔여 SR)
  { num: 87, from: "Hyper Rare", to: "Ultra Rare" },    // 크레세리아 골드 (KR 잔여 HR→UR; JP는 이미 UR)
  { num: 81, from: "Triple Rare", to: "Hyper Rare" },   // 다스트다스VMAX 레인보우
  { num: 82, from: "Super Rare", to: "Hyper Rare" },    // 쥬라르돈VMAX 레인보우
  { num: 83, from: "Double Rare", to: "Hyper Rare" },   // 쥬라르돈VMAX 레인보우
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S7D 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const setId of SET_IDS) {
    for (const f of FIXES) {
      const rc = await prisma.regionCard.findFirst({ where: { setId, numberInt: f.num }, include: { rarity: true } });
      if (!rc) { console.log(`  ~ ${setId} #${f.num}: 없음`); continue; }
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === f.to) continue;
      if (cur !== f.from) { console.log(`  ⚠️ ${setId} #${f.num} ${rc.name}: 현재 ${cur} ≠ from ${f.from} → skip`); continue; }
      console.log(`  ${setId} #${f.num} ${rc.name}: ${cur} → ${f.to}`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: RID[f.to] } });
    }
  }
  console.log(`\n${APPLY ? `✅ ${changed}장 교정` : `(dry-run) 변경예정 ${changed}장`}`);
  if (APPLY) {
    for (const setId of SET_IDS) {
      const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId }, _count: true });
      const rar = await prisma.rarity.findMany();
      const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
      console.log(`=== ${setId}: ${dist.filter(d=>["Double Rare","Triple Rare","Super Rare","Hyper Rare","Ultra Rare"].includes(nm(d.rarityId))).map(d=>`${nm(d.rarityId)}:${d._count}`).join(" ")}`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
