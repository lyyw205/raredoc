import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/toss";
import {
  getArchetype,
  getArchetypeRecipe,
  getArchetypeMatchups,
  getArchetypeResults,
} from "@/lib/services/cardgame";
import { computeDeckCost } from "@/lib/services/deck-pricing";
import { DeckDetailView } from "./DeckDetailView";

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

  const [recipe, matchups, results, cost] = await Promise.all([
    getArchetypeRecipe(id),
    getArchetypeMatchups(id),
    // 최근 입상 리스트 (UI-1a) — 우승 사례 섹션을 흡수 통합
    getArchetypeResults(id, 12),
    // 견적 (UI-1b) — budget/premium 동시 계산, 토글은 클라 스왑. 실패해도 페이지는 살림.
    computeDeckCost(id).catch(() => null),
  ]);

  return (
    <DeckDetailView
      locale={locale}
      archetype={archetype}
      recipe={recipe}
      matchups={matchups}
      results={results}
      cost={cost}
    />
  );
}
