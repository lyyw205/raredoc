/**
 * DP1~7 SetGroup + Set 의 한글명 입력.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const DP = [
  { groupId: "og-dp1", enSetId: "en-tcg-dp1", jpSetId: "jp-tcg-dp1", nameKo: "다이아몬드 & 펄" },
  { groupId: "og-dp2", enSetId: "en-tcg-dp2", jpSetId: "jp-tcg-dp2", nameKo: "신비한 보물" },
  { groupId: "og-dp3", enSetId: "en-tcg-dp3", jpSetId: "jp-tcg-dp3", nameKo: "비밀의 경이" },
  { groupId: "og-dp4", enSetId: "en-tcg-dp4", jpSetId: "jp-tcg-dp4", nameKo: "위대한 만남" },
  { groupId: "og-dp5", enSetId: "en-tcg-dp5", jpSetId: "jp-tcg-dp5", nameKo: "장엄한 새벽" },
  { groupId: "og-dp6", enSetId: "en-tcg-dp6", jpSetId: "jp-tcg-dp6", nameKo: "각성한 전설" },
  { groupId: "og-dp7", enSetId: "en-tcg-dp7", jpSetId: "jp-tcg-dp7", nameKo: "폭풍전선" },
];

async function main() {
  for (const n of DP) {
    const sg = await prisma.setGroup.update({
      where: { id: n.groupId },
      data: { nameKo: n.nameKo },
    });
    // EN Set
    await prisma.set.update({
      where: { id: n.enSetId },
      data: { nameKo: n.nameKo },
    }).catch(() => { /* EN set may not exist yet — skip */ });
    // JP Set (may not exist yet)
    await prisma.set.update({
      where: { id: n.jpSetId },
      data: { nameKo: n.nameKo },
    }).catch(() => { /* JP set may not exist yet — skip */ });
    console.log(`✓ ${n.groupId}: SG nameKo="${sg.nameKo}"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
