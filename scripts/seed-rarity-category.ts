/**
 * 희귀도 카테고리 레이어 시드 + Rarity 매핑
 *
 * 11개 카테고리 upsert → Rarity.categoryId 채움
 * 매핑 안 되는 row는 NULL 유지 + 콘솔 출력
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// ── 카테고리 정의 (사용자 승인) ──────────────────────────────────────────────
const CATEGORIES = [
  {
    code: "common",
    nameKo: "커먼",
    nameJa: "コモン",
    nameEn: "Common",
    tier: 1,
    order: 1,
    description: "● 까만 점, 광택 없음",
  },
  {
    code: "uncommon",
    nameKo: "언커먼",
    nameJa: "アンコモン",
    nameEn: "Uncommon",
    tier: 2,
    order: 2,
    description: "◆ 까만 마름모, 광택 없음",
  },
  {
    code: "rare",
    nameKo: "레어",
    nameJa: "レア",
    nameEn: "Rare",
    tier: 3,
    order: 3,
    description: "★ 일반 별, 광택 없음",
  },
  {
    code: "holo_rare",
    nameKo: "홀로 레어",
    nameJa: "ホロレア",
    nameEn: "Holo Rare",
    tier: 4,
    order: 4,
    description: "★+홀로 (카드 그림 반짝)",
  },
  {
    code: "double_rare",
    nameKo: "더블 레어",
    nameJa: "ダブルレア",
    nameEn: "Double Rare",
    tier: 5,
    order: 5,
    description: "★★ ex/V/GX/VMAX/VSTAR/LV.X",
  },
  {
    code: "ultra_rare",
    nameKo: "울트라 레어",
    nameJa: "ウルトラレア",
    nameEn: "Ultra Rare",
    tier: 6,
    order: 6,
    description: "풀 홀로 SR 종류",
  },
  {
    code: "illustration_rare",
    nameKo: "일러스트 레어",
    nameJa: "イラストレア",
    nameEn: "Illustration Rare",
    tier: 7,
    order: 7,
    description: "카드 풀일러 + 일반 프레임",
  },
  {
    code: "special_illustration_rare",
    nameKo: "스페셜 일러 레어",
    nameJa: "スペシャルイラストレア",
    nameEn: "Special Illustration Rare",
    tier: 8,
    order: 8,
    description: "IR + ★★ 표시",
  },
  {
    code: "shiny",
    nameKo: "시너",
    nameJa: "シャイニー",
    nameEn: "Shiny",
    tier: 8,
    order: 9,
    description: "시너 ◇ 마크 (시 컬렉션)",
  },
  {
    code: "hyper_rare",
    nameKo: "하이퍼 레어",
    nameJa: "ハイパーレア",
    nameEn: "Hyper Rare",
    tier: 9,
    order: 10,
    description: "무지개/골드/실버 풀아트",
  },
  {
    code: "promo",
    nameKo: "프로모",
    nameJa: "プロモ",
    nameEn: "Promo",
    tier: 0,
    order: 11,
    description: "팩 외 배포 (미분류 None 포함)",
  },
] as const;

// ── Rarity code → 카테고리 code 매핑 ─────────────────────────────────────────
// DB 실제 존재 Rarity code 기준 (58종 + None)
const RARITY_TO_CATEGORY: Record<string, string> = {
  // common
  Common: "common",
  C: "common",

  // uncommon
  Uncommon: "uncommon",
  U: "uncommon",

  // rare
  Rare: "rare",
  R: "rare",
  "Rare ACE": "rare",
  "Rare Prime": "rare",
  "Triple Rare": "rare",
  "Rare BREAK": "rare",

  // holo_rare
  "Rare Holo": "holo_rare",
  "Holo Rare": "holo_rare",
  "Trainer Gallery Rare Holo": "holo_rare",
  "Rare Holo Star": "holo_rare",
  "Classic Collection": "holo_rare",
  "Rare Holo LEGEND": "holo_rare",
  LEGEND: "holo_rare",
  "Rare Shining": "holo_rare",
  Shining: "holo_rare",
  "Black White Rare": "holo_rare",

  // double_rare
  "Double Rare": "double_rare",
  "Rare Holo V": "double_rare",
  "Rare Holo EX": "double_rare",
  "Rare Holo GX": "double_rare",
  "Rare Holo VMAX": "double_rare",
  "Rare Holo VSTAR": "double_rare",
  "Rare Holo LV.X": "double_rare",
  "Radiant Rare": "double_rare",
  "Amazing Rare": "double_rare",
  "Prism Rare": "double_rare",
  "Rare Prism Star": "double_rare",
  Kagayaku: "double_rare",

  // ultra_rare
  "Ultra Rare": "ultra_rare",
  "Rare Ultra": "ultra_rare",
  "Super Rare": "ultra_rare",
  "Super Rare Holo": "ultra_rare",
  "Secret Rare": "ultra_rare",
  "Shiny Ultra Rare": "ultra_rare",
  "Trainer Rare": "ultra_rare",
  "Character Rare": "ultra_rare",
  "Character Super Rare": "ultra_rare",
  "ACE SPEC Rare": "ultra_rare",
  "Mega Ultra Rare": "ultra_rare",
  "Mega Attack Rare": "ultra_rare",

  // illustration_rare
  "Illustration Rare": "illustration_rare",
  "Art Rare": "illustration_rare",

  // special_illustration_rare
  "Special Illustration Rare": "special_illustration_rare",
  "Special Art Rare": "special_illustration_rare",

  // shiny
  "Rare Shiny": "shiny",
  "Shiny Rare": "shiny",
  "Shiny Secret Rare": "shiny",
  "Rare Shiny GX": "shiny",

  // hyper_rare
  "Hyper Rare": "hyper_rare",
  "Rare Rainbow": "hyper_rare",
  "Mega Hyper Rare": "hyper_rare",
  "Rare Secret": "hyper_rare",

  // promo
  Promo: "promo",
  None: "promo",
};

async function main() {
  console.log("=== Phase 2: RarityCategory 시드 + 매핑 시작 ===\n");

  // ── 1. 11개 카테고리 upsert ────────────────────────────────────────────────
  for (const cat of CATEGORIES) {
    await prisma.rarityCategory.upsert({
      where: { code: cat.code },
      update: {
        nameKo: cat.nameKo,
        nameJa: cat.nameJa,
        nameEn: cat.nameEn,
        tier: cat.tier,
        order: cat.order,
        description: cat.description,
      },
      create: {
        code: cat.code,
        nameKo: cat.nameKo,
        nameJa: cat.nameJa,
        nameEn: cat.nameEn,
        tier: cat.tier,
        order: cat.order,
        description: cat.description,
      },
    });
    console.log(`  upserted category: ${cat.code} (tier=${cat.tier})`);
  }
  console.log(`\n✓ ${CATEGORIES.length}개 카테고리 upsert 완료\n`);

  // ── 2. 카테고리 id 맵 구성 ─────────────────────────────────────────────────
  const categoryRows = await prisma.rarityCategory.findMany({
    select: { id: true, code: true },
  });
  const catIdByCode = new Map(categoryRows.map((c) => [c.code, c.id]));

  // ── 3. 모든 Rarity row 조회 + categoryId 채움 ──────────────────────────────
  const rarities = await prisma.rarity.findMany({
    select: { id: true, code: true },
  });

  let mapped = 0;
  let unmapped = 0;
  const unmappedCodes: string[] = [];

  for (const r of rarities) {
    const catCode = RARITY_TO_CATEGORY[r.code];
    if (!catCode) {
      unmapped++;
      unmappedCodes.push(r.code);
      continue;
    }
    const catId = catIdByCode.get(catCode);
    if (!catId) {
      console.warn(`  경고: 카테고리 코드 "${catCode}" DB에 없음 (Rarity: ${r.code})`);
      unmapped++;
      unmappedCodes.push(r.code);
      continue;
    }
    await prisma.rarity.update({
      where: { id: r.id },
      data: { categoryId: catId },
    });
    mapped++;
  }

  console.log(`✓ 매핑 완료: ${mapped}/${rarities.length}개`);
  if (unmappedCodes.length > 0) {
    console.log(`\n⚠ 매핑 실패 (categoryId=NULL 유지): ${unmapped}개`);
    unmappedCodes.forEach((c) => console.log(`  - "${c}"`));
  } else {
    console.log("✓ 전체 매핑 성공 (미매핑 없음)");
  }

  // ── 4. 카테고리별 카드 수 통계 ────────────────────────────────────────────
  console.log("\n=== 카테고리별 카드 수 ===");
  const stats = await prisma.rarityCategory.findMany({
    orderBy: { order: "asc" },
    select: {
      code: true,
      nameKo: true,
      tier: true,
      rarities: {
        select: {
          _count: { select: { cards: true } },
          code: true,
        },
      },
    },
  });

  for (const cat of stats) {
    const total = cat.rarities.reduce((sum, r) => sum + r._count.cards, 0);
    const rarityCodes = cat.rarities.map((r) => r.code).join(", ");
    console.log(
      `  ${cat.nameKo} (tier=${cat.tier}): ${total.toLocaleString()}장` +
        (rarityCodes ? ` [${rarityCodes}]` : "")
    );
  }

  await prisma.$disconnect();
  console.log("\n=== 완료 ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
