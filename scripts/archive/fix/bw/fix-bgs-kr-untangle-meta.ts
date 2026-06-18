/**
 * BGS = バトルギフトセット「ボルトロスVSトルネロス」(Thundurus vs Tornadus Battle Gift Set, BW era, 2011-11-18) 교정.
 *  DB는 두 덱으로 분할: jp-tcg-BD2(볼트로스/Thundurus 덱)·jp-tcg-TD2(토르네로스/Tornadus 덱), JP는 통합 1-23 번호의 부분집합.
 *  (A) kr-bd 기본에너지 충돌 untangle(3건) — KR공식=13넘버드+에너지3(detailId …014/015/016, numberFull:null), 에너지가 #4/6/8+포켓몬LC 공유:
 *        · 기본 번개: #4→#14, lc-008→lc-021(基本雷) · 기본 격투: #6→#15, lc-010→lc-022(基本闘) · 기본 악: #8→#16, lc-016→lc-023(基本悪)
 *  (B) kr-td 기본에너지 충돌 untangle(3건) — 에너지가 #2/3/9+포켓몬/트레이너LC 공유:
 *        · 기본 불꽃: #2→#14, lc-002→lc-021(基本炎) · 기본 물: #3→#15, lc-003→lc-022(基本水) · 기본 강철: #9→#16, lc-015→lc-023(基本鋼)
 *      교정후 kr-bd/kr-td = 16 distinct(#1-16), 포켓몬/트레이너 정체성 정상.
 *  (C) JP 메타: jp-tcg-BD2 nameKo "볼트로스 덱"(정확·유지)·date 1970→2011-11-18; jp-tcg-TD2 nameKo "볼트로스 덱"→"BW 「토네로스 덱」"(kr-td 미러)·date 1970→2011-11-18.
 *  (D) kr-bd/kr-td date: 리서치 확정 시(detailId ST2012003/004=2012).
 *  ※카드연결(LC 재링크) → assertWritable. BD/TD 비보호 통과.
 *  실행: npx tsx scripts/fix-bgs-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2011-11-18";
// 리서치 wf wqbrta69y (high conf): BGS KR 발매일 = 2012-06-21 (볼트로스/토네로스 덱 동시발매)
//  pokemoncard.co.kr/card/4 "발매일 2012-06-21·각 4,000원"(통합 인트로) + namu 토르네로스 인포박스 [KR]2012-06-21.
const KR_DATE: string | null = "2012-06-21";

const FIXES = [
  // kr-bd (Thundurus deck)
  { id: "kr-bd-004", label: "기본 번개 에너지", fromN: 4, fromLc: "lc-jp-tcg-BD2-008", toN: 14, toLc: "lc-jp-tcg-BD2-021" },
  { id: "kr-bd-006", label: "기본 격투 에너지", fromN: 6, fromLc: "lc-jp-tcg-BD2-010", toN: 15, toLc: "lc-jp-tcg-BD2-022" },
  { id: "kr-bd-008", label: "기본 악 에너지",   fromN: 8, fromLc: "lc-jp-tcg-BD2-016", toN: 16, toLc: "lc-jp-tcg-BD2-023" },
  // kr-td (Tornadus deck)
  { id: "kr-td-002", label: "기본 불꽃 에너지", fromN: 2, fromLc: "lc-jp-tcg-TD2-002", toN: 14, toLc: "lc-jp-tcg-TD2-021" },
  { id: "kr-td-003", label: "기본 물 에너지",   fromN: 3, fromLc: "lc-jp-tcg-TD2-003", toN: 15, toLc: "lc-jp-tcg-TD2-022" },
  { id: "kr-td-009", label: "기본 강철 에너지", fromN: 9, fromLc: "lc-jp-tcg-TD2-015", toN: 16, toLc: "lc-jp-tcg-TD2-023" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const SETS = ["jp-tcg-BD2", "jp-tcg-TD2", "kr-bd", "kr-td"];
  const sets = await prisma.set.findMany({ where: { id: { in: SETS } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bgs" });

  console.log(`■ BGS(BD2/TD2) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A/B) kr-bd·kr-td 기본에너지 untangle(6건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (C) JP 메타");
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-BD2" }, data: { releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } }); // nameKo "볼트로스 덱" 유지
    await prisma.set.update({ where: { id: "jp-tcg-TD2" }, data: { nameKo: "BW 「토네로스 덱」", releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });
  }
  console.log(`  jp-tcg-BD2: nameKo 유지(볼트로스 덱), date→${JP_DATE} | jp-tcg-TD2: nameKo→"BW 「토네로스 덱」", date→${JP_DATE}`);

  console.log("\n· (D) KR date");
  if (KR_DATE) { console.log(`  → ${KR_DATE}`); if (APPLY) for (const id of ["kr-bd","kr-td"]) await prisma.set.update({ where: { id }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  유지(리서치 대기)");

  if (APPLY) {
    for (const id of SETS) {
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      const distinct = new Set(rows.map((r) => r.numberInt)).size;
      console.log(`  검증 ${id}: rows=${rows.length}, distinct=${distinct}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
