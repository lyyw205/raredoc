import { getArchetypes, getArchetypeTrends, resolveDeckCardMap } from "@/lib/services/cardgame";
import { CARDS } from "@/lib/cardgame/mock";
import { MOCK_TO_REAL } from "@/lib/cardgame/mockToReal";
import { prisma } from "@/lib/prisma";
import { MetaPageView, type TrendCard } from "./MetaPageView";

// 모든 레귤레이션 덱 + 사용률 추이를 DB 에서 읽어 클라이언트 뷰로 전달한다.
// 상승/하락 카드 TOP5 는 카드별 사용률(mock 메타 지표)을 그대로 사용한다.
export default async function CardgameMetaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [archetypes, trend] = await Promise.all([
    getArchetypes(),
    getArchetypeTrends(),
  ]);

  // 추천덱 썸네일용 카드 맵 — 모든 archetype heroCardIds 해석 (DB → mock 폴백)
  const cards = await resolveDeckCardMap(archetypes.flatMap((a) => a.heroCardIds));

  // 카드 변동(상승/하락) — 카드 사용률 지표는 mock CARDS 에만 존재(시세 외 표시용, DB 미보유).
  // 표시 데이터(name/image/setName)는 DB CardLocale 로 enrich, 미발견 시 mock 폴백.
  const mockTrend = Object.values(CARDS).filter((c) => (c.usageRate ?? 0) > 0);
  const trendRealIds = mockTrend.map((c) => MOCK_TO_REAL[c.id] ?? c.id);
  const trendLocales = trendRealIds.length
    ? await prisma.cardLocale.findMany({
        where: { id: { in: Array.from(new Set(trendRealIds)) } },
        include: { set: true, logicalCard: { include: { rarity: true } } },
      })
    : [];
  const trendByRealId = new Map(trendLocales.map((l) => [l.id, l]));
  const trendCards: TrendCard[] = mockTrend.map((c) => {
    const realId = MOCK_TO_REAL[c.id] ?? c.id;
    const db = trendByRealId.get(realId);
    return {
      id: c.id,
      nameKo: db?.name ?? c.nameKo,
      setNameKo: db ? (db.set.nameKo ?? db.set.name) : c.setNameKo,
      imageUrl: db?.imageSmall ?? db?.imageLarge ?? c.imageUrl,
      usageRate: c.usageRate ?? 0,
    };
  });

  return (
    <MetaPageView
      locale={locale}
      archetypes={archetypes}
      cards={cards}
      trend={trend}
      trendCards={trendCards}
    />
  );
}
