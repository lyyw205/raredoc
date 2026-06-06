"use client";

import Link from "next/link";
import { Card, Tag, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import type {
  ArchetypeWithCards,
  ArchetypeRecipe,
  RecipeCard,
  ArchetypeMatchup,
} from "@/lib/services/cardgame";
import { ArrowLeft, ExternalLink } from "lucide-react";

// ── 상수 ──────────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  S: "bg-red-100 text-red-700 border border-red-200",
  A: "bg-orange-100 text-orange-700 border border-orange-200",
  B: "bg-blue-100 text-blue-700 border border-blue-200",
  C: "bg-gray-100 text-gray-600 border border-gray-200",
};

// 우승 사례 (서버에서 사전 환산 — region 노출 안 함).
export type WinnerTournament = {
  id: string;
  nameKo: string;
  date: string;
  format: string;
  players: number;
};

// ── 레시피 카테고리 블록 (#16/#17) ────────────────────────────────────────────

const CATEGORY_LABEL: Record<keyof ArchetypeRecipe, string> = {
  pokemon: "포켓몬",
  trainer: "트레이너",
  energy: "에너지",
};

function RecipeRow({ card }: { card: RecipeCard }) {
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

function RecipeSection({ recipe }: { recipe: ArchetypeRecipe }) {
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
                <RecipeRow key={`${c.cardName}-${c.setCode}-${c.number}`} card={c} />
              ))}
            </div>
          </Card>
        );
      })}
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
  winnerTournaments,
}: {
  locale: string;
  archetype: ArchetypeWithCards;
  recipe: ArchetypeRecipe;
  matchups: ArchetypeMatchup[];
  winnerTournaments: WinnerTournament[];
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
        {/* 섹션 1: 표준 레시피 (#16/#17) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-toss-title font-bold text-toss-text-primary">표준 레시피</h2>
            <span className="text-toss-caption text-toss-text-tertiary">평균 채용 · 채용률</span>
          </div>
          <RecipeSection recipe={recipe} />
          <p className="text-toss-micro text-toss-text-quaternary mt-2">
            카드 이미지·시세는 매칭 작업 후 제공 예정 (준비 중).
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

        {/* 섹션 4: 우승 사례 (실데이터) */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">우승 사례</h2>
          {winnerTournaments.length === 0 ? (
            <EmptyState title="우승 기록이 없습니다" description="최근 집계 기간 내 이 덱의 대회 우승 기록이 없습니다." />
          ) : (
            <div className="space-y-2">
              {winnerTournaments.map((t) => (
                <Card key={t.id} variant="default" padding="md">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/${locale}/cardgame/tournaments/${t.id}`}
                          className="text-toss-label font-semibold text-toss-text-primary hover:text-toss-brand transition-colors"
                        >
                          {t.nameKo}
                        </Link>
                        <span className="text-toss-micro px-1.5 py-0.5 rounded bg-toss-bg-muted text-toss-text-tertiary">
                          {t.format}
                        </span>
                      </div>
                      <p className="text-toss-caption text-toss-text-tertiary">
                        {t.date} · 참가 {t.players}명
                      </p>
                    </div>
                    <Link
                      href={`/${locale}/cardgame/tournaments/${t.id}`}
                      className="flex items-center gap-1 text-toss-caption text-toss-brand hover:underline"
                    >
                      <ExternalLink size={12} />
                      대회 상세 →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 섹션 5: 가격/시세 — 카드 매칭 보류 → 준비중 */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">가격 / 시세</h2>
          <Card variant="default" padding="lg">
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <span className="text-toss-label font-semibold text-toss-text-secondary">준비 중</span>
              <p className="text-toss-caption text-toss-text-tertiary max-w-md">
                레시피 카드의 시세 매칭 작업이 진행 중입니다. 매칭이 완료되면 덱 구축 비용과
                카드별 시세가 여기에 표시됩니다.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
