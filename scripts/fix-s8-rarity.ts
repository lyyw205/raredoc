/**
 * S8(퓨전아츠) 희귀도 스크램블 교정 — 샹델라/펄스완/뮤/요씽리스 V·VMAX 11장.
 * 정답근거: project_s8_fusion_scramble 메모(이전 세션 카드이미지 전수검증=최종권위) + 공식스캔(#104=sr_c·#101-115=SR)
 *   + 트래커 완전 reconcile(교정 후 RR8·RRR4·SR15·HR9·UR5, 계산검증) + 보편규칙(베이스 V=RR·VMAX=RRR).
 * #128/129는 골드 UR 에너지(S8a와 달리 UR이 정답) — 손대지 않음.
 * from-가드: 현재 레어도가 기대 오류값일 때만 교정(KR 지역차 자동 보호). og-s8 비동결.
 * 실행: npx tsx scripts/fix-s8-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SET_IDS = ["jp-tcg-S8", "kr-s8"];
const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
  "Ultra Rare": "cmpp4wyzt001wyjuriy5esk1h",
};
const FIXES: { num: number; from: string; to: string }[] = [
  { num: 14, from: "Super Rare", to: "Double Rare" },   // 샹델라V 베이스
  { num: 15, from: "Double Rare", to: "Triple Rare" },  // 샹델라VMAX 베이스
  { num: 35, from: "Double Rare", to: "Triple Rare" },  // 펄스완VMAX 베이스
  { num: 40, from: "Double Rare", to: "Triple Rare" },  // 뮤VMAX 베이스
  { num: 86, from: "Double Rare", to: "Triple Rare" },  // 요씽리스VMAX 베이스
  { num: 104, from: "Triple Rare", to: "Super Rare" },  // 펄스완V 풀아트
  { num: 116, from: "Super Rare", to: "Hyper Rare" },   // 샹델라VMAX 레인보우 (JP는 1차에 Triple→HR 완료; 이 from=KR 잔여 SR→HR)
  { num: 117, from: "Super Rare", to: "Hyper Rare" },   // 펄스완VMAX 레인보우
  { num: 118, from: "Triple Rare", to: "Hyper Rare" },  // 뮤VMAX 레인보우
  { num: 119, from: "Super Rare", to: "Hyper Rare" },   // 뮤VMAX 레인보우
  { num: 120, from: "Triple Rare", to: "Hyper Rare" },  // 요씽리스VMAX 레인보우
  { num: 125, from: "Hyper Rare", to: "Ultra Rare" },   // 모코코/보송송 골드 (KR 잔여 HR→UR; JP는 이미 UR)
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S8 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-S8" }, _count: true });
    const rar = await prisma.rarity.findMany({ where: { id: { in: dist.map((d) => d.rarityId).filter(Boolean) as string[] } } });
    const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
    console.log("=== jp-tcg-S8 교정 후 분포 ===");
    for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nm(d.rarityId)}: ${d._count}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
