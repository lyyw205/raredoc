/**
 * SV9a(열풍의 아레나/熱風のアリーナ) 레어도 교정 — 공식(pokemon-card.com) 카드별 아이콘 기준.
 *
 * 근거(실측): シロナのガブリアスex 3장이 DB에서 rarity "None"(미설정) →
 *  - #080 : 공식 ic_rare_sr_c  = Super Rare        (cardID 47381, "080/063")
 *  - #087 : 공식 ic_rare_sar   = Special Art Rare  (cardID 47388, "087/063")
 *  - #091 : 공식 ic_rare_ur_c  = Ultra Rare        (cardID 47392, "091/063")
 * (참고: base #001-063 은 DB=공식 카드별 완전일치 — 트래커 C/U 쪽이 1장 틀림, DB 미변경)
 *
 * sv-heatwave-arena 는 동결 팩. assertWritable + --allow-protected 필요.
 * 실행: npx tsx scripts/fix-sv9a-rarity.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const SET_ID = "jp-sv-heatwave-arena";
const CARD_PACK_ID = "sv-heatwave-arena";
const SUPER_RARE_ID = "cmpp4wyyk001ryjurevrx3dq0";
const SAR_ID = "cmpp4wyxt001oyjurx0rmzr5r";
const UR_ID = "cmpp4wyzt001wyjuriy5esk1h";

const FIXES = [
  { numberInt: 80, expectName: "シロナのガブリアスex", expectFrom: "None", toId: SUPER_RARE_ID, toLabel: "Super Rare" },
  { numberInt: 87, expectName: "シロナのガブリアスex", expectFrom: "None", toId: SAR_ID, toLabel: "Special Art Rare" },
  { numberInt: 91, expectName: "シロナのガブリアスex", expectFrom: "None", toId: UR_ID, toLabel: "Ultra Rare" },
] as const;

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sv9a-rarity" });
  console.log(`■ SV9a 레어도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  let problems = 0;

  for (const f of FIXES) {
    const rows = await prisma.regionCard.findMany({ where: { setId: SET_ID, numberInt: f.numberInt }, include: { rarity: true } });
    if (rows.length !== 1) { console.log(`  ✗ #${f.numberInt}: 행 ${rows.length}개(기대 1)`); problems++; continue; }
    const rc = rows[0];
    const curr = rc.rarity?.code ?? "(null)";
    const nameOk = rc.name === f.expectName;
    const fromOk = curr === f.expectFrom;
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
