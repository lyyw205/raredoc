import { getArchetypes, resolveDeckCardMap } from "@/lib/services/cardgame";
import { DecksPageView } from "./DecksPageView";

export default async function CardgameDecksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const archetypes = await getArchetypes();
  const cards = await resolveDeckCardMap(archetypes.flatMap((a) => a.heroCardIds));

  return <DecksPageView locale={locale} archetypes={archetypes} cards={cards} />;
}
