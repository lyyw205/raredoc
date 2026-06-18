/**
 * S7R(창공스트림) 희귀도 스크램블 교정 — 오로트/갸라도스/카이류/레쿠쟈/우르가모스/차렘 V·VMAX 9장.
 * 근거: project_s7r_bluesky_scramble 메모(이전 카드이미지검증 "레어도9 교정", 미반영됨) + 보편규칙(V=RR·VMAX=RRR)
 *   + 시크릿블록 구조(#68-79 SR·#80-86 HR, 형제카드 다수 일치) + 트래커 완전 reconcile(교정 후 RR6·RRR3·SR12·HR7·UR4, 계산검증).
 * #90 골드UR 에너지(UR 정답). from-가드(KR 지역차/미발매 보호). og-s7r 비동결.
 * 실행: npx tsx scripts/fix-s7r-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const SET_IDS = ["jp-tcg-S7R", "kr-s7r"];
const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
};
const FIXES: { num: number; from: string; to: string }[] = [
  { num: 7, from: "Triple Rare", to: "Double Rare" },   // 오로트V 베이스
  { num: 20, from: "Triple Rare", to: "Double Rare" },  // 갸라도스V 베이스
  { num: 69, from: "Double Rare", to: "Super Rare" },   // 우르가모스V 풀아트
  { num: 72, from: "Double Rare", to: "Super Rare" },   // 차렘V 풀아트
  { num: 74, from: "Double Rare", to: "Super Rare" },   // 카이류V 풀아트
  { num: 80, from: "Double Rare", to: "Hyper Rare" },   // 오로트VMAX 레인보우
  { num: 81, from: "Double Rare", to: "Hyper Rare" },   // 갸라도스VMAX 레인보우
  { num: 82, from: "Double Rare", to: "Hyper Rare" },   // 레쿠쟈VMAX 레인보우
  { num: 83, from: "Triple Rare", to: "Hyper Rare" },   // 레쿠쟈VMAX 레인보우
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S7R 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
      console.log(`=== ${setId} ===`);
      for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nm(d.rarityId)}: ${d._count}`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
