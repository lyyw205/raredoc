import { getRulings, getGlossary, resolveDeckCardMap } from "@/lib/services/cardgame";
import { GuidePageView } from "./GuidePageView";

// 스타터덱 썸네일에 쓰는 mock 카드 id (BeginnerTab STARTER_DECKS 와 일치)
const STARTER_CARD_IDS = ["m5-118", "m5-120", "sv3pt5-215"];

export default async function CardgameGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [rulings, glossary, starterCards] = await Promise.all([
    getRulings(),
    getGlossary("ko"),
    resolveDeckCardMap(STARTER_CARD_IDS),
  ]);

  return (
    <GuidePageView
      locale={locale}
      rulings={rulings}
      glossary={glossary}
      starterCards={starterCards}
    />
  );
}
