import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // SV EN card counts vs DB
  const svEnSets = await prisma.set.findMany({
    where: { setGroup: { era: "SV" }, region: "EN" },
    select: {
      id: true,
      name: true,
      cardCount: true,
      _count: { select: { localeCards: true } },
    },
    orderBy: { releaseDate: "asc" },
  });

  console.log("SV EN sets — set.cardCount vs actual localeCards:");
  for (const s of svEnSets) {
    const status = s.cardCount === s._count.localeCards ? "✓" : `MISMATCH (DB has ${s._count.localeCards})`;
    console.log(`  ${s.id} | ${s.name} | declared=${s.cardCount} | actual=${s._count.localeCards} | ${status}`);
  }

  // SV svp (promos)
  const svp = await prisma.set.findFirst({
    where: { id: "svp" },
    select: { id: true, name: true, cardCount: true, _count: { select: { localeCards: true } } },
  });
  if (svp) {
    console.log(`\n  svp | ${svp.name} | declared=${svp.cardCount} | actual=${svp._count.localeCards}`);
  } else {
    console.log("\n  svp NOT in DB");
  }

  // LogicalCard coverage for SV
  const svLogical = await prisma.logicalCard.count({ where: { setGroup: { era: "SV" } } });
  const svLogicalNameKo = await prisma.logicalCard.count({ where: { setGroup: { era: "SV" }, nameKo: { not: null } } });
  console.log(`\nSV LogicalCards: ${svLogical}, with nameKo: ${svLogicalNameKo}`);

  // SetGroups nameKo
  const svGroups = await prisma.setGroup.findMany({
    where: { era: "SV" },
    select: { id: true, nameEn: true, nameKo: true, nameJa: true },
    orderBy: { releaseDate: "asc" },
  });
  console.log("\nSV SetGroups nameKo coverage:");
  for (const sg of svGroups) {
    console.log(`  ${sg.id} | nameEn=${sg.nameEn ?? "—"} | nameKo=${sg.nameKo ?? "—"} | nameJa=${sg.nameJa ?? "—"}`);
  }

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
