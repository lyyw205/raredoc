/**
 * L (HGSS era JP) CardPack + Set 의 한글명/일본명 입력.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const L_SETS = [
  { groupId: "og-l1a", jpSetId: "jp-tcg-L1a", nameKo: "하트골드 컬렉션",   nameJa: "ハートゴールドコレクション" },
  { groupId: "og-l1b", jpSetId: "jp-tcg-L1b", nameKo: "소울실버 컬렉션",   nameJa: "ソウルシルバーコレクション" },
  { groupId: "og-l2",  jpSetId: "jp-tcg-L2",  nameKo: "되살아나는 전설",   nameJa: "よみがえる伝説" },
  { groupId: "og-ll",  jpSetId: "jp-tcg-LL",  nameKo: "강화팩 로스트링크", nameJa: "強化パック ロストリンク" },
  { groupId: "og-l3",  jpSetId: "jp-tcg-L3",  nameKo: "정상대격돌",        nameJa: "頂上大激突" },
];

async function main() {
  for (const n of L_SETS) {
    const sg = await prisma.cardPack.update({
      where: { id: n.groupId },
      data: { nameKo: n.nameKo, nameJa: n.nameJa },
    });
    await prisma.set.update({
      where: { id: n.jpSetId },
      data: { nameKo: n.nameKo, nameJa: n.nameJa },
    }).catch(() => { /* skip if not found */ });
    console.log(`✓ ${n.groupId}: nameKo="${sg.nameKo}" nameJa="${n.nameJa}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
