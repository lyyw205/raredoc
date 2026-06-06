import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/toss";
import {
  getArchetype,
  getArchetypeRecipe,
  getArchetypeMatchups,
  getRealTournaments,
} from "@/lib/services/cardgame";
import {
  DeckDetailView,
  type WinnerTournament,
} from "./DeckDetailView";

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const archetype = await getArchetype(id);

  if (!archetype) {
    return (
      <div>
        <Link
          href={`/${locale}/cardgame/decks`}
          className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary mb-6"
        >
          <ArrowLeft size={14} />
          덱 목록으로
        </Link>
        <EmptyState
          title="덱을 찾을 수 없습니다"
          description="잘못된 덱 ID이거나 아직 등록되지 않은 덱입니다."
          action={
            <Link href={`/${locale}/cardgame/decks`} className="text-toss-brand text-toss-label">
              덱 목록 보기
            </Link>
          }
        />
      </div>
    );
  }

  const [recipe, matchups, tournaments] = await Promise.all([
    getArchetypeRecipe(id),
    getArchetypeMatchups(id),
    getRealTournaments(),
  ]);

  // 우승 사례: 이 덱이 우승한 실데이터 대회.
  const winnerTournaments: WinnerTournament[] = tournaments
    .filter((t) => t.winnerArchetypeId === archetype.id)
    .map((t) => ({
      id: t.id,
      nameKo: t.nameKo,
      date: t.date,
      format: t.format,
      players: t.players,
    }));

  return (
    <DeckDetailView
      locale={locale}
      archetype={archetype}
      recipe={recipe}
      matchups={matchups}
      winnerTournaments={winnerTournaments}
    />
  );
}
