/**
 * BKR = バトル強化デッキ60「レシラムEX」 (Reshiram-EX Battle Strength Deck, code BGR, BW era, 2011-10-21) 교정.
 *  (A) kr-bgrex 기본에너지 충돌 untangle(2건) — KR공식 /018 + 에너지2(#2/#3 numberFull:null, 충돌원), 포켓몬 LC 공유:
 *        · 기본 불꽃: #2→#19, lc-002(윈디)→lc-019(基本炎) · 기본 물: #3→#20, lc-003(활화르바)→lc-020(基本水)
 *      교정후 kr-bgrex = 20 distinct(#2=윈디/#3=활화르바 정상). (#11/#14 트레이너 번호스왑=정체성 정상)
 *  (B) jp-tcg-BGREX nameKo "볼트로스 덱"(오염)→ "BW 「배틀 강화 60장 덱 - 레시라무 EX」"(kr 미러), date 1970→2011-10-21.
 *  (C) kr-bgrex nameKo null→ 동일. KR date: 리서치 확정 시(BKZ 제크로무EX 트윈과 공통 추정).
 *  ※ kr-bgrex code="BGR"(버그군) — 식별자 추측 수정 안 함, 플래그.
 *  ※카드연결(LC 재링크) → assertWritable. BGR 비보호 통과.
 *  실행: npx tsx scripts/fix-bgrex-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2011-10-21";
const KR_NAME = "BW 「배틀 강화 60장 덱 - 레시라무 EX」";
// 리서치 wf wcu5ihya3 (high conf): BKR/BKZ KR 발매일 = 2012-04-12 (동시발매)
//  pokemoncard.co.kr/card/5 통합 "레시라무 EX·제크로무 EX" 발매일 2012-04-12 + namu 양쪽 인포박스 [KR]2012-04-12.
const KR_DATE: string | null = "2012-04-12";

const FIXES = [
  { id: "kr-bgrex-002", label: "기본 불꽃 에너지", fromN: 2, fromLc: "lc-jp-tcg-BGREX-002", toN: 19, toLc: "lc-jp-tcg-BGREX-019" },
  { id: "kr-bgrex-003", label: "기본 물 에너지",   fromN: 3, fromLc: "lc-jp-tcg-BGREX-003", toN: 20, toLc: "lc-jp-tcg-BGREX-020" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BGREX", "kr-bgrex"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bgrex" });

  console.log(`■ BKR(BGREX) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-bgrex 기본에너지 untangle(2건)");
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
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BGREX" }, select: { nameKo: true } });
  console.log(`  jp-tcg-BGREX nameKo "${jp?.nameKo}" → "${KR_NAME}", date→${JP_DATE}`);
  console.log(`  kr-bgrex nameKo (null)→ "${KR_NAME}", date ${KR_DATE ?? "유지(리서치 대기)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "jp-tcg-BGREX" }, data: { nameKo: KR_NAME, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });
    const krData: any = { nameKo: KR_NAME };
    if (KR_DATE) krData.releaseDate = new Date(`${KR_DATE}T00:00:00Z`);
    await prisma.set.update({ where: { id: "kr-bgrex" }, data: krData });
  }

  if (APPLY) {
    for (const id of ["jp-tcg-BGREX", "kr-bgrex"]) {
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      console.log(`  검증 ${id}: rows=${rows.length}, distinct=${new Set(rows.map(r=>r.numberInt)).size}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
