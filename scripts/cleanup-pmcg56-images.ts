/**
 * PMCG5/6 의 이미지·일러스트레이터·Bulbapedia 매핑을 초기화.
 *
 * 이전 자동 fix 가 매핑을 어지럽혀서 정확한 복구가 어려움 → 깨끗한 NULL 상태에서
 * 다음 PR (followup-plans.md 의 Phase 6) 에서 정밀 재매핑.
 *
 * 보존되는 데이터:
 *  - LogicalCard: hp / types / attacks / abilities / pokedexNumbers / rarity /
 *    supertype / nameKo / 기타 메타 — 정확함
 *  - CardLocale: id / name(일본어) / setId / number — 정확함
 *
 * 삭제·NULL 되는 데이터:
 *  - CardLocale.imageSmall / imageLarge → NULL
 *  - LogicalCard.illustrator → NULL
 *  - ExternalIdMapping(bulbapedia) PMCG5/6 row 들 → DELETE
 *
 * 주의: Supabase Storage 에 남은 파일들은 별도 정리 (또는 다음 재업로드 시 덮어씀).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const src = await prisma.externalSource.findUniqueOrThrow({ where: { code: "bulbapedia" } });

  // 1. ExternalIdMapping 삭제
  const delMap = await prisma.externalIdMapping.deleteMany({
    where: {
      sourceId: src.id,
      OR: [
        { cardLocaleId: { startsWith: "jp-tcg-PMCG5-" } },
        { cardLocaleId: { startsWith: "jp-tcg-PMCG6-" } },
      ],
    },
  });
  console.log(`✓ Bulbapedia 매핑 삭제: ${delMap.count} 건`);

  // 2. CardLocale.imageSmall / imageLarge → NULL
  const clearImg = await prisma.cardLocale.updateMany({
    where: {
      OR: [
        { id: { startsWith: "jp-tcg-PMCG5-" } },
        { id: { startsWith: "jp-tcg-PMCG6-" } },
      ],
    },
    data: { imageSmall: null, imageLarge: null },
  });
  console.log(`✓ CardLocale.imageSmall/Large NULL: ${clearImg.count} 건`);

  // 3. LogicalCard.illustrator → NULL
  const clearIll = await prisma.logicalCard.updateMany({
    where: {
      setGroupId: { in: ["og-pmcg5", "og-pmcg6"] },
    },
    data: { illustrator: null },
  });
  console.log(`✓ LogicalCard.illustrator NULL: ${clearIll.count} 건`);

  console.log(`\n초기화 완료. 다음 PR (followup-plans.md Phase 6) 에서 정밀 재매핑 예정.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
