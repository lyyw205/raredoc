/**
 * SV8a(테라스탈 페스타 ex) 레어도 교정 — 공식 아이콘으로 확인 가능한 부분만.
 * ⚠️ SV8a 는 공식(pokemon-card.com)이 base/특수(ACE·SIR·HR·base-UR) 카드에 레어도 아이콘을 표시하지 않음.
 *    히트 4종(RR/SAR/SR/UR) 85장만 아이콘 존재. 그 85장 중 DB 오류는 #209 1건뿐(나머지 84장 DB 정확).
 *  - #209 : 공식 ic_rare_sar = Special Art Rare (cardID 47130 부근). DB는 None.
 * sv-prismatic-evolutions 동결 팩. --allow-protected 필요.
 * 실행: npx tsx scripts/fix-sv8a-rarity.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const SET_ID = "jp-sv-prismatic-evolutions";
const CARD_PACK_ID = "sv-prismatic-evolutions";
const SAR_ID = "cmpp4wyxt001oyjurx0rmzr5r";

const FIXES = [
  { numberInt: 209, expectFrom: "None", toId: SAR_ID, toLabel: "Special Art Rare" },
] as const;

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sv8a-rarity" });
  console.log(`■ SV8a 레어도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  let problems = 0;
  for (const f of FIXES) {
    const rows = await prisma.regionCard.findMany({ where: { setId: SET_ID, numberInt: f.numberInt }, include: { rarity: true } });
    if (rows.length !== 1) { console.log(`  ✗ #${f.numberInt}: 행 ${rows.length}개`); problems++; continue; }
    const rc = rows[0]; const curr = rc.rarity?.code ?? "(null)";
    const fromOk = curr === f.expectFrom;
    console.log(`  #${f.numberInt} ${rc.name} | ${curr} → ${f.toLabel} | 현재레어도검증=${fromOk ? "OK" : "✗("+curr+")"}`);
    if (!fromOk) { console.log(`     ⚠ 검증 실패 — 건너뜀`); problems++; continue; }
    if (APPLY) { await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: f.toId } }); console.log(`     ✓ 적용 (id=${rc.id})`); }
  }
  console.log(problems ? `\n⚠ 실패 ${problems}건` : (APPLY ? "\n적용 완료" : "\n(dry-run) 적용: --apply --allow-protected"));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
