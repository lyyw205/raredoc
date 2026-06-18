import {
  getRecommendedDecksWithCards,
  getRecentWinnerDecklists,
} from "@/lib/services/cardgame";
import { DecksPageView } from "./DecksPageView";

// 덱 페이지 — 2탭(메타 통계 / 최근 1위 덱). 모두 Limitless 실데이터.
export default async function CardgameDecksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [recommended, winners] = await Promise.all([
    getRecommendedDecksWithCards(12, 8),
    getRecentWinnerDecklists(6),
  ]);

  return <DecksPageView locale={locale} recommended={recommended} winners={winners} />;
}
