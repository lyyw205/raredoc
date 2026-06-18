/**
 * S5R(연격마스터 / 連撃マスター) 희귀도 스크램블 교정 — 양국.
 * 구조: base #1-70(V=RR×6·VMAX=RRR×3) + secret #71-81 SR(V풀아트8+서포터3) · #82-88 HR(VMAX레인보우4+서포터레인보우3) · #89-91 UR(골드 오크탄/레벨볼/연격에너지) = 91.
 *   근거: 보편규칙 + 트래커(C30/U23/R8/RR6/RRR3/SR11/HR7/UR3) 양국 정확 reconcile
 *   + 공식 pokemon-card.com base 재확인(#12/13/50/55/56) + 메모 project_s6k_s5a_s5i_remap(#89=골드오크탄, 정규#23 이전됨).
 *   공식은 HR/UR(#82-91) 미카탈로그 → KR근사 + 규칙 + 트래커로 확정.
 * og-s5r 비동결. from-가드. 레어도만 변경(연결 불변). 실행: npx tsx scripts/fix-s5r-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
  "Ultra Rare": "cmpp4wyzt001wyjuriy5esk1h",
};

type Fix = { num: number; from: string; to: string; note: string };

const JP_FIXES: Fix[] = [
  { num: 12, from: "Triple Rare", to: "Double Rare", note: "ビクティニV base = RR" },
  { num: 13, from: "Super Rare", to: "Triple Rare", note: "ビクティニVMAX base = RRR" },
  { num: 50, from: "Triple Rare", to: "Double Rare", note: "れんげきウーラオスV base = RR" },
  { num: 55, from: "Triple Rare", to: "Double Rare", note: "アーマーガアV base = RR" },
  { num: 56, from: "Super Rare", to: "Triple Rare", note: "アーマーガアVMAX base = RRR" },
  { num: 82, from: "Double Rare", to: "Hyper Rare", note: "ビクティニVMAX 레인보우 = HR" },
  { num: 83, from: "Double Rare", to: "Hyper Rare", note: "れんげきウーラオスVMAX 레인보우 = HR" },
  { num: 84, from: "Super Rare", to: "Hyper Rare", note: "れんげきウーラオスVMAX 레인보우 = HR" },
  { num: 85, from: "Double Rare", to: "Hyper Rare", note: "アーマーガアVMAX 레인보우 = HR" },
  { num: 89, from: "Rare", to: "Ultra Rare", note: "オクタン 골드 = UR (정규#23 이전, 레어도 stale)" },
];

const KR_FIXES: Fix[] = [
  { num: 82, from: "Super Rare", to: "Hyper Rare", note: "비크티니 VMAX 레인보우 = HR" },
  { num: 89, from: "Hyper Rare", to: "Ultra Rare", note: "대포무노(골드 오크탄) = UR" },
];

const PLAN: { setId: string; fixes: Fix[] }[] = [
  { setId: "jp-tcg-S5R", fixes: JP_FIXES },
  { setId: "kr-s5r", fixes: KR_FIXES },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S5R 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const { setId, fixes } of PLAN) {
    console.log(`--- ${setId} (${fixes.length} planned) ---`);
    for (const f of fixes) {
      const rc = await prisma.regionCard.findFirst({ where: { setId, numberInt: f.num }, include: { rarity: true } });
      if (!rc) { console.log(`  ~ #${f.num}: 없음`); continue; }
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === f.to) { console.log(`  = #${f.num} ${rc.name}: 이미 ${f.to}`); continue; }
      if (cur !== f.from) { console.log(`  ⚠️ #${f.num} ${rc.name}: 현재 ${cur} ≠ from ${f.from} → skip`); continue; }
      console.log(`  #${f.num} ${rc.name}: ${cur} → ${f.to}  (${f.note})`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: RID[f.to] } });
    }
  }
  console.log(`\n${APPLY ? `✅ ${changed}장 교정` : `(dry-run) 변경예정 ${changed}장`}`);
  if (APPLY) {
    console.log("\n=== 교정 후 분포 ===");
    for (const { setId } of PLAN) {
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
