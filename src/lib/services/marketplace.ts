import { prisma } from "@/lib/prisma";
import { USD_KRW, conditionCoefficient, pickPriceUsd } from "@/lib/trades/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 추정가 (컬렉션 서비스와 동일 계수 — Listing askingKrw 없을 때 폴백)
// ─────────────────────────────────────────────────────────────────────────────

function estimateKrw(
  grade: string,
  estimatedKrw: number | null,
  prices: { normal: number | null; holofoil: number | null; reverseHolo: number | null; firstEdition: number | null }[]
): number | null {
  if (estimatedKrw != null) return estimatedKrw;
  const latest = prices[0];
  if (!latest) return null;
  const usd = pickPriceUsd(latest);
  if (usd == null || !Number.isFinite(usd)) return null;
  return Math.round(usd * USD_KRW * conditionCoefficient(grade));
}

// ─────────────────────────────────────────────────────────────────────────────
// Listing 동기화 (forSale 토글과 연계)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CollectionItem 의 forSale 상태에 맞춰 Listing 을 동기화.
 * - forSale=true  → Listing 없으면 생성(active), 있으면 hidden→active 로 복구
 * - forSale=false → 기존 Listing 을 hidden 으로 (active offer 보존 위해 삭제 안 함)
 * itemId 의 소유자만 호출하도록 액션 레이어에서 보장.
 */
export async function ensureListingForItem(itemId: string): Promise<string | null> {
  const item = await prisma.collectionItem.findUnique({
    where: { id: itemId },
    select: { id: true, userId: true, forSale: true, estimatedKrw: true, listing: { select: { id: true } } },
  });
  if (!item) return null;

  if (item.forSale) {
    if (item.listing) {
      await prisma.listing.update({
        where: { itemId },
        data: { status: "active" },
      });
      return item.listing.id;
    }
    const created = await prisma.listing.create({
      data: {
        itemId,
        sellerId: item.userId,
        askingKrw: item.estimatedKrw ?? null,
        dealMethod: "both",
        status: "active",
      },
      select: { id: true },
    });
    return created.id;
  }

  // 판매 해제: Listing 이 있으면 숨김 처리
  if (item.listing) {
    await prisma.listing.update({
      where: { itemId },
      data: { status: "hidden" },
    });
    return item.listing.id;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 카드 보유자 목록 (forSale → Listing 기반)
// ─────────────────────────────────────────────────────────────────────────────

export interface CardOwner {
  itemId: string;
  listingId: string;
  seller: {
    id: string;
    username: string | null;
    displayName: string;
    initial: string;
    tier: string;
  };
  grade: string;
  certified: boolean;
  askingKrw: number | null;
  dealMethod: string;
  location: string | null;
  offerAvailable: boolean;
}

/**
 * 해당 카드를 판매중(active Listing)으로 보유한 유저 목록.
 * viewerId 가 본인이면 offerAvailable=false (자기 자신에게 제안 불가).
 */
export async function getOwnersForCard(
  cardId: string,
  viewerId?: string | null
): Promise<CardOwner[]> {
  const listings = await prisma.listing.findMany({
    where: { status: "active", item: { regionCardId: cardId } },
    select: {
      id: true,
      askingKrw: true,
      dealMethod: true,
      location: true,
      sellerId: true,
      item: {
        select: {
          id: true,
          grade: true,
          certified: true,
          estimatedKrw: true,
          regionCard: {
            select: {
              prices: {
                orderBy: { recordedAt: "desc" },
                take: 1,
                select: { normal: true, holofoil: true, reverseHolo: true, firstEdition: true },
              },
            },
          },
        },
      },
      seller: {
        select: { id: true, username: true, displayName: true, name: true, avatarInitial: true, tier: true },
      },
    },
  });

  return listings.map((l) => {
    const display = l.seller.displayName ?? l.seller.name ?? l.seller.username ?? "?";
    const asking =
      l.askingKrw ?? estimateKrw(l.item.grade, l.item.estimatedKrw, l.item.regionCard.prices);
    return {
      itemId: l.item.id,
      listingId: l.id,
      seller: {
        id: l.seller.id,
        username: l.seller.username,
        displayName: display,
        initial: l.seller.avatarInitial ?? display.charAt(0) ?? "?",
        tier: l.seller.tier,
      },
      grade: l.item.grade,
      certified: l.item.certified,
      askingKrw: asking,
      dealMethod: l.dealMethod,
      location: l.location,
      offerAvailable: viewerId ? l.sellerId !== viewerId : true,
    };
  });
}

/** 카드 상세 헤더용: 이 카드를 보유한 유저 수 / 판매중(제안 가능) 유저 수. */
export async function getCardOwnerCounts(cardId: string): Promise<{ total: number; offerable: number }> {
  const [total, offerable] = await Promise.all([
    prisma.collectionItem.count({ where: { regionCardId: cardId } }),
    prisma.collectionItem.count({ where: { regionCardId: cardId, forSale: true } }),
  ]);
  return { total, offerable };
}
