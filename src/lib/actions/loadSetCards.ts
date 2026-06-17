"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getSetCardsCached, overlayOwnedStatus } from "@/lib/cards/dex-region";
import type { DexCard } from "@/components/dex/DexCatalog";

/**
 * 선택한 세트의 카드들을 lazy 로드. 로그인 유저가 있으면 보유(owned) 오버레이를 얹는다.
 *   - 카드 식별은 RegionCard.id(= CollectionItem.regionCardId). 캐시 객체는 변형 금지 → 불변 map 으로 반환.
 */
export async function loadSetCards(setId: string): Promise<DexCard[]> {
  const cards = await getSetCardsCached(setId);
  const user = await getCurrentUser();
  if (!user) return cards;
  return overlayOwnedStatus(cards, user.id);
}
