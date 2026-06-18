/**
 * 수집한 JP 세트(jp-wcs23 + Classic clf/cll/clk)를 setGroup 으로 묶어 '기타' 탈출.
 * 신규 CardPack(SetGroup) 2개 생성(eraKey=SV → SV 시대 분류, packType=deck 라 특전·덱 구획) + Set/Card FK 연결.
 * 전부 신규 수집분(동결/기존 무관). Run: npx tsx scripts/group-jp-collect-packs.ts [--apply]
 */
import "dotenv/config";
import { prisma } from "../../../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const GROUPS = [
  {
    id: "og-wcs23", era: "SV-SP", eraKey: "SV", order: 91, releaseDate: "2023-08-11",
    nameJa: "WCS2023 横浜 ピカチュウデッキ", nameKo: "2023 세계대회 요코하마 피카츄 덱", nameEn: "World Championships 2023 Yokohama",
    sets: ["jp-wcs23"],
  },
  {
    id: "og-classic", era: "SV-SP", eraKey: "SV", order: 91, releaseDate: "2023-11-10",
    nameJa: "ポケモンカードゲーム Classic", nameKo: "포켓몬 카드 게임 Classic", nameEn: "Pokémon Card Game Classic",
    sets: ["jp-clf", "jp-cll", "jp-clk"],
  },
];

async function main() {
  // Era SV 존재 확인(eraKey FK)
  const eraSV = await prisma.era.findUnique({ where: { key: "SV" } });
  if (!eraSV) { console.error("🛑 Era 'SV' 없음 — eraKey FK 불가"); process.exit(1); }

  for (const g of GROUPS) {
    console.log(`\n${APPLY ? "✅" : "🔍"} group ${g.id} (era ${g.era}/${g.eraKey}) ← sets: ${g.sets.join(", ")}`);
    if (!APPLY) continue;

    await prisma.cardPack.upsert({
      where: { id: g.id },
      create: {
        id: g.id, era: g.era, eraKey: g.eraKey, order: g.order,
        nameJa: g.nameJa, nameKo: g.nameKo, nameEn: g.nameEn,
        releaseDate: new Date(g.releaseDate + "T00:00:00Z"),
      },
      update: { era: g.era, eraKey: g.eraKey, nameJa: g.nameJa, nameKo: g.nameKo, nameEn: g.nameEn },
    });
    // Set.setGroupId + 그 세트들의 Card.setGroupId 연결
    const s = await prisma.set.updateMany({ where: { id: { in: g.sets } }, data: { cardPackId: g.id } });
    const c = await prisma.card.updateMany({ where: { primarySetId: { in: g.sets } }, data: { cardPackId: g.id } });
    console.log(`   Set ${s.count}개 · Card ${c.count}개 → ${g.id}`);
  }
  console.log(`\n${APPLY ? "적용완료" : "DRY-RUN — 적용: --apply"}`);
}

main().catch((e) => { console.error("FAIL:", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
