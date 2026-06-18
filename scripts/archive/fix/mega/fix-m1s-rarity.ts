/**
 * M1S(메가심포니아) 레어도 교정 — 공식(pokemon-card.com) 카드별 레어도 아이콘 기준.
 *
 * 근거(실측):
 *  - #017 ユキカブリ : 공식 ic_rare_c_c = Common  (cardID 47813, "017/063") — DB는 Rare 오분류
 *  - #077 メガライボルトex : 공식 ic_rare_sr_c = Super Rare (cardID 48463, "077/063") — DB는 Secret Rare(UR) 오분류
 *
 * M1S 는 동결 팩(mega-symphonia). assertWritable 가드 적용 — --allow-protected 필요(사용자 확인 체크포인트).
 * 실행: npx tsx scripts/fix-m1s-rarity.ts --apply --allow-protected
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const SET_ID = "jp-tcg-M1S";
const CARD_PACK_ID = "mega-symphonia";
const COMMON_ID = "cmpp4wyk9000ayjur8h3rbxyd";
const SUPER_RARE_ID = "cmpp4wyyk001ryjurevrx3dq0";
const ART_RARE_ID = "cmpp4wyqr000yyjurz30wylr4"; // code "Art Rare" (アートレア=AR)

// 교정 대상: numberInt + 기대 이름(검증용) + 목표 rarityId
// (#017 Rare→Common, #077 UR→SR 는 2026-06-13 적용 완료)
// AR 레코드 통합: 공식 #064-075 전부 ic_rare_ar(=Art Rare) — #065·#072만 DB에서 Illustration Rare 로 갈라져 있어 통합.
const FIXES = [
  { numberInt: 65, expectName: "テッカニン", expectFrom: "Illustration Rare", toId: ART_RARE_ID, toLabel: "Art Rare" },
  { numberInt: 72, expectName: "ヌケニン",   expectFrom: "Illustration Rare", toId: ART_RARE_ID, toLabel: "Art Rare" },
] as const;

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable([CARD_PACK_ID], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-m1s-rarity" });

  console.log(`■ M1S 레어도 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  let problems = 0;

  for (const f of FIXES) {
    const rows = await prisma.regionCard.findMany({
      where: { setId: SET_ID, numberInt: f.numberInt },
      include: { rarity: true },
    });
    if (rows.length !== 1) { console.log(`  ✗ #${f.numberInt}: 행 ${rows.length}개(기대 1) — 중단 안전`); problems++; continue; }
    const rc = rows[0];
    const curr = rc.rarity?.code ?? "(null)";
    const nameOk = rc.name === f.expectName;
    const fromOk = curr === f.expectFrom;
    console.log(`  #${f.numberInt} ${rc.name} | 현재=${curr} → ${f.toLabel} | 이름검증=${nameOk ? "OK" : "✗("+rc.name+")"} 현재레어도검증=${fromOk ? "OK" : "✗("+curr+")"}`);
    if (!nameOk || !fromOk) { console.log(`     ⚠ 검증 실패 — 이 카드는 건너뜀`); problems++; continue; }

    if (APPLY) {
      await prisma.regionCard.update({ where: { id: rc.id }, data: { rarityId: f.toId } });
      console.log(`     ✓ 적용됨 (id=${rc.id})`);
    }
  }

  if (!APPLY) {
    console.log(`\n(dry-run) 적용: --apply --allow-protected`);
  } else {
    // 검증: 교정 후 M1S 레어도 분포
    const dist = await prisma.regionCard.groupBy({
      by: ["rarityId"], where: { setId: SET_ID }, _count: true,
    });
    const rar = await prisma.rarity.findMany({ where: { id: { in: dist.map((d) => d.rarityId).filter(Boolean) as string[] } } });
    const nmeOf = (id: string | null) => rar.find((r) => r.id === id)?.code ?? "(null)";
    console.log(`\n=== 교정 후 M1S 레어도 분포 ===`);
    for (const d of dist.sort((a, b) => (b._count as number) - (a._count as number))) console.log(`  ${nmeOf(d.rarityId)}: ${d._count}`);
  }
  console.log(problems ? `\n⚠ 검증 실패 ${problems}건 — 확인 필요` : `\n검증 통과`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
