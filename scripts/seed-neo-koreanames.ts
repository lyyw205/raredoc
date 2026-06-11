/**
 * NEO1~4 CardPack + Set 의 한글/일본어 공식명 입력.
 * 사용자 제공 한글 패명 (한국 미발매라 raredoc 표준).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const NEO = [
  { groupId: "og-neo1", setId: "jp-tcg-neo1", nameKo: "금, 은 신세계로",         nameJa: "金、銀、新世界へ..." },
  { groupId: "og-neo2", setId: "jp-tcg-neo2", nameKo: "유적을 넘어서",            nameJa: "遺跡をこえて..." },
  { groupId: "og-neo3", setId: "jp-tcg-neo3", nameKo: "각성하는 전설",            nameJa: "めざめる伝説" },
  { groupId: "og-neo4", setId: "jp-tcg-neo4", nameKo: "어둠, 그리고 빛으로",       nameJa: "闇、そして光へ..." },
];

async function main() {
  for (const n of NEO) {
    const sg = await prisma.cardPack.update({
      where: { id: n.groupId },
      data: { nameKo: n.nameKo, nameJa: n.nameJa },
    });
    const s = await prisma.set.update({
      where: { id: n.setId },
      data: { nameKo: n.nameKo, nameJa: n.nameJa, name: n.nameJa },
    });
    console.log(`✓ ${n.groupId}: SG="${sg.nameKo}" / Set="${s.nameKo}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
