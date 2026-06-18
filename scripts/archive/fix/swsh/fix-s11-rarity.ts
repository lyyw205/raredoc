/**
 * S11(로스트어비스) 희귀도 교정 — 공식(pokemon-card.com) 검증 완료.
 * 비표준/오배정 3장(JP·KR 동일):
 *   #67  ドラピオンVSTAR(베이스)  Hyper Rare  → Triple Rare(RRR)  [공식 #067/100 무아이콘=베이스 RRR, 형제 #57·#81 동일]
 *   #101 マフォクシーV(풀아트)     Secret Rare → Super Rare(SR)    [공식 #101/100 icon=sr_c]
 *   #119 ドラピオンVSTAR(시크릿)  Holo Rare   → Hyper Rare(HR)     [공식 #119/100 icon=hr]
 * 교정 후 RRR3→4·SR15→16·HR8유지 = 트래커 분포와 정확히 일치.
 * og-s11 비동결. 가드: 현재 레어도가 기대 오류값일 때만 교정.
 * 실행: npx tsx scripts/fix-s11-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const CARD_PACK_ID = "og-s11";
const SET_IDS = ["jp-tcg-S11", "kr-s11"];
const RID: Record<string, string> = {
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Super Rare": "cmpp4wyyk001ryjurevrx3dq0",
  "Hyper Rare": "cmpp4wysu0016yjurcnv0ys4l",
};
const FIXES: { num: number; from: string; to: string }[] = [
  { num: 67, from: "Hyper Rare", to: "Triple Rare" },
  { num: 101, from: "Secret Rare", to: "Super Rare" },
  { num: 119, from: "Holo Rare", to: "Hyper Rare" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-s11-rarity" });
  console.log(`■ S11 희귀도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0;
  for (const setId of SET_IDS) {
    for (const f of FIXES) {
      const rows = await prisma.regionCard.findMany({ where: { setId, numberInt: f.num }, include: { rarity: true } });
      for (const rc of rows) {
        const cur = rc.rarity?.code ?? "(null)";
        if (cur === f.to) { console.log(`  ${setId} #${f.num} ${rc.name}: 이미 ${f.to} → skip`); continue; }
        if (cur !== f.from) { console.log(`  ⚠️ ${setId} #${f.num} ${rc.name}: 현재 ${cur} ≠ 기대 ${f.from} → skip(수동확인)`); continue; }
        console.log(`  ${setId} #${f.num} ${rc.name}: ${cur} → ${f.to}`);
        changed++;
        if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: RID[f.to] } });
      }
    }
  }
  console.log(`\n${APPLY ? `✅ ${changed}장 교정` : `(dry-run) 변경예정 ${changed}장 — 적용: --apply`}`);
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-S11" }, _count: true });
    const rar = await prisma.rarity.findMany({ where: { id: { in: dist.map((d) => d.rarityId).filter(Boolean) as string[] } } });
    const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
    console.log("=== jp-tcg-S11 교정 후 분포 ===");
    for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nm(d.rarityId)}: ${d._count}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
