/**
 * MMB 덱(jp-tcg-MMBp/MMBs = メガマスターデッキビルドBOX パワー/スピードスタイル) 시대·발매일 교정.
 *
 * 오분류: 수집 시 이름의 "MEGA" 때문에 신 MEGA(메가신화 2025) 블록으로 잘못 넣음 +
 *   Limitless 연도 렌더버그로 발매일이 2015→2025(10년 오인).
 * 실제(리서치 확정 — pokemon-card.com /products/xy/, Bulbapedia): **XY 시대**, **2015-08-07**.
 *   ("M"=XY 시대 메가진화, 2025 MEGA 블록 아님. 형제: jp-tcg-XYA/XYD/XYH 메가배틀덱과 동일 패밀리)
 *
 * 교정(Set.* = FREE 필드, 매핑가드 불필요):
 *   - cardPackId: mega-decks(MEGA-SP) → xy-decks(XY-SP, "XY 구축덱")
 *   - releaseDate: 2025-08-07 → 2015-08-07
 *   - series: "メガシンフォニア" → "ポケモンカードゲームXY"
 *   ※ R2 이미지는 기존 mega-decks/ja/.../jp-tcg-MMB{p,s}/ 경로 그대로 유지(URL 불변, 표시 정상).
 *     경로 폴더명만 mega-decks 로 남는 무해한 불일치 — 이미지 이동 불필요.
 *
 * dry: npx tsx scripts/fix-mmb-era-date.ts
 * 적용: npx tsx scripts/fix-mmb-era-date.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const IDS = ["jp-tcg-MMBp", "jp-tcg-MMBs"];
const TO = { cardPackId: "xy-decks", releaseDate: new Date("2015-08-07T00:00:00.000Z"), series: "ポケモンカードゲームXY" };

async function main() {
  const sets = await prisma.set.findMany({ where: { id: { in: IDS } }, select: { id: true, name: true, cardPackId: true, releaseDate: true, series: true } });
  console.log(`${APPLY ? "APPLY" : "DRY"} fix-mmb-era-date | 대상 ${sets.length}/${IDS.length}`);
  for (const s of sets) {
    console.log(`  ${s.id} (${s.name})`);
    console.log(`    cardPackId : ${s.cardPackId} → ${TO.cardPackId}`);
    console.log(`    releaseDate: ${s.releaseDate?.toISOString().slice(0, 10)} → ${TO.releaseDate.toISOString().slice(0, 10)}`);
    console.log(`    series     : "${s.series}" → "${TO.series}"`);
  }
  if (sets.length !== IDS.length) { console.error(`✗ 대상 누락 — 중단`); process.exit(1); }
  if (!APPLY) { console.log("\n[dry-run] 변경 없음. --apply 로 실행."); return; }

  for (const id of IDS) {
    await prisma.set.update({ where: { id }, data: { cardPackId: TO.cardPackId, releaseDate: TO.releaseDate, series: TO.series } });
    console.log(`  ✅ ${id} 교정`);
  }
  console.log("\n완료 — MMB 덱이 XY 시대(xy-decks) · 2015-08-07 로 교정됨.");
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); }).finally(() => prisma.$disconnect());
