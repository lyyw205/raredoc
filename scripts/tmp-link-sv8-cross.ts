// Surging Sparks(sv8) 합본 잔여 — 테라스탈 스타터(SVLS/SVLN)·드래고나 특수E 수동 연결 (2026-06-07, registry §30)
//   페어 전건 이름+dex+일러 유일쌍 확인 완료. 사용: npx tsx scripts/tmp-link-sv8-cross.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const APPLY = process.argv.includes("--apply");
const PAIRS: [string, string, string, string][] = [
  ["jp-tcg-SVLS", "001", "sv8", "16"], ["jp-tcg-SVLS", "002", "sv8", "17"], ["jp-tcg-SVLS", "003", "sv8", "19"],
  ["jp-tcg-SVLS", "004", "sv8", "26"], ["jp-tcg-SVLS", "006", "sv8", "36"], ["jp-tcg-SVLS", "007", "sv8", "81"],
  ["jp-tcg-SVLS", "008", "sv8", "125"], ["jp-tcg-SVLS", "014", "sv8", "164"],
  ["jp-tcg-SVLN", "001", "sv8", "40"], ["jp-tcg-SVLN", "003", "sv8", "73"], ["jp-tcg-SVLN", "004", "sv8", "74"],
  ["jp-tcg-SVLN", "005", "sv8", "86"], ["jp-tcg-SVLN", "006", "sv8", "88"], ["jp-tcg-SVLN", "007", "sv8", "89"],
  ["jp-tcg-SVLN", "009", "sv8", "143"], ["jp-tcg-SVLN", "010", "sv8", "144"], ["jp-tcg-SVLN", "015", "sv8", "185"],
  ["jp-sv-paradise-dragona", "011", "sv8", "48"], ["jp-sv-paradise-dragona", "064", "sv8", "191"], ["jp-sv-paradise-dragona", "094", "sv8", "252"],
];
async function main() {
  let ok = 0, skip = 0;
  for (const [jpSet, jpNum, enSet, enNum] of PAIRS) {
    const jp = await prisma.regionCard.findFirst({ where: { setId: jpSet, number: jpNum }, select: { name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { where: { region: "EN" }, select: { id: true } } } } } });
    const en = await prisma.regionCard.findFirst({ where: { setId: enSet, number: enNum }, select: { id: true, name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { select: { region: true } } } } } });
    if (!jp || !en) { console.log(`❌ 누락 ${jpSet}#${jpNum}/${enNum}`); skip++; continue; }
    if (jp.logicalCard?.locales.length) { console.log(`⚠ JP 기연결 ${jpSet}#${jpNum}`); skip++; continue; }
    if (!en.logicalCard?.locales.every((l) => l.region === "EN")) { console.log(`⚠ EN 비orphan #${enNum}`); skip++; continue; }
    console.log(`연결 ${jpSet.replace(/^jp-(tcg-|sv-)?/, "")}#${jpNum} ${jp.name} [${jp.logicalCard?.illustrator}] ← sv8#${enNum} ${en.name} [${en.logicalCard?.illustrator}]`);
    if (APPLY) {
      const oldLc = en.logicalCardId!;
      await prisma.regionCard.update({ where: { id: en.id }, data: { logicalCardId: jp.logicalCardId! } });
      await migrateAndDelete(oldLc, jp.logicalCardId!);
    }
    ok++;
  }
  console.log(`\n연결 ${ok} · 스킵 ${skip}`);
}
async function migrateAndDelete(oldLc: string, newLc: string) {
  const left = await prisma.regionCard.count({ where: { logicalCardId: oldLc } });
  if (left > 0) return;
  for (const model of ["trade", "collectionItem", "deckRecipeCard", "deckCard", "ruling", "externalIdMapping"] as const) {
    // @ts-expect-error 동적
    const r = await prisma[model].updateMany({ where: { logicalCardId: oldLc }, data: { logicalCardId: newLc } });
    if (r.count) console.log(`  참조 이관 ${model}: ${r.count}`);
  }
  const tiers = await prisma.tierEntry.findMany({ where: { logicalCardId: oldLc }, select: { id: true, setId: true } });
  for (const t of tiers) {
    const dup = await prisma.tierEntry.findFirst({ where: { logicalCardId: newLc, setId: t.setId }, select: { id: true } });
    if (dup) await prisma.tierEntry.delete({ where: { id: t.id } });
    else await prisma.tierEntry.update({ where: { id: t.id }, data: { logicalCardId: newLc } });
  }
  const texts = await prisma.cardText.findMany({ where: { logicalCardId: oldLc }, select: { id: true, language: true } });
  for (const tx of texts) {
    const dup = await prisma.cardText.findFirst({ where: { logicalCardId: newLc, language: tx.language }, select: { id: true } });
    if (!dup) await prisma.cardText.update({ where: { id: tx.id }, data: { logicalCardId: newLc } });
  }
  await prisma.logicalCard.delete({ where: { id: oldLc } });
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
