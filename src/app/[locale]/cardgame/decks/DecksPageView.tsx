"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ToggleGroup, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import type { ArchetypeSummary } from "@/lib/services/cardgame";
import { deckLabel } from "@/lib/cardgame/archetype-ko";
import { BookOpen } from "lucide-react";
import { DeckIcon } from "@/components/cardgame/DeckIcon";
import { TierBadge } from "@/components/cardgame/TierBadge";
import { formatKrwShort } from "@/lib/format/krw";

// 표본 적음 임계값.
const LOW_SAMPLE = 10;

type SortKey = "usage" | "winRate" | "conversion" | "avgRank" | "consistency" | "cost";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "usage",       label: "사용률"  },
  { value: "winRate",     label: "승률"    },
  { value: "conversion",  label: "입상률"  },
  { value: "avgRank",     label: "평균등수" },
  { value: "consistency", label: "안정성"  },
  { value: "cost",        label: "가격"    },
];

/** 견적(KRW) → "6.5만" 표기. null = 견적 전. */
function formatCost(krw: number | null): string {
  return formatKrwShort(krw, { suffix: "만", emptyDash: true });
}

const TIER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "S",   label: "S"   },
  { value: "A",   label: "A"   },
  { value: "B",   label: "B"   },
  { value: "C",   label: "C"   },
];

// 뱃지 (#9 언더독 / #10 인기함정 / #14 메타카운터).
function DeckBadges({ a }: { a: ArchetypeSummary }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {a.isUnderdog && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">🌱 언더독</span>
      )}
      {a.isTrap && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">⚠️ 인기함정</span>
      )}
      {a.isMetaCounter && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">🛡 메타카운터</span>
      )}
    </span>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

export function DecksPageView({
  locale,
  archetypes,
}: {
  locale: string;
  archetypes: ArchetypeSummary[];
}) {
  const [sortBy, setSortBy] = useState<SortKey>("usage");
  const [tierFilter, setTierFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = [...archetypes];
    if (tierFilter !== "all") list = list.filter((a) => a.tier === tierFilter);

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "winRate":
          return b.winRate - a.winRate;
        case "conversion":
          return b.conversion - a.conversion;
        case "avgRank":
          return a.avgRank - b.avgRank; // 낮을수록 좋음
        case "consistency":
          return b.consistency - a.consistency;
        case "cost":
          // 저렴한 순 ("싸고 센 덱" 발견) — 견적 없는 덱은 뒤로
          return (a.deckCostBudget ?? Infinity) - (b.deckCostBudget ?? Infinity);
        case "usage":
        default:
          return b.usageRate - a.usageRate;
      }
    });
  }, [archetypes, sortBy, tierFilter]);

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary flex items-center gap-2">
          <BookOpen size={24} className="text-toss-brand" />
          덱 아카이브
        </h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          Limitless 대회 데이터 기반 덱 일람 (최근 14일)
        </p>
      </div>

      {/* 필터 바 (가격대/지역 없음) */}
      <div className="space-y-3 p-4 bg-toss-bg-muted rounded-toss-lg mb-6">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-toss-caption text-toss-text-tertiary shrink-0">정렬</span>
            <ToggleGroup options={SORT_OPTIONS} value={sortBy} onChange={(v) => setSortBy(v as SortKey)} size="sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-toss-caption text-toss-text-tertiary shrink-0">티어</span>
            <ToggleGroup options={TIER_OPTIONS} value={tierFilter} onChange={setTierFilter} size="sm" />
          </div>
        </div>
      </div>

      {/* 결과 카운트 */}
      <p className="text-toss-caption text-toss-text-tertiary mb-4">{filtered.length}개 덱</p>

      {/* 덱 테이블 */}
      {filtered.length === 0 ? (
        <EmptyState title="해당 조건의 덱이 없습니다" description="필터를 변경해보세요." />
      ) : (
        <div className="overflow-x-auto rounded-toss-lg border border-toss-divider">
          <table className="w-full text-toss-caption">
            <thead>
              <tr className="text-left border-b border-toss-divider bg-toss-bg-muted">
                <th className="py-3 px-3 font-semibold text-toss-text-tertiary">덱</th>
                <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-center w-12">티어</th>
                <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-right">사용률</th>
                <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-right">승률</th>
                <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-right">입상률</th>
                <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-right">평균등수</th>
                <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-right">안정성</th>
                <th className="py-3 px-3 font-semibold text-toss-text-tertiary text-right" title="저레어 기준 덱 구축 비용(시세 합산 추정)">
                  💰가격
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const lowSample = a.sampleSize < LOW_SAMPLE;
                return (
                  <tr key={a.id} className="border-b border-toss-divider last:border-0 hover:bg-toss-hover transition-colors">
                    <td className="py-3 px-3">
                      <Link href={`/${locale}/cardgame/decks/${a.id}`} className="group flex items-center gap-2.5">
                        <DeckIcon iconKeys={a.iconKeys} size="md" />
                        <span className="min-w-0">
                          <span className="font-semibold text-toss-text-primary group-hover:text-toss-brand transition-colors">
                            {deckLabel(a, a.id)}
                          </span>
                          <span className="flex items-center gap-1.5 mt-1">
                            <DeckBadges a={a} />
                            {lowSample && (
                              <span className="text-[10px] text-toss-text-quaternary">표본 {a.sampleSize} (적음)</span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <TierBadge tier={a.tier} size="sm" />
                    </td>
                    <td className={cn("py-3 px-3 text-right tabular-nums", lowSample ? "text-toss-text-quaternary" : "text-toss-text-primary font-semibold")}>
                      {a.usageRate.toFixed(1)}%
                    </td>
                    <td className={cn("py-3 px-3 text-right tabular-nums", lowSample ? "text-toss-text-quaternary" : "text-toss-text-secondary")}>
                      {a.winRate.toFixed(1)}%
                    </td>
                    <td className={cn("py-3 px-3 text-right tabular-nums", lowSample ? "text-toss-text-quaternary" : "text-toss-text-secondary")}>
                      {a.conversion.toFixed(1)}%
                    </td>
                    <td className={cn("py-3 px-3 text-right tabular-nums", lowSample ? "text-toss-text-quaternary" : "text-toss-text-secondary")}>
                      {a.avgRank.toFixed(1)}위
                    </td>
                    <td className={cn("py-3 px-3 text-right tabular-nums", lowSample ? "text-toss-text-quaternary" : "text-toss-text-secondary")}>
                      {a.consistency.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-toss-text-primary">
                      {formatCost(a.deckCostBudget)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-toss-micro text-toss-text-quaternary text-center mt-10">
        Limitless TCG 공식 대회 데이터 집계. 표본이 적은 덱은 회색으로 표시됩니다.
      </p>
    </div>
  );
}
