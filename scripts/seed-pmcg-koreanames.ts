/**
 * PMCG1~6 CardPack + Set 의 한글/일본어 공식명 입력.
 *
 * 사용자가 알려준 한글 패명 (역사적으로 한국 미발매라 raredoc 표준):
 *   PMCG1: 확장팩 제1탄  (拡張パック)
 *   PMCG2: 확장팩 제2탄 포켓몬 정글  (ポケモンジャングル)
 *   PMCG3: 확장팩 제3탄 화석의 비밀  (化石の秘密)
 *   PMCG4: 확장팩 제4탄 로켓단  (ロケット団)
 *   PMCG5: 짐 확장 제1탄 리더스 스타디움  (リーダーズスタジアム)
 *   PMCG6: 짐 확장 제2탄 어둠에서의 도전  (闇からの挑戦)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const PMCG = [
  { groupId: "og-pmcg1", setId: "jp-tcg-PMCG1", nameKo: "확장팩 제1탄", nameJa: "拡張パック" },
  { groupId: "og-pmcg2", setId: "jp-tcg-PMCG2", nameKo: "확장팩 제2탄 포켓몬 정글", nameJa: "ポケモンジャングル" },
  { groupId: "og-pmcg3", setId: "jp-tcg-PMCG3", nameKo: "확장팩 제3탄 화석의 비밀", nameJa: "化石の秘密" },
  { groupId: "og-pmcg4", setId: "jp-tcg-PMCG4", nameKo: "확장팩 제4탄 로켓단", nameJa: "ロケット団" },
  { groupId: "og-pmcg5", setId: "jp-tcg-PMCG5", nameKo: "짐 확장 제1탄 리더스 스타디움", nameJa: "リーダーズスタジアム" },
  { groupId: "og-pmcg6", setId: "jp-tcg-PMCG6", nameKo: "짐 확장 제2탄 어둠에서의 도전", nameJa: "闇からの挑戦" },
];

async function main() {
  for (const p of PMCG) {
    const sg = await prisma.cardPack.update({
      where: { id: p.groupId },
      data: { nameKo: p.nameKo, nameJa: p.nameJa },
    });
    const s = await prisma.set.update({
      where: { id: p.setId },
      data: { nameKo: p.nameKo, nameJa: p.nameJa, name: p.nameJa },
    });
    console.log(`✓ ${p.groupId}: SG.nameKo="${sg.nameKo}"  / Set ${p.setId}: nameKo="${s.nameKo}"`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
