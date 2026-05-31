import { getTournaments, getPlayerRankings } from "@/lib/services/cardgame";
import { TournamentsPageView } from "./TournamentsPageView";

export default async function CardgameTournamentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [tournaments, playerRankings] = await Promise.all([
    getTournaments(),
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
