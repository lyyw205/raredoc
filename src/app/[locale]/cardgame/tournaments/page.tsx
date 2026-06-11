import { getRealTournaments, getPlayerRankings } from "@/lib/services/cardgame";
import { TournamentsPageView } from "./TournamentsPageView";

// 대회 리스트 — 정본 소스(source) 있는 실데이터만. region 노출 안 함.
export default async function CardgameTournamentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [tournaments, playerRankings] = await Promise.all([
    getRealTournaments(),
    getPlayerRankings(2026),
  ]);

  return (
    <TournamentsPageView
      locale={locale}
      tournaments={tournaments}
      playerRankings={playerRankings}
    />
  );
}
