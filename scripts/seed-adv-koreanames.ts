/**
 * ADV1~5 (2003) CardPack + Set 한글/일본어 공식명 입력.
 *
 * 한국 미발매 → raredoc 표준명 (사용자 결정).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SETS = [
  { groupId: "og-adv1", setId: "jp-tcg-ADV1", nameKo: "ADV 확장팩",                      nameJa: "拡張パック" },
  { groupId: "og-adv2", setId: "jp-tcg-ADV2", nameKo: "사막의 기적",                      nameJa: "砂漠のきせき" },
  { groupId: "og-adv3", setId: "jp-tcg-ADV3", nameKo: "천공의 패자",                      nameJa: "天空の覇者" },
  { groupId: "og-adv4", setId: "jp-tcg-ADV4", nameKo: "마그마 VS 아쿠아 두 개의 야망",   nameJa: "強化拡張パックex1マグマVSアクア ふたつの野望" },
  { groupId: "og-adv5", setId: "jp-tcg-ADV5", nameKo: "풀린 봉인",                        nameJa: "とかれた封印" },
];

async function main() {
  for (const s of SETS) {
    const sg = await prisma.cardPack.update({
      where: { id: s.groupId },
      data: { nameKo: s.nameKo, nameJa: s.nameJa },
    });
    const st = await prisma.set.update({
      where: { id: s.setId },
      data: { nameKo: s.nameKo, nameJa: s.nameJa, name: s.nameJa },
    });
    console.log(`✓ ${s.groupId}: SG="${sg.nameKo}" / Set="${st.nameKo}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
