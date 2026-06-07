import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // 1) CardLocale에서 닌자스피너 전 언어 검색
  const locales = await prisma.cardLocale.findMany({
    where: {
      OR: [
        { name: { contains: "Ninja Spinner", mode: "insensitive" } },
        { name: { contains: "닌자스피너" } },
        { name: { contains: "ニンジャスピナー" } },
      ],
    },
    select: {
      id: true, name: true, number: true, region: true, language: true,
      logicalCardId: true,
      set: { select: { id: true, name: true, region: true } },
    },
  });
  console.log("=== CardLocale rows ===");
  for (const c of locales) {
    console.log(`[${c.region}/${c.language}] ${c.name} #${c.number} set=${c.set?.id}(${c.set?.name}) LC=${c.logicalCardId}`);
  }
  if (!locales.length) console.log("(none)");

  // 2) 위에서 나온 LogicalCard들의 전체 locale 구성 확인
  const lcIds = [...new Set(locales.map((c) => c.logicalCardId))];
  for (const lcId of lcIds) {
    const lc = await prisma.logicalCard.findUnique({
      where: { id: lcId },
      select: {
        id: true, nameKo: true, primaryNumber: true, supertype: true,
        primarySet: { select: { id: true } },
        locales: { select: { region: true, language: true, name: true, number: true, set: { select: { id: true } } } },
      },
    });
    if (!lc) continue;
    console.log(`\n=== LogicalCard ${lc.id} nameKo=${lc.nameKo} primary=${lc.primarySet?.id}#${lc.primaryNumber} ===`);
    for (const l of lc.locales) {
      console.log(`  - [${l.region}/${l.language}] ${l.name} #${l.number} set=${l.set?.id}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
