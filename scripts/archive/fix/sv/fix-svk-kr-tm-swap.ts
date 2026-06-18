/**
 * sv-goods = SV 배틀 강화 BOX 「스텔라미라클」 (jp-tcg-SVK / kr-svk) — KR 기술머신 에볼/데볼 스왑 교정.
 *  mega-goods(MA)와 동일 버그: ワザマシン エヴォ(SVK-028) ↔ デヴォ(SVK-029) KR 연결이 뒤바뀜.
 *  JP 정상(SVK-028=エヴォ, SVK-029=デヴォ). KR 두 장 LC만 교차:
 *    · kr-svk-025 기술머신 데볼루션: lc-jp-tcg-SVK-028(エヴォ) → lc-jp-tcg-SVK-029(デヴォ)
 *    · kr-svk-026 기술머신 에볼루션: lc-jp-tcg-SVK-029(デヴォ) → lc-jp-tcg-SVK-028(エヴォ)
 *  sv-goods는 비동결(동결은 본탄 sv-stellar-crown). CardLocale 유니크 제약은 PK뿐 → 직접 스왑 OK.
 *  실행: npx tsx scripts/fix-svk-kr-tm-swap.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const FIXES = [
  { id: "kr-svk-025", name: "기술머신 데볼루션", fromLc: "lc-jp-tcg-SVK-028", toLc: "lc-jp-tcg-SVK-029" },
  { id: "kr-svk-026", name: "기술머신 에볼루션", fromLc: "lc-jp-tcg-SVK-029", toLc: "lc-jp-tcg-SVK-028" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  assertWritable(["sv-goods"], { allow: hasAllowProtectedFlag(), dryRun: !APPLY, tool: "fix-svk-kr-tm-swap" });

  console.log(`■ sv-goods(SVK) KR 기술머신 에볼/데볼 스왑 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
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
      where: { setId: "kr-svk", numberInt: { in: [25, 26] } },
      select: { id: true, name: true, cardId: true }, orderBy: { numberInt: "asc" },
    });
    console.log("\n  KR 최종:", rows.map((r) => `${r.id}(${r.name})→${r.cardId}`).join("  "));
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
