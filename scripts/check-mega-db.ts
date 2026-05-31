import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const mega = await prisma.setGroup.findMany({
    where: { era: "MEGA" },
    include: {
      sets: {
        select: { id: true, region: true, name: true, cardCount: true, _count: { select: { localeCards: true } } },
      },
    },
    orderBy: { releaseDate: "asc" },
  });
  console.log("MEGA SetGroups:", mega.length);
  for (const sg of mega) {
    console.log(`\n  ${sg.id} | nameEn=${sg.nameEn ?? "—"} | nameKo=${sg.nameKo ?? "—"} | nameJa=${sg.nameJa ?? "—"}`);
    for (const s of sg.sets) {
      console.log(`    set: ${s.id} | ${s.region} | ${s.name} | declared=${s.cardCount} | actual=${s._count.localeCards}`);
    }
  }

  const megaLogical = await prisma.logicalCard.count({ where: { setGroup: { era: "MEGA" } } });
  const megaLogicalNameKo = await prisma.logicalCard.count({ where: { setGroup: { era: "MEGA" }, nameKo: { not: null } } });
  console.log(`\nMEGA LogicalCards: ${megaLogical}, with nameKo: ${megaLogicalNameKo}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
