"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getSetCardsCached } from "@/lib/cards/dex-region";
import type { DexCard } from "@/components/dex/DexCatalog";

/**
 * 선택한 세트의 카드들을 lazy 로드. 로그인 유저가 있으면 보유(owned) 오버레이를 얹는다.
 *   - 카드 식별은 RegionCard.id(= CollectionItem.localeId). 캐시 객체는 변형 금지 → 불변 map 으로 반환.
 */
export async function loadSetCards(setId: string): Promise<DexCard[]> {
  const cards = await getSetCardsCached(setId);
  const user = await getCurrentUser();
  if (!user || cards.length === 0) return cards;

  const items = await prisma.collectionItem.findMany({
    where: { userId: user.id, localeId: { in: cards.map((c) => c.id) } },
    select: { localeId: true, grade: true, certified: true },
  });
  if (items.length === 0) return cards;

  const owned = new Map<string, { grade: string; certified: boolean }>();
  for (const it of items) {
    if (!owned.has(it.localeId)) owned.set(it.localeId, { grade: it.grade, certified: it.certified });
  }

  return cards.map((c) => {
    const own = owned.get(c.id);
    return own ? { ...c, owned: true, grade: own.grade, certified: own.certified } : c;
  });
}
