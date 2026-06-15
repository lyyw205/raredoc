/**
 * svp(Scarlet & Violet Black Star Promos) Set.cardCount 를 실제 CardLocale 수로 동기화.
 * (보강 수집 후 메타 갱신; 기존 196 = stale)
 * 실행: npx tsx scripts/fix-svp-cardcount.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const APPLY = process.argv.includes("--apply");
  const actual = await prisma.regionCard.count({ where: { setId: "svp" } });
  const before = await prisma.set.findUnique({ where: { id: "svp" }, select: { cardCount: true } });
  console.log(`svp.cardCount: ${before?.cardCount} → ${actual} | ${APPLY ? "★APPLY" : "(dry-run)"}`);
  if (APPLY) {
    await prisma.set.update({ where: { id: "svp" }, data: { cardCount: actual } });
    const after = await prisma.set.findUnique({ where: { id: "svp" }, select: { cardCount: true } });
    console.log(`검증: cardCount=${after?.cardCount}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
