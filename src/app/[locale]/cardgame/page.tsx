import {
  getArchetypes,
  getArchetypeTrends,
  getRisingDecks,
  getRealTournaments,
} from "@/lib/services/cardgame";
import { MetaPageView } from "./MetaPageView";

// 메타 현황 — Limitless 실데이터(sampleSize>0) 기반.
// 카드 매칭 보류(A단계)라 heroCardIds 빈 배열 → 화면은 tier 뱃지/덱명 폴백.
export default async function CardgameMetaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [archetypes, trend, rising, tournaments] = await Promise.all([
    getArchetypes({ realOnly: true }),
    getArchetypeTrends(),
    getRisingDecks(5),
    getRealTournaments(),
  ]);

  return (
    <MetaPageView
      locale={locale}
      archetypes={archetypes}
      trend={trend}
      rising={rising}
      tournamentCount={tournaments.length}
    />
  );
}
