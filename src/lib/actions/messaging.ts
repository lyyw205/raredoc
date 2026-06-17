"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrCreateConversation } from "@/lib/services/messaging";
import { ActionResult, ACTION_ERR } from "./_shared";

export type MessagingActionState = ActionResult<{ conversationId?: string }>;

function revalidateMessageViews() {
  // 대화 목록/스레드/헤더 안읽음 모두 layout 재검증으로 갱신
  revalidatePath("/", "layout");
}

/** 대화 참여자인지 확인. 아니면 null. */
async function loadConversationFor(conversationId: string, userId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, user1Id: true, user2Id: true, sourcePostId: true },
  });
  if (!conv) return null;
  if (conv.user1Id !== userId && conv.user2Id !== userId) return null;
  return conv;
}

// ─────────────────────────────────────────────────────────────────────────────
// 대화 시작 (커뮤니티 거래글 문의 등)
// ─────────────────────────────────────────────────────────────────────────────

const startSchema = z.object({
  partnerId: z.string().min(1),
  sourceType: z.enum(["direct", "card_inquiry", "community_post"]).optional(),
  cardId: z.string().min(1).nullable().optional(),
  postId: z.string().min(1).nullable().optional(),
});

export async function startConversationAction(input: {
  partnerId: string;
  sourceType?: "direct" | "card_inquiry" | "community_post";
  cardId?: string | null;
  postId?: string | null;
}): Promise<MessagingActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };

  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: ACTION_ERR.badRequest };
  if (parsed.data.partnerId === user.id)
    return { ok: false, error: "자기 자신과는 대화할 수 없습니다." };

  // 상대 유저 존재 확인
  const partner = await prisma.user.findUnique({
    where: { id: parsed.data.partnerId },
    select: { id: true },
  });
  if (!partner) return { ok: false, error: "상대를 찾을 수 없습니다." };

  const { id } = await getOrCreateConversation(user.id, parsed.data.partnerId, {
    sourceType: parsed.data.sourceType ?? "direct",
    cardId: parsed.data.cardId ?? null,
    postId: parsed.data.postId ?? null,
  });

  revalidateMessageViews();
  return { ok: true, conversationId: id };
}

// ─────────────────────────────────────────────────────────────────────────────
// 메시지 전송
// ─────────────────────────────────────────────────────────────────────────────

const sendSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().trim().max(2000),
  attachedCardId: z.string().min(1).nullable().optional(),
});

export async function sendMessageAction(input: {
  conversationId: string;
  content: string;
  attachedCardId?: string | null;
}): Promise<MessagingActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };

  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "메시지를 확인해 주세요." };
  if (!parsed.data.content && !parsed.data.attachedCardId)
    return { ok: false, error: "내용을 입력해 주세요." };

  const conv = await loadConversationFor(parsed.data.conversationId, user.id);
  if (!conv) return { ok: false, error: "대화 권한이 없습니다." };

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: user.id,
        content: parsed.data.content,
        attachedCardId: parsed.data.attachedCardId ?? null,
      },
    }),
    prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: now },
    }),
  ]);

  revalidateMessageViews();
  return { ok: true, conversationId: conv.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// 읽음 처리
// ─────────────────────────────────────────────────────────────────────────────

export async function markReadAction(conversationId: string): Promise<MessagingActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };
  if (!conversationId) return { ok: false, error: ACTION_ERR.badRequest };

  const conv = await loadConversationFor(conversationId, user.id);
  if (!conv) return { ok: false, error: "대화 권한이 없습니다." };

  const lastMsg = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.message.updateMany({
      where: { conversationId, senderId: { not: user.id }, readAt: null },
      data: { readAt: new Date() },
    }),
    prisma.conversationRead.upsert({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      create: { conversationId, userId: user.id, lastReadMessageId: lastMsg?.id ?? null },
      update: { lastReadMessageId: lastMsg?.id ?? null },
    }),
  ]);

  revalidateMessageViews();
  return { ok: true, conversationId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 거래 약속 / 완료 / 후기
// ─────────────────────────────────────────────────────────────────────────────

/** 대화에 연결된 (또는 가장 최근) Offer 를 찾는다. 없으면 null. */
async function findOfferForConversation(conversationId: string) {
  return prisma.offer.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, listingId: true, buyerId: true, status: true },
  });
}

/** 트랜잭션 내부: 거래 완료 마킹 — offer/listing/post 를 completed 로. */
async function markTradeCompleted(
  tx: Prisma.TransactionClient,
  offer: { id: string; listingId: string } | null,
  sourcePostId: string | null,
) {
  if (offer) {
    await tx.offer.update({
      where: { id: offer.id },
      data: { status: "completed", respondedAt: new Date() },
    });
    await tx.listing.update({
      where: { id: offer.listingId },
      data: { status: "completed" },
    });
  }
  if (sourcePostId) {
    await tx.post.updateMany({
      where: { id: sourcePostId },
      data: { tradeStatus: "completed" },
    });
  }
}

