/**
 * S4a(샤이니스타 V / シャイニースターV) 희귀도 교정 — 양국.
 * 공식 pokemon-card.com 전수 확인(post-190 블록): SR9(#191-199)·Shiny104(#200-303)·SSR23(#304-326)·UR4(#327-330) = 트래커 정확 일치.
 * 교정 3종:
 *  (A) JP UR 4장: #327-330 ムゲンダイナV/VMAX·ザシアンV·ザマゼンタV 이 RR/RRR로 라벨 → UR (KR 이미 정답=ground-truth + 트래커 UR4).
 *  (B) SSR 트레이너 오라벨 → None: 샤이니는 포켓몬 전용인데 ふつうのつりざお(Ordinary Rod)·ターフスタジアム(Turffield Stadium)가 Shiny Ultra Rare → None (양국, 번호는 지역차).
 *  (C) 본세트 포켓몬 4종이 시크릿 트윈과 별개인데 Shiny Rare로 오라벨(저번호 #18/30/52/57) → None (양국). 공식=본세트 정규(RR미만)카드 확인, 시크릿 트윈은 #200+에 따로 존재.
 * 결과: 양국 None163/ShinyRare104/ShinyUR23/RR16/RRR8/SR9/AR3/UR4 = 330 (트래커 정확 일치).
 * og-s4a 비동결. 레어도만 변경(연결 불변). 실행: npx tsx scripts/fix-s4a-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const RID: Record<string, string> = {
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Ultra Rare": "cmpp4wyzt001wyjuriy5esk1h",
  "Shiny Rare": "cmpp4wywz001lyjuruq1sdqtm",
  "Shiny Ultra Rare": "cmpp4wyxj001nyjurnibo23pw",
  "None": "cmpp4wyve001fyjura3dj4u72",
};

type Fix = { num: number; from: string; to: string; note: string };

const JP_FIXES: Fix[] = [
  // (A) UR secrets
  { num: 327, from: "Double Rare", to: "Ultra Rare", note: "ムゲンダイナV 골드 = UR" },
  { num: 328, from: "Triple Rare", to: "Ultra Rare", note: "ムゲンダイナVMAX 골드 = UR" },
  { num: 329, from: "Double Rare", to: "Ultra Rare", note: "ザシアンV 골드 = UR" },
  { num: 330, from: "Double Rare", to: "Ultra Rare", note: "ザマゼンタV 골드 = UR" },
  // (B) SSR trainer mislabels
  { num: 164, from: "Shiny Ultra Rare", to: "None", note: "ふつうのつりざお(트레이너) — 샤이니 아님" },
  { num: 179, from: "Shiny Ultra Rare", to: "None", note: "ターフスタジアム(트레이너) — 샤이니 아님" },
  // (C) main-set Pokémon shiny mislabels (저번호; 시크릿 트윈 #200+ 별도)
  { num: 18, from: "Shiny Rare", to: "None", note: "アップリュー 본세트 정규(트윈 #212)" },
  { num: 30, from: "Shiny Rare", to: "None", note: "ガラル バリコオル 본세트 정규(트윈 #220)" },
  { num: 52, from: "Shiny Rare", to: "None", note: "ロトム 본세트 정규(트윈 #237)" },
  { num: 57, from: "Shiny Rare", to: "None", note: "エレズン 본세트 정규(트윈 #240)" },
];

const KR_FIXES: Fix[] = [
  // (B) SSR trainer mislabels (KR 번호 지역차)
  { num: 160, from: "Shiny Ultra Rare", to: "None", note: "보통낚싯대(트레이너) — 샤이니 아님" },
  { num: 181, from: "Shiny Ultra Rare", to: "None", note: "터프스타디움(트레이너) — 샤이니 아님" },
  // (C) main-set Pokémon shiny mislabels
  { num: 18, from: "Shiny Rare", to: "None", note: "애프룡 본세트 정규" },
  { num: 30, from: "Shiny Rare", to: "None", note: "가라르 마임꽁꽁 본세트 정규" },
  { num: 52, from: "Shiny Rare", to: "None", note: "로토무 본세트 정규" },
  { num: 57, from: "Shiny Rare", to: "None", note: "일레즌 본세트 정규" },
];

const PLAN: { setId: string; fixes: Fix[] }[] = [
  { setId: "jp-tcg-S4a", fixes: JP_FIXES },
  { setId: "kr-s4a", fixes: KR_FIXES },
];

const ORDER = ["None", "Shiny Rare", "Shiny Ultra Rare", "Double Rare", "Triple Rare", "Super Rare", "Amazing Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S4a 희귀도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
