import { getArchetypes } from "@/lib/services/cardgame";
import { DecksPageView } from "./DecksPageView";

// 덱 리스트 — Limitless 실데이터(sampleSize>0)만. 카드 매칭 보류라 썸네일 없음(tier 뱃지 폴백).
export default async function CardgameDecksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const archetypes = await getArchetypes({ realOnly: true });

  return <DecksPageView locale={locale} archetypes={archetypes} />;
}
