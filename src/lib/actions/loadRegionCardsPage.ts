"use server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  buildRegionCardsPage,
  overlayOwnedStatus,
  type Region,
  type RegionCardSort,
  type RegionCardPage,
} from "@/lib/cards/dex-region";

/**
 * "전체" 가상 팩: 선택 지역의 전체 카드를 서버에서 필터·정렬한 뒤 offset/limit(기본 50) 페이지로 lazy 로드.
 *   - 필터·정렬은 서버 측에서 지역 전체 카탈로그에 적용(클라 필터와 동일 의미) → 무한스크롤이 전체를 정확히 커버.
 *   - 로그인 유저가 있으면 페이지 카드에 보유(owned) 오버레이를 불변 map 으로 얹는다(loadSetCards 와 동일).
 */
export async function loadRegionCardsPage(
  region: Region,
  input: {
    offset: number;
    limit?: number;
    search?: string;
    categories?: string[];
    types?: string[];
    supertypes?: string[];
    sort?: RegionCardSort;
  },
): Promise<RegionCardPage> {
  const page = await buildRegionCardsPage(region, { ...input, limit: input.limit ?? 50 });
  const user = await getCurrentUser();
  if (!user) return page;
  return { ...page, cards: await overlayOwnedStatus(page.cards, user.id) };
}
