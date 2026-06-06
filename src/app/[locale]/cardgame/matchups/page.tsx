import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import {
  getMatchupMatrix,
  getArchetypeMatchups,
  getArchetypes,
  getMetaFreshness,
} from "@/lib/services/cardgame";
import { DeckIcon } from "@/components/cardgame/DeckIcon";

// ⚔️ 상성 페이지 (UI-2차) — docs/cardgame-ui-plan.md §4-6.
// ① 상위 8덱 매트릭스(사전 SQL 게이트 96% games>=10 통과) ② 덱별 전체 리스트(?deck=)
// ③ 산식 푸터 — "무승부=⅓승·표본 컷" 명시가 차별점(벤치마크: 전 세계가 산식을 안 씀).

function cellColor(winRate: number, games: number): string {
  if (games < 5) return "text-toss-text-quaternary";
  if (winRate >= 55) return "bg-green-50 text-green-700 font-semibold";
  if (winRate <= 45) return "bg-red-50 text-red-600 font-semibold";
  return "text-toss-text-secondary";
}

export default async function MatchupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ deck?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const [matrix, freshness, allDecks] = await Promise.all([
    getMatchupMatrix(8),
    getMetaFreshness(),
    getArchetypes({ realOnly: true }),
  ]);
  const selectedDeck = sp.deck && allDecks.some((d) => d.id === sp.deck) ? sp.deck : matrix.decks[0]?.id;
  const deckMatchups = selectedDeck ? await getArchetypeMatchups(selectedDeck) : [];
  const selectedInfo = allDecks.find((d) => d.id === selectedDeck);

  return (
    <div>
      <Link
        href={`/${locale}/cardgame`}
        className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary mb-6"
      >
        <ArrowLeft size={14} />
        메타 현황으로
      </Link>

      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary">⚔️ 덱 상성</h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          대회 매치 기록 기반 덱 vs 덱 승률 · 글로벌(최근 {freshness.windowDays}일, 대회 {freshness.tournamentCount}건)
        </p>
      </div>

      {/* ① 상위 8덱 매트릭스 — 모바일: 가로 스크롤 + 첫 열 고정 */}
      <section className="mb-10">
        <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">상위 덱 상성표</h2>
        {matrix.decks.length < 2 ? (
          <EmptyState title="표본이 부족합니다" />
        ) : (
          <div className="overflow-x-auto rounded-toss-lg border border-toss-divider">
            <table className="text-toss-caption border-collapse min-w-full">
              <thead>
                <tr className="bg-toss-bg-muted">
                  <th className="sticky left-0 bg-toss-bg-muted py-2 px-3 text-left font-semibold text-toss-text-tertiary z-10">
                    행 기준 승률
                  </th>
                  {matrix.decks.map((d) => (
                    <th key={d.id} className="py-2 px-2 text-center font-medium text-toss-text-secondary min-w-16">
                      <Link href={`/${locale}/cardgame/decks/${d.id}`} className="inline-flex flex-col items-center gap-1 hover:text-toss-brand">
                        <DeckIcon iconKeys={d.iconKeys} size="sm" />
                        <span className="text-toss-micro leading-tight break-keep max-w-16 truncate">{d.nameKo}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.decks.map((row) => (
                  <tr key={row.id} className="border-t border-toss-divider">
                    <th className="sticky left-0 bg-white py-2 px-3 text-left font-semibold text-toss-text-primary z-10">
                      <Link
                        href={`?deck=${row.id}`}
                        className="inline-flex items-center gap-1.5 hover:text-toss-brand"
                      >
                        <DeckIcon iconKeys={row.iconKeys} size="sm" />
                        <span className="max-w-28 truncate">{row.nameKo}</span>
                      </Link>
                    </th>
                    {matrix.decks.map((col) => {
                      if (row.id === col.id) {
                        return (
                          <td key={col.id} className="py-2 px-2 text-center text-toss-text-quaternary bg-toss-bg-muted/50">
                            —
                          </td>
                        );
                      }
                      const cell = matrix.cells[`${row.id}|${col.id}`];
                      if (!cell || cell.games < 5) {
                        return (
                          <td key={col.id} className="py-2 px-2 text-center text-toss-text-quaternary" title="표본 5게임 미만">
                            ·
                          </td>
                        );
                      }
                      return (
                        <td
                          key={col.id}
                          className={cn("py-2 px-2 text-center tabular-nums", cellColor(cell.winRate, cell.games))}
                          title={`${row.nameKo} vs ${col.nameKo}: ${cell.wins}-${cell.losses}-${cell.ties} (${cell.games}게임)`}
                        >
                          {cell.winRate}
                          <sup className={cn("ml-0.5 text-[9px]", cell.games < 10 ? "text-toss-text-quaternary" : "text-toss-text-tertiary")}>
                            {cell.games}
                          </sup>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ② 덱별 전체 리스트 */}
      <section>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-toss-title font-bold text-toss-text-primary">덱별 전체 상성</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {allDecks.slice(0, 16).map((d) => (
            <Link
              key={d.id}
              href={`?deck=${d.id}`}
              className={cn(
                "inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-toss-caption font-semibold transition-colors",
                d.id === selectedDeck
                  ? "bg-toss-text-primary text-white"
                  : "bg-toss-bg-muted text-toss-text-tertiary hover:text-toss-text-primary",
              )}
            >
              <DeckIcon iconKeys={d.iconKeys} size="sm" />
              {d.nameKo || d.nameEn || d.id}
            </Link>
          ))}
        </div>

        {deckMatchups.length === 0 ? (
          <EmptyState title="이 덱의 매치 기록이 없습니다" />
        ) : (
          <Card variant="default" padding="md">
            <p className="text-toss-label font-semibold text-toss-text-primary mb-3">
              {selectedInfo?.nameKo ?? selectedDeck} 기준 승률
            </p>
            <div className="space-y-1">
              {deckMatchups.map((m) => (
                <Link
                  key={m.opponentId}
                  href={`/${locale}/cardgame/decks/${m.opponentId}`}
                  className="flex items-center gap-3 p-2 rounded-toss-md hover:bg-toss-hover transition-colors"
                >
                  <span className="flex-1 min-w-0 text-toss-caption font-semibold text-toss-text-primary truncate">
                    {m.opponentNameKo}
                  </span>
                  <span className="text-toss-micro text-toss-text-tertiary shrink-0">{m.games}게임</span>
                  <span
                    className={cn(
                      "text-toss-caption font-bold w-12 text-right tabular-nums shrink-0",
                      m.lowSample ? "text-toss-text-quaternary" : m.winRate >= 55 ? "text-green-600" : m.winRate <= 45 ? "text-red-500" : "text-toss-text-secondary",
                    )}
                  >
                    {m.winRate}%
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* ③ 산식 푸터 — 투명성 (벤치마크 차별점) */}
      <p className="text-toss-micro text-toss-text-quaternary mt-6">
        산식: 승률 = 승 ÷ (승+패), 무승부 제외 · 출처: Limitless 온라인 대회 매치 기록 · 셀 윗첨자 =
        게임 수(5게임 미만 "·" 표시, 10게임 미만 회색) · 대회 데이터 기준{" "}
        {freshness.syncedAt ? new Date(freshness.syncedAt).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—"} 갱신
      </p>
    </div>
  );
}
