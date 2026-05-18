import type { Metadata } from "next";
import { MessageInbox, type Conversation } from "@/components/messages/MessageInbox";

export const metadata: Metadata = { title: "메세지 — Raredoc" };

const MOCK_CONVERSATIONS: Conversation[] = [
  {
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
  {
    id: "c2",
    partner: { username: "chaeyeon", displayName: "채연", initial: "채" },
    lastMessage: "PSA 10 리자몽 정말 부럽네요 ㅠㅠ",
    lastAt: "1시간 전",
    unread: 0,
    sourceType: "direct",
  },
  {
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
  {
    id: "c4",
    partner: { username: "sneaker_jin", displayName: "진스니커", initial: "진" },
    lastMessage: "사카이 콜라보 응모 결과 나왔어요?",
    lastAt: "2일 전",
    unread: 0,
    sourceType: "direct",
  },
  {
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
];

export default function MessagesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <MessageInbox conversations={MOCK_CONVERSATIONS} />
    </div>
  );
}
