import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const sv = await prisma.setGroup.findMany({
    where: { era: { in: ["SV", "MEGA"] } },
    include: {
      sets: {
        select: { id: true, region: true, _count: { select: { localeCards: true } } },
      },
    },
    orderBy: { releaseDate: "asc" },
  });
  console.log("SV/MEGA SetGroups:", sv.length);
  for (const sg of sv) {
    const langs = sg.sets.map((s) => `${s.region}:${s._count.localeCards}`).join(" ");
    console.log(`  ${sg.id} | ${sg.era} | ${sg.nameEn?.substring(0, 30)} | ${langs}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
