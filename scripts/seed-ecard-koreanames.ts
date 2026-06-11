/**
 * E1~5 + VS1 + web1 (e-Card era + 그 전후, 2001~2002) 의
 * CardPack + Set 한글/일본어 공식명 입력.
 *
 * 한국 미발매 → raredoc 표준명 (사용자 결정).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const SETS = [
  { groupId: "og-e1",   setId: "jp-tcg-E1",   nameKo: "기본 확장팩",     nameJa: "基本拡張パック" },
  { groupId: "og-e2",   setId: "jp-tcg-E2",   nameKo: "지도에 없는 마을", nameJa: "地図にない町" },
  { groupId: "og-e3",   setId: "jp-tcg-E3",   nameKo: "바다에서의 바람", nameJa: "海からの風" },
  { groupId: "og-e4",   setId: "jp-tcg-E4",   nameKo: "갈라진 대지",     nameJa: "裂けた大地" },
  { groupId: "og-e5",   setId: "jp-tcg-E5",   nameKo: "신비한 산",       nameJa: "神秘なる山" },
  { groupId: "og-vs1",  setId: "jp-tcg-VS1",  nameKo: "포켓몬카드 VS",   nameJa: "ポケモンカード★VS" },
  { groupId: "og-web1", setId: "jp-tcg-web1", nameKo: "포켓몬카드 web",  nameJa: "ポケモンカード★web" },
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
