/**
 * BKB = バトル強化デッキ60「ブラックキュレムEX」 (code BGB, BW era, 2012-10-19) 교정.
 *  (A) kr-bgb 스크램블 untangle — 기본에너지 2장이 #3/#4 + 포켓몬 LC를 잘못 공유, 1장은 LC오링크:
 *        · 탱탱겔(Jellicent):      lc-019(물에너지)→lc-003  (번호 #3 유지)
 *        · 기본 물 에너지:          #3→#19            (lc-019 유지, 정상)
 *        · 기본 번개 에너지:        #4→#20, lc-004(코일)→lc-020
 *      교정후 kr-bgb = 20 distinct (모든 정체성 정상), JP 구조와 일치. (코일 #4/lc-004 유지)
 *  (B) jp-tcg-BGB2 메타: nameKo 오염("BW 「볼트로스 덱」")→ KR형제명, date 1970→2012-10-19(트래커).
 *  (C) kr-bgb date: 리서치 확정 시에만.
 *  ※ KR명 3장 "플라스마단" 접미 오염(탱탱겔/썬더EX/플라스마에너지)은 별도 플래그(소스확인 후 정리).
 *  ※ 카드연결(LC 재링크) 변경이라 assertWritable 가드. BGB 그룹 비보호 통과.
 *  실행: npx tsx scripts/fix-bgb-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "../../../lib/protected-groups";

// 리서치 wf w1yx3vla1 (high conf): JP 2012-10-19(Serebii+Bulba+yodobashi), 공식넘버드=18(/018, #19물/#20뢰=numberFull:null 미넘버드), hasRarity=false.
//  KR=2013-04-04 (pokemoncard.co.kr/card/1 라이브, 블랙+화이트 통합 단일 SKU 8,000원). DB 분할명(블랙/화이트)은 공식 통합명의 일관된 변형 → 유지.
//  ※로컬 공식데이터: data/jp-official/jp-bw-bgb.json, data/kr-official/kr-official-bgb.json (구조확인 가능).
const JP_DATE = "2012-10-19";
const JP_NAMEKO = "BW 「배틀 강화 60장 덱 - 블랙큐레무 EX」"; // kr-bgb 공식명 미러(분할 변형)
const KR_DATE: string | null = "2013-04-04";

// id 기준 매칭(명확). from-가드: 현재 numberInt+logicalCardId 일치 시에만 적용.
const FIXES = [
  { id: "kr-bgb-003-b", label: "탱탱겔(Jellicent)",   fromN: 3, fromLc: "lc-jp-tcg-BGB2-019", toN: 3,  toLc: "lc-jp-tcg-BGB2-003" },
  { id: "kr-bgb-003",   label: "기본 물 에너지",        fromN: 3, fromLc: "lc-jp-tcg-BGB2-019", toN: 19, toLc: "lc-jp-tcg-BGB2-019" },
  { id: "kr-bgb-004",   label: "기본 번개 에너지",       fromN: 4, fromLc: "lc-jp-tcg-BGB2-004", toN: 20, toLc: "lc-jp-tcg-BGB2-020" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BGB2", "kr-bgb"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bgb" });

  console.log(`■ BKB(BGB) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-bgb 스크램블 untangle");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (B) jp-tcg-BGB2 nameKo/date");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BGB2" }, select: { nameKo: true, releaseDate: true } });
  console.log(`  nameKo "${jp?.nameKo}" → "${JP_NAMEKO}" | date ${jp?.releaseDate?.toISOString().slice(0,10)} → ${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BGB2" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  console.log("\n· (C) kr-bgb date");
  if (KR_DATE) { console.log(`  date → ${KR_DATE}`); if (APPLY) await prisma.set.update({ where: { id: "kr-bgb" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  KR_DATE 미확정 → placeholder 유지(최종점검 플래그)");

  if (APPLY) {
    for (const id of ["jp-tcg-BGB2", "kr-bgb"]) {
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
