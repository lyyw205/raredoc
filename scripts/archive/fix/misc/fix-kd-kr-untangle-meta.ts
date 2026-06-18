/**
 * KLD = バトル強化デッキ30「ケルディオ」 (code KD, BW era, 2012-04-20) 교정.
 *  (A) kr-kd 기본에너지 충돌 untangle(3건, 이 덱은 에너지 3종) — 에너지가 #3/#8/#9 + 포켓몬 LC를 잘못 공유:
 *        · 기본 물 에너지:   #3→#16, lc-003(프리지오)→lc-016 (JP #16 基本水)
 *        · 기본 악 에너지:   #8→#17, lc-008(기어르)→lc-017 (JP #17 基本悪)
 *        · 기본 강철 에너지: #9→#18, lc-010(수퍼볼)→lc-018 (JP #18 基本鋼) ※강철에너지가 lc-010에 오링크
 *      교정후 kr-kd = 18 distinct(#3=프리지오/#8=기어르/#9=수퍼볼 정상). 트레이너 #9-15 번호차=정체성 정상.
 *  (B) jp-tcg-KD2 메타: nameKo 오염("BW 「볼트로스 덱」")→ "BW 「케르디오 덱」", date 1970→2012-04-20(트래커).
 *  (C) kr-kd date: 리서치 확정 시(로컬 detailId ST2012→2012 발매, 정확일 미확정).
 *  ※공식넘버드=15(/015); #16-18 에너지=numberFull:null. 트래커18=15+에너지3, 무레어도.
 *  ※카드연결(LC 재링크) → assertWritable. KD 비보호 통과.
 *  실행: npx tsx scripts/fix-kd-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2012-04-20";
const JP_NAMEKO = "BW 「케르디오 덱」"; // kr-kd 공식명 미러
// 리서치 wf wqp1c53rr (high conf): kr-kd KR 발매일 = 2012-11-01
//  pokemoncard.co.kr/card/17 Playwright DOM "발매일 2012-11-01" (제품="BW 트레이너 세트 「케르디오」", 케르디오 덱 번들 포함). detailId ST2012007 일치.
const KR_DATE: string | null = "2012-11-01";

const FIXES = [
  { id: "kr-kd-003", label: "기본 물 에너지",   fromN: 3, fromLc: "lc-jp-tcg-KD2-003", toN: 16, toLc: "lc-jp-tcg-KD2-016" },
  { id: "kr-kd-008", label: "기본 악 에너지",   fromN: 8, fromLc: "lc-jp-tcg-KD2-008", toN: 17, toLc: "lc-jp-tcg-KD2-017" },
  { id: "kr-kd-009", label: "기본 강철 에너지", fromN: 9, fromLc: "lc-jp-tcg-KD2-010", toN: 18, toLc: "lc-jp-tcg-KD2-018" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-KD2", "kr-kd"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-kd" });

  console.log(`■ KLD(KD) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-kd 기본에너지 untangle(3건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (B) jp-tcg-KD2 nameKo/date");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-KD2" }, select: { nameKo: true, releaseDate: true } });
  console.log(`  nameKo "${jp?.nameKo}" → "${JP_NAMEKO}" | date ${jp?.releaseDate?.toISOString().slice(0,10)} → ${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-KD2" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  console.log("\n· (C) kr-kd date");
  if (KR_DATE) { console.log(`  date → ${KR_DATE}`); if (APPLY) await prisma.set.update({ where: { id: "kr-kd" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  KR_DATE 미확정 → placeholder 유지(리서치 대기)");

  if (APPLY) {
    for (const id of ["jp-tcg-KD2", "kr-kd"]) {
      const n = await prisma.regionCard.count({ where: { setId: id } });
      await prisma.set.update({ where: { id }, data: { cardCount: n } });
      const rows = await prisma.regionCard.findMany({ where: { setId: id }, select: { numberInt: true } });
      const distinct = new Set(rows.map((r) => r.numberInt)).size;
      console.log(`\n=== 검증 ${id}: rows=${rows.length}, distinct=${distinct}`);
    }
  } else console.log("\n(dry-run) 적용: --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
