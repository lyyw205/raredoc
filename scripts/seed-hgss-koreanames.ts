/**
 * HGSS CardPack + EN Set 의 한글명 입력.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const HGSS = [
  { groupId: "og-hgss1", enSetId: "en-tcg-hgss1", jpSetId: "jp-tcg-hgss1", nameKo: "하트골드 & 소울실버" },
  { groupId: "og-hsp",   enSetId: "en-tcg-hsp",   jpSetId: "jp-tcg-hsp",   nameKo: "HGSS 블랙스타 프로모" },
  { groupId: "og-hgss2", enSetId: "en-tcg-hgss2", jpSetId: "jp-tcg-hgss2", nameKo: "HS 언리시드" },
  { groupId: "og-hgss3", enSetId: "en-tcg-hgss3", jpSetId: "jp-tcg-hgss3", nameKo: "HS 언도티드" },
  { groupId: "og-hgss4", enSetId: "en-tcg-hgss4", jpSetId: "jp-tcg-hgss4", nameKo: "HS 트라이엄펀트" },
  { groupId: "og-col1",  enSetId: "en-tcg-col1",  jpSetId: "jp-tcg-col1",  nameKo: "전설의 부름" },
];

async function main() {
  for (const n of HGSS) {
    const sg = await prisma.cardPack.update({
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
