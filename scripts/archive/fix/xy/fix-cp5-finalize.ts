/**
 * CP5(幻・伝説ドリームキラコレクション) 레어도 정리 + KR발매일 — 공식검증(pg=439, high conf) 결과 반영.
 *  · JP/KR 전 카드 rarityId → null: 공식 38장 전수 레어도심볼 0건(파서 CP6 음성대조로 검증). DB의 C19/U13/R4는 EN식 오배정.
 *    (같은 포켓몬 2회 등장=일러스트 차이지 C/U 구분 아님. 트래커도 "무레어도, 전부 1st Edition Holo"로 일치.)
 *  · kr-cp5 releaseDate → 2016-08-25 (namu 국기태그 "대한민국 국기 2016년 8월 25일", high conf).
 * og-cp5 비동결(PROTECTED 미포함). 레어도=연결변경 아님. 실행: npx tsx scripts/fix-cp5-finalize.ts --apply
 */
import "dotenv/config";
import { prisma } from "../../../../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  console.log(`■ CP5 레어도 null화 + KR date | ${APPLY ? "★APPLY" : "(dry-run)"}\n`);
  for (const setId of ["jp-tcg-CP5", "kr-cp5"]) {
    const before = await prisma.regionCard.count({ where: { setId, rarityId: { not: null } } });
    console.log(`  ${setId}: rarity 보유 ${before}행 → null`);
    if (APPLY && before) await prisma.regionCard.updateMany({ where: { setId, rarityId: { not: null } }, data: { rarityId: null } });
  }
  const kr = await prisma.set.findUnique({ where: { id: "kr-cp5" }, select: { releaseDate: true } });
  console.log(`  kr-cp5 releaseDate ${kr?.releaseDate?.toISOString().slice(0,10)} → 2016-08-25`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "kr-cp5" }, data: { releaseDate: new Date("2016-08-25T00:00:00Z") } });
    console.log("\n=== 검증 ===");
    for (const setId of ["jp-tcg-CP5", "kr-cp5"]) {
      const withR = await prisma.regionCard.count({ where: { setId, rarityId: { not: null } } });
      const tot = await prisma.regionCard.count({ where: { setId } });
      console.log(`  ${setId}: rarity보유=${withR}/${tot}`);
    }
    const k = await prisma.set.findUnique({ where: { id: "kr-cp5" }, select: { releaseDate: true } });
    console.log(`  kr-cp5 date=${k?.releaseDate?.toISOString().slice(0,10)}`);
  } else console.log("\n(dry-run) --apply");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
