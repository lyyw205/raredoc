"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardDivider,
  ToggleGroup,
  EmptyState,
} from "@/components/toss";
import { cn } from "@/lib/utils";
import type { TournamentRow, PlayerRankingRow } from "@/lib/services/cardgame";
import { Trophy, Calendar, Users } from "lucide-react";

// ── 상수 ──────────────────────────────────────────────────────────────────────

const REGION_OPTIONS = [
  { value: "all",  label: "전체" },
  { value: "KR",   label: "한국" },
  { value: "JP",   label: "일본" },
  { value: "INTL", label: "국제" },
];

const STATUS_OPTIONS = [
  { value: "all",       label: "전체" },
  { value: "upcoming",  label: "예정" },
  { value: "completed", label: "완료" },
];

// ── 대회 카드 ─────────────────────────────────────────────────────────────────

function TournamentCard({ t, locale }: { t: TournamentRow; locale: string }) {
  return (
    <Card variant="default" padding="md" className="h-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-toss-label font-bold text-toss-text-primary truncate">{t.nameKo}</p>
          <p className="text-toss-micro text-toss-text-tertiary mt-0.5">{t.date}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              t.status === "upcoming"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            )}
          >
            {t.status === "upcoming" ? "예정" : "완료"}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-toss-bg-muted text-toss-text-tertiary">
            {t.region}
          </span>
        </div>
      </div>

      <CardDivider />

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-toss-text-tertiary" />
          <span className="text-toss-caption text-toss-text-secondary">{t.players}명</span>
        </div>
        <span className="text-toss-micro text-toss-text-tertiary">{t.format}</span>
      </div>

      {t.winnerArchetypeId && t.winnerNameKo && (
        <div className="mt-2">
          <p className="text-toss-micro text-toss-text-tertiary mb-1">우승 덱</p>
          <Link href={`/${locale}/cardgame/decks/${t.winnerArchetypeId}`}>
            <span className="inline-flex items-center gap-1 text-toss-caption text-toss-brand font-medium hover:underline">
              {t.winnerNameKo} →
            </span>
          </Link>
        </div>
      )}
    </Card>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

