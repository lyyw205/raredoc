"use client";

import Link from "next/link";
import { Card, Tag, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import type {
  ArchetypeSummary,
  ArchetypeRecipe,
  RecipeSlot,
  RecipeCategory,
  ArchetypeMatchup,
  ArchetypeResultRow,
} from "@/lib/services/cardgame";
import { ArrowLeft, Trophy, List } from "lucide-react";
import { DeckIcon } from "@/components/cardgame/DeckIcon";
import { CardThumb } from "@/components/cardgame/CardThumb";
import { TierBadge } from "@/components/cardgame/TierBadge";
import { DeckCostWidget } from "./DeckCostWidget";
import type { DeckCostResult } from "@/lib/services/deck-pricing";
import { formatKrwShort } from "@/lib/format/krw";

/** 슬롯 💰 단가 범위 — "1,200원 ~ 4.8만". 단일가면 1개만. 시세 없으면 null. */
function priceRangeLabel(min: number | null, max: number | null): string | null {
  if (min == null) return null;
  const lo = formatKrwShort(min, { suffix: "만" });
  return max == null || max === min ? lo : `${lo} ~ ${formatKrwShort(max, { suffix: "만" })}`;
}

// ── 레시피 카테고리 블록 (#16/#17) ────────────────────────────────────────────

const CATEGORY_LABEL: Record<RecipeCategory, string> = {
  pokemon: "포켓몬",
  trainer: "트레이너",
  energy: "에너지",
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as RecipeCategory[];

function totalSlots(byCat: Record<RecipeCategory, RecipeSlot[]>): number {
  return CATEGORIES.reduce((s, c) => s + byCat[c].length, 0);
}

// 통합 슬롯 1행(=한 플레이 카드, 인쇄판 통합) — 썸네일 + 장수/채용률 + 버전 배지 + 💰 시세 힌트(준비 중).
function SlotRow({
  slot,
  locale,
  emphasis,
}: {
  slot: RecipeSlot;
  locale: string;
  emphasis: "count" | "rate";
}) {
  const thumb = <CardThumb src={slot.cardImage} alt={slot.cardName} className="w-9 shrink-0" />;
  const top = slot.printings[0];
  const price = priceRangeLabel(slot.priceMin, slot.priceMax);
  const printingInfo =
    slot.printingCount > 1 ? `인쇄판 ${slot.printingCount}종` : [top?.setCode, top?.number].filter(Boolean).join(" ");
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-toss-md",
        slot.isHero && "bg-amber-50 ring-1 ring-amber-200"
      )}
    >
      {slot.regionCardId ? (
        <Link href={`/${locale}/cards/${slot.regionCardId}`} className="shrink-0 hover:opacity-90">
          {thumb}
        </Link>
      ) : (
        thumb
      )}
      <span className="text-toss-caption font-bold text-toss-text-primary w-9 text-right shrink-0 tabular-nums">
        ×{slot.count}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-toss-caption font-semibold text-toss-text-primary truncate">{slot.cardName}</p>
          {slot.printingCount > 1 && (
            <span className="shrink-0 text-[10px] font-medium px-1 py-0.5 rounded bg-toss-bg-muted text-toss-text-tertiary">
              {slot.printingCount}버전
            </span>
          )}
        </div>
        <p className="text-toss-micro text-toss-text-tertiary truncate">
          {price && <span className="font-medium text-amber-600">💰 {price}</span>}
          {price && printingInfo && <span className="text-toss-text-quaternary"> · </span>}
          {printingInfo}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {slot.isHero && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">⭐ 핵심</span>
        )}
        <span
          className={cn(
            "text-right tabular-nums w-12",
            emphasis === "rate"
              ? "text-toss-caption font-bold text-toss-text-secondary"
              : "text-toss-micro text-toss-text-tertiary"
          )}
        >
          {slot.adoptionRate}%
        </span>
      </div>
    </div>
  );
}