/** 트랜잭션 내부: 링크(약속/후기) 시스템 메시지 생성 + 대화 lastMessageAt 갱신. */
async function appendLinkedMessage(
  tx: Prisma.TransactionClient,
  conversationId: string,
  senderId: string,
  link: { appointmentId?: string; reviewId?: string },
) {
  await tx.message.create({
    data: { conversationId, senderId, content: "", ...link },
  });
  await tx.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });
}

const proposeSchema = z.object({
  conversationId: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  time: z.string().min(1), // HH:MM
  place: z.string().trim().min(1).max(100),
});

/** 약속 메시지 전송 → Appointment 생성 + 메시지(appointmentId) + 거래글 예약중. */
export async function proposeAppointmentAction(input: {
  conversationId: string;
  date: string;
  time: string;
  place: string;
}): Promise<MessagingActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };

  const parsed = proposeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "약속 정보를 확인해 주세요." };

  const conv = await loadConversationFor(parsed.data.conversationId, user.id);
  if (!conv) return { ok: false, error: "대화 권한이 없습니다." };

  const when = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
  if (Number.isNaN(when.getTime())) return { ok: false, error: "날짜/시간이 올바르지 않습니다." };

  const offer = await findOfferForConversation(conv.id);

  await prisma.$transaction(async (tx) => {
    const apt = await tx.appointment.create({
      data: {
        offerId: offer?.id ?? null,
        date: when,
        place: parsed.data.place,
        status: "proposed",
      },
    });
    await appendLinkedMessage(tx, conv.id, user.id, { appointmentId: apt.id });
    // 연결된 거래글 예약중 처리
    if (conv.sourcePostId) {
      await tx.post.updateMany({
        where: { id: conv.sourcePostId, tradeStatus: { not: "completed" } },
        data: { tradeStatus: "reserved" },
      });
    }
    // 연결된 Listing 예약중 처리
    if (offer) {
      await tx.listing.update({ where: { id: offer.listingId }, data: { status: "reserved" } });
    }
  });

  revalidateMessageViews();
  return { ok: true, conversationId: conv.id };
}

/** 약속 확정. */
export async function confirmAppointmentAction(input: {
  conversationId: string;
  appointmentId: string;
}): Promise<MessagingActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };
  const conv = await loadConversationFor(input.conversationId, user.id);
  if (!conv) return { ok: false, error: "대화 권한이 없습니다." };

  await prisma.appointment.updateMany({
    where: { id: input.appointmentId, status: "proposed" },
    data: { status: "confirmed" },
  });

  revalidateMessageViews();
  return { ok: true, conversationId: conv.id };
}

/** 거래 완료 처리 (Offer/Listing/거래글 completed). */
export async function completeOfferAction(
  conversationId: string
): Promise<MessagingActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };

  const conv = await loadConversationFor(conversationId, user.id);
  if (!conv) return { ok: false, error: "대화 권한이 없습니다." };

  const offer = await findOfferForConversation(conv.id);

  await prisma.$transaction(async (tx) => {
    await markTradeCompleted(tx, offer, conv.sourcePostId);
  });

  revalidateMessageViews();
  return { ok: true, conversationId: conv.id };
}

const reviewSchema = z.object({
  conversationId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  manner: z.enum(["good", "bad"]),
  comment: z.string().trim().max(500).optional(),
});

/** 거래 후기 작성 → Review + 메시지(reviewId) + 거래 완료 처리. */
export async function leaveReviewAction(input: {
  conversationId: string;
  rating: number;
  manner: "good" | "bad";
  comment?: string;
}): Promise<MessagingActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: ACTION_ERR.auth };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "후기 내용을 확인해 주세요." };

  const conv = await loadConversationFor(parsed.data.conversationId, user.id);
  if (!conv) return { ok: false, error: "대화 권한이 없습니다." };

  const rateeId = conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
  const offer = await findOfferForConversation(conv.id);

  await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        offerId: offer?.id ?? null,
        raterId: user.id,
        rateeId,
        rating: parsed.data.rating,
        manner: parsed.data.manner,
        comment: parsed.data.comment || null,
      },
    });
    await appendLinkedMessage(tx, conv.id, user.id, { reviewId: review.id });
    await markTradeCompleted(tx, offer, conv.sourcePostId);
  });

  revalidateMessageViews();
  return { ok: true, conversationId: conv.id };
}
