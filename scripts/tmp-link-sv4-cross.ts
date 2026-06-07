// Paradox Rift(sv4) 잔여 10장 → JP 스타터/레이징서프 연결 (2026-06-07, registry §36)
//   EN sv4 = SV4K+SV4M+레이징서프(merge 완료) + 스타터 테라스탈 SVEL/SVEM 발췌 + 특수E.
//   SVEL(라우드본ex)/SVEM(뮤츠ex) 2023-09-22 — sv4(2023-11-10) 직전 인쇄, 시기 페어링 유일쌍.
//   Volcanion: SVEL#004(9월 1쇄) 선택 — SVG#011은 sv4 동일 발매(2023-11-10) 재록.
//   Skeledirge ex: SVEL#008 선택 — triplet#020(3월)은 PAL(sv2#37) 짝으로 예약(발매순 페어링).
//   이미지 판정: Volcanion·Mewtwo ex·Skeledirge ex 3쌍 동일 아트 확인.
//   사용: npx tsx scripts/tmp-link-sv4-cross.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const PAIRS: [string, string, string, string, string][] = [
  ["jp-tcg-SVEL", "004", "sv4", "22", "Volcanion Nisota Niso (이미지 판정)"],
  ["jp-tcg-SVEL", "005", "sv4", "23", "Fuecoco Gemi"],
  ["jp-tcg-SVEL", "006", "sv4", "24", "Crocalor Pani Kobayashi"],
  ["jp-tcg-SVEM", "001", "sv4", "58", "Mewtwo ex aky CG Works (이미지 판정)"],
  ["jp-tcg-SVEM", "004", "sv4", "71", "Natu ryoma uratsuka (PE#060은 2024-10 재록)"],
  ["jp-tcg-SVEM", "005", "sv4", "72", "Xatu Tetsu Kayama"],
  ["jp-tcg-SVEM", "006", "sv4", "74", "Deoxys Saya Tsuruta"],
  ["jp-tcg-SVEL", "008", "sv4", "137", "Skeledirge ex 5ban (이미지 판정)"],
  ["jp-sv-raging-surf", "062", "sv4", "182", "Medical Energy (특수E 수동 — RS 유일)"],
  ["jp-sv-raging-surf", "092", "sv4", "266", "Reversal Energy 골드 (UR 인쇄 RS#092 유일 — 일반판 SV2P#071과 별개)"],
];

async function main() {
  console.log(`■ sv4 잔여 연결 ${PAIRS.length}쌍 ${APPLY ? "★적용" : "(dry)"}`);
  let ok = 0, skip = 0;
  for (const [jpSet, jpNum, enSet, enNum, memo] of PAIRS) {
    const jp = await prisma.cardLocale.findFirst({ where: { setId: jpSet, number: jpNum },
      select: { name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { where: { region: "EN" }, select: { id: true } } } } } });
    const en = await prisma.cardLocale.findFirst({ where: { setId: enSet, number: enNum },
      select: { id: true, name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { select: { region: true } } } } } });
    if (!jp || !en) { console.log(`❌ 누락: ${jpSet}#${jpNum} / ${enSet}#${enNum}`); skip++; continue; }
    if (jp.logicalCard?.locales.length) { console.log(`⚠ JP 기연결 스킵: ${jpSet}#${jpNum} ${jp.name}`); skip++; continue; }
    if (!en.logicalCard?.locales.every((l) => l.region === "EN")) { console.log(`⚠ EN 비orphan 스킵: ${enSet}#${enNum} ${en.name}`); skip++; continue; }
    console.log(`연결 ${jpSet.replace("jp-tcg-", "").replace("jp-sv-", "")}#${jpNum} ${jp.name} [${jp.logicalCard?.illustrator}] ← ${enSet}#${enNum} ${en.name} [${en.logicalCard?.illustrator}] (${memo})`);
    if (APPLY) {
      const oldLc = en.logicalCardId!;
      await prisma.cardLocale.update({ where: { id: en.id }, data: { logicalCardId: jp.logicalCardId! } });
      await migrateAndDelete(oldLc, jp.logicalCardId!);
    }
    ok++;
  }
  console.log(`\n연결 ${ok} · 스킵 ${skip}`);
}

// orphan LC 삭제 전 사용자 데이터 참조 이관 (BBWF 패턴)
async function migrateAndDelete(oldLc: string, newLc: string) {
  const left = await prisma.cardLocale.count({ where: { logicalCardId: oldLc } });
  if (left > 0) return;
  for (const model of ["trade", "collectionItem", "deckRecipeCard", "deckCard", "ruling", "externalIdMapping"] as const) {
    // @ts-expect-error 동적 모델 접근
    const r = await prisma[model].updateMany({ where: { logicalCardId: oldLc }, data: { logicalCardId: newLc } });
    if (r.count) console.log(`  참조 이관 ${model}: ${r.count} (${oldLc} → ${newLc})`);
  }
  const tiers = await prisma.tierEntry.findMany({ where: { logicalCardId: oldLc }, select: { id: true, setId: true } });
  for (const t of tiers) {
    const dup = await prisma.tierEntry.findFirst({ where: { logicalCardId: newLc, setId: t.setId }, select: { id: true } });
    if (dup) await prisma.tierEntry.delete({ where: { id: t.id } });
    else await prisma.tierEntry.update({ where: { id: t.id }, data: { logicalCardId: newLc } });
    console.log(`  참조 이관 tierEntry(${t.setId})${dup ? " — 중복으로 구항목 삭제" : ""}`);
  }
  const texts = await prisma.cardText.findMany({ where: { logicalCardId: oldLc }, select: { id: true, language: true } });
  for (const tx of texts) {
    const dup = await prisma.cardText.findFirst({ where: { logicalCardId: newLc, language: tx.language }, select: { id: true } });
    if (!dup) { await prisma.cardText.update({ where: { id: tx.id }, data: { logicalCardId: newLc } }); console.log(`  CardText(${tx.language}) 이관`); }
  }
  await prisma.logicalCard.delete({ where: { id: oldLc } });
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
