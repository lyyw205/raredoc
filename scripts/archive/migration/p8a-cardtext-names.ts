// ── P8a: LC.nameKo → CardText(ko, name) 완성 (additive) ───────────────────────
// 현재 CardText ko 이름이 절반만 적재(11,184/21,781 nameKo). 누락분을 채워 이름축 완성.
// 축은 현 cardId 유지(gameCard/artCard 재키는 후속 최적화). unique(lcId,lang) → skipDuplicates.
// 기본 dry-run. 적용 --apply. 실행: npx tsx scripts/migration/p8a-cardtext-names.ts [--apply]
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`【P8a CardText 이름완성】${APPLY ? " ★APPLY" : " (dry-run)"}`);
  // nameKo 있는데 ko CardText 없는 LC
  const missing = await prisma.$queryRawUnsafe<any[]>(`
    SELECT lc.id, lc."nameKo" FROM "LogicalCard" lc
    WHERE lc."nameKo" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "CardText" ct WHERE ct."logicalCardId"=lc.id AND ct.language='ko')`);
  console.log(`  nameKo 보유·ko CardText 없는 LC: ${missing.length}`);

  if (!APPLY) {
    const cur = await prisma.cardText.count({ where: { language: "ko" } });
    console.log(`  현재 ko CardText ${cur} → 적용 후 ${cur + missing.length} 예상`);
    console.log("  (dry-run)"); await prisma.$disconnect(); return;
  }

  let ins = 0;
  for (let i = 0; i < missing.length; i += 2000) {
    const batch = missing.slice(i, i + 2000).map((m) => ({
      cardId: m.id, language: "ko", name: m.nameKo, source: "lc_nameko", confidence: 1.0,
    }));
    ins += (await prisma.cardText.createMany({ data: batch, skipDuplicates: true })).count;
  }
  const koNow = await prisma.cardText.count({ where: { language: "ko" } });
  // 검증: nameKo 있는 LC 전부 ko CardText 보유?
  const stillMissing = await prisma.$queryRawUnsafe<any[]>(`
    SELECT count(*)::int c FROM "LogicalCard" lc WHERE lc."nameKo" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "CardText" ct WHERE ct."logicalCardId"=lc.id AND ct.language='ko')`);
  console.log(`  ✅ ko CardText +${ins} → 총 ${koNow} · 잔여 누락 ${stillMissing[0].c}(0기대)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
