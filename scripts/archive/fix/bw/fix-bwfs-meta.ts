/**
 * HS = BW はじめてセット (Beginning Set, code FS, BW era, 2010-10-29) 교정.
 *  (A) jp-tcg-BWFS nameKo "볼트로스 덱"(오염)→ "BW 「퍼스트 세트 - 풀의 진화」"(kr-fs 미러). 43장·무레어도·날짜 정상.
 *  (B) kr-fs 기본에너지 충돌 untangle(6건) — 에너지 6장이 #1-6 + 포켓몬 LC 공유, 원소 일치로 lc-038~043 이동, KR 연속 #35-40:
 *        풀#1→#35/lc-038(草)·불꽃#2→#36/lc-039(炎)·물#3→#37/lc-040(水)·번개#4→#38/lc-041(雷)·초#5→#39/lc-042(超)·격투#6→#40/lc-043(闘)
 *      교정후 kr-fs=40 distinct(#1-6 포켓몬 단독 정상).
 *  ※kr-fs는 분기형 KR 제품(40=34포켓몬/트레이너+6에너지) — JP 43 대비 3종(ママンボウ#16·タブンネ#28·チラーミィ#29) 미수록=지역 스코프차(수집누락 아님 추정, 최종 재확인). kr-fs date 1970→리서치.
 *  실행: npx tsx scripts/fix-bwfs-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_NAMEKO = "BW 「퍼스트 세트 - 풀의 진화」"; // kr-fs 미러
// 리서치 wf wuf1umshx (high conf): kr-fs KR 발매일 = 2011-05-03
//  pokemoncard.co.kr/card/8 "발매일 2011-05-03" + namu BW퍼스트세트 인포박스 [KR]2011-05-03. (KR 우산제품=풀·불꽃·물의 진화 3변형 동시발매, kr-fs=풀의 진화)
const KR_DATE: string | null = "2011-05-03";

const FIXES = [
  { id: "kr-fs-001-b", label: "기본 풀 에너지",   fromN: 1, fromLc: "lc-jp-tcg-BWFS-001", toN: 35, toLc: "lc-jp-tcg-BWFS-038" },
  { id: "kr-fs-002-b", label: "기본 불꽃 에너지", fromN: 2, fromLc: "lc-jp-tcg-BWFS-002", toN: 36, toLc: "lc-jp-tcg-BWFS-039" },
  { id: "kr-fs-003-b", label: "기본 물 에너지",   fromN: 3, fromLc: "lc-jp-tcg-BWFS-003", toN: 37, toLc: "lc-jp-tcg-BWFS-040" },
  { id: "kr-fs-004-b", label: "기본 번개 에너지", fromN: 4, fromLc: "lc-jp-tcg-BWFS-004", toN: 38, toLc: "lc-jp-tcg-BWFS-041" },
  { id: "kr-fs-005-b", label: "기본 초 에너지",   fromN: 5, fromLc: "lc-jp-tcg-BWFS-005", toN: 39, toLc: "lc-jp-tcg-BWFS-042" },
  { id: "kr-fs-006",   label: "기본 격투 에너지", fromN: 6, fromLc: "lc-jp-tcg-BWFS-006", toN: 40, toLc: "lc-jp-tcg-BWFS-043" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BWFS", "kr-fs"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bwfs" });

  console.log(`■ HS(BWFS Beginning Set) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) jp-tcg-BWFS nameKo");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BWFS" }, select: { nameKo: true } });
  console.log(`  "${jp?.nameKo}" → "${JP_NAMEKO}"`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BWFS" }, data: { nameKo: JP_NAMEKO } });

  console.log("\n· (B) kr-fs 기본에너지 untangle(6건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (C) kr-fs date");
  if (KR_DATE) { console.log(`  → ${KR_DATE}`); if (APPLY) await prisma.set.update({ where: { id: "kr-fs" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  유지(리서치 대기)");

  if (APPLY) {
    for (const id of ["jp-tcg-BWFS", "kr-fs"]) {
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      console.log(`  검증 ${id}: rows=${rows.length}, distinct=${new Set(rows.map(r=>r.numberInt)).size}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
