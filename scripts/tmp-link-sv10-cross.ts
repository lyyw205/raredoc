// Destined Rivals(sv10) 합본 병합 잔여 — 스타터(SVOM/SVOD) 출신 + 특수에너지 수동 연결 (2026-06-07)
//   EN Destined Rivals가 JP 스타터덱 ex(마리·다이고) 카드를 본세트에 흡수 — 일러 전건 일치 확인 완료(registry §27).
//   사용: npx tsx scripts/tmp-link-sv10-cross.ts [--apply]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

// [JP setId, JP number, EN setId, EN number, 메모]
const PAIRS: [string, string, string, string, string][] = [
  ["jp-tcg-SVOM", "001", "sv10", "130", "Marnie's Purrloin REND"],
  ["jp-tcg-SVOM", "002", "sv10", "131", "Marnie's Liepard Hasuno"],
  ["jp-tcg-SVOM", "003", "sv10", "132", "Marnie's Scraggy Teeziro"],
  ["jp-tcg-SVOM", "004", "sv10", "133", "Marnie's Scrafty Kazumasa Yasukuni"],
  ["jp-tcg-SVOM", "005", "sv10", "134", "Marnie's Impidimp KEIICHIRO ITO"],
  ["jp-tcg-SVOM", "006", "sv10", "135", "Marnie's Morgrem NC Empire"],
  ["jp-tcg-SVOM", "007", "sv10", "136", "Marnie's Grimmsnarl ex PLANETA Mochizuki"],
  ["jp-tcg-SVOM", "008", "sv10", "137", "Marnie's Morpeko Mina Nakai"],
  ["jp-tcg-SVOM", "009", "sv10", "164", "Energy Recycler Toyste Beach"],
  ["jp-tcg-SVOM", "019", "sv10", "169", "Spikemuth Gym AYUMI ODASHIMA"],
  ["jp-tcg-SVOD", "001", "sv10", "83", "Steven's Baltoy Tonji Matsuno"],
  ["jp-tcg-SVOD", "002", "sv10", "84", "Steven's Claydol nagimiso"],
  ["jp-tcg-SVOD", "003", "sv10", "86", "Steven's Carbink Ligton"],
  ["jp-tcg-SVOD", "004", "sv10", "142", "Steven's Skarmory Nisota Niso (MC#494 동일아트 재록 별도)"],
  ["jp-tcg-SVOD", "005", "sv10", "143", "Steven's Beldum Takeshi Nakamura"],
  ["jp-tcg-SVOD", "006", "sv10", "144", "Steven's Metang Anesaki Dynamic"],
  ["jp-tcg-SVOD", "007", "sv10", "145", "Steven's Metagross ex PLANETA Mochizuki"],
  ["jp-tcg-SVOD", "018", "sv10", "166", "Granite Cave=いしのどうくつ AYUMI ODASHIMA"],
  ["jp-sv-destined-rivals", "098", "sv10", "182", "Team Rocket's Energy (특수E 세트내 1:1)"],
];

async function main() {
  console.log(`■ sv10 잔여 연결 ${PAIRS.length}쌍 ${APPLY ? "★적용" : "(dry)"}`);
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

// tmp-link-bbwf-cross.ts와 동일한 사용자 데이터 FK 이관 패턴
async function migrateAndDelete(oldLc: string, newLc: string) {
  const left = await prisma.cardLocale.count({ where: { logicalCardId: oldLc } });
  if (left > 0) return;
  for (const model of ["trade", "collectionItem", "deckRecipeCard", "deckCard", "ruling", "externalIdMapping"] as const) {
    // @ts-expect-error 동적 모델 접근
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
