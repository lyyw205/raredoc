/**
 * Rarity 정렬 헬퍼. UI 컴포넌트 전역 공유.
 *
 * 정책: Rarity 마스터의 `tier` 컬럼(0~9)이 단일 기준.
 *   - 카드의 region(EN/JP/KR)에 따라 표시명은 nameEn/nameJa/nameKo 가 다르지만
 *     tier는 region 무관해서 정렬에 안전.
 *   - null tier 는 999 로 끝.
 *
 * 카드/컴포넌트는 `rarityTier?: number | null` 필드를 받아야 한다.
 *
 * categoryTier: RarityCategory.tier 기반 정렬. 카테고리 레이어 도입 후 필터/그룹화에 사용.
 *   - null 이면 raw rarityTier 로 폴백.
 */

export type RarityRankable = { rarityTier?: number | null };
export type CategoryRankable = {
  rarityCategoryTier?: number | null;
  rarityTier?: number | null;
};

export function cardTier(card: RarityRankable): number {
  return card.rarityTier ?? 999;
}

export function tierFromGroup(cards: RarityRankable[]): number {
  return cards[0] ? cardTier(cards[0]) : 999;
}

/** 카테고리 tier 반환. 없으면 raw rarityTier 로 폴백. */
export function categoryTier(card: CategoryRankable): number {
  return card.rarityCategoryTier ?? card.rarityTier ?? 999;
}

export function categoryTierFromGroup(cards: CategoryRankable[]): number {
  return cards[0] ? categoryTier(cards[0]) : 999;
}
