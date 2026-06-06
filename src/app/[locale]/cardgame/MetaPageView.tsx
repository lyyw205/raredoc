"use client";

import Link from "next/link";
import {
  Card,
  CardDivider,
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
import { Trophy, TrendingUp, TrendingDown, Flame } from "lucide-react";
import type {
  ArchetypeSummary,
  RisingDeck,
} from "@/lib/services/cardgame";

// 메타 페이지 사용률 추이 차트용 서버 사전 가공 데이터.
export type MetaTrend = {
  weeks: string[];
  series: { archetypeId: string; nameKo: string; points: Record<string, number> }[];
};
export type RisingResult = {
  rising: RisingDeck[];
  falling: RisingDeck[];
  hasTrend: boolean;
};

// ── 색상 ──────────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  S: "bg-red-100 text-red-700 border border-red-200",
  A: "bg-orange-100 text-orange-700 border border-orange-200",
  B: "bg-blue-100 text-blue-700 border border-blue-200",
  C: "bg-gray-100 text-gray-600 border border-gray-200",
};

// 라인 차트 색상 팔레트 (archetypeId 미지정 시 인덱스로 순환).
const CHART_PALETTE = [
  "#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6",
];

// 덱명 표시 — 한글명 없으면 nameEn 폴백.
function deckLabel(a: { nameKo: string; nameEn: string | null }): string {
  return a.nameKo || a.nameEn || "";
}

// ── 급상승 히어로 (#23) ────────────────────────────────────────────────────────

