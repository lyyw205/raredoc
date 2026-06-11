"use client";

import Link from "next/link";
import { Card, Tag, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import type {
  ArchetypeWithCards,
  ArchetypeRecipe,
  RecipeCard,
  ArchetypeMatchup,
  ArchetypeResultRow,
} from "@/lib/services/cardgame";
import { ArrowLeft, Trophy, List } from "lucide-react";
import { DeckIcon } from "@/components/cardgame/DeckIcon";
import { CardThumb } from "@/components/cardgame/CardThumb";
import { DeckCostWidget } from "./DeckCostWidget";
import type { DeckCostResult } from "@/lib/services/deck-pricing";

// ── 상수 ──────────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  S: "bg-red-100 text-red-700 border border-red-200",
  A: "bg-orange-100 text-orange-700 border border-orange-200",
  B: "bg-blue-100 text-blue-700 border border-blue-200",
  C: "bg-gray-100 text-gray-600 border border-gray-200",
};

// ── 레시피 카테고리 블록 (#16/#17) ────────────────────────────────────────────

const CATEGORY_LABEL: Record<keyof ArchetypeRecipe, string> = {
  pokemon: "포켓몬",
  trainer: "트레이너",
  energy: "에너지",
};

function RecipeRow({ card, locale }: { card: RecipeCard; locale: string }) {
  const thumb = <CardThumb src={card.cardImage} alt={card.cardName} className="w-9 shrink-0" />;
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-toss-md",
        card.isHero
          ? "bg-amber-50 ring-1 ring-amber-200"
          : card.isCore
          ? "bg-toss-bg-muted"
          : card.isTech
          ? "opacity-70"
          : ""
      )}
    >
      {card.regionCardId ? (
        <Link href={`/${locale}/cards/${card.regionCardId}`} className="shrink-0 hover:opacity-90">
          {thumb}
        </Link>
      ) : (
        thumb
      )}
      <span className="text-toss-caption font-bold text-toss-text-primary w-9 text-right shrink-0 tabular-nums">
        ×{card.avgCount}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-toss-caption font-semibold text-toss-text-primary truncate">{card.cardName}</p>
        <p className="text-toss-micro text-toss-text-tertiary truncate">
          {[card.setCode, card.number].filter(Boolean).join(" ")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {card.isHero && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">⭐ 핵심</span>
        )}
        {card.isCore && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">코어</span>
        )}
        {card.isTech && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">테크</span>
        )}
        <span className="text-toss-micro text-toss-text-tertiary w-12 text-right tabular-nums">
          {card.adoptionRate}%
        </span>
      </div>
    </div>
  );
}

