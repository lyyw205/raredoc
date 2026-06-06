"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardDivider, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import type { TournamentRow, PlayerRankingRow } from "@/lib/services/cardgame";
import { platformBadge } from "@/lib/cardgame/platform";
import { Trophy, Users, ChevronRight } from "lucide-react";

// ── 대회 카드 (region 노출 안 함) ──────────────────────────────────────────────

function TournamentCard({ t, locale }: { t: TournamentRow; locale: string }) {
  return (
    <Link href={`/${locale}/cardgame/tournaments/${t.id}`} className="block">
      <Card variant="interactive" padding="md" className="h-full">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-toss-label font-bold text-toss-text-primary truncate">{t.nameKo}</p>
            {t.name && t.name !== t.nameKo && (
              <p className="text-toss-micro text-toss-text-quaternary truncate">{t.name}</p>
            )}
            <p className="text-toss-micro text-toss-text-tertiary mt-0.5">{t.date}</p>
          </div>
          <ChevronRight size={16} className="text-toss-text-quaternary shrink-0 mt-0.5" />
        </div>

        <CardDivider />

        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-toss-text-tertiary" />
            <span className="text-toss-caption text-toss-text-secondary">{t.players}명</span>
          </div>
          {t.level && LEVEL_LABELS[t.level] && (
            <span className="text-toss-micro px-1.5 py-0.5 rounded bg-toss-bg-muted text-toss-text-tertiary font-medium">
              {LEVEL_LABELS[t.level]}
            </span>
          )}
          <span className="text-toss-micro text-toss-text-tertiary">{t.format}</span>
          {(() => {
            const b = platformBadge(t.platform);
            return (
              <span
                className={cn(
                  "text-toss-micro px-1.5 py-0.5 rounded font-medium",
                  b.online
                    ? "bg-blue-50 text-blue-600"
                    : "bg-amber-50 text-amber-700"
                )}
                title={b.sub ?? undefined}
              >
                {b.emoji} {b.label}
              </span>
            );
          })()}
        </div>

        {t.winnerArchetypeId && t.winnerNameKo && (
          <div className="mt-2">
            <p className="text-toss-micro text-toss-text-tertiary mb-1">우승 덱</p>
            <span className="inline-flex items-center gap-1 text-toss-caption text-toss-brand font-medium">
              {t.winnerNameKo}
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

// level → 필터 라벨 (multisource P3: 대회 격 필터 — 데이터에 존재하는 level 만 노출)
const LEVEL_LABELS: Record<string, string> = {
  online: "온라인",
  league: "코리안리그",
  city: "시티리그",
  cl: "챔피언스리그",
  regional: "리저널",
  ic: "인터내셔널",
  worlds: "월즈",
  special: "스페셜",
};

export function TournamentsPageView({
  locale,
  tournaments,
  playerRankings,
}: {
  locale: string;
  tournaments: TournamentRow[];
  playerRankings: PlayerRankingRow[];
}) {
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const levels = useMemo(() => {
    const set = new Set<string>();
    for (const t of tournaments) if (t.level) set.add(t.level);
    // LEVEL_LABELS 선언 순서대로 정렬
    return Object.keys(LEVEL_LABELS).filter((k) => set.has(k));
  }, [tournaments]);

  const sorted = useMemo(
    () =>
      [...tournaments]
        .filter((t) => levelFilter === "all" || t.level === levelFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [tournaments, levelFilter]
  );

  // 월별 그룹화 (YYYY-MM).
  const byMonth = useMemo(() => {
    const map: Record<string, TournamentRow[]> = {};
    sorted.forEach((t) => {
      const month = t.date.slice(0, 7);
      if (!map[month]) map[month] = [];
      map[month].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [sorted]);

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary flex items-center gap-2">
          <Trophy size={24} className="text-toss-brand" />
          대회
        </h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          대회 결과 ({sorted.length}개 대회)
        </p>
      </div>

      {/* level 필터 — 데이터에 존재하는 격만 노출 */}
      {levels.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {["all", ...levels].map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLevelFilter(lv)}
              className={cn(
                "px-3 py-1.5 rounded-full text-toss-caption font-semibold transition-colors",
                levelFilter === lv
                  ? "bg-toss-text-primary text-white"
                  : "bg-toss-bg-muted text-toss-text-tertiary hover:text-toss-text-primary"
              )}
            >
              {lv === "all" ? "전체" : LEVEL_LABELS[lv]}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-10">
        {/* 최근 대회 카드 그리드 */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">최근 대회</h2>
          {sorted.length === 0 ? (
            <EmptyState title="대회 데이터가 없습니다" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.slice(0, 6).map((t) => (
                <TournamentCard key={t.id} t={t} locale={locale} />
              ))}
            </div>
          )}
        </section>

        {/* 월별 전체 일람 */}
        {byMonth.length > 0 && (
          <section>
            <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">전체 대회</h2>
            <div className="space-y-6">
              {byMonth.map(([month, list]) => (
                <div key={month}>
                  <p className="text-toss-label font-bold text-toss-text-secondary mb-3 pb-2 border-b border-toss-divider">
                    {month.replace("-", "년 ")}월
                  </p>
                  <div className="space-y-1">
                    {list.map((t) => (
                      <Link
                        key={t.id}
                        href={`/${locale}/cardgame/tournaments/${t.id}`}
                        className="flex items-center gap-4 py-2.5 px-3 rounded-toss-md hover:bg-toss-hover transition-colors"
                      >
                        <span className="text-toss-caption text-toss-text-tertiary w-12 shrink-0">
                          {t.date.slice(5)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-toss-caption font-semibold text-toss-text-primary truncate">
                            {t.nameKo}
                          </p>
                          <p className="text-toss-micro text-toss-text-tertiary">
                            {t.format} · {t.players}명
                          </p>
                        </div>
                        {t.winnerNameKo && (
                          <span className="text-toss-micro text-toss-brand truncate max-w-[40%] shrink-0">
                            {t.winnerNameKo}
                          </span>
                        )}
                        <ChevronRight size={14} className="text-toss-text-quaternary shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 플레이어 랭킹 — 데이터 있을 때만 */}
        {playerRankings.length > 0 && (
          <section>
            <h2 className="text-toss-title font-bold text-toss-text-primary mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-toss-brand" />
              플레이어 랭킹 (CSP)
            </h2>
            <Card variant="default" padding="md">
              <div className="overflow-x-auto">
                <table className="w-full text-toss-caption">
                  <thead>
                    <tr className="text-left border-b border-toss-divider">
                      <th className="pb-3 font-semibold text-toss-text-tertiary w-10">순위</th>
                      <th className="pb-3 font-semibold text-toss-text-tertiary">플레이어</th>
                      <th className="pb-3 font-semibold text-toss-text-tertiary text-right">CSP</th>
                      <th className="pb-3 font-semibold text-toss-text-tertiary">주력 덱</th>
                      <th className="pb-3 font-semibold text-toss-text-tertiary text-right">우승</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerRankings.map((p) => (
                      <tr key={p.rank} className="border-b border-toss-divider last:border-0">
                        <td className="py-3">
                          <span
                            className={cn(
                              "inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold",
                              p.rank === 1
                                ? "bg-yellow-100 text-yellow-700"
                                : p.rank === 2
                                ? "bg-gray-200 text-gray-600"
                                : p.rank === 3
                                ? "bg-orange-100 text-orange-600"
                                : "bg-toss-bg-muted text-toss-text-tertiary"
                            )}
                          >
                            {p.rank}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-toss-text-primary">{p.name}</td>
                        <td className="py-3 text-right font-bold text-toss-brand">{p.csp.toLocaleString()}</td>
                        <td className="py-3 text-toss-text-secondary">{p.favArchetype}</td>
                        <td className="py-3 text-right text-toss-text-secondary">{p.wins}회</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}
      </div>

      <p className="text-toss-micro text-toss-text-quaternary text-center mt-10">
        Limitless TCG 공식 대회 데이터. 국제(영문권) 대회 위주입니다.
      </p>
    </div>
  );
}
