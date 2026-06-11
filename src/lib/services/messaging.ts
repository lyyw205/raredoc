import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Conversation user1/user2 정규화 (unique [user1Id, user2Id] 유지: 항상 사전순 정렬)
// ─────────────────────────────────────────────────────────────────────────────

/** 두 유저 id 를 사전순으로 정렬해 [user1Id, user2Id] 로 반환. */
export function orderUserPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// ─────────────────────────────────────────────────────────────────────────────
// 카드 참조 미리보기 (Conversation/Message 의 cardId → 표시용)
// ─────────────────────────────────────────────────────────────────────────────

export interface CardRefView {
  cardId: string;
  cardName: string;
  imageUrl: string;
  setName: string;
}

/** 카드 id 목록 → 표시용 CardRefView 맵 (DB 카드만; 없으면 누락). */
async function loadCardRefs(cardIds: string[]): Promise<Map<string, CardRefView>> {
  const ids = [...new Set(cardIds.filter(Boolean))];
  const map = new Map<string, CardRefView>();
  if (ids.length === 0) return map;
  // Phase 4: prisma.card → prisma.regionCard. RegionCard.id == 기존 Card.id.
  // RegionCard 행은 이미 해당 locale 의 표시명을 갖고 있으므로 .name 그대로 사용.
  const cards = await prisma.regionCard.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      imageSmall: true,
      set: { select: { name: true, nameKo: true } },
    },
  });
  for (const c of cards) {
    map.set(c.id, {
      cardId: c.id,
      cardName: c.name,
      imageUrl: c.imageSmall ?? "",
      setName: c.set.nameKo ?? c.set.name,
    });
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// 대화 목록
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationListItem {
  id: string;
  partner: {
    id: string;
    username: string | null;
    displayName: string;
    initial: string;
  };
  lastMessage: string;
  lastAt: Date | null;
  unread: number;
  sourceType: "direct" | "card_inquiry" | "community_post";
  cardRef?: CardRefView;
}

type PartnerUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  name: string | null;
  avatarInitial: string | null;
};

const partnerSelect = {
  id: true,
  username: true,
  displayName: true,
  name: true,
  avatarInitial: true,
} as const;

/** 대화 참여자 user id 목록 → 표시용 맵. */
async function loadPartnerUsers(userIds: string[]): Promise<Map<string, PartnerUser>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, PartnerUser>();
  if (ids.length === 0) return map;
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: partnerSelect,
  });
  for (const u of users) map.set(u.id, u);
  return map;
}

function partnerView(u: PartnerUser | undefined, fallbackId: string) {
  const display = u?.displayName ?? u?.name ?? u?.username ?? "?";
  return {
    id: u?.id ?? fallbackId,
    username: u?.username ?? null,
    displayName: display,
    initial: u?.avatarInitial ?? display.charAt(0) ?? "?",
  };
}

/** 뷰어가 참여한 대화 목록 (최근 메시지순, 안읽음 수 포함). */
export async function getConversations(viewerId: string): Promise<ConversationListItem[]> {
  const rows = await prisma.conversation.findMany({
    where: { OR: [{ user1Id: viewerId }, { user2Id: viewerId }] },
    select: {
      id: true,
      user1Id: true,
      user2Id: true,
      sourceType: true,
      sourceCardId: true,
      lastMessageAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, senderId: true, readAt: true, createdAt: true },
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });

  // 안읽음 수: 상대가 보냈고 아직 readAt 이 null 인 메시지 수
  const unreadRows = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: rows.map((r) => r.id) },
      senderId: { not: viewerId },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap = new Map<string, number>();
  for (const u of unreadRows) unreadMap.set(u.conversationId, u._count._all);

  const cardRefMap = await loadCardRefs(
    rows.map((r) => r.sourceCardId).filter((x): x is string => !!x)
  );
  const partnerIds = rows.map((r) => (r.user1Id === viewerId ? r.user2Id : r.user1Id));
  const partnerMap = await loadPartnerUsers(partnerIds);

  return rows
    .filter((r) => r.messages.length > 0 || r.sourceType !== "direct")
    .map((r) => {
      const last = r.messages[0];
      const cardRef = r.sourceCardId ? cardRefMap.get(r.sourceCardId) : undefined;
      const partnerId = r.user1Id === viewerId ? r.user2Id : r.user1Id;
      const sourceType =
        r.sourceType === "card_inquiry" || r.sourceType === "community_post"
          ? r.sourceType
          : "direct";
      return {
        id: r.id,
        partner: partnerView(partnerMap.get(partnerId), partnerId),
        lastMessage: last?.content ?? (cardRef ? `${cardRef.cardName} 문의` : ""),
        lastAt: r.lastMessageAt ?? last?.createdAt ?? null,
        unread: unreadMap.get(r.id) ?? 0,
        sourceType,
        cardRef,
      };
    });
}

