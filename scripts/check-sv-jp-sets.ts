import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const jpSets = await prisma.set.findMany({
    where: { setGroup: { era: "SV" }, region: { in: ["JP", "KR"] } },
    select: { id: true, region: true, name: true, cardCount: true, _count: { select: { localeCards: true } } },
    orderBy: { releaseDate: "asc" },
  });
  console.log("SV JP/KR sets:");
  for (const s of jpSets) {
    console.log(`  ${s.id} | ${s.region} | ${s.name} | declared=${s.cardCount} | actual=${s._count.localeCards}`);
  }

  // Check LogicalCard supertype coverage for SV JP orphans
  const nullSuper = await prisma.logicalCard.count({
    where: { setGroup: { era: "SV" }, supertype: null },
  });
  const total = await prisma.logicalCard.count({ where: { setGroup: { era: "SV" } } });
  console.log(`\nSV LogicalCards: ${total}, supertype=null: ${nullSuper}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