// 카테고리 소그룹(포켓몬/트레이너/에너지) — 코어·플렉스 공용.
function CatGroups({
  byCat,
  locale,
  emphasis,
}: {
  byCat: Record<RecipeCategory, RecipeSlot[]>;
  locale: string;
  emphasis: "count" | "rate";
}) {
  const cats = CATEGORIES.filter((c) => byCat[c].length > 0);
  return (
    <div className="space-y-3">
      {cats.map((cat) => {
        const slots = byCat[cat];
        const total = Math.round(slots.reduce((s, c) => s + c.count, 0) * 10) / 10;
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-toss-micro font-semibold text-toss-text-tertiary">{CATEGORY_LABEL[cat]}</p>
              <span className="text-toss-micro text-toss-text-quaternary">
                {slots.length}종 · 평균 {total}장
              </span>
            </div>
            <div className="space-y-1">
              {slots.map((s) => (
                <SlotRow key={`${cat}-${s.cardName}`} slot={s} locale={locale} emphasis={emphasis} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 표준 레시피 = 코어 스켈레톤 + 플렉스 슬롯(카테고리별) + 마이너(접기) — deck-recipe-variants-plan.
function RecipeSection({ recipe, locale }: { recipe: ArchetypeRecipe; locale: string }) {
  const coreCount = totalSlots(recipe.core);
  const flexCount = totalSlots(recipe.flex);
  if (coreCount === 0 && flexCount === 0 && recipe.minor.length === 0) {
    return <EmptyState title="레시피 데이터가 없습니다" description="이 덱의 표준 레시피가 아직 집계되지 않았습니다." />;
  }
  return (
    <div className="space-y-4">
      {coreCount > 0 && (
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-toss-label font-semibold text-toss-text-primary flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" /> 코어
            </p>
            <span className="text-toss-caption text-toss-text-tertiary">거의 모든 덱 채용 · 고정</span>
          </div>
          <CatGroups byCat={recipe.core} locale={locale} emphasis="count" />
        </Card>
      )}
      {flexCount > 0 && (
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-toss-label font-semibold text-toss-text-primary flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" /> 플렉스 슬롯
            </p>
            <span className="text-toss-caption text-toss-text-tertiary">유저마다 갈리는 선택 · 채용률</span>
          </div>
          <CatGroups byCat={recipe.flex} locale={locale} emphasis="rate" />
        </Card>
      )}
      {recipe.minor.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary px-1 py-2">
            마이너 채용 카드 {recipe.minor.length}종 (채용률 &lt;12%){" "}
            <span className="inline-block transition-transform group-open:rotate-180">▾</span>
          </summary>
          <Card variant="default" padding="md" className="mt-2">
            <div className="space-y-1">
              {recipe.minor.map((s) => (
                <SlotRow key={`minor-${s.category}-${s.cardName}`} slot={s} locale={locale} emphasis="rate" />
              ))}
            </div>
          </Card>
        </details>
      )}
    </div>
  );
}

// ── 핵심 카드 그리드 (UI-1a — 벤치마크 "Core Cards: 최빈 장수 + 채용률%" 패턴) ──

function CoreCardsSection({ recipe, locale }: { recipe: ArchetypeRecipe; locale: string }) {
  const all = [...recipe.core.pokemon, ...recipe.core.trainer, ...recipe.flex.pokemon];
  const picks = all
    .filter((s) => (s.isHero || s.tier === "core") && s.cardImage)
    .sort((a, b) => (a.isHero === b.isHero ? b.adoptionRate - a.adoptionRate : a.isHero ? -1 : 1))
    .slice(0, 8);
  if (picks.length === 0) return null;
  return (
    <section>
      <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">핵심 카드</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {picks.map((s) => (
          <Link
            key={`${s.category}-${s.cardName}`}
            href={s.regionCardId ? `/${locale}/cards/${s.regionCardId}` : "#"}
            className="block hover:opacity-90 transition-opacity"
          >
            <CardThumb src={s.cardImage} alt={s.cardName} count={Math.round(s.count)} />
            <p className="mt-1 text-toss-micro text-toss-text-tertiary text-center truncate">
              {s.adoptionRate}% 채용
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
  archetype: ArchetypeSummary;
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
          <TierBadge tier={archetype.tier} />
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
            <span className="text-toss-caption text-toss-text-tertiary">플레이 카드 단위 · 인쇄판 통합</span>
          </div>
          <RecipeSection recipe={recipe} locale={locale} />
          <p className="text-toss-micro text-toss-text-quaternary mt-2">
            최근 14일 입상 덱리스트 집계 · 성능이 같은 인쇄판은 한 슬롯으로 통합(채용률은 덱리스트 기준 정확 집계). 코어=거의 고정, 플렉스=유저마다 갈리는 선택. 💰=인쇄판별 장당 시세(저가판~고가판) · 버전 선택은 카드 상세에서.
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
