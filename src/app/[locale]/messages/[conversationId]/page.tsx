import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageThread, type Message } from "@/components/messages/MessageThread";
import type { Conversation } from "@/components/messages/MessageInbox";
import { prisma } from "@/lib/prisma";
import { searchCards } from "@/lib/api/pokemontcg";

// ── 목업 데이터 (추후 API/DB로 교체) ─────────────────────────────────────────

const MOCK_CONVERSATIONS: Record<string, Conversation> = {
  c1: {
    id: "c1",
    partner: { username: "raymond_tcg", displayName: "raymond_tcg", initial: "레" },
    lastMessage: "주말에 강남 직거래 가능한가요?",
    lastAt: "5분 전",
    unread: 2,
    sourceType: "community_post",
    cardRef: {
      cardId: "sv3pt5-215",
      cardName: "피카츄 ex SAR",
      imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png",
      setName: "포켓몬 151",
    },
  },
  c2: {
    id: "c2",
    partner: { username: "chaeyeon", displayName: "채연", initial: "채" },
    lastMessage: "PSA 10 리자몽 정말 부럽네요 ㅠㅠ",
    lastAt: "1시간 전",
    unread: 0,
    sourceType: "direct",
  },
  c3: {
    id: "c3",
    partner: { username: "boxseller_k", displayName: "박상자", initial: "박" },
    lastMessage: "드래고나 풀박스 아직 있어요?",
    lastAt: "어제",
    unread: 1,
    sourceType: "community_post",
    cardRef: {
      cardId: "sv4pt5-box",
      cardName: "파라다이스 드래고나 풀박스",
      imageUrl: "https://images.pokemontcg.io/sv4pt5/logo.png",
      setName: "파라다이스 드래고나",
    },
  },
  c4: {
    id: "c4",
    partner: { username: "sneaker_jin", displayName: "진스니커", initial: "진" },
    lastMessage: "사카이 콜라보 응모 결과 나왔어요?",
    lastAt: "2일 전",
    unread: 0,
    sourceType: "direct",
  },
  c5: {
    id: "c5",
    partner: { username: "nari_collect", displayName: "나리", initial: "나" },
    lastMessage: "151 SAR 풀셋 가격이 얼마나 됐어요?",
    lastAt: "3일 전",
    unread: 0,
    sourceType: "card_inquiry",
    cardRef: {
      cardId: "sv3pt5-198",
      cardName: "이상해꽃 ex SAR",
      imageUrl: "https://images.pokemontcg.io/sv3pt5/198_hires.png",
      setName: "포켓몬 151",
    },
  },
};

const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    {
      id: "m1",
      senderId: "raymond_tcg",
      content: "안녕하세요! 직거래 글 보고 연락드립니다. 피카츄 ex SAR 아직 판매하시나요?",
      createdAt: "10:23",
      read: true,
    },
    {
      id: "m2",
      senderId: "me",
      content: "네, 아직 있습니다! 상태는 NM이고 PSA 미감정이에요. 직접 보시면 더 좋을 것 같아요.",
      createdAt: "10:31",
      read: true,
    },
    {
      id: "m3",
      senderId: "raymond_tcg",
      content: "가격 혹시 23만원 아래로 협의 가능할까요? 22만에 가능하신가요?",
      createdAt: "10:35",
      read: true,
    },
    {
      id: "m4",
      senderId: "me",
      content: "22.5만원에 하시죠 ㅎㅎ 서울 어느 지역이세요?",
      createdAt: "10:40",
      read: true,
    },
    {
      id: "m5",
      senderId: "raymond_tcg",
      content: "강남 쪽입니다! 주말에 직거래 가능한가요?",
      createdAt: "10:42",
      read: false,
    },
    {
      id: "m6",
      senderId: "raymond_tcg",
      content: "토요일 오후가 제일 좋은데 시간 괜찮으실까요?",
      createdAt: "10:43",
      read: false,
    },
  ],
  c2: [
    {
      id: "m1",
      senderId: "chaeyeon",
      content: "안녕하세요! 커뮤니티에서 컬렉션 보고 팔로우했어요. PSA 10 리자몽 정말 부럽네요 ㅠㅠ",
      createdAt: "09:15",
      read: true,
    },
    {
      id: "m2",
      senderId: "me",
      content: "감사합니다 ㅎㅎ 8개월 기다린 보람 있었어요. 채연님 컬렉션도 엄청나던데요!",
      createdAt: "09:22",
      read: true,
    },
    {
      id: "m3",
      senderId: "chaeyeon",
      content: "PSA 10 리자몽 정말 부럽네요 ㅠㅠ 저도 언젠가는...",
      createdAt: "09:30",
      read: true,
    },
  ],
  c3: [
    {
      id: "m1",
      senderId: "me",
      content: "안녕하세요! 직거래 글에서 드래고나 풀박스 보고 연락드렸어요. 아직 있나요?",
      createdAt: "어제 14:20",
      read: true,
    },
    {
      id: "m2",
      senderId: "boxseller_k",
      content: "네, 아직 있습니다! 미개봉 상태 그대로예요.",
      createdAt: "어제 15:01",
      read: false,
    },
  ],
  c4: [
    {
      id: "m1",
      senderId: "sneaker_jin",
      content: "나이키 X 사카이 응모 하셨나요? 저는 오늘 결과 기다리는 중이에요",
      createdAt: "2일 전",
      read: true,
    },
    {
      id: "m2",
      senderId: "me",
      content: "저도 응모했는데 아직 결과가 안 왔어요. 사카이 콜라보 응모 결과 나왔어요?",
      createdAt: "2일 전",
      read: true,
    },
  ],
  c5: [
    {
      id: "m1",
      senderId: "nari_collect",
      content: "안녕하세요! 프로필에서 이상해꽃 SAR 보고 연락드렸어요. 혹시 판매 생각 있으신가요?",
      createdAt: "3일 전",
      read: true,
    },
    {
      id: "m2",
      senderId: "me",
      content: "아직 판매 계획은 없는데, 가격이 맞으면 고민해볼 수 있을 것 같아요. 얼마 생각하세요?",
      createdAt: "3일 전",
      read: true,
    },
    {
      id: "m3",
      senderId: "nari_collect",
      content: "151 SAR 풀셋 가격이 얼마나 됐어요?",
      createdAt: "3일 전",
      read: true,
    },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}): Promise<Metadata> {
  const { conversationId } = await params;
  const conv = MOCK_CONVERSATIONS[conversationId];
  if (!conv) return {};
  return { title: `${conv.partner.displayName}와의 대화 — Raredoc` };
}

async function getCardRef(cardId: string) {
  const dbCard = await prisma.card
    .findUnique({ where: { id: cardId }, include: { set: true } })
    .catch(() => null);
  if (dbCard) {
    return {
      cardId: dbCard.id,
      cardName: dbCard.nameKo ?? dbCard.name,
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
  params: Promise<{ conversationId: string }>;
  searchParams?: Promise<{ cardId?: string }>;
}) {
  const { conversationId } = await params;
  const sp = (await searchParams) ?? {};
  const conversation = MOCK_CONVERSATIONS[conversationId];
  const messages = MOCK_MESSAGES[conversationId];

  if (!conversation || !messages) notFound();

  const prefilledCardRef = sp.cardId ? (await getCardRef(sp.cardId)) ?? undefined : undefined;

  return (
    <MessageThread
      conversation={conversation}
      messages={messages}
      myUserId="me"
      prefilledCardRef={prefilledCardRef}
    />
  );
}
