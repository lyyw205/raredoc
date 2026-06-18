/**
 * SV7a(낙원드래고나/楽園ドラゴーナ) 레어도 교정 — 공식(pokemon-card.com) 아이콘 기준.
 * 근거(라이브 확인):
 *  #3  マシェード  : ic_rare_u_c = Uncommon  (DB Common)
 *  #31 ナゲツケサル: ic_rare_u_c = Uncommon  (DB Common)
 *  #62 ドラセナ    : ic_rare_c_c = Common    (DB Uncommon)
 *  #67 ポワルン たいようのすがた: ic_rare_ar = Art Rare (DB None, cardID 46313 "067/064")
 * (base C/U/R/RR 나머지 + ACE 3장(#52·56·64, 무아이콘)·시크릿은 DB=공식 일치)
 * sv-paradise-dragona 동결 팩. --allow-protected 필요.
 * 실행: npx tsx scripts/fix-sv7a-rarity.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const SET_ID = "jp-sv-paradise-dragona";
const CARD_PACK_ID = "sv-paradise-dragona";
const RID = { Common: "cmpp4wyk9000ayjur8h3rbxyd", Uncommon: "cmpp4wykj000byjurc7tz6q7i", "Art Rare": "cmpp4wyqr000yyjurz30wylr4" } as const;

const FIXES = [
  { numberInt: 3, expectName: "マシェード", expectFrom: "Common", to: "Uncommon" as const },
  { numberInt: 31, expectName: "ナゲツケサル", expectFrom: "Common", to: "Uncommon" as const },
  { numberInt: 62, expectName: "ドラセナ", expectFrom: "Uncommon", to: "Common" as const },
  { numberInt: 67, expectName: "ポワルン たいようのすがた", expectFrom: "None", to: "Art Rare" as const },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-sv7a-rarity" });
  console.log(`■ SV7a 레어도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  let problems = 0;
  for (const f of FIXES) {
    const rows = await prisma.regionCard.findMany({ where: { setId: SET_ID, numberInt: f.numberInt }, include: { rarity: true } });
    if (rows.length !== 1) { console.log(`  ✗ #${f.numberInt}: 행 ${rows.length}개`); problems++; continue; }
    const rc = rows[0]; const curr = rc.rarity?.code ?? "None";
    const nameOk = rc.name === f.expectName, fromOk = curr === f.expectFrom;
    console.log(`  #${f.numberInt} ${rc.name} | ${curr} → ${f.to} | 이름=${nameOk ? "OK" : "✗"} 현재=${fromOk ? "OK" : "✗("+curr+")"}`);
    if (!nameOk || !fromOk) { console.log(`     ⚠ 검증 실패 — 건너뜀`); problems++; continue; }
    if (APPLY) { await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: RID[f.to] } }); console.log(`     ✓ 적용`); }
  }
  if (APPLY) {
    const dist = await prisma.regionCard.groupBy({ by: ["rarityId"], where: { setId: SET_ID }, _count: true });
    const rar = await prisma.rarity.findMany({ where: { id: { in: dist.map((d) => d.rarityId).filter(Boolean) as string[] } } });
    const nm = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
    console.log(`\n=== 교정 후 분포 ===`);
    for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nm(d.rarityId)}: ${d._count}`);
  } else console.log(`\n(dry-run) 적용: --apply --allow-protected`);
  console.log(problems ? `\n⚠ 실패 ${problems}건` : `\n검증 통과`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
