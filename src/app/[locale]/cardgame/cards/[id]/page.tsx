import { redirect } from "next/navigation";
import { MOCK_TO_REAL, REAL_TO_MOCK } from "@/lib/cardgame/mockToReal";

// 카드게임 카드 상세는 실데이터 통합 페이지 `/cards/[cardId]` 로 일원화되었다.
// 들어오는 id 는 mock id 또는 실제 pokemontcg id(DeckCard.cardId).
//   - mock id 이고 실제 매핑이 있으면 → 실제 카드 상세
//   - 이미 실제 id 면(REAL_TO_MOCK 에 존재) → 그대로 실제 카드 상세
//   - 그 외(가상 카드) → 카드 탭 목록으로 폴백
export default async function CardgameCardRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const real = MOCK_TO_REAL[id] ?? (REAL_TO_MOCK[id] ? id : undefined);
  redirect(real ? `/${locale}/cards/${real}` : `/${locale}/cardgame/cards`);
}
