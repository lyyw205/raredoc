/**
 * BW SetGroup + EN Set + JP Set 의 한글명 입력.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const BW = [
  { groupId: "og-bwp",  enSetId: "en-tcg-bwp",  jpSetId: "jp-tcg-bwp",  nameKo: "BW 블랙스타 프로모" },
  { groupId: "og-bw1",  enSetId: "en-tcg-bw1",  jpSetId: "jp-tcg-bw1",  nameKo: "블랙 & 화이트" },
  { groupId: "og-bw2",  enSetId: "en-tcg-bw2",  jpSetId: "jp-tcg-bw2",  nameKo: "떠오르는 힘" },
  { groupId: "og-bw3",  enSetId: "en-tcg-bw3",  jpSetId: "jp-tcg-bw3",  nameKo: "고결한 승리" },
  { groupId: "og-bw4",  enSetId: "en-tcg-bw4",  jpSetId: "jp-tcg-bw4",  nameKo: "다음 운명" },
  { groupId: "og-bw5",  enSetId: "en-tcg-bw5",  jpSetId: "jp-tcg-bw5",  nameKo: "다크 익스플로러" },
  { groupId: "og-bw6",  enSetId: "en-tcg-bw6",  jpSetId: "jp-tcg-bw6",  nameKo: "위대한 용" },
  { groupId: "og-dv1",  enSetId: "en-tcg-dv1",  jpSetId: "jp-tcg-dv1",  nameKo: "드래곤 볼트" },
  { groupId: "og-bw7",  enSetId: "en-tcg-bw7",  jpSetId: "jp-tcg-bw7",  nameKo: "경계 너머" },
  { groupId: "og-bw8",  enSetId: "en-tcg-bw8",  jpSetId: "jp-tcg-bw8",  nameKo: "플라즈마 스톰" },
  { groupId: "og-bw9",  enSetId: "en-tcg-bw9",  jpSetId: "jp-tcg-bw9",  nameKo: "플라즈마 프리즈" },
  { groupId: "og-bw10", enSetId: "en-tcg-bw10", jpSetId: "jp-tcg-bw10", nameKo: "플라즈마 블래스트" },
  { groupId: "og-bw11", enSetId: "en-tcg-bw11", jpSetId: "jp-tcg-bw11", nameKo: "전설의 보물" },
];

async function main() {
  for (const n of BW) {
    const sg = await prisma.setGroup.update({
      where: { id: n.groupId },
      data: { nameKo: n.nameKo },
    });
    await prisma.set.update({ where: { id: n.enSetId }, data: { nameKo: n.nameKo } })
      .catch(() => { /* EN set may not exist yet */ });
    await prisma.set.update({ where: { id: n.jpSetId }, data: { nameKo: n.nameKo } })
      .catch(() => { /* JP set may not exist yet */ });
    console.log(`✓ ${n.groupId}: nameKo="${sg.nameKo}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
