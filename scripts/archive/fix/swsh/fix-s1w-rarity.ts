/**
 * S1W(소드 / ソード) 희귀도 스크램블 교정 — 양국(KR도 #69/#73 오염).
 * 라인: ラプラス(Lapras)·イシヘンジン(Stonjourner)·ザシアン(Zacian) V·VMAX + 골드 ザシアンV #73.
 *   구조(S1H 평행): base V=RR·VMAX=RRR / 풀아트V=SR / VMAX레인보우=HR / 골드V=UR.
 *   근거: 보편규칙 + 트래커(C26/U19/R7/RR6/RRR2/SR8/HR4/UR3=75) 양국 정확 reconcile + 공식 base 확인 + 메모(Zacian V 3프린트 jp46reg/jp65FA/jp73gold).
 *   ※ KR이 #69 ラプラスVMAX레인보우=SR·#73 ザシアンV골드=HR 로 오염(KR clean ground-truth 아님) → 둘 다 교정.
 * og-s1w 비동결. from-가드. 레어도만(연결 불변). 실행: npx tsx scripts/fix-s1w-rarity.ts --apply
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
  { num: 15, from: "Super Rare", to: "Triple Rare", note: "ラプラスVMAX base = RRR" },
  { num: 34, from: "Triple Rare", to: "Double Rare", note: "イシヘンジンV base = RR" },
  { num: 35, from: "Super Rare", to: "Triple Rare", note: "イシヘンジンVMAX base = RRR" },
  { num: 46, from: "Super Rare", to: "Double Rare", note: "ザシアンV base = RR" },
  { num: 62, from: "Double Rare", to: "Super Rare", note: "ラプラスV 풀아트 = SR" },
  { num: 69, from: "Triple Rare", to: "Hyper Rare", note: "ラプラスVMAX 레인보우 = HR" },
  { num: 70, from: "Double Rare", to: "Hyper Rare", note: "イシヘンジンVMAX 레인보우 = HR" },
  { num: 73, from: "Double Rare", to: "Ultra Rare", note: "ザシアンV 골드 = UR" },
];

const KR_FIXES: Fix[] = [
  { num: 69, from: "Super Rare", to: "Hyper Rare", note: "라프라스 VMAX 레인보우 = HR (KR 오염)" },
  { num: 73, from: "Hyper Rare", to: "Ultra Rare", note: "자시안 V 골드 = UR (KR 오염)" },
];

const PLAN: { setId: string; fixes: Fix[] }[] = [
  { setId: "jp-tcg-S1W", fixes: JP_FIXES },
  { setId: "kr-s1w", fixes: KR_FIXES },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S1W 희귀도 스크램블 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
