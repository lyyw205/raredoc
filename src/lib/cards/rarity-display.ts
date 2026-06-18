/**
 * 희귀도 카테고리 표시 메타 — 약칭(라벨)·색상. /dex 카드팩 정보 섹션과 컬렉션 탭 "등급 구성"이
 * 공유하는 단일출처. (정렬 tier 는 rarity.ts categoryTier 사용.)
 */

// 희귀도 카테고리 코드 → 약칭(범례·바 라벨)
export const RARITY_CAT_ABBR: Record<string, string> = {
  promo: "P", common: "C", uncommon: "U", rare: "R", holo_rare: "RH",
  double_rare: "RR", illustration_rare: "AR", special_illustration_rare: "SAR",
  super_rare: "SR", ultra_rare: "UR", shiny: "S", hyper_rare: "HR",
};

// 희귀도 카테고리 코드 → 색상(구성 바·범례). tier 오름차순으로 회색→네이비→블루 그라데이션.
export const RARITY_CAT_COLOR: Record<string, string> = {
  promo:                     "#b8c0c9",
  common:                    "#c4ccd4",
  uncommon:                  "#94a0ad",
  rare:                      "#5b6776",
  holo_rare:                 "#3f4a5a",
  double_rare:               "#16365f",
  illustration_rare:         "#1c4fb0",
  super_rare:                "#2456cc",
  special_illustration_rare: "#3b74e8",
  ultra_rare:                "#5ba0f7",
  shiny:                     "#7dc0fb",
  hyper_rare:                "#9b8cf8",
};

export const RARITY_CAT_FALLBACK_COLOR = "#94a0ad";
