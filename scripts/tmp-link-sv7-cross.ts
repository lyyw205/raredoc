// Stellar Crown(sv7) 합본 잔여 — 배틀아카데미(SVI)·스페셜덱(SVG) 출신 수동 연결 (2026-06-07, registry §31)
//   다후보(MC/SVM 재록 경합)는 시기 일치 원본 SVI 선택. Greninja ex는 이미지 판정 완료.
//   사용: npx tsx scripts/tmp-link-sv7-cross.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
const APPLY = process.argv.includes("--apply");
const PAIRS: [string, string, string][] = [
  // SVG (스페셜덱세트ex 이상해꽃·리자몽·거북왕)
  ["jp-tcg-SVG", "003", "1"], ["jp-tcg-SVG", "016", "30"], ["jp-tcg-SVG", "050", "143"], ["jp-tcg-SVG", "052", "148"],
  // SVI (배틀아카데미) — 유일쌍
  ["jp-tcg-SVI", "003", "15"], ["jp-tcg-SVI", "004", "16"], ["jp-tcg-SVI", "013", "33"], ["jp-tcg-SVI", "014", "34"],
  ["jp-tcg-SVI", "022", "56"], ["jp-tcg-SVI", "024", "59"], ["jp-tcg-SVI", "025", "68"], ["jp-tcg-SVI", "026", "69"],
  ["jp-tcg-SVI", "027", "70"], ["jp-tcg-SVI", "030", "79"], ["jp-tcg-SVI", "033", "90"], ["jp-tcg-SVI", "039", "98"],
  ["jp-tcg-SVI", "044", "112"], ["jp-tcg-SVI", "047", "126"],
  // SVI — 다후보(MC 2025-12 재록 배제, 원본 선택)
  ["jp-tcg-SVI", "001", "4"], ["jp-tcg-SVI", "005", "17"], ["jp-tcg-SVI", "006", "18"], ["jp-tcg-SVI", "007", "19"],
  ["jp-tcg-SVI", "008", "20"], ["jp-tcg-SVI", "009", "22"], ["jp-tcg-SVI", "010", "29"], ["jp-tcg-SVI", "012", "31"],
  ["jp-tcg-SVI", "015", "39"], ["jp-tcg-SVI", "016", "40"], ["jp-tcg-SVI", "017", "41"], ["jp-tcg-SVI", "031", "81"],
  ["jp-tcg-SVI", "032", "82"], ["jp-tcg-SVI", "038", "97"], ["jp-tcg-SVI", "041", "105"], ["jp-tcg-SVI", "042", "108"],
  ["jp-tcg-SVI", "043", "109"], ["jp-tcg-SVI", "045", "113"], ["jp-tcg-SVI", "048", "127"],
];
async function main() {
  let ok = 0, skip = 0;
  for (const [jpSet, jpNum, enNum] of PAIRS) {
    const jp = await prisma.cardLocale.findFirst({ where: { setId: jpSet, number: jpNum }, select: { name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { where: { region: "EN" }, select: { id: true } } } } } });
    const en = await prisma.cardLocale.findFirst({ where: { setId: "sv7", number: enNum }, select: { id: true, name: true, logicalCardId: true, logicalCard: { select: { illustrator: true, locales: { select: { region: true } } } } } });
    if (!jp || !en) { console.log(`❌ 누락 ${jpSet}#${jpNum}/${enNum}`); skip++; continue; }
    if (jp.logicalCard?.locales.length) { console.log(`⚠ JP 기연결 ${jpSet}#${jpNum}`); skip++; continue; }
    if (!en.logicalCard?.locales.every((l) => l.region === "EN")) { console.log(`⚠ EN 비orphan #${enNum}`); skip++; continue; }
    // 일러 가드: 양측 일러 불일치면 스킵 (에너지 등 null 제외)
    if (jp.logicalCard?.illustrator && en.logicalCard?.illustrator && jp.logicalCard.illustrator.toLowerCase() !== en.logicalCard.illustrator.toLowerCase()) {
      console.log(`⚠ 일러 불일치 스킵 ${jpSet}#${jpNum} [${jp.logicalCard.illustrator}] vs sv7#${enNum} [${en.logicalCard.illustrator}]`); skip++; continue;
    }
    console.log(`연결 ${jpSet.replace("jp-tcg-", "")}#${jpNum} ${jp.name} [${jp.logicalCard?.illustrator}] ← sv7#${enNum} ${en.name}`);
    if (APPLY) {
      const oldLc = en.logicalCardId!;
      await prisma.cardLocale.update({ where: { id: en.id }, data: { logicalCardId: jp.logicalCardId! } });
      await migrateAndDelete(oldLc, jp.logicalCardId!);
    }
    ok++;
  }
  console.log(`\n연결 ${ok} · 스킵 ${skip}`);
}
async function migrateAndDelete(oldLc: string, newLc: string) {
  const left = await prisma.cardLocale.count({ where: { logicalCardId: oldLc } });
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
