/**
 * BKv = バトル強化デッキ ビリジオン (Virizion Battle Strength Deck, code BG, BW era, 2011-03-18) 교정.
 *  (A) kr-bg_virizion 기본에너지 충돌 untangle(3건) — 에너지가 #1/#2/#3 + 포켓몬 LC 공유:
 *        · 기본 풀: #1→#15, lc-001(두르보)→lc-015(基本草) · 기본 불꽃: #2→#16, lc-002(두르쿤)→lc-016(基本炎) · 기본 물: #3→#17, lc-003(소미안)→lc-017(基本水)
 *      교정후 kr-bg_virizion = 17 distinct. (#8/#9 트레이너 번호스왑=정체성 정상)
 *  (B) jp-tcg-BGV nameKo "볼트로스 덱"(오염)→ kr-bg_virizion 미러, date 1970→2011-03-18.
 *  (C) kr-bg_virizion date → 2011-09-06 (머스킷티어 트리오, 리서치 wf w0r67fy2r high conf, pokemoncard.co.kr/card/7).
 *  실행: npx tsx scripts/fix-bgv-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2011-03-18";
const KR_DATE = "2011-09-06";

const FIXES = [
  { id: "kr-bg_virizion-001", label: "기본 풀 에너지",   fromN: 1, fromLc: "lc-jp-tcg-BGV-001", toN: 15, toLc: "lc-jp-tcg-BGV-015" },
  { id: "kr-bg_virizion-002", label: "기본 불꽃 에너지", fromN: 2, fromLc: "lc-jp-tcg-BGV-002", toN: 16, toLc: "lc-jp-tcg-BGV-016" },
  { id: "kr-bg_virizion-003", label: "기본 물 에너지",   fromN: 3, fromLc: "lc-jp-tcg-BGV-003", toN: 17, toLc: "lc-jp-tcg-BGV-017" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BGV", "kr-bg_virizion"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bgv" });

  console.log(`■ BKv(BGV Virizion) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-bg_virizion 기본에너지 untangle(3건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (B/C) 메타");
  const kr = await prisma.set.findUnique({ where: { id: "kr-bg_virizion" }, select: { name: true } });
  const JP_NAMEKO = kr?.name ?? "BW 「배틀 강화덱 - 비리디온 덱」";
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BGV" }, select: { nameKo: true } });
  console.log(`  jp-tcg-BGV nameKo "${jp?.nameKo}" → "${JP_NAMEKO}", date→${JP_DATE} | kr-bg_virizion date→${KR_DATE}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-BGV" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });
    await prisma.set.update({ where: { id: "kr-bg_virizion" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } });
  }

  if (APPLY) {
    for (const id of ["jp-tcg-BGV", "kr-bg_virizion"]) {
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      console.log(`  검증 ${id}: rows=${rows.length}, distinct=${new Set(rows.map(r=>r.numberInt)).size}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
