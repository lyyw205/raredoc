"use client";

import { RARITY_CAT_ABBR, RARITY_CAT_COLOR, RARITY_CAT_FALLBACK_COLOR } from "@/lib/cards/rarity-display";

// 카테고리 코드 → 구성 통계. tier 오름차순 정렬된 [code, stat] 엔트리 배열.
export type RarityStat = { total: number; owned: number; tier: number; nameKo: string };
export type RarityStatEntry = [string, RarityStat];

/**
 * 등급(희귀도 카테고리) 구성 — 제목 + 범례(TOTAL·등급별 수량) + 누적 스택 바.
 * /dex 카드팩 정보 섹션과 마이페이지 컬렉션 탭이 공유.
 *   - view="all":  바=단색, 범례=총수량
 *   - view="mine": 바=흐림+보유분 채움, 범례=보유/전체
 */
export function RarityComposition({ stats, view }: { stats: RarityStatEntry[]; view: "all" | "mine" }) {
  if (stats.length === 0) return null;
  const sumTotal = stats.reduce((acc, [, r]) => acc + r.total, 0);
  const sumOwned = stats.reduce((acc, [, r]) => acc + r.owned, 0);
  const lastIdx = stats.length - 1;
  // TOTAL 수량칸 — 내 카드(N/M) 기준 폭 예약해 토글 시 밀림 방지.
  const totalNumW = `${sumOwned}/${sumTotal}`.length;

  return (
    <div className="mt-4 border-t border-toss-divider pt-4">
      {/* 제목 (좌) + 범례 TOTAL·등급/수량 (우, 같은 행) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="shrink-0 text-toss-label font-bold text-toss-text-primary">등급 구성</h3>
        {/* 범례 — TOTAL(맨 앞) + 등급별. 항목별 수량칸만 자기 폭 예약 + flex-wrap */}
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-toss-caption text-toss-text-secondary">TOTAL</span>
            <span className="inline-block text-toss-caption font-bold text-toss-text-primary toss-numeric" style={{ minWidth: `${totalNumW}ch` }}>
              {view === "mine" ? `${sumOwned}/${sumTotal}` : sumTotal}
            </span>
          </div>
          {stats.map(([key, r]) => (
            <div key={key} className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: RARITY_CAT_COLOR[key] ?? RARITY_CAT_FALLBACK_COLOR }} />
              <span className="shrink-0 text-toss-caption text-toss-text-secondary">{RARITY_CAT_ABBR[key] ?? r.nameKo}</span>
              <span className="inline-block text-toss-caption font-bold text-toss-text-primary toss-numeric" style={{ minWidth: `${`${r.owned}/${r.total}`.length}ch` }}>
                {view === "mine" ? `${r.owned}/${r.total}` : r.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 누적 스택 바 */}
      <div className="flex h-4 w-full overflow-hidden rounded-toss-md bg-toss-bg-muted">
        {stats.map(([key, r], i) => {
          const color = RARITY_CAT_COLOR[key] ?? RARITY_CAT_FALLBACK_COLOR;
          const widthPct = sumTotal > 0 ? (r.total / sumTotal) * 100 : 0;
          const fillPct = r.total > 0 ? (r.owned / r.total) * 100 : 0;
          return (
            <div
              key={key}
              className={`relative h-full ${i < lastIdx ? "border-r-2 border-toss-bg-base" : ""}`}
              style={{ width: `${widthPct}%`, backgroundColor: view === "mine" ? `${color}29` : color }}
              title={`${RARITY_CAT_ABBR[key] ?? r.nameKo} ${view === "mine" ? `${r.owned}/${r.total}` : r.total}`}
            >
              {view === "mine" && fillPct > 0 && (
                <div className="absolute inset-y-0 left-0 h-full" style={{ width: `${fillPct}%`, backgroundColor: color }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
