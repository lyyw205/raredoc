/**
 * PPD = プラズマ団パワードデッキ30 (code PD, BW era, 2012-09-14) 교정.
 *  (A) kr-pd 기본에너지 충돌 untangle(PSS형, 2건) — 에너지 2장이 #8/#9 + 포켓몬 LC를 잘못 공유:
 *        · 기본 초 에너지:   #8→#18, lc-008(기기기어르)→lc-018 (JP #18 基本超)
 *        · 기본 강철 에너지: #9→#19, lc-009(아이앤트)→lc-019 (JP #19 基本鋼)
 *      교정후 kr-pd = 19 distinct (#8=기기기어르/lc-008·#9=아이앤트/lc-009 정상).
 *  (B) jp-tcg-PD2 메타: nameKo 오염("BW 「볼트로스 덱」")→ KR형제명, date 1970→2012-09-14(트래커).
 *  (C) kr-pd date → 2013-02-14 (pokemoncard.co.kr/card/2, 로컬 detailId ST2013001… 확증).
 *  ※공식넘버드=17(/017); #18超/#19鋼=numberFull:null. 트래커19=17+기본에너지2. rows19 유지.
 *  ※"플라스마단/플라스마" koName=공식 소스값 → 유지.
 *  ※카드연결(LC 재링크) → assertWritable. PD 비보호 통과.
 *  실행: npx tsx scripts/fix-pd-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

const JP_DATE = "2012-09-14";
const JP_NAMEKO = "BW 「플라스마단 파워 덱」"; // kr-pd 공식명 미러
const KR_DATE: string | null = "2013-02-14";

const FIXES = [
  { id: "kr-pd-008", label: "기본 초 에너지",   fromN: 8, fromLc: "lc-jp-tcg-PD2-008", toN: 18, toLc: "lc-jp-tcg-PD2-018" },
  { id: "kr-pd-009", label: "기본 강철 에너지", fromN: 9, fromLc: "lc-jp-tcg-PD2-009", toN: 19, toLc: "lc-jp-tcg-PD2-019" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-PD2", "kr-pd"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-pd" });

  console.log(`■ PPD(PD) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-pd 기본에너지 untangle(2건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (B) jp-tcg-PD2 nameKo/date");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-PD2" }, select: { nameKo: true, releaseDate: true } });
  console.log(`  nameKo "${jp?.nameKo}" → "${JP_NAMEKO}" | date ${jp?.releaseDate?.toISOString().slice(0,10)} → ${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-PD2" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  console.log("\n· (C) kr-pd date");
  if (KR_DATE) { console.log(`  date → ${KR_DATE}`); if (APPLY) await prisma.set.update({ where: { id: "kr-pd" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  KR_DATE 미확정 → placeholder 유지");

  if (APPLY) {
    for (const id of ["jp-tcg-PD2", "kr-pd"]) {
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
