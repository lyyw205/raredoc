/**
 * Phase 7-A — LogicalCard.nameKo → CardText(language="ko") 이관.
 *
 * 옵션 C 전환의 첫 백필. 멱등(re-run 안전): 이미 ko CardText 가 있는 카드는 건너뜀.
 *
 * 규칙:
 *  - LogicalCard.nameKo 가 있는 행 → CardText{ language:"ko", name:nameKo,
 *    source:"legacy_nameko", confidence:1.0 } 생성.
 *  - 다른 *Ko(attacks/abilities/rules/flavorText) 는 현재 전부 비어있어 이관 대상 아님
 *    (nameKo 가 모든 한글 데이터의 상위집합임을 사전 확인).
 *  - 기존 ko CardText 가 이미 있으면 clobber 금지 — D단계 공식 데이터 보호.
 *
 * 실행: npx tsx scripts/migrate-nameko-to-cardtext.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const CHUNK = 1000;

async function main() {
  const t0 = Date.now();

  // 1) 이관 대상: nameKo 가 있는 LogicalCard (한글 데이터 상위집합)
  const cards = await prisma.logicalCard.findMany({
    where: { nameKo: { not: null } },
    select: { id: true, nameKo: true, rulesKo: true, flavorTextKo: true },
  });
  console.log(`[init] 이관 후보(nameKo 보유): ${cards.length}`);

  // 2) 이미 ko CardText 가 있는 카드(보호 대상)
  const existing = await prisma.cardText.findMany({
    where: { language: "ko" },
    select: { logicalCardId: true },
  });
  const has = new Set(existing.map((e) => e.logicalCardId));
  console.log(`[init] 기존 ko CardText: ${has.size} (skip 대상)`);

  // 3) 신규 행 구성
  const rows: Prisma.CardTextCreateManyInput[] = [];
  for (const c of cards) {
    if (has.has(c.id)) continue;
    rows.push({
      logicalCardId: c.id,
      language: "ko",
      name: c.nameKo,
      rules: c.rulesKo ?? [],
      flavorText: c.flavorTextKo,
      source: "legacy_nameko",
      confidence: 1.0,
    });
  }
  console.log(`[plan] 신규 생성 예정: ${rows.length}`);

  // 4) 청크 단위 createMany (skipDuplicates 로 unique 경합도 무해)
  let created = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const res = await prisma.cardText.createMany({ data: slice, skipDuplicates: true });
    created += res.count;
    console.log(`  ... ${created}/${rows.length}`);
  }

  // 5) 검증
  const total = await prisma.cardText.count({ where: { language: "ko" } });
  const withName = await prisma.cardText.count({ where: { language: "ko", name: { not: null } } });
  console.log("\n=== MIGRATE 7-A SUMMARY ===");
  console.log({
    durationSec: ((Date.now() - t0) / 1000).toFixed(1),
    candidates: cards.length,
    created,
    koCardText_total: total,
    koCardText_withName: withName,
  });

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
