"use client";

import Link from "next/link";
import { Card, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import { Trophy, Users } from "lucide-react";
import type { RegionArchetypeRow } from "@/lib/services/cardgame";
import { DeckIcon } from "@/components/cardgame/DeckIcon";

// JP/KR 탭 — 소표본(top cut 기준)이라 S/A/B/C 티어보드 대신 입상 점유율 정렬 리스트.
// (tier "—" 행이 티어보드 하드코딩 필터에서 증발하는 문제 회피 — multisource 리스크 P1-8)

const REGION_LABEL: Record<string, string> = { JP: "일본", KR: "한국" };

const EMPTY_COPY: Record<string, { title: string; description: string }> = {
  JP: {
    title: "일본 시티리그 데이터 수집 전",
    description:
      "시티리그 시즌 데이터를 준비하고 있어요. 2026 시즌4가 5월에 종료되어, 차기 시즌 개막 후 갱신됩니다.",
  },
  KR: {
    title: "한국 대회 데이터가 아직 없어요",
    description: "코리안리그 데이터 수집 후 표시됩니다.",
  },
};

function usageBarWidth(rate: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.max(4, Math.round((rate / max) * 100))}%`;
}

export function RegionMetaView({
  locale,
  region,
  archetypes,
  tournamentCount,
  latestDate,
}: {
  locale: string;
  region: "JP" | "KR";
  archetypes: RegionArchetypeRow[];
  tournamentCount: number;
  latestDate: string | null;
}) {
  if (archetypes.length === 0) {
    const c = EMPTY_COPY[region];
    return <EmptyState title={c.title} description={c.description} />;
  }

  const totalSample = archetypes.reduce((a, b) => a + b.sampleSize, 0);
  const maxUsage = archetypes[0]?.usageRate ?? 0;

  return (
    <div>
      {/* 표본 안내 — 분모가 INTL(전 참가자)과 다름을 명시 */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <span className="text-toss-micro px-2 py-1 rounded-full bg-toss-bg-muted text-toss-text-tertiary">
          대회 {tournamentCount}건 · 입상 표본 {totalSample}건
        </span>
        {latestDate && (
          <span className="text-toss-micro px-2 py-1 rounded-full bg-toss-bg-muted text-toss-text-tertiary">
            최신 대회 {latestDate}
          </span>
        )}
        <span className="text-toss-micro text-toss-text-quaternary">
          {REGION_LABEL[region]} 메타는 게재된 입상권(Top Cut) 기준 점유율이에요 — 글로벌(전 참가자 기준)과
          분모가 달라요.
        </span>
      </div>

      <Card variant="default" padding="md">
        <ol className="divide-y divide-toss-divider">
          {archetypes.map((a, i) => (
            <li key={a.id}>
              <Link
                href={`/${locale}/cardgame/decks/${a.id}`}
                className="flex items-center gap-3 py-3 hover:bg-toss-hover transition-colors rounded-lg px-2 -mx-2"
              >
                <span
                  className={cn(
                    "w-7 text-center text-toss-label font-bold tabular-nums shrink-0",
                    i < 3 ? "text-toss-brand" : "text-toss-text-quaternary",
                  )}
                >
                  {i + 1}
                </span>
                <DeckIcon iconKeys={a.iconKeys} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-toss-label font-semibold text-toss-text-primary truncate">
                      {a.nameKo || a.nameEn || a.id}
                    </span>
                    {a.winCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-toss-micro text-yellow-600 shrink-0">
                        <Trophy size={11} />
                        우승 {a.winCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-toss-bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-toss-brand/70"
                      style={{ width: usageBarWidth(a.usageRate, maxUsage) }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-toss-label font-bold text-toss-text-primary tabular-nums">
                    {a.usageRate.toFixed(1)}%
                  </p>
                  <p className="text-toss-micro text-toss-text-quaternary flex items-center justify-end gap-0.5">
                    <Users size={10} />
                    {a.sampleSize}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <p className="text-toss-micro text-toss-text-quaternary mt-3">
        표본 30건 미만 덱은 티어를 매기지 않아요. 점유율 막대는 1위 덱 대비 비율입니다.
      </p>
    </div>
  );
}