function RecipeSection({ recipe, locale }: { recipe: ArchetypeRecipe; locale: string }) {
  const groups = (Object.keys(CATEGORY_LABEL) as (keyof ArchetypeRecipe)[]).filter(
    (k) => recipe[k].length > 0
  );
  if (groups.length === 0) {
    return <EmptyState title="레시피 데이터가 없습니다" description="이 덱의 표준 레시피가 아직 집계되지 않았습니다." />;
  }
  return (
    <div className="space-y-4">
      {groups.map((cat) => {
        const cards = recipe[cat];
        const total = Math.round(cards.reduce((s, c) => s + c.avgCount, 0) * 10) / 10;
        return (
          <Card key={cat} variant="default" padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-toss-label font-semibold text-toss-text-primary">{CATEGORY_LABEL[cat]}</p>
              <span className="text-toss-caption text-toss-text-tertiary">평균 {total}장</span>
            </div>
            <div className="space-y-1">
              {cards.map((c) => (
                <RecipeRow key={`${c.cardName}-${c.setCode}-${c.number}`} card={c} locale={locale} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── 핵심 카드 그리드 (UI-1a — 벤치마크 "Core Cards: 최빈 장수 + 채용률%" 패턴) ──

function CoreCardsSection({ recipe, locale }: { recipe: ArchetypeRecipe; locale: string }) {
  const all = [...recipe.pokemon, ...recipe.trainer];
  const picks = all
    .filter((c) => (c.isHero || c.isCore) && c.cardImage)
    .sort((a, b) => (a.isHero === b.isHero ? b.adoptionRate - a.adoptionRate : a.isHero ? -1 : 1))
    .slice(0, 8);
  if (picks.length === 0) return null;
  return (
    <section>
      <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">핵심 카드</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {picks.map((c) => (
          <Link
            key={`${c.cardName}-${c.setCode}-${c.number}`}
            href={c.regionCardId ? `/${locale}/cards/${c.regionCardId}` : "#"}
            className="block hover:opacity-90 transition-opacity"
          >
            <CardThumb src={c.cardImage} alt={c.cardName} count={Math.round(c.avgCount)} />
            <p className="mt-1 text-toss-micro text-toss-text-tertiary text-center truncate">
              {c.adoptionRate}% 채용
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── 최근 입상 리스트 타임라인 (UI-1a — 대회 컨텍스트 보존 + 리스트 뷰어 진입) ──

function ResultsTimeline({ results, locale }: { results: ArchetypeResultRow[]; locale: string }) {
  if (results.length === 0) {
    return <EmptyState title="입상 기록이 없습니다" description="최근 집계 기간 내 이 덱의 입상 기록이 없습니다." />;
  }
  return (
    <div className="space-y-1.5">
      {results.map((r) => (
        <div
          key={r.standingId}
          className="flex items-center gap-3 p-2.5 rounded-toss-md hover:bg-toss-hover transition-colors"
        >
          <span
            className={cn(
              "inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold shrink-0",
              r.placing === 1
                ? "bg-yellow-100 text-yellow-700"
                : r.placing <= 4
                ? "bg-toss-bg-muted text-toss-text-secondary"
                : "bg-toss-bg-muted text-toss-text-quaternary"
            )}
          >
            {r.placing === 1 ? <Trophy size={13} /> : r.placing}
          </span>
          <div className="flex-1 min-w-0">
            <Link
              href={`/${locale}/cardgame/tournaments/${r.tournamentId}`}
              className="text-toss-caption font-semibold text-toss-text-primary hover:text-toss-brand transition-colors truncate block"
            >
              {r.tournamentName}
            </Link>
            <p className="text-toss-micro text-toss-text-tertiary">
              {r.date} · {r.playerName} · {r.players}명
            </p>
          </div>
          {r.hasDecklist && (
            <Link
              href={`/${locale}/cardgame/lists/${r.standingId}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-toss-bg-muted text-toss-micro font-medium text-toss-text-tertiary hover:text-toss-brand transition-colors shrink-0"
            >
              <List size={11} />
              리스트
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 상성 (#13) ─────────────────────────────────────────────────────────────────

function MatchupRow({ m, locale }: { m: ArchetypeMatchup; locale: string }) {
  return (
    <Link
      href={`/${locale}/cardgame/decks/${m.opponentId}`}
      className="flex items-center gap-3 p-2 rounded-toss-md hover:bg-toss-hover transition-colors group"
    >
      <span className="flex-1 min-w-0 text-toss-caption font-semibold text-toss-text-primary truncate group-hover:text-toss-brand transition-colors">
        {m.opponentNameKo}
      </span>
      {m.lowSample && (
        <span className="text-[10px] text-toss-text-quaternary shrink-0">표본부족</span>
      )}
      <span className="text-toss-micro text-toss-text-tertiary shrink-0">{m.games}판</span>
      <span
        className={cn(
          "text-toss-caption font-bold w-12 text-right tabular-nums shrink-0",
          m.winRate >= 55 ? "text-green-600" : m.winRate <= 45 ? "text-red-500" : "text-toss-text-secondary"
        )}
      >
        {m.winRate}%
      </span>
    </Link>
  );
}

function MatchupSection({ matchups, locale }: { matchups: ArchetypeMatchup[]; locale: string }) {
  if (matchups.length === 0) {
    return <EmptyState title="상성 데이터가 없습니다" description="이 덱의 대전 기록이 아직 충분하지 않습니다." />;
  }
  const favorable = matchups.slice(0, 3); // winRate 내림차순 정렬됨
  const unfavorable = [...matchups].reverse().slice(0, 3);

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card variant="default" padding="md">
        <p className="text-toss-label font-semibold text-green-700 mb-2">유리한 상대 Top 3</p>
        <div className="space-y-1">
          {favorable.map((m) => (
            <MatchupRow key={m.opponentId} m={m} locale={locale} />
          ))}
        </div>
      </Card>
      <Card variant="default" padding="md">
        <p className="text-toss-label font-semibold text-red-600 mb-2">불리한 상대 Top 3</p>
        <div className="space-y-1">
          {unfavorable.map((m) => (
            <MatchupRow key={m.opponentId} m={m} locale={locale} />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

export function DeckDetailView({
  locale,
  archetype,
  recipe,
  matchups,
  results,
  cost,
}: {
  locale: string;
  archetype: ArchetypeWithCards;
  recipe: ArchetypeRecipe;
  matchups: ArchetypeMatchup[];
  results: ArchetypeResultRow[];
  cost: DeckCostResult | null;
}) {
  const lowSample = archetype.sampleSize < 10;
  const title = archetype.nameKo || archetype.nameEn || archetype.id;

  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href={`/${locale}/cardgame/decks`}
        className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary mb-6"
      >
        <ArrowLeft size={14} />
        덱 목록으로
      </Link>

      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <DeckIcon iconKeys={archetype.iconKeys} size="lg" />
          <h1 className="text-toss-display font-bold text-toss-text-primary">{title}</h1>
          <span
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-toss-md text-sm font-bold shrink-0",
              TIER_COLORS[archetype.tier]
            )}
          >
            {archetype.tier}
          </span>
          {archetype.isMetaCounter && (
            <span className="text-[11px] font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-700">
              🛡 메타카운터
            </span>
          )}
          {archetype.isUnderdog && (
            <span className="text-[11px] font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
              🌱 언더독
            </span>
          )}
          {archetype.isTrap && (
            <span className="text-[11px] font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-700">
              ⚠️ 인기함정
            </span>
          )}
        </div>
        {archetype.nameEn && archetype.nameKo && archetype.nameEn !== archetype.nameKo && (
          <p className="text-toss-caption text-toss-text-tertiary mb-3">{archetype.nameEn}</p>
        )}

        <div className="flex items-center gap-6 flex-wrap mb-4">
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">사용률</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.usageRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">승률</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.winRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">입상률</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.conversion.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">평균 등수</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.avgRank.toFixed(1)}위</p>
          </div>
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">안정성</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.consistency.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">표본</p>
            <p className={cn("text-toss-label font-semibold", lowSample ? "text-toss-text-quaternary" : "text-toss-text-primary")}>
              {archetype.sampleSize}{lowSample ? " (적음)" : ""}
            </p>
          </div>
        </div>

        {archetype.description && (
          <p className="text-toss-body text-toss-text-secondary">{archetype.description}</p>
        )}
      </div>

      <div className="space-y-8">
        {/* 섹션 -1: 💰 견적 (UI-1b — 저레어/고레어 프리캐시 토글) */}
        {cost && cost.pricedCount > 0 && <DeckCostWidget cost={cost} />}

        {/* 섹션 0: 핵심 카드 (UI-1a) */}
        <CoreCardsSection recipe={recipe} locale={locale} />

        {/* 섹션 1: 표준 레시피 (#16/#17) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-toss-title font-bold text-toss-text-primary">표준 레시피</h2>
            <span className="text-toss-caption text-toss-text-tertiary">평균 채용 · 채용률</span>
          </div>
          <RecipeSection recipe={recipe} locale={locale} />
          <p className="text-toss-micro text-toss-text-quaternary mt-2">
            입상 덱리스트 집계 기준 평균 레시피입니다. 카드별 시세는 준비 중.
          </p>
        </section>

        {/* 섹션 2: 상성 (#13) */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">상성</h2>
          <MatchupSection matchups={matchups} locale={locale} />
        </section>

        {/* 섹션 3: 강점/약점 (편집 자산 있을 때만) */}
        {(archetype.strengths.length > 0 || archetype.weaknesses.length > 0) && (
          <section>
            <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">플레이 가이드</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {archetype.strengths.length > 0 && (
                <Card variant="default" padding="md">
                  <p className="text-toss-label font-semibold text-green-700 mb-2">강점</p>
                  <div className="flex flex-wrap gap-1.5">
                    {archetype.strengths.map((s) => (
                      <Tag key={s} color="positive" shape="soft">{s}</Tag>
                    ))}
                  </div>
                </Card>
              )}
              {archetype.weaknesses.length > 0 && (
                <Card variant="default" padding="md">
                  <p className="text-toss-label font-semibold text-red-600 mb-2">약점</p>
                  <div className="flex flex-wrap gap-1.5">
                    {archetype.weaknesses.map((w) => (
                      <Tag key={w} color="negative" shape="soft">{w}</Tag>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* 섹션 4: 최근 입상 리스트 (UI-1a — 우승 사례 흡수 통합) */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">최근 입상 리스트</h2>
          <Card variant="default" padding="md">
            <ResultsTimeline results={results} locale={locale} />
          </Card>
        </section>

        {/* 가격/시세 placeholder 는 견적 위젯(상단)으로 대체 — 견적 불가 덱만 안내 유지 */}
        {(!cost || cost.pricedCount === 0) && (
          <section>
            <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">가격 / 시세</h2>
            <Card variant="default" padding="lg">
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <span className="text-toss-label font-semibold text-toss-text-secondary">견적 준비 중</span>
                <p className="text-toss-caption text-toss-text-tertiary max-w-md">
                  이 덱의 카드 시세가 아직 충분히 수집되지 않았어요. 시세 수집 범위가 늘어나면
                  자동으로 표시됩니다.
                </p>
              </div>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
