"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDivider,
  ToggleGroup,
  EmptyState,
} from "@/components/toss";
import { cn } from "@/lib/utils";
import type { ArchetypeSummary, ResolvedCard } from "@/lib/services/cardgame";
import { BookOpen } from "lucide-react";

// ── 색상 상수 ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  S: "bg-red-100 text-red-700 border border-red-200",
  A: "bg-orange-100 text-orange-700 border border-orange-200",
  B: "bg-blue-100 text-blue-700 border border-blue-200",
  C: "bg-gray-100 text-gray-600 border border-gray-200",
};

// ── 필터 옵션 ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "usage",  label: "사용률↓"  },
  { value: "wins",   label: "우승횟수↓" },
  { value: "new",    label: "신규↓"    },
];

const TIER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "S",   label: "S"   },
  { value: "A",   label: "A"   },
  { value: "B",   label: "B"   },
  { value: "C",   label: "C"   },
];

const REGULATION_OPTIONS = [
  { value: "all",       label: "전체"      },
  { value: "스탠다드",   label: "스탠다드"   },
  { value: "익스텐디드", label: "익스텐디드" },
  { value: "殿堂",       label: "殿堂"      },
];

const PRICE_OPTIONS = [
  { value: "all",  label: "전체" },
  { value: "low",  label: "낮음" },
  { value: "mid",  label: "중간" },
  { value: "high", label: "높음" },
];

// ── 덱 카드 컴포넌트 ──────────────────────────────────────────────────────────

function DeckCard({
  archetype,
  cards,
  locale,
}: {
  archetype: ArchetypeSummary;
  cards: Record<string, ResolvedCard>;
  locale: string;
}) {
  const heroCards = archetype.heroCardIds.slice(0, 4).map((id) => cards[id]).filter(Boolean);

  return (
    <Link href={`/${locale}/cardgame/decks/${archetype.id}`} className="block">
      <Card variant="interactive" padding="md" className="h-full">
        <CardHeader className="mb-3">
          <CardTitle className="text-toss-title font-bold text-toss-text-primary">
            {archetype.nameKo}
          </CardTitle>
          <span
            className={cn(
              "inline-flex items-center justify-center w-7 h-7 rounded-toss-md text-sm font-bold shrink-0",
              TIER_COLORS[archetype.tier]
            )}
          >
            {archetype.tier}
          </span>
        </CardHeader>

        {/* 핵심 카드 썸네일 */}
        <div className="flex gap-2 mb-3">
          {heroCards.map((card) => (
            <div
              key={card.id}
              className="flex-1 aspect-[5/7] rounded-toss-md overflow-hidden bg-toss-bg-muted"
            >
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.nameKo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-toss-micro text-toss-text-quaternary">{card.nameKo}</span>
                </div>
              )}
            </div>
          ))}
          {heroCards.length === 0 && (
            <div className="flex-1 h-20 rounded-toss-md bg-toss-bg-muted flex items-center justify-center">
              <span className="text-toss-caption text-toss-text-quaternary">이미지 없음</span>
            </div>
          )}
        </div>

        <CardDivider />

        <div className="flex items-center gap-4 mt-3">
          <div className="flex-1">
            <p className="text-toss-micro text-toss-text-tertiary">사용률</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">
              {archetype.usageRate}%
            </p>
          </div>
          <div className="flex-1">
            <p className="text-toss-micro text-toss-text-tertiary">우승</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">
              {archetype.winCount}회
            </p>
          </div>
          <div className="flex-1">
            <p className="text-toss-micro text-toss-text-tertiary">평균 등수</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">
              {archetype.avgRank.toFixed(1)}위
            </p>
          </div>
        </div>

        <p className="text-toss-micro text-toss-brand mt-3 font-medium">
          덱 상세 보기 →
        </p>
      </Card>
    </Link>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

export function DecksPageView({
  locale,
  archetypes,
  cards,
}: {
  locale: string;
  archetypes: ArchetypeSummary[];
  cards: Record<string, ResolvedCard>;
}) {
  const [sortBy, setSortBy] = useState("usage");
  const [tierFilter, setTierFilter] = useState("all");
  const [regulationFilter, setRegulationFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = [...archetypes];

    if (tierFilter !== "all") {
      list = list.filter((a) => a.tier === tierFilter);
    }

    if (regulationFilter !== "all") {
      list = list.filter((a) => a.regulation === regulationFilter);
    }

    // 가격대 필터 — 덱 총가 mock: 사용률 높을수록 고가로 가정
    if (priceFilter === "low") {
      list = list.filter((a) => a.usageRate < 10);
    } else if (priceFilter === "mid") {
      list = list.filter((a) => a.usageRate >= 10 && a.usageRate < 20);
    } else if (priceFilter === "high") {
      list = list.filter((a) => a.usageRate >= 20);
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "usage":
          return b.usageRate - a.usageRate;
        case "wins":
          return b.winCount - a.winCount;
        case "new":
          return a.id.localeCompare(b.id);
        default:
          return 0;
      }
    });
  }, [archetypes, sortBy, tierFilter, regulationFilter, priceFilter]);

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary flex items-center gap-2">
          <BookOpen size={24} className="text-toss-brand" />
          덱 아카이브
        </h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          현 시즌 추천 메타 덱 일람 — 목업 데이터 기반
        </p>
      </div>

      {/* 필터 바 */}
      <div className="space-y-3 p-4 bg-toss-bg-muted rounded-toss-lg mb-6">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-toss-caption text-toss-text-tertiary shrink-0">정렬</span>
            <ToggleGroup
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={setSortBy}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-toss-caption text-toss-text-tertiary shrink-0">티어</span>
            <ToggleGroup
              options={TIER_OPTIONS}
              value={tierFilter}
              onChange={setTierFilter}
              size="sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-toss-caption text-toss-text-tertiary shrink-0">레귤레이션</span>
            <ToggleGroup
              options={REGULATION_OPTIONS}
              value={regulationFilter}
              onChange={setRegulationFilter}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-toss-caption text-toss-text-tertiary shrink-0">가격대</span>
            <ToggleGroup
              options={PRICE_OPTIONS}
              value={priceFilter}
              onChange={setPriceFilter}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 결과 카운트 */}
      <p className="text-toss-caption text-toss-text-tertiary mb-4">
        {filtered.length}개 덱
      </p>

      {/* 덱 그리드 */}
      {filtered.length === 0 ? (
        <EmptyState title="해당 조건의 덱이 없습니다" description="필터를 변경해보세요." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((archetype) => (
            <DeckCard key={archetype.id} archetype={archetype} cards={cards} locale={locale} />
          ))}
        </div>
      )}

      <p className="text-toss-micro text-toss-text-quaternary text-center mt-10">
        모든 데이터는 목업입니다. 실제 대회 성적과 다를 수 있습니다.
      </p>
    </div>
  );
}
