import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { MessageThread, type Message } from "@/components/messages/MessageThread";
import type { Conversation } from "@/components/messages/MessageInbox";
import { getCurrentUser } from "@/lib/auth/session";
import { getMessages, type CardRefView } from "@/lib/services/messaging";
import { formatMessageTime } from "@/lib/messaging/format";
import { prisma } from "@/lib/prisma";
import { searchCards } from "@/lib/api/pokemontcg";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "대화 — Raredoc" };
}

/** searchParams.cardId → 답장 첨부용 CardRef (DB-first + pokemontcg.io fallback). */
async function getCardRef(cardId: string): Promise<CardRefView | null> {
  // Phase 4: prisma.card → prisma.cardLocale. CardLocale.id == 기존 Card.id 호환.
  const dbCard = await prisma.cardLocale
    .findUnique({ where: { id: cardId }, include: { set: true } })
    .catch(() => null);
  if (dbCard) {
    return {
      cardId: dbCard.id,
      cardName: dbCard.name,
      setName: dbCard.set.nameKo ?? dbCard.set.name,
      imageUrl: dbCard.imageSmall ?? "",
    };
  }
  try {
    const res = await searchCards(`id:${cardId}`, 1);
    const c = res.data[0];
    if (!c) return null;
    return {
      cardId: c.id,
      cardName: c.name,
      setName: c.set.name,
      imageUrl: c.images.small,
    };
  } catch {
    return null;
  }
}

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string; locale: string }>;
  searchParams?: Promise<{ cardId?: string }>;
}) {
  const { conversationId, locale } = await params;
  const sp = (await searchParams) ?? {};

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const thread = await getMessages(conversationId, user.id);
  if (!thread) notFound();

  const conversation: Conversation = {
    id: thread.conversation.id,
    partner: {
      username: thread.conversation.partner.username ?? thread.conversation.partner.id,
      displayName: thread.conversation.partner.displayName,
      initial: thread.conversation.partner.initial,
    },
    lastMessage: "",
    lastAt: "",
    unread: 0,
    sourceType: thread.conversation.sourceType,
    cardRef: thread.conversation.cardRef,
  };

  const messages: Message[] = thread.messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    content: m.content,
    createdAt: formatMessageTime(m.createdAt),
    read: m.read,
    cardRef: m.cardRef,
    appointment: m.appointment,
    review: m.review,
  }));

  const prefilledCardRef = sp.cardId ? (await getCardRef(sp.cardId)) ?? undefined : undefined;

  return (
    <MessageThread
      conversation={conversation}
      messages={messages}
      myUserId={user.id}
      prefilledCardRef={prefilledCardRef}
    />
  );
}
