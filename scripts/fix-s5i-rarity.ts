/**
 * S5I(일격마스터 / 一撃マスター) JP 희귀도 스크램블 교정 — KR(트래커와 정확 일치=ground-truth)에 정렬.
 * 라인: アップリュー(Appletun)·カプ・コケコ(Tapu Koko)·いちげきウーラオス(Single Strike Urshifu) V·VMAX + 골드 ヘルガー(#89).
 *   구조: base #1-70(V=RR×6·VMAX=RRR×3) + secret #71-81 SR(V풀아트8+서포터3) · #82-88 HR(VMAX레인보우4+서포터3) · #89-91 UR(골드 ヘルガー/レベルボール류) = 91.
 *   근거: KR S5I=트래커(C30/U23/R8/RR6/RRR3/SR11/HR7/UR3) 정확 일치(독립 ground-truth) + 보편규칙 + 공식 pokemon-card.com base/풀아트 재확인 + 메모(헬가 정규#45 이전, #89 레어도 stale).
 *   공식 HR/UR(#82-91) 미카탈로그 → KR+규칙 확정. og-s5i 비동결. from-가드. 레어도만 변경(연결 불변).
 * 실행: npx tsx scripts/fix-s5i-rarity.ts --apply
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

const SET_ID = "jp-tcg-S5I";
const FIXES: { num: number; from: string; to: string; note: string }[] = [
  { num: 7, from: "Super Rare", to: "Double Rare", note: "アップリューV base = RR" },
  { num: 17, from: "Super Rare", to: "Double Rare", note: "カプ・コケコV base = RR" },
  { num: 36, from: "Triple Rare", to: "Double Rare", note: "いちげきウーラオスV base = RR" },
  { num: 71, from: "Triple Rare", to: "Super Rare", note: "アップリューV 풀아트 = SR" },
  { num: 72, from: "Triple Rare", to: "Super Rare", note: "カプ・コケコV 풀아트 = SR" },
  { num: 82, from: "Double Rare", to: "Hyper Rare", note: "アップリューVMAX 레인보우 = HR" },
  { num: 83, from: "Double Rare", to: "Hyper Rare", note: "カプ・コケコVMAX 레인보우 = HR" },
  { num: 84, from: "Super Rare", to: "Hyper Rare", note: "いちげきウーラオスVMAX 레인보우 = HR" },
  { num: 85, from: "Double Rare", to: "Hyper Rare", note: "いちげきウーラオスVMAX 레인보우 = HR" },
  { num: 89, from: "Rare", to: "Ultra Rare", note: "ヘルガー 골드 = UR (정규#45 이전, 레어도 stale)" },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S5I JP 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
    for (const setId of [SET_ID, "kr-s5"]) {
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
