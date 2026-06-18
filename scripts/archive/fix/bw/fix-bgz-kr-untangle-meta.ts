/**
 * BKZ = バトル強化デッキ60「ゼクロムEX」 (Zekrom-EX Battle Strength Deck, code BGZ, BW era, 2011-10-21) 교정.
 *  (A) kr-bgz 기본에너지 충돌 untangle(2건) — 에너지가 #1/#4 + 포켓몬 LC 공유:
 *        · 기본 풀: #1→#19, lc-001(스라크)→lc-019(基本草) · 기본 번개: #4→#20, lc-004(암팰리스)→lc-020(基本雷)
 *      교정후 kr-bgz = 20 distinct(#1=스라크/#4=암팰리스 정상). (#11/#14·#15/#16 트레이너 번호스왑=정체성 정상)
 *  (B) jp-tcg-BGZ2 nameKo "볼트로스 덱"(오염)→ "BW 「배틀 강화 60장 덱 - 제크로무 EX」"(kr-bgz 미러), date 1970→2011-10-21.
 *  (C) kr-bgz nameKo 이미 정상·code BGZ 정상. KR date: BKR/BKZ 트윈 리서치 확정 시.
 *  ※카드연결(LC 재링크) → assertWritable. BGZ 비보호 통과.
 *  실행: npx tsx scripts/fix-bgz-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2011-10-21";
const JP_NAMEKO = "BW 「배틀 강화 60장 덱 - 제크로무 EX」"; // kr-bgz 미러
// 리서치 wf wcu5ihya3 (high conf): BKR/BKZ KR 발매일 = 2012-04-12 (동시발매, pokemoncard.co.kr/card/5 통합 + namu).
const KR_DATE: string | null = "2012-04-12";

const FIXES = [
  { id: "kr-bgz-001", label: "기본 풀 에너지",   fromN: 1, fromLc: "lc-jp-tcg-BGZ2-001", toN: 19, toLc: "lc-jp-tcg-BGZ2-019" },
  { id: "kr-bgz-004", label: "기본 번개 에너지", fromN: 4, fromLc: "lc-jp-tcg-BGZ2-004", toN: 20, toLc: "lc-jp-tcg-BGZ2-020" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BGZ2", "kr-bgz"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bgz" });

  console.log(`■ BKZ(BGZ) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-bgz 기본에너지 untangle(2건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (B) jp-tcg-BGZ2 nameKo/date");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BGZ2" }, select: { nameKo: true } });
  console.log(`  nameKo "${jp?.nameKo}" → "${JP_NAMEKO}", date→${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BGZ2" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  console.log("\n· (C) kr-bgz date");
  if (KR_DATE) { console.log(`  → ${KR_DATE}`); if (APPLY) await prisma.set.update({ where: { id: "kr-bgz" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  유지(리서치 대기)");

  if (APPLY) {
    for (const id of ["jp-tcg-BGZ2", "kr-bgz"]) {
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      console.log(`  검증 ${id}: rows=${rows.length}, distinct=${new Set(rows.map(r=>r.numberInt)).size}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
