"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrCreateConversation } from "@/lib/services/messaging";

export type MarketplaceActionState = {
  ok: boolean;
  error?: string;
  conversationId?: string;
  offerId?: string;
};

function revalidateMarketViews() {
  revalidatePath("/", "layout");
}

// ─────────────────────────────────────────────────────────────────────────────
// 구매 제안 시작 (카드 보유자에게)
// ─────────────────────────────────────────────────────────────────────────────

const makeOfferSchema = z.object({
  listingId: z.string().min(1),
  cardId: z.string().min(1).optional(),
  message: z.string().trim().max(2000).optional(),
  proposedKrw: z.number().int().positive().nullable().optional(),
});

/**
 * 카드 보유자에게 구매 제안 시작.
 * Listing 조회 → 본인 제외 검증 → Offer(pending) + 대화 생성/연결 + 첫 메시지(cardRef 첨부).
 */
export async function makeOfferAction(input: {
  listingId: string;
  cardId?: string;
  message?: string;
  proposedKrw?: number | null;
}): Promise<MarketplaceActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = makeOfferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 요청입니다." };

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId },
    select: {
      id: true,
      sellerId: true,
      status: true,
      item: { select: { localeId: true } },
    },
  });
  if (!listing) return { ok: false, error: "판매 정보를 찾을 수 없습니다." };
  if (listing.status !== "active")
    return { ok: false, error: "현재 제안할 수 없는 매물입니다." };
  if (listing.sellerId === user.id)
    return { ok: false, error: "자신의 카드에는 제안할 수 없습니다." };

  const cardId = parsed.data.cardId ?? listing.item.localeId;

  const { id: conversationId } = await getOrCreateConversation(user.id, listing.sellerId, {
    sourceType: "card_inquiry",
    cardId,
  });

  // 동일 대화에 이미 진행 중(pending/accepted) 제안이 있으면 재사용
  const existingOffer = await prisma.offer.findFirst({
    where: {
      listingId: listing.id,
      buyerId: user.id,
      status: { in: ["pending", "accepted"] },
    },
    select: { id: true },
  });

  let offerId = existingOffer?.id;
  const isNew = !existingOffer;

  await prisma.$transaction(async (tx) => {
    if (!offerId) {
      const offer = await tx.offer.create({
        data: {
          listingId: listing.id,
          buyerId: user.id,
          proposedKrw: parsed.data.proposedKrw ?? null,
          status: "pending",
          conversationId,
        },
      });
      offerId = offer.id;
    } else {
      await tx.offer.update({ where: { id: offerId }, data: { conversationId } });
    }

    // 첫 메시지: cardRef 첨부 (신규 제안일 때만 자동 메시지)
    if (isNew) {
      await tx.message.create({
        data: {
          conversationId,
          senderId: user.id,
          content: parsed.data.message?.trim() || "안녕하세요! 카드 구매 제안 드립니다.",
          attachedCardId: cardId,
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
    }
  });

  revalidateMarketViews();
  return { ok: true, conversationId, offerId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 제안 상태 변경 (판매자: 수락/거절, 구매자: 취소)
// ─────────────────────────────────────────────────────────────────────────────

const respondSchema = z.object({
  offerId: z.string().min(1),
  action: z.enum(["accept", "decline", "cancel"]),
});

export async function respondToOfferAction(input: {
  offerId: string;
  action: "accept" | "decline" | "cancel";
}): Promise<MarketplaceActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 요청입니다." };

  const offer = await prisma.offer.findUnique({
    where: { id: parsed.data.offerId },
    select: {
      id: true,
      buyerId: true,
      status: true,
      conversationId: true,
      listing: { select: { id: true, sellerId: true } },
    },
  });
  if (!offer) return { ok: false, error: "제안을 찾을 수 없습니다." };
  if (offer.status !== "pending")
    return { ok: false, error: "이미 처리된 제안입니다." };

  const isSeller = offer.listing.sellerId === user.id;
  const isBuyer = offer.buyerId === user.id;

  if (parsed.data.action === "cancel") {
    if (!isBuyer) return { ok: false, error: "권한이 없습니다." };
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "cancelled", respondedAt: new Date() },
    });
  } else {
    if (!isSeller) return { ok: false, error: "권한이 없습니다." };
    const status = parsed.data.action === "accept" ? "accepted" : "declined";
    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: offer.id },
        data: { status, respondedAt: new Date() },
      });
      if (status === "accepted") {
        await tx.listing.update({
          where: { id: offer.listing.id },
          data: { status: "reserved" },
        });
      }
    });
  }

  revalidateMarketViews();
  return { ok: true, offerId: offer.id, conversationId: offer.conversationId ?? undefined };
}
