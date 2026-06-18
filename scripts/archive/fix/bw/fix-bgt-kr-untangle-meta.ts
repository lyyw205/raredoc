/**
 * BKt = バトル強化デッキ テラキオン (Terrakion Battle Strength Deck, code BG, BW era, 2011-03-18) 교정.
 *  (A) kr-bg_terrakion 기본에너지 충돌 untangle(3건) — 에너지가 #4/#5/#6 + 포켓몬 LC 공유:
 *        · 기본 번개: #4→#15, lc-004(고디탱)→lc-015(基本雷) · 기본 초: #5→#16, lc-005(단굴)→lc-016(基本超) · 기본 격투: #6→#17, lc-006(암트르)→lc-017(基本闘)
 *      교정후 kr-bg_terrakion = 17 distinct(#4=고디탱/#5=단굴/#6=암트르 정상). (#8/#9 트레이너 번호스왑=정체성 정상)
 *  (B) jp-tcg-BGT nameKo "볼트로스 덱"(오염)→ kr-bg_terrakion 미러, date 1970→2011-03-18.
 *  (C) kr-bg_terrakion date: 머스킷티어 트리오 리서치 확정 시.
 *  실행: npx tsx scripts/fix-bgt-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2011-03-18";
// 리서치 wf w0r67fy2r (high conf): 머스킷티어 트리오 KR 발매일 = 2011-09-06 (pokemoncard.co.kr/card/7 통합 + namu).
const KR_DATE: string | null = "2011-09-06";

const FIXES = [
  { id: "kr-bg_terrakion-004", label: "기본 번개 에너지", fromN: 4, fromLc: "lc-jp-tcg-BGT-004", toN: 15, toLc: "lc-jp-tcg-BGT-015" },
  { id: "kr-bg_terrakion-005", label: "기본 초 에너지",   fromN: 5, fromLc: "lc-jp-tcg-BGT-005", toN: 16, toLc: "lc-jp-tcg-BGT-016" },
  { id: "kr-bg_terrakion-006", label: "기본 격투 에너지", fromN: 6, fromLc: "lc-jp-tcg-BGT-006", toN: 17, toLc: "lc-jp-tcg-BGT-017" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BGT", "kr-bg_terrakion"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bgt" });

  console.log(`■ BKt(BGT Terrakion) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-bg_terrakion 기본에너지 untangle(3건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (B) jp-tcg-BGT nameKo/date");
  const kr = await prisma.set.findUnique({ where: { id: "kr-bg_terrakion" }, select: { name: true } });
  const JP_NAMEKO = kr?.name ?? "BW 「배틀 강화덱 - 테라키온 덱」";
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BGT" }, select: { nameKo: true } });
  console.log(`  nameKo "${jp?.nameKo}" → "${JP_NAMEKO}", date→${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BGT" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  console.log("\n· (C) kr-bg_terrakion date");
  if (KR_DATE) { console.log(`  → ${KR_DATE}`); if (APPLY) await prisma.set.update({ where: { id: "kr-bg_terrakion" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  유지(리서치 대기)");

  if (APPLY) {
    for (const id of ["jp-tcg-BGT", "kr-bg_terrakion"]) {
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      console.log(`  검증 ${id}: rows=${rows.length}, distinct=${new Set(rows.map(r=>r.numberInt)).size}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