/** 뷰어의 전체 안읽음 메시지 수 (헤더 뱃지용). */
export async function getUnreadCount(viewerId: string): Promise<number> {
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ user1Id: viewerId }, { user2Id: viewerId }] },
    select: { id: true },
  });
  if (convs.length === 0) return 0;
  return prisma.message.count({
    where: {
      conversationId: { in: convs.map((c) => c.id) },
      senderId: { not: viewerId },
      readAt: null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 대화 생성 / 조회
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 두 유저 간 대화를 찾거나 생성. unique [user1Id, user2Id] 정렬로 중복 방지.
 * 기존 대화가 있으면 sourceCard/Post 가 비어 있을 때만 보강.
 */
export async function getOrCreateConversation(
  userA: string,
  userB: string,
  opts?: {
    sourceType?: "direct" | "card_inquiry" | "community_post";
    cardId?: string | null;
    postId?: string | null;
  }
): Promise<{ id: string; created: boolean }> {
  const [user1Id, user2Id] = orderUserPair(userA, userB);
  const existing = await prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    select: { id: true, sourceCardId: true, sourcePostId: true },
  });
  if (existing) {
    // 기존 direct 대화에 카드/게시글 맥락이 새로 들어오면 보강 (덮어쓰지는 않음)
    const patch: { sourceCardId?: string; sourcePostId?: string } = {};
    if (opts?.cardId && !existing.sourceCardId) patch.sourceCardId = opts.cardId;
    if (opts?.postId && !existing.sourcePostId) patch.sourcePostId = opts.postId;
    if (Object.keys(patch).length > 0) {
      await prisma.conversation.update({ where: { id: existing.id }, data: patch });
    }
    return { id: existing.id, created: false };
  }
  const conv = await prisma.conversation.create({
    data: {
      user1Id,
      user2Id,
      sourceType: opts?.sourceType ?? "direct",
      sourceCardId: opts?.cardId ?? null,
      sourcePostId: opts?.postId ?? null,
    },
    select: { id: true },
  });
  return { id: conv.id, created: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 메시지 스레드 + 읽음 처리
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageView {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
  read: boolean;
  cardRef?: CardRefView;
  appointment?: { date: string; time: string; place: string };
  review?: { rating: number; manner: "good" | "bad"; comment: string };
}

export interface ThreadView {
  conversation: {
    id: string;
    partner: ConversationListItem["partner"];
    sourceType: "direct" | "card_inquiry" | "community_post";
    cardRef?: CardRefView;
  };
  messages: MessageView[];
}

/**
 * 대화 스레드 조회 + 읽음 처리(뷰어가 참여자일 때).
 * 뷰어가 참여자가 아니면 null. 읽음: ConversationRead upsert + 상대 메시지 readAt 갱신.
 */
export async function getMessages(
  conversationId: string,
  viewerId: string
): Promise<ThreadView | null> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      user1Id: true,
      user2Id: true,
      sourceType: true,
      sourceCardId: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          content: true,
          attachedCardId: true,
          appointmentId: true,
          reviewId: true,
          readAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conv) return null;
  if (conv.user1Id !== viewerId && conv.user2Id !== viewerId) return null;
  const partnerId = conv.user1Id === viewerId ? conv.user2Id : conv.user1Id;
  const partnerMap = await loadPartnerUsers([partnerId]);

  // 읽음 처리: 상대가 보낸 안읽음 메시지를 읽음으로
  const lastMsg = conv.messages[conv.messages.length - 1];
  await prisma.$transaction([
    prisma.message.updateMany({
      where: { conversationId, senderId: { not: viewerId }, readAt: null },
      data: { readAt: new Date() },
    }),
    prisma.conversationRead.upsert({
      where: { conversationId_userId: { conversationId, userId: viewerId } },
      create: { conversationId, userId: viewerId, lastReadMessageId: lastMsg?.id ?? null },
      update: { lastReadMessageId: lastMsg?.id ?? null },
    }),
  ]);

  // 부가 정보 로드: 카드 / 약속 / 후기
  const cardRefMap = await loadCardRefs([
    ...conv.messages.map((m) => m.attachedCardId).filter((x): x is string => !!x),
    ...(conv.sourceCardId ? [conv.sourceCardId] : []),
  ]);

  const aptIds = conv.messages.map((m) => m.appointmentId).filter((x): x is string => !!x);
  const reviewIds = conv.messages.map((m) => m.reviewId).filter((x): x is string => !!x);
  const [apts, reviews] = await Promise.all([
    aptIds.length
      ? prisma.appointment.findMany({ where: { id: { in: aptIds } } })
      : Promise.resolve([]),
    reviewIds.length
      ? prisma.review.findMany({ where: { id: { in: reviewIds } } })
      : Promise.resolve([]),
  ]);
  const aptMap = new Map(apts.map((a) => [a.id, a]));
  const reviewMap = new Map(reviews.map((r) => [r.id, r]));

  const sourceType =
    conv.sourceType === "card_inquiry" || conv.sourceType === "community_post"
      ? conv.sourceType
      : "direct";

  const messages: MessageView[] = conv.messages.map((m) => {
    const apt = m.appointmentId ? aptMap.get(m.appointmentId) : undefined;
    const rev = m.reviewId ? reviewMap.get(m.reviewId) : undefined;
    const aptDate = apt?.date;
    return {
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt,
      read: m.senderId === viewerId ? m.readAt != null : true,
      cardRef: m.attachedCardId ? cardRefMap.get(m.attachedCardId) : undefined,
      appointment: apt
        ? {
            date: aptDate ? aptDate.toISOString().slice(0, 10) : "",
            time: aptDate ? aptDate.toISOString().slice(11, 16) : "",
            place: apt.place,
          }
        : undefined,
      review: rev
        ? {
            rating: rev.rating,
            manner: rev.manner === "bad" ? "bad" : "good",
            comment: rev.comment ?? "",
          }
        : undefined,
    };
  });

  return {
    conversation: {
      id: conv.id,
      partner: partnerView(partnerMap.get(partnerId), partnerId),
      sourceType,
      cardRef: conv.sourceCardId ? cardRefMap.get(conv.sourceCardId) : undefined,
    },
    messages,
  };
}