export function TournamentsPageView({
  locale,
  tournaments,
  playerRankings,
}: {
  locale: string;
  tournaments: TournamentRow[];
  playerRankings: PlayerRankingRow[];
}) {
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = [...tournaments];
    if (regionFilter !== "all") list = list.filter((t) => t.region === regionFilter);
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [tournaments, regionFilter, statusFilter]);

  const upcoming = useMemo(
    () =>
      tournaments.filter((t) => t.status === "upcoming").sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    [tournaments]
  );

  const completed = useMemo(
    () =>
      tournaments.filter((t) => t.status === "completed").sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    [tournaments]
  );

  // 월별 그룹화
  const byMonth = useMemo(() => {
    const map: Record<string, TournamentRow[]> = {};
    filtered.forEach((t) => {
      const month = t.date.slice(0, 7); // "YYYY-MM"
      if (!map[month]) map[month] = [];
      map[month].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary flex items-center gap-2">
          <Trophy size={24} className="text-toss-brand" />
          대회 일정
        </h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          시티리그 · CL · 챔피언십 일정 및 결과 — 목업 데이터
        </p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 p-4 bg-toss-bg-muted rounded-toss-lg mb-8">
        <div className="flex items-center gap-2">
          <span className="text-toss-caption text-toss-text-tertiary shrink-0">지역</span>
          <ToggleGroup
            options={REGION_OPTIONS}
            value={regionFilter}
            onChange={setRegionFilter}
            size="sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-toss-caption text-toss-text-tertiary shrink-0">상태</span>
          <ToggleGroup
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            size="sm"
          />
        </div>
      </div>

      <div className="space-y-10">
        {/* 섹션 1: 다가오는 대회 */}
        {(statusFilter === "all" || statusFilter === "upcoming") && (
          <section>
            <h2 className="text-toss-title font-bold text-toss-text-primary mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-toss-brand" />
              다가오는 대회
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState title="예정된 대회가 없습니다" />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((t) => (
                  <TournamentCard key={t.id} t={t} locale={locale} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 섹션 2: 일정 캘린더 (월별 그룹) */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4 flex items-center gap-2">
            <Calendar size={18} />
            일정 캘린더
          </h2>
          {byMonth.length === 0 ? (
            <EmptyState title="해당 조건의 대회가 없습니다" />
          ) : (
            <div className="space-y-6">
              {byMonth.map(([month, tournamentsInMonth]) => (
                <div key={month}>
                  <p className="text-toss-label font-bold text-toss-text-secondary mb-3 pb-2 border-b border-toss-divider">
                    {month.replace("-", "년 ")}월
                  </p>
                  <div className="space-y-2">
                    {tournamentsInMonth.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-4 py-2.5 px-3 rounded-toss-md hover:bg-toss-hover transition-colors"
                      >
                        <span className="text-toss-caption text-toss-text-tertiary w-16 shrink-0">
                          {t.date.slice(5)} {/* MM-DD */}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-toss-caption font-semibold text-toss-text-primary truncate">
                            {t.nameKo}
                          </p>
                          <p className="text-toss-micro text-toss-text-tertiary">
                            {t.region} · {t.format} · {t.players}명
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                              t.status === "upcoming"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            )}
                          >
                            {t.status === "upcoming" ? "예정" : "완료"}
                          </span>
                          {t.winnerArchetypeId && t.winnerNameKo && (
                            <Link
                              href={`/${locale}/cardgame/decks/${t.winnerArchetypeId}`}
                              className="text-toss-micro text-toss-brand hover:underline"
                            >
                              {t.winnerNameKo}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 섹션 3: 최근 결과 */}
        {(statusFilter === "all" || statusFilter === "completed") && (
          <section>
            <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">최근 결과</h2>
            {completed.length === 0 ? (
              <EmptyState title="완료된 대회가 없습니다" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-toss-caption">
                  <thead>
                    <tr className="text-left border-b border-toss-divider">
                      <th className="pb-3 font-semibold text-toss-text-tertiary">날짜</th>
                      <th className="pb-3 font-semibold text-toss-text-tertiary">대회명</th>
                      <th className="pb-3 font-semibold text-toss-text-tertiary text-center">지역</th>
                      <th className="pb-3 font-semibold text-toss-text-tertiary text-right">참가</th>
                      <th className="pb-3 font-semibold text-toss-text-tertiary text-right">우승 덱</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed.map((t) => (
                      <tr key={t.id} className="border-b border-toss-divider last:border-0">
                        <td className="py-3 text-toss-text-tertiary whitespace-nowrap">{t.date}</td>
                        <td className="py-3 font-medium text-toss-text-primary">{t.nameKo}</td>
                        <td className="py-3 text-center">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-toss-bg-muted text-toss-text-tertiary font-medium">
                            {t.region}
                          </span>
                        </td>
                        <td className="py-3 text-right text-toss-text-secondary">{t.players}명</td>
                        <td className="py-3 text-right">
                          {t.winnerArchetypeId && t.winnerNameKo ? (
                            <Link
                              href={`/${locale}/cardgame/decks/${t.winnerArchetypeId}`}
                              className="text-toss-brand hover:underline font-medium"
                            >
                              {t.winnerNameKo}
                            </Link>
                          ) : (
                            <span className="text-toss-text-quaternary">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 섹션 4: 플레이어 랭킹 (CSP) */}
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
                      <td className="py-3 text-right font-bold text-toss-brand">
                        {p.csp.toLocaleString()}
                      </td>
                      <td className="py-3 text-toss-text-secondary">{p.favArchetype}</td>
                      <td className="py-3 text-right text-toss-text-secondary">{p.wins}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>

      <p className="text-toss-micro text-toss-text-quaternary text-center mt-10">
        모든 데이터는 목업입니다. 실제 대회 일정과 다를 수 있습니다.
      </p>
    </div>
  );
}
