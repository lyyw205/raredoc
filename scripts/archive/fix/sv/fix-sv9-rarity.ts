/**
 * SV9(배틀파트너즈/バトルパートナーズ) 레어도 교정 — 공식(pokemon-card.com) 아이콘 기준.
 * 근거: #105 リーリエのアブリボン 가 DB rarity "None" → 공식 ic_rare_ar = Art Rare
 *       (cardID 47225, "105/100", regulation SV9). base #042 は U.
 * sv-journey-together 동결 팩. assertWritable + --allow-protected 필요.
 * 실행: npx tsx scripts/fix-sv9-rarity.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const SET_ID = "jp-sv-journey-together";
const CARD_PACK_ID = "sv-journey-together";
const ART_RARE_ID = "cmpp4wyqr000yyjurz30wylr4";

const FIXES = [
  { numberInt: 105, expectName: "リーリエのアブリボン", expectFrom: "None", toId: ART_RARE_ID, toLabel: "Art Rare" },
] as const;

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sv9-rarity" });
  console.log(`■ SV9 레어도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  let problems = 0;
  for (const f of FIXES) {
    const rows = await prisma.regionCard.findMany({ where: { setId: SET_ID, numberInt: f.numberInt }, include: { rarity: true } });
    if (rows.length !== 1) { console.log(`  ✗ #${f.numberInt}: 행 ${rows.length}개(기대 1)`); problems++; continue; }
    const rc = rows[0]; const curr = rc.rarity?.code ?? "(null)";
    const nameOk = rc.name === f.expectName, fromOk = curr === f.expectFrom;
    console.log(`  #${f.numberInt} ${rc.name} | ${curr} → ${f.toLabel} | 이름=${nameOk ? "OK" : "✗"} 현재레어도=${fromOk ? "OK" : "✗("+curr+")"}`);
    if (!nameOk || !fromOk) { console.log(`     ⚠ 검증 실패 — 건너뜀`); problems++; continue; }
    if (APPLY) { await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: f.toId } }); console.log(`     ✓ 적용 (id=${rc.id})`); }
  }
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: SET_ID }, _count: true });
    const rar = await prisma.rarity.findMany({ where: { id: { in: dist.map((d) => d.rarityId).filter(Boolean) as string[] } } });
    const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
    console.log(`\n=== 교정 후 분포 ===`);
    for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nm(d.rarityId)}: ${d._count}`);
  } else console.log(`\n(dry-run) 적용: --apply --allow-protected`);
  console.log(problems ? `\n⚠ 검증 실패 ${problems}건` : `\n검증 통과`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
