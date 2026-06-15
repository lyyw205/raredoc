/**
 * S6K(칠흑의 가이스트 / 漆黒のガイスト) 희귀도 스크램블 교정 — 양국 동시.
 * 구조: base #1-70(C30·U23·R8·RR6·RRR3) + secret #71-83 SR(13) · #84-91 HR(8) · #92-95 UR(4) = 95.
 *   근거: 보편규칙(V=RR·VMAX=RRR base / V풀아트=SR / VMAX·서포터 레인보우=HR / 골드=UR)
 *   + KR base가 이미 정답(독립 ground-truth) + 양국 모두 트래커(C30/U23/R8/RR6/RRR3/SR13/HR8/UR4)에 정확 reconcile
 *   + 공식 pokemon-card.com / tcgdex 교차검증.
 * og-s6k 비동결. from-가드(잘못된 현재값일 때만 교체). 실행: npx tsx scripts/fix-s6k-rarity.ts --apply
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

type Fix = { num: number; from: string; to: string; note: string };

// JP: base 4 + secret 5 = 9장
const JP_FIXES: Fix[] = [
  { num: 3, from: "Triple Rare", to: "Double Rare", note: "セレビィV base = RR" },
  { num: 4, from: "Super Rare", to: "Triple Rare", note: "セレビィVMAX base = RRR" },
  { num: 37, from: "Double Rare", to: "Triple Rare", note: "こくばバドレックスVMAX base = RRR" },
  { num: 49, from: "Super Rare", to: "Double Rare", note: "メタグロスV base = RR" },
  { num: 77, from: "Triple Rare", to: "Super Rare", note: "メタグロスV 풀아트 = SR" },
  { num: 84, from: "Double Rare", to: "Hyper Rare", note: "セレビィVMAX 레인보우 = HR" },
  { num: 85, from: "Triple Rare", to: "Hyper Rare", note: "こくばバドレックスVMAX 레인보우 = HR" },
  { num: 86, from: "Super Rare", to: "Hyper Rare", note: "こくばバドレックスVMAX 레인보우 = HR" },
  { num: 87, from: "Double Rare", to: "Hyper Rare", note: "メタグロスVMAX 레인보우 = HR" },
];

// KR: secret 2장 (base는 이미 전부 정답)
const KR_FIXES: Fix[] = [
  { num: 84, from: "Super Rare", to: "Hyper Rare", note: "세레비 VMAX 레인보우 = HR" },
  { num: 92, from: "Hyper Rare", to: "Ultra Rare", note: "붐볼(골드 마르마인) = UR" },
];

const PLAN: { setId: string; fixes: Fix[] }[] = [
  { setId: "jp-tcg-S6K", fixes: JP_FIXES },
  { setId: "kr-s6k", fixes: KR_FIXES },
];

const SECRET = ["Super Rare", "Hyper Rare", "Ultra Rare", "Double Rare", "Triple Rare", "Rare", "Common", "Uncommon"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S6K 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
      const ordered = SECRET.map((code) => { const d = dist.find((x) => nm(x.rarityId) === code); return d ? `${code}:${d._count}` : null; }).filter(Boolean);
      console.log(`  ${setId}: ${ordered.join(" ")}`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
