// cross-pack 형제 검증 (읽기전용) — flag OFF/ON 을 같은 앵커로 비교.
//   OFF: per-pack 풀(앵커 Card 자신의 locale)만 → 다른 팩 같은그림 형제 안 뜸.
//   ON : artCardId 그룹 전체 RegionCard 풀 → 다른 팩의 같은그림이 형제로 등장.
// 실행:
//   OFF: npx tsx scripts/migration/verify-crosspack-siblings.ts
//   ON : CROSS_PACK_SIBLINGS=1 npx tsx scripts/migration/verify-crosspack-siblings.ts
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { loadCardByLocaleId } from "../../src/lib/cards/queries";
import { CROSS_PACK_SIBLINGS_ENABLED } from "../../src/lib/cards/cross-pack-siblings";

type GroupRow = { artCardId: string; packs: number; regions: number; prints: number };
type AnchorRow = { id: string; region: string; setId: string; cardId: string; pack: string | null; cardRegions: number };

async function main() {
  console.log(`\n════ cross-pack 형제 검증 ════  flag = ${CROSS_PACK_SIBLINGS_ENABLED ? "★ON★" : "OFF(기본)"}\n`);

  // setId → cardPackId(=setGroupId) 맵 (cross-pack 판정용)
  const sets = await prisma.set.findMany({ select: { id: true, cardPackId: true } });
  const packOf = new Map(sets.map((s) => [s.id, s.cardPackId] as const));

  // 1) 데모 그룹: artCardId 그룹이 ≥2 팩·≥2 지역(=cross-pack 형제가 존재할 수 있는 그룹). 포켓몬 우선(이름 명료).
  const groups = (await prisma.$queryRawUnsafe(
    `SELECT lc."artCardId", count(distinct lc."setGroupId")::int packs,
            count(distinct rc.region)::int regions, count(*)::int prints
     FROM "LogicalCard" lc JOIN "CardLocale" rc ON rc."logicalCardId"=lc.id
     WHERE lc."artCardId" IS NOT NULL AND lc.supertype = 'Pokémon'
     GROUP BY lc."artCardId"
     HAVING count(distinct lc."setGroupId") >= 2 AND count(distinct rc.region) >= 2
     ORDER BY count(distinct rc.region) DESC, count(distinct lc."setGroupId") DESC, lc."artCardId"
     LIMIT 60`,
  )) as GroupRow[];

  // 매 6번째 그룹을 샘플(다양성) — 최대 8개
  const sample = groups.filter((_, i) => i % 7 === 0).slice(0, 8);
  console.log(`cross-pack 후보 그룹(포켓몬, ≥2팩·≥2지역): ${groups.length} · 샘플 ${sample.length}\n`);

  for (const g of sample) {
    // 앵커 = 그룹 내에서 "자기 Card 의 지역 수가 가장 적은" RegionCard (OFF 대비 극대화).
    const anchors = (await prisma.$queryRawUnsafe(
      `SELECT rc.id, rc.region, rc."setId", lc.id AS "cardId", lc."setGroupId" AS pack,
              (SELECT count(distinct r2.region) FROM "CardLocale" r2 WHERE r2."logicalCardId"=lc.id)::int AS "cardRegions"
       FROM "CardLocale" rc JOIN "LogicalCard" lc ON lc.id=rc."logicalCardId"
       WHERE lc."artCardId" = $1
       ORDER BY "cardRegions" ASC, rc.id ASC
       LIMIT 1`,
      g.artCardId,
    )) as AnchorRow[];
    if (anchors.length === 0) continue;
    const a = anchors[0];

    const loaded = await loadCardByLocaleId(a.id);
    if (!loaded) continue;
    const anchorPack = packOf.get(a.setId) ?? a.pack ?? "?";
    console.log(
      `▶ ${loaded.locale.name}  [앵커 ${a.region} · ${loaded.locale.setCode ?? loaded.locale.setId} · #${loaded.locale.number} · 팩 ${anchorPack}]` +
        `  (그룹 ${g.prints}프린트/${g.packs}팩/${g.regions}지역, 앵커Card 지역수 ${a.cardRegions})`,
    );
    let crossCount = 0;
    for (const region of ["EN", "JP", "KR"] as const) {
      const s = loaded.siblingByRegion[region];
      if (!s) { console.log(`    ${region}: (없음)`); continue; }
      const sPack = packOf.get(s.setId) ?? "?";
      const cross = sPack !== anchorPack;
      if (cross) crossCount++;
      const self = s.id === a.id;
      console.log(
        `    ${region}: ${s.setCode ?? s.setId} · #${s.number} · 팩 ${sPack}` +
          `${self ? "  (=앵커 자신)" : cross ? "  ✦CROSS-PACK(다른 팩에서 끌어옴)" : "  (같은 팩)"}`,
      );
    }
    console.log(`    → cross-pack 형제 ${crossCount}건\n`);
  }

  console.log(
    CROSS_PACK_SIBLINGS_ENABLED
      ? "✅ flag ON: ✦CROSS-PACK 형제가 뜨면 헤드라인 기능 정상 동작."
      : "ℹ flag OFF: per-pack 풀이라 ✦CROSS-PACK 0 이 정상(앵커 팩 내 형제만). ON 으로 재실행해 대비.",
  );
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
