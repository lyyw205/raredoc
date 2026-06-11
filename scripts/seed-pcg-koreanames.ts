/**
 * PCG1~9 (2004~2006) CardPack + Set 한글/일본어 공식명 입력.
 *
 * 한국 미발매 → raredoc 표준명 (사용자 결정).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SETS = [
  { groupId: "og-pcg1", setId: "jp-tcg-PCG1", nameKo: "전설의 비상",      nameJa: "伝説の飛翔" },
  { groupId: "og-pcg2", setId: "jp-tcg-PCG2", nameKo: "창공의 격돌",      nameJa: "蒼空の激突" },
  { groupId: "og-pcg3", setId: "jp-tcg-PCG3", nameKo: "로켓단의 역습",    nameJa: "ロケット団の逆襲" },
  { groupId: "og-pcg4", setId: "jp-tcg-PCG4", nameKo: "금빛 하늘, 은빛 바다", nameJa: "金の空、銀の海" },
  { groupId: "og-pcg5", setId: "jp-tcg-PCG5", nameKo: "환상의 숲",        nameJa: "まぼろしの森" },
  { groupId: "og-pcg6", setId: "jp-tcg-PCG6", nameKo: "호론의 연구탑",    nameJa: "ホロンの研究塔" },
  { groupId: "og-pcg7", setId: "jp-tcg-PCG7", nameKo: "호론의 환영",      nameJa: "ホロンの幻影" },
  { groupId: "og-pcg8", setId: "jp-tcg-PCG8", nameKo: "기적의 결정",      nameJa: "きせきの結晶" },
  { groupId: "og-pcg9", setId: "jp-tcg-PCG9", nameKo: "끝없는 공방",      nameJa: "さいはての攻防" },
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
