"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDivider,
  DeltaBadge,
  ToggleGroup,
  EmptyState,
} from "@/components/toss";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import type { ArchetypeSummary, ResolvedCard } from "@/lib/services/cardgame";

// 메타 페이지 사용률 추이 + 카드 변동에 필요한 서버 사전 가공 데이터.
export type MetaTrend = {
  weeks: string[];
  series: { archetypeId: string; nameKo: string; points: Record<string, number> }[];
};
export type TrendCard = {
  id: string;
  nameKo: string;
  setNameKo: string;
  imageUrl: string;
  usageRate: number;
};

// ── 색상 팔레트 (아키타입별) ──────────────────────────────────────────────────

const ARCHETYPE_COLORS: Record<string, string> = {
  "mega-darkrai":  "#6366f1",
  "dragapult":     "#0ea5e9",
  "mega-lucario":  "#f59e0b",
  "kamichu-cobra": "#10b981",
  "slowking":      "#ec4899",
};

const TIER_COLORS: Record<string, string> = {
  S: "bg-red-100 text-red-700 border border-red-200",
  A: "bg-orange-100 text-orange-700 border border-orange-200",
  B: "bg-blue-100 text-blue-700 border border-blue-200",
  C: "bg-gray-100 text-gray-600 border border-gray-200",
};

// ── 필터 옵션 ─────────────────────────────────────────────────────────────────

const REGULATION_OPTIONS = [
  { value: "스탠다드",   label: "스탠다드"   },
  { value: "익스텐디드", label: "익스텐디드" },
  { value: "殿堂",       label: "殿堂"       },
] as const;

const REGION_OPTIONS = [
  { value: "KR", label: "한국" },
  { value: "JP", label: "일본" },
] as const;

const PERIOD_OPTIONS = [
  { value: "week",  label: "주" },
  { value: "month", label: "월" },
  { value: "all",   label: "전체" },
] as const;

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
            <p className="text-toss-micro text-toss-text-tertiary">CL 우승</p>
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

// ── Tier 리스트 섹션 ──────────────────────────────────────────────────────────

