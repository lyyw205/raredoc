/**
 * mega-goods = MEGA 프리미엄 트레이너 박스 MEGA (jp-tcg-MA / kr-ma) — KR 기술머신 에볼루션↔데볼루션 스왑 교정.
 *  사용자 보고: ワザマシン エヴォ(MA-033) ↔ ワザマシン デヴォ(MA-034) KR 연결이 뒤바뀜.
 *  JP 정상(MA-033=エヴォ, MA-034=デヴォ). KR 두 장 LC만 교차:
 *    · kr-ma-027 기술머신 데볼루션: lc-jp-tcg-MA-033(エヴォ) → lc-jp-tcg-MA-034(デヴォ)
 *    · kr-ma-028 기술머신 에볼루션: lc-jp-tcg-MA-034(デヴォ) → lc-jp-tcg-MA-033(エヴォ)
 *  (CardLocale 유니크 제약은 PK뿐이라 직접 스왑 OK.) mega-goods는 비동결.
 *  실행: npx tsx scripts/fix-ma-kr-tm-swap.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

// {id, 기대 이름, 기대 현재 LC(from), 교정 LC(to)}
const FIXES = [
  { id: "kr-ma-027", name: "기술머신 데볼루션", fromLc: "lc-jp-tcg-MA-033", toLc: "lc-jp-tcg-MA-034" },
  { id: "kr-ma-028", name: "기술머신 에볼루션", fromLc: "lc-jp-tcg-MA-034", toLc: "lc-jp-tcg-MA-033" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable(["mega-goods"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-ma-kr-tm-swap" });

  console.log(`■ mega-goods KR 기술머신 에볼/데볼 스왑 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id }, select: { id: true, name: true, cardId: true } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음`); continue; }
    if (rc.name !== f.name) { console.log(`  ⚠️ ${f.id} 이름 불일치(${rc.name}≠${f.name}) → skip(안전)`); continue; }
    if (rc.cardId === f.toLc) { console.log(`  = ${f.id} ${rc.name}: 이미 ${f.toLc}`); continue; }
    if (rc.cardId !== f.fromLc) { console.log(`  ⚠️ ${f.id} ${rc.name}: 현재 LC ${rc.cardId}≠${f.fromLc} → skip(안전)`); continue; }
    console.log(`  ✔ ${f.id} ${rc.name}: ${f.fromLc} → ${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { cardId: f.toLc } });
  }

  if (APPLY) {
    const rows = await prisma.regionCard.findMany({
      where: { setId: "kr-ma", numberInt: { in: [27, 28] } },
      select: { id: true, name: true, cardId: true }, orderBy: { numberInt: "asc" },
    });
    console.log("\n  KR 최종:", rows.map((r) => `${r.id}(${r.name})→${r.cardId}`).join("  "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
