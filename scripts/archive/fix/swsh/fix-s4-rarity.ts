/**
 * S4(앙천의 볼트태클 / 仰天のボルテッカー) 희귀도 교정 — 양국.
 * 공식 pokemon-card.com 재확인: #31 ピカチュウVMAX base=RRR / #93 サイトウ(Bea)=U / #94 ダンデ(Leon)=R.
 *  · JP 스크램블 5장: #31 VMAX base SR→RRR, #112/113/115 VMAX레인보우 RR→HR, #114 RRR→HR (KR 이미 정답=ground-truth).
 *  · KR 스왑 2장: KR이 サイトウ/ダンデ 레어도를 뒤바꿔 가짐(공식과 반대) → #93 R→U, #94 U→R (카운트중립이라 트래커는 통과했었음).
 * 결과: 양국 C44/U34/R10/RR8/RRR4/SR11/HR7/UR3=121 트래커 정확 일치 + 양국 상호 일치.
 * og-s4 비동결. from-가드. 레어도만 변경(연결 불변). 실행: npx tsx scripts/fix-s4-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

const RID: Record<string, string> = {
  "Uncommon": "cmpp4wykj000byjurc7tz6q7i",
  "Rare": "cmpp4wykt000cyjurmsot429m",
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
};

type Fix = { num: number; from: string; to: string; note: string };

const JP_FIXES: Fix[] = [
  { num: 31, from: "Super Rare", to: "Triple Rare", note: "ピカチュウVMAX base = RRR" },
  { num: 112, from: "Double Rare", to: "Hyper Rare", note: "イオルブVMAX 레인보우 = HR" },
  { num: 113, from: "Double Rare", to: "Hyper Rare", note: "ガラルヒヒダルマVMAX 레인보우 = HR" },
  { num: 114, from: "Triple Rare", to: "Hyper Rare", note: "ピカチュウVMAX 레인보우 = HR" },
  { num: 115, from: "Double Rare", to: "Hyper Rare", note: "ギルガルドVMAX 레인보우 = HR" },
];

// ★REVERT: 직전 턴 오류 복구. KR은 트레이너를 가나다 재정렬해서 #번호가 JP와 다른 카드를 가리킴
//   (KR#93=단델/Leon, KR#94=리그스태프 — JP#93 サイトウ/Bea·#94 ダンデ/Leon 아님).
//   KR #93 단델(Leon)=R, #94 리그스태프=U 가 원래 정답이었음(공식 Leon=R 일치). 잘못 스왑한 것을 되돌림.
const KR_FIXES: Fix[] = [
  { num: 93, from: "Uncommon", to: "Rare", note: "단델(Leon) = R 복구(가나다재정렬: KR#93≠JP サイトウ)" },
  { num: 94, from: "Rare", to: "Uncommon", note: "리그 스태프 = U 복구(가나다재정렬: KR#94≠JP ダンデ)" },
];

const PLAN: { setId: string; fixes: Fix[] }[] = [
  { setId: "jp-tcg-S4", fixes: JP_FIXES },
  { setId: "kr-s4", fixes: KR_FIXES },
];

const ORDER = ["Common", "Uncommon", "Rare", "Double Rare", "Triple Rare", "Super Rare", "Hyper Rare", "Ultra Rare"];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ S4 희귀도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
