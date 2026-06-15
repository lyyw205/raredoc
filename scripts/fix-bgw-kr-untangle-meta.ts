/**
 * BKW = バトル強化デッキ60「ホワイトキュレムEX」 (code BGW, BW era, 2012-10-19) 교정.
 *  (A) kr-bgw 스크램블 untangle(4건) — 기본에너지 2장이 #2/#3 + 포켓몬 LC를 잘못 공유, 2장 LC 상호 오링크:
 *        · 기본 불꽃 에너지: #2→#19, lc-002→lc-019 (JP #19 基本炎)
 *        · 기본 물 에너지:   #3→#20, lc-003→lc-020 (JP #20 基本水)
 *        · 샤크니아(Sharpedo): lc-014(랜덤리시버)→lc-004 (#4 유지)
 *        · 랜덤 리시버:        lc-019(불꽃E)→lc-014 (#10 유지)
 *      교정후 kr-bgw = 20 distinct, 20 LC 전부 1:1. (불켜미 #2/lc-002·샤프니아 #3/lc-003·하이퍼볼 #14/lc-010 유지)
 *  (B) jp-tcg-BGW2 메타: nameKo 오염("BW 「볼트로스 덱」")→ KR형제명, date 1970→2012-10-19.
 *  (C) kr-bgw date → 2013-04-04 (블랙+화이트 통합 KR SKU, pokemoncard.co.kr/card/1).
 *  ※ "플라스마단" 접미 koName(파이어EX/샤크니아/플라스마에너지)=공식 소스값(Team Plasma 표기) → 유지.
 *  ※ 공식넘버드=18(/018); #19炎/#20水=numberFull:null. 트래커20=18+기본에너지2. rows20 유지.
 *  ※ 카드연결(LC 재링크) 변경 → assertWritable. BGW 비보호 통과.
 *  실행: npx tsx scripts/fix-bgw-kr-untangle-meta.ts [--apply] [--allow-protected]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assertWritable, hasAllowProtectedFlag } from "./lib/protected-groups";

const JP_DATE = "2012-10-19";
const JP_NAMEKO = "BW 「배틀 강화 60장 덱 - 화이트큐레무 EX」"; // kr-bgw 공식명 미러(분할 변형)
const KR_DATE: string | null = "2013-04-04";

const FIXES = [
  { id: "kr-bgw-002", label: "기본 불꽃 에너지",     fromN: 2,  fromLc: "lc-jp-tcg-BGW2-002", toN: 19, toLc: "lc-jp-tcg-BGW2-019" },
  { id: "kr-bgw-003", label: "기본 물 에너지",        fromN: 3,  fromLc: "lc-jp-tcg-BGW2-003", toN: 20, toLc: "lc-jp-tcg-BGW2-020" },
  { id: "kr-bgw-004", label: "샤크니아(Sharpedo)",    fromN: 4,  fromLc: "lc-jp-tcg-BGW2-014", toN: 4,  toLc: "lc-jp-tcg-BGW2-004" },
  { id: "kr-bgw-010", label: "랜덤 리시버",            fromN: 10, fromLc: "lc-jp-tcg-BGW2-019", toN: 10, toLc: "lc-jp-tcg-BGW2-014" },
];

async function main() {
  const APPLY = process.argv.includes("--apply");
  const allow = hasAllowProtectedFlag();
  const sets = await prisma.set.findMany({ where: { id: { in: ["jp-tcg-BGW2", "kr-bgw"] } }, select: { id: true, cardPackId: true } });
  assertWritable(sets.map((s) => s.cardPackId), { allow, dryRun: !APPLY, tool: "fix-bgw" });

  console.log(`■ BKW(BGW) 교정 | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);

  console.log("· (A) kr-bgw 스크램블 untangle(4건)");
  for (const f of FIXES) {
    const rc = await prisma.regionCard.findUnique({ where: { id: f.id } });
    if (!rc) { console.log(`  🔴 ${f.id} 없음 → skip`); continue; }
    if (rc.numberInt !== f.fromN || rc.cardId !== f.fromLc) {
      console.log(`  ⚠️ ${f.id}: 현재 #${rc.numberInt}/${rc.cardId} ≠ 예상 #${f.fromN}/${f.fromLc} → skip(안전)`); continue;
    }
    console.log(`  ✔ ${f.label} [${f.id}]: #${f.fromN}→#${f.toN}, ${f.fromLc}→${f.toLc}`);
    if (APPLY) await prisma.regionCard.update({ where: { id: f.id }, data: { numberInt: f.toN, cardId: f.toLc } });
  }

  console.log("\n· (B) jp-tcg-BGW2 nameKo/date");
  const jp = await prisma.set.findUnique({ where: { id: "jp-tcg-BGW2" }, select: { nameKo: true, releaseDate: true } });
  console.log(`  nameKo "${jp?.nameKo}" → "${JP_NAMEKO}" | date ${jp?.releaseDate?.toISOString().slice(0,10)} → ${JP_DATE}`);
  if (APPLY) await prisma.set.update({ where: { id: "jp-tcg-BGW2" }, data: { nameKo: JP_NAMEKO, releaseDate: new Date(`${JP_DATE}T00:00:00Z`) } });

  console.log("\n· (C) kr-bgw date");
  if (KR_DATE) { console.log(`  date → ${KR_DATE}`); if (APPLY) await prisma.set.update({ where: { id: "kr-bgw" }, data: { releaseDate: new Date(`${KR_DATE}T00:00:00Z`) } }); }
  else console.log("  KR_DATE 미확정 → placeholder 유지");

  if (APPLY) {
    for (const id of ["jp-tcg-BGW2", "kr-bgw"]) {
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