function TierListSection({ archetypes, locale }: { archetypes: ArchetypeSummary[]; locale: string }) {
  const tiers = ["S", "A", "B", "C"] as const;

  return (
    <div className="space-y-3">
      {tiers.map((tier) => {
        const items = archetypes.filter((a) => a.tier === tier);
        if (items.length === 0) return null;
        return (
          <div key={tier} className="flex items-start gap-4">
            <div
              className={cn(
                "shrink-0 w-8 h-8 rounded-toss-md flex items-center justify-center text-sm font-bold mt-0.5",
                TIER_COLORS[tier]
              )}
            >
              {tier}
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((archetype) => (
                <Link
                  key={archetype.id}
                  href={`/${locale}/cardgame/decks/${archetype.id}`}
                >
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-toss-md bg-toss-bg-muted hover:bg-toss-hover text-toss-label text-toss-text-primary transition-colors cursor-pointer border border-toss-divider">
                    {archetype.nameKo}
                    <span className="text-toss-micro text-toss-text-tertiary ml-1">
                      {archetype.usageRate}%
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 사용률 추이 차트 ──────────────────────────────────────────────────────────

function UsageTrendChart({ trend }: { trend: MetaTrend }) {
  const chartData = trend.weeks.map((week) => {
    const row: Record<string, string | number> = { week };
    trend.series.forEach((s) => {
      row[s.nameKo] = s.points[week] ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--toss-divider)" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "var(--toss-text-tertiary)" }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--toss-text-tertiary)" }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value, name) => [`${Number(value)}%`, String(name)]}
          contentStyle={{
            background: "var(--toss-bg-base)",
            border: "1px solid var(--toss-divider)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {trend.series.map((s) => (
          <Line
            key={s.archetypeId}
            type="monotone"
            dataKey={s.nameKo}
            stroke={ARCHETYPE_COLORS[s.archetypeId] ?? "#888"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── 상승/하락 카드 ─────────────────────────────────────────────────────────────

function TrendCards({ direction, cards }: { direction: "up" | "down"; cards: TrendCard[] }) {
  const list = [...cards]
    .filter((c) => c.usageRate > 0)
    .sort((a, b) =>
      direction === "up" ? b.usageRate - a.usageRate : a.usageRate - b.usageRate
    )
    .slice(0, 5);

  return (
    <div className="space-y-2">
      {list.map((card, i) => (
        <div key={card.id} className="flex items-center gap-3">
          <span className="w-5 text-toss-caption text-toss-text-quaternary text-right shrink-0">
            {i + 1}
          </span>
          <div className="w-8 h-[46px] rounded overflow-hidden bg-toss-bg-muted shrink-0">
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.nameKo} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-toss-caption font-semibold text-toss-text-primary truncate">
              {card.nameKo}
            </p>
            <p className="text-toss-micro text-toss-text-tertiary truncate">{card.setNameKo}</p>
          </div>
          <DeltaBadge
            percent={direction === "up" ? card.usageRate : -card.usageRate}
            mode="text"
            size="sm"
            decimals={0}
          />
        </div>
      ))}
    </div>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

export function MetaPageView({
  locale,
  archetypes,
  cards,
  trend,
  trendCards,
}: {
  locale: string;
  archetypes: ArchetypeSummary[];
  cards: Record<string, ResolvedCard>;
  trend: MetaTrend;
  trendCards: TrendCard[];
}) {
  const [regulation, setRegulation] = useState<string>("스탠다드");
  const [region, setRegion] = useState<string>("KR");
  const [period, setPeriod] = useState<string>("week");

  const filteredArchetypes = archetypes.filter((a) => a.regulation === regulation);

  const topArchetypes = filteredArchetypes.filter(
    (a) => a.tier === "S" || a.tier === "A"
  );

  return (
    <div className="space-y-10">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-toss-display font-bold text-toss-text-primary flex items-center gap-2">
          <Trophy size={24} className="text-toss-brand" />
          메타 현황
        </h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          현 시즌 대회 메타 분석 — 목업 데이터 기반
        </p>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-toss-bg-muted rounded-toss-lg">
        <div className="flex items-center gap-2">
          <span className="text-toss-caption text-toss-text-tertiary">레귤레이션</span>
          <ToggleGroup
            options={REGULATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={regulation}
            onChange={setRegulation}
            size="sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-toss-caption text-toss-text-tertiary">지역</span>
          <ToggleGroup
            options={REGION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={region}
            onChange={setRegion}
            size="sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-toss-caption text-toss-text-tertiary">기간</span>
          <ToggleGroup
            options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={period}
            onChange={setPeriod}
            size="sm"
          />
        </div>
      </div>

      {/* 섹션 1: 추천 덱 */}
      <section>
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">
          추천 덱
        </h2>
        {topArchetypes.length === 0 ? (
          <EmptyState title="해당 포맷의 덱 데이터가 없습니다" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topArchetypes.map((archetype) => (
              <DeckCard key={archetype.id} archetype={archetype} cards={cards} locale={locale} />
            ))}
          </div>
        )}
      </section>

      {/* 섹션 2: Tier 리스트 */}
      <section>
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">
          Tier 리스트
        </h2>
        {filteredArchetypes.length === 0 ? (
          <EmptyState title="해당 포맷의 티어 데이터가 없습니다" />
        ) : (
          <Card variant="default" padding="lg">
            <TierListSection archetypes={filteredArchetypes} locale={locale} />
          </Card>
        )}
      </section>

      {/* 섹션 3: 사용률 추이 + 카드 변동 */}
      <section>
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">
          사용률 추이 (최근 8주)
        </h2>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* 차트 */}
          <Card variant="default" padding="md">
            <UsageTrendChart trend={trend} />
          </Card>

          {/* 상승 / 하락 카드 */}
          <div className="space-y-4">
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-toss-label font-semibold text-toss-text-primary">
                  상승 카드 TOP 5
                </span>
              </div>
              <TrendCards direction="up" cards={trendCards} />
            </Card>
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-red-500" />
                <span className="text-toss-label font-semibold text-toss-text-primary">
                  하락 카드 TOP 5
                </span>
              </div>
              <TrendCards direction="down" cards={trendCards} />
            </Card>
          </div>
        </div>
      </section>

      <p className="text-toss-micro text-toss-text-quaternary text-center">
        모든 데이터는 목업입니다. 실제 대회 성적과 다를 수 있습니다.
      </p>
    </div>
  );
}
