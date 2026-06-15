/**
 * SM11(미라클트윈 / ミラクルツイン) 교정 — JP=jp-tcg-sn11(★id·code 'sn11' 오타), KR=kr-sm11. 그룹 og-sn11.
 *  · TR(Trainer Rare) 4장(#91-94, 양국 null) → Trainer Rare 라벨 (트래커 TR4 일치, 다른팩은 라벨됨).
 *  · cardCount 실제행수 동기화(JP 106→115, KR 105→106).
 *  · JP code 'sn11' → 'SM11'(트래커·KR과 일치).
 * JP 나머지 레어도 트래커 정확일치(C42/U32/R10/RR6/SR12/HR6/UR3). KR HR6·UR3 미수집(actual 106).
 * ※ id 'jp-tcg-sn11'·그룹 'og-sn11' 'sn' 오타는 PK/그룹 리네임이라 보류(별도 확인). 레어도/메타만.
 * og-sn11 비동결. 실행: npx tsx scripts/fix-sm11.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const TR_ID = "cmpp4wyzb001uyjurx137syk0"; // Trainer Rare
const SETS = ["jp-tcg-sn11", "kr-sm11"];
const TR_NUMS = [91, 92, 93, 94];

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ SM11 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  // 1) TR 라벨
  let changed = 0;
  for (const setId of SETS) {
    for (const n of TR_NUMS) {
      const rc = await prisma.regionCard.findFirst({ where: { setId, numberInt: n }, include: { rarity: true } });
      if (!rc) { console.log(`  ~ ${setId} #${n}: 없음`); continue; }
      const cur = rc.rarity?.code ?? "(null)";
      if (cur === "Trainer Rare") { console.log(`  = ${setId} #${n} ${rc.name}: 이미 TR`); continue; }
      if (cur !== "(null)") { console.log(`  ⚠️ ${setId} #${n} ${rc.name}: 현재 ${cur} ≠ null → skip`); continue; }
      console.log(`  ${setId} #${n} ${rc.name}: null → Trainer Rare`);
      changed++;
      if (APPLY) await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: TR_ID } });
    }
  }

  // 2) cardCount 동기화 + 3) JP code 교정
  if (APPLY) {
    for (const setId of SETS) {
      const actual = await prisma.regionCard.count({ where: { setId } });
      const data: any = { cardCount: actual };
      if (setId === "jp-tcg-sn11") data.code = "SM11";
      await prisma.set.update({ where: { id: setId }, data });
    }
  }

  console.log(`\n${APPLY ? `✅ TR ${changed}장 + 메타 교정` : `(dry-run) TR ${changed}장 변경예정`}`);
  if (APPLY) {
    const rows = await prisma.set.findMany({ where: { id: { in: SETS } }, select: { id: true, code: true, cardCount: true }, orderBy: { id: "asc" } });
    console.log("\n=== 검증 ===");
    rows.forEach((s) => console.log(`  ${s.id}: code=${s.code} cardCount=${s.cardCount}`));
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
