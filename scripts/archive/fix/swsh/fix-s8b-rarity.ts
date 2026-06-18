/**
 * S8b(VMAX 클라이맥스) 희귀도 교정 — Bulbapedia(=트래커 히트카운트 일치) + 공식 아이콘(#083 무아이콘=RRR·#236 csr=CSR) 검증.
 * DB가 V/VMAX·기본에너지 레어도를 광범위 스크램블 → 24장 교정하면 RR25·RRR19·CHR28·SR23·CSR42·UR8 = 트래커 정확 일치(합 293, 계산검증).
 * from-가드: 현재 레어도가 기대 오류값일 때만 교정 → KR 지역차(#278-285=기본에너지) 자동 보호. og-s8b 비동결.
 * 실행: npx tsx scripts/fix-s8b-rarity.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const CARD_PACK_ID = "og-s8b";
const SET_IDS = ["jp-tcg-S8b"]; // KR은 카드배치 다름(예 #73 님피아V≠데데네)+지역차 → 별도 처리
const RID: Record<string, string> = {
  Common: "cmpp4wyk9000ayjur8h3rbxyd",
  "Double Rare": "cmpp4wysb0014yjuroyoidvmy",
  "Triple Rare": "cmpp4wyzk001vyjur44rer0wx",
  "Character Super Rare": "cmpp4wyrk0011yjur3ma5hfti",
  "Ultra Rare": "cmpp4wyzt001wyjuriy5esk1h",
};
const FIXES: { nums: number[]; from: string; to: string | null }[] = [
  { nums: [21, 32, 33, 128], from: "None", to: "Common" },            // Castform
  { nums: [42, 73, 111], from: "Double Rare", to: "Common" },          // 非V 포켓몬
  { nums: [92, 94, 119, 122], from: "Triple Rare", to: "Double Rare" },// V (베이스)
  { nums: [82], from: "Character Super Rare", to: "Double Rare" },     // V (베이스)
  { nums: [83, 93, 95], from: "Character Super Rare", to: "Triple Rare" }, // VMAX (베이스)
  { nums: [236, 252, 253], from: "Double Rare", to: "Character Super Rare" }, // CSR 레인보우
  { nums: [281], from: "Triple Rare", to: "Ultra Rare" },              // 골드 VMAX
  { nums: [282, 284, 285], from: "Character Super Rare", to: "Ultra Rare" }, // 골드 VMAX
  { nums: [286, 287], from: "Ultra Rare", to: null },                  // 기본에너지(레어도 없음)
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-s8b-rarity" });
  console.log(`■ S8b 희귀도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  let changed = 0, skipped = 0;
  for (const setId of SET_IDS) {
    for (const f of FIXES) {
      for (const n of f.nums) {
        const rc = await prisma.regionCard.findFirst({ where: { setId, numberInt: n }, include: { rarity: true } });
        if (!rc) continue;
        const cur = rc.rarity?.code ?? (rc.rarityId == null ? "(null)" : "?");
        if (cur !== f.from) { skipped++; if (cur !== (f.to ?? "(null)")) console.log(`  ~ ${setId} #${n} ${rc.name}: 현재 ${cur} ≠ from ${f.from} → skip`); continue; }
        const toLabel = f.to ?? "(null)";
        console.log(`  ${setId} #${n} ${rc.name}: ${cur} → ${toLabel}`);
        changed++;
        if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: f.to ? RID[f.to] : null } });
      }
    }
  }
  console.log(`\n${APPLY ? `✅ ${changed}장 교정` : `(dry-run) 변경예정 ${changed}장`} (skip ${skipped})`);
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: "jp-tcg-S8b" }, _count: true });
    const rar = await prisma.rarity.findMany({ where: { id: { in: dist.map((d) => d.rarityId).filter(Boolean) as string[] } } });
    const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
    console.log("=== jp-tcg-S8b 교정 후 분포 ===");
    for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nm(d.rarityId)}: ${d._count}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