function RisingHero({ rising, locale }: { rising: RisingResult; locale: string }) {
  const list = rising.rising.slice(0, 5);
  if (list.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Flame size={20} className="text-orange-500" />
        <h2 className="text-toss-title font-bold text-toss-text-primary">
          {rising.hasTrend ? "해외에서 뜨는 덱" : "해외 주목 덱"}
        </h2>
        <span className="text-toss-micro text-toss-text-quaternary">
          {rising.hasTrend ? "최근 사용률 급상승" : "사용률 상위 (추이 데이터 누적 중)"}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {list.map((d, i) => (
          <Link key={d.id} href={`/${locale}/cardgame/decks/${d.id}`}>
            <Card variant="interactive" padding="md" className="h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-toss-micro text-toss-text-quaternary">#{i + 1}</span>
                {rising.hasTrend && d.delta !== 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      d.delta > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    )}
                  >
                    {d.delta > 0 ? "▲" : "▼"}{Math.abs(d.delta)}%p
                  </span>
                )}
              </div>
              <p className="text-toss-label font-bold text-toss-text-primary truncate">{d.nameKo}</p>
              <p className="text-toss-micro text-toss-text-tertiary mt-1">사용률 {d.usageRate.toFixed(1)}%</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── 티어표 (#2) ────────────────────────────────────────────────────────────────

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
              {items.map((a) => (
                <Link key={a.id} href={`/${locale}/cardgame/decks/${a.id}`}>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-toss-md bg-toss-bg-muted hover:bg-toss-hover text-toss-label text-toss-text-primary transition-colors cursor-pointer border border-toss-divider">
                    {deckLabel(a)}
                    <span className="text-toss-micro text-toss-text-tertiary ml-1">
                      {a.usageRate.toFixed(1)}%
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

// ── 인기덱 랭킹 (#1) — 사용률 바 ───────────────────────────────────────────────

function UsageRanking({ archetypes, locale }: { archetypes: ArchetypeSummary[]; locale: string }) {
  const list = [...archetypes].sort((a, b) => b.usageRate - a.usageRate).slice(0, 12);
  const max = list[0]?.usageRate || 1;
  return (
    <div className="space-y-2">
      {list.map((a, i) => (
        <Link
          key={a.id}
          href={`/${locale}/cardgame/decks/${a.id}`}
          className="flex items-center gap-3 group"
        >
          <span className="w-5 text-toss-caption text-toss-text-quaternary text-right shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-toss-caption font-semibold text-toss-text-primary truncate group-hover:text-toss-brand transition-colors">
                {deckLabel(a)}
              </span>
              <span className="text-toss-micro text-toss-text-tertiary shrink-0 ml-2">
                {a.usageRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-toss-bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-toss-brand"
                style={{ width: `${Math.max(4, (a.usageRate / max) * 100)}%` }}
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── 사용률 추이 차트 (#3) ──────────────────────────────────────────────────────

function UsageTrendChart({ trend }: { trend: MetaTrend }) {
  // 주차 정렬 + 너무 많은 시리즈 방지(상위 8개).
  const series = trend.series.slice(0, 8);
  const chartData = trend.weeks.map((week) => {
    const row: Record<string, string | number> = { week };
    series.forEach((s) => {
      row[s.nameKo] = s.points[week] ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--toss-divider)" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--toss-text-tertiary)" }} />
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
        {series.map((s, i) => (
          <Line
            key={s.archetypeId}
            type="monotone"
            dataKey={s.nameKo}
            stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── 급상승/급하락 리스트 (#4) ──────────────────────────────────────────────────

function DeltaList({ direction, items, locale }: { direction: "up" | "down"; items: RisingDeck[]; locale: string }) {
  if (items.length === 0) {
    return <p className="text-toss-micro text-toss-text-quaternary">데이터 없음</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((d, i) => (
        <Link key={d.id} href={`/${locale}/cardgame/decks/${d.id}`} className="flex items-center gap-3 group">
          <span className="w-4 text-toss-micro text-toss-text-quaternary text-right shrink-0">{i + 1}</span>
          <span className="flex-1 min-w-0 text-toss-caption font-semibold text-toss-text-primary truncate group-hover:text-toss-brand transition-colors">
            {d.nameKo}
          </span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
              direction === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
            )}
          >
            {direction === "up" ? "▲" : "▼"}{Math.abs(d.delta)}%p
          </span>
        </Link>
      ))}
    </div>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

export function MetaPageView({
  locale,
  archetypes,
  trend,
  rising,
  tournamentCount,
}: {
  locale: string;
  archetypes: ArchetypeSummary[];
  trend: MetaTrend;
  rising: RisingResult;
  tournamentCount: number;
}) {
  return (
    <div className="space-y-10">
      {/* 헤더 */}
      <div>
        <h1 className="text-toss-display font-bold text-toss-text-primary flex items-center gap-2">
          <Trophy size={24} className="text-toss-brand" />
          메타 현황
        </h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          Limitless 대회 데이터 기반 (최근 14일, {tournamentCount}개 대회)
        </p>
        <p className="text-toss-micro text-toss-text-quaternary mt-1">
          덱 분류는 제출 데클리스트 기반 Limitless 자동 판정 · 주로 온라인(PTCG Live) 대회
        </p>
      </div>

      {/* #23 해외 뜨는 덱 — 최상단 히어로 */}
      <RisingHero rising={rising} locale={locale} />

      {/* #2 티어표 */}
      <section>
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">Tier 리스트</h2>
        {archetypes.length === 0 ? (
          <EmptyState title="티어 데이터가 없습니다" />
        ) : (
          <Card variant="default" padding="lg">
            <TierListSection archetypes={archetypes} locale={locale} />
          </Card>
        )}
      </section>

      {/* #1 인기덱 랭킹 */}
      <section>
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">인기 덱 랭킹</h2>
        {archetypes.length === 0 ? (
          <EmptyState title="덱 데이터가 없습니다" />
        ) : (
          <Card variant="default" padding="lg">
            <UsageRanking archetypes={archetypes} locale={locale} />
          </Card>
        )}
      </section>

      {/* #3 사용률 추이 + #4 급상승/급하락 */}
      <section>
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">사용률 추이</h2>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <Card variant="default" padding="md">
            {trend.series.length === 0 ? (
              <EmptyState title="추이 데이터 누적 중" description="주차별 비교가 가능해지면 표시됩니다." />
            ) : (
              <UsageTrendChart trend={trend} />
            )}
          </Card>

          <div className="space-y-4">
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-toss-label font-semibold text-toss-text-primary">급상승 TOP 5</span>
              </div>
              <DeltaList direction="up" items={rising.hasTrend ? rising.rising : []} locale={locale} />
              {!rising.hasTrend && (
                <p className="text-toss-micro text-toss-text-quaternary">주차 데이터 누적 중</p>
              )}
            </Card>
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-red-500" />
                <span className="text-toss-label font-semibold text-toss-text-primary">급하락 TOP 5</span>
              </div>
              <DeltaList direction="down" items={rising.hasTrend ? rising.falling : []} locale={locale} />
              {!rising.hasTrend && (
                <p className="text-toss-micro text-toss-text-quaternary">주차 데이터 누적 중</p>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* #20 메타 필수 카드 / #25 신팩 메타덱 — 카드 매칭 보류 → 준비중 */}
      <section>
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">메타 필수 카드 · 신팩 메타덱</h2>
        <Card variant="default" padding="lg">
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <span className="text-toss-label font-semibold text-toss-text-secondary">카드 데이터 준비 중</span>
            <p className="text-toss-caption text-toss-text-tertiary max-w-md">
              덱 레시피의 카드 이미지·시세 매칭 작업이 진행 중입니다. 매칭이 완료되면 메타 필수
              카드와 신팩 포함 덱이 여기에 표시됩니다.
            </p>
          </div>
        </Card>
      </section>

      <CardDivider />
      <p className="text-toss-micro text-toss-text-quaternary text-center">
        Limitless TCG 공식 대회 데이터 집계. 국제(영문권) 대회 위주이며 실제 지역 메타와 다를 수 있습니다.
      </p>
    </div>
  );
}
