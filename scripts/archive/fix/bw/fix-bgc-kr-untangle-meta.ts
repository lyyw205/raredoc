/**
 * BKc = バトル強化デッキ コバルオン (Cobalion Battle Strength Deck, code BG, BW era, 2011-03-18) 교정.
 *  (A) kr-bg_cobalon 기본에너지 충돌 untangle(2건) — 에너지가 #7/#8 + 포켓몬 LC 공유:
 *        · 기본 악: #7→#15, lc-007(수리둥보)→lc-015(基本悪) · 기본 강철: #8→#16, lc-009(수퍼볼)→lc-016(基本鋼)
 *      교정후 kr-bg_cobalon = 16 distinct(#7=수리둥보/#8=수퍼볼 정상). (#8/#9 트레이너 번호스왑=정체성 정상)
 *  (B) jp-tcg-BGC nameKo "볼트로스 덱"(오염)→ "BW 「배틀 강화덱 - 코바르온 덱」"(kr 미러), date 1970→2011-03-18.
 *  (C) kr-bg_cobalon nameKo 정상. KR date: 머스킷티어 트리오(BKc/BKt/BKv) 리서치 확정 시.
 *  실행: npx tsx scripts/fix-bgc-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2011-03-18";
const JP_NAMEKO = "BW 「배틀 강화덱 - 코바르온 덱」"; // kr-bg_cobalon 미러
// 리서치 wf w0r67fy2r (high conf): 머스킷티어 트리오 KR 발매일 = 2011-09-06 (코바르온/테라키온/비리디온 동시발매)
//  pokemoncard.co.kr/card/7 통합 "발매일 2011-09-06·각 6,000원" + namu BW배틀강화덱 인포박스 [KR]2011-09-06.
const KR_DATE: string | null = "2011-09-06";

const FIXES = [
  { id: "kr-bg_cobalon-007", label: "기본 악 에너지",   fromN: 7, fromLc: "lc-jp-tcg-BGC-007", toN: 15, toLc: "lc-jp-tcg-BGC-015" },
  { id: "kr-bg_cobalon-008", label: "기본 강철 에너지", fromN: 8, fromLc: "lc-jp-tcg-BGC-009", toN: 16, toLc: "lc-jp-tcg-BGC-016" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BGC", "kr-bg_cobalon"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bgc" });

  console.log(`■ BKc(BGC Cobalion) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-bg_cobalon 기본에너지 untangle(2건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (B) jp-tcg-BGC nameKo/date");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BGC" }, select: { nameKo: true } });
  console.log(`  nameKo "${jp?.nameKo}" → "${JP_NAMEKO}", date→${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BGC" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  console.log("\n· (C) kr-bg_cobalon date");
  if (KR_DATE) { console.log(`  → ${KR_DATE}`); if (APPLY) await prisma.set.update({ where: { id: "kr-bg_cobalon" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  유지(리서치 대기)");

  if (APPLY) {
    for (const id of ["jp-tcg-BGC", "kr-bg_cobalon"]) {
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      console.log(`  검증 ${id}: rows=${rows.length}, distinct=${new Set(rows.map(r=>r.numberInt)).size}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
