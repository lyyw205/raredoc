/**
 * PL1~4 CardPack + Set 의 한글명 입력.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const PL = [
  { groupId: "og-pl1", enSetId: "en-tcg-pl1", jpSetId: "jp-tcg-pl1", nameKo: "플래티넘" },
  { groupId: "og-pl2", enSetId: "en-tcg-pl2", jpSetId: "jp-tcg-pl2", nameKo: "라이벌의 등장" },
  { groupId: "og-pl3", enSetId: "en-tcg-pl3", jpSetId: "jp-tcg-pl3", nameKo: "최고의 승자" },
  { groupId: "og-pl4", enSetId: "en-tcg-pl4", jpSetId: "jp-tcg-pl4", nameKo: "아르세우스" },
];

async function main() {
  for (const n of PL) {
    const sg = await prisma.cardPack.update({
      where: { id: n.groupId },
      data: { nameKo: n.nameKo },
    });
    await prisma.set.update({
      where: { id: n.enSetId },
      data: { nameKo: n.nameKo },
    }).catch(() => { /* EN set may not exist yet */ });
    await prisma.set.update({
      where: { id: n.jpSetId },
      data: { nameKo: n.nameKo },
    }).catch(() => { /* JP set may not exist yet */ });
    console.log(`✓ ${n.groupId}: SG nameKo="${sg.nameKo}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
