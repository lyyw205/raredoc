import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/toss";
import { getArchetype, getArchetypes, getTournaments } from "@/lib/services/cardgame";
import {
  DeckDetailView,
  type WinnerTournament,
  type CounterArchetype,
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

  // 우승 사례: 이 덱이 우승한 완료 대회
  const completed = await getTournaments({ status: "completed" });
  const winnerTournaments: WinnerTournament[] = completed
    .filter((t) => t.winnerArchetypeId === archetype.id)
    .map((t) => ({
      id: t.id,
      nameKo: t.nameKo,
      date: t.date,
      region: t.region,
      format: t.format,
      players: t.players,
    }));

  // 카운터 덱: counters id → 덱 이름/티어 환산
  const all = await getArchetypes();
  const counterArchetypes: CounterArchetype[] = archetype.counters
    .map((cid) => all.find((a) => a.id === cid))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ id: a.id, nameKo: a.nameKo, tier: a.tier }));

  return (
    <DeckDetailView
      locale={locale}
      archetype={archetype}
      winnerTournaments={winnerTournaments}
      counterArchetypes={counterArchetypes}
    />
  );
}
