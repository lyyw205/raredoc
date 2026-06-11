/**
 * Phase 1: JP imageSmall URL 보강
 *
 * 대상: language='ja' 이고 imageSmall IS NULL 이면서 imageLarge IS NOT NULL 인 카드
 * 전략: tcgdex imageLarge URL의 /high.webp → /low.webp 패턴 변환으로 imageSmall 채우기
 *       (추가 fetch 없이 URL 패턴만 변환)
 *
 * Run: npx tsx scripts/fill-jp-image-urls.ts [--dry-run]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`fill-jp-image-urls start${DRY_RUN ? " [DRY RUN]" : ""}`);

  // 대상 카드: imageSmall NULL, imageLarge NOT NULL
  const cards = await prisma.regionCard.findMany({
    where: {
      language: "ja",
      imageSmall: null,
      imageLarge: { not: null },
    },
    select: { id: true, imageLarge: true, setId: true, number: true },
  });

  console.log(`Found ${cards.length} JP cards with imageLarge but no imageSmall`);

  let updated = 0;
  let skipped = 0;

  for (const card of cards) {
    const large = card.imageLarge!;
    let smallUrl: string | null = null;

    // tcgdex pattern: .../high.webp → .../low.webp
    if (large.includes("assets.tcgdex.net") && large.endsWith("/high.webp")) {
      smallUrl = large.replace(/\/high\.webp$/, "/low.webp");
    } else {
      // Unknown pattern — skip
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${card.id}: ${large} → ${smallUrl}`);
      updated++;
      continue;
    }

    await prisma.regionCard.update({
      where: { id: card.id },
      data: { imageSmall: smallUrl },
    });
    updated++;
  }

  console.log(`\nResults:`);
  console.log(`  Updated : ${updated}`);
  console.log(`  Skipped (unknown pattern): ${skipped}`);
  console.log(`  Total processed: ${cards.length}`);

  // Final count check
  if (!DRY_RUN) {
    const stillMissing = await prisma.regionCard.count({
      where: { language: "ja", imageSmall: null },
    });
    console.log(`\nJP imageSmall still NULL after update: ${stillMissing}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
