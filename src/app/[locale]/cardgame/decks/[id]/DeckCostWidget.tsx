"use client";

import { useState } from "react";
import { Card } from "@/components/toss";
import { cn } from "@/lib/utils";
import { Wallet, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { DeckCostResult } from "@/lib/services/deck-pricing";
import { formatKrwShort } from "@/lib/format/krw";

// 덱 견적 위젯 (UI-1b) — [저레어↔고레어] 토글은 서버에서 미리 계산된 2값 스왑(재계산 없음).
// 정직 표기 의무: 기준·날짜·집계율·환율 캡션 + 미집계 카드 전건 노출 + 고가누락 "±변동 큼" 라벨.

function formatMan(krw: number): string {
  return formatKrwShort(krw, { suffix: "만원" });
}

export function DeckCostWidget({ cost }: { cost: DeckCostResult }) {
  const [mode, setMode] = useState<"budget" | "premium">("budget");
  const [showMissing, setShowMissing] = useState(false);
  const side = cost[mode];

  return (
    <Card variant="default" padding="md">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="inline-flex w-10 h-10 rounded-toss-md bg-toss-bg-muted items-center justify-center shrink-0">
            <Wallet size={18} className="text-toss-brand" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-toss-title font-bold text-toss-text-primary tabular-nums">
                약 {formatMan(side.totalKrw)}
              </p>
              {cost.hasExpensiveMissing && (
                <span
                  className="inline-flex items-center gap-0.5 text-toss-micro font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700"
                  title="시세 미집계 카드 중 고레어 인쇄판이 있어 실제 비용이 크게 다를 수 있어요"
                >
                  <AlertTriangle size={10} />
                  ±변동 큼
                </span>
              )}
            </div>
            <p className="text-toss-micro text-toss-text-tertiary">
              덱 구축 비용 · {cost.pricedCount}/{cost.totalCount}장 집계
            </p>
          </div>
        </div>

        {/* 저레어/고레어 토글 — 프리캐시 스왑 */}
        <div className="inline-flex rounded-full bg-toss-bg-muted p-0.5">
          {(
            [
              ["budget", "저레어"],
              ["premium", "고레어"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={cn(
                "px-3 py-1 rounded-full text-toss-caption font-semibold transition-colors",
                mode === k ? "bg-white text-toss-text-primary shadow-sm" : "text-toss-text-tertiary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-toss-micro text-toss-text-quaternary mt-3">
        기준: {cost.basis}
        {cost.asOf && ` · 시세 ${cost.asOf}`} · 시세 합산 추정치로 실구매가와 다를 수 있어요.
        {mode === "budget" ? " 저레어 = 카드별 최저가 인쇄판." : " 고레어 = 카드별 최고 레어도 인쇄판."}
      </p>

      {cost.missing.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowMissing((v) => !v)}
            className="inline-flex items-center gap-1 text-toss-micro text-toss-text-tertiary hover:text-toss-text-primary"
          >
            {showMissing ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            시세 미집계 {cost.missing.reduce((a, m) => a + m.count, 0)}장 보기
          </button>
          {showMissing && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {cost.missing.map((m) => (
                <li
                  key={m.cardName}
                  className={cn(
                    "text-toss-micro px-1.5 py-0.5 rounded bg-toss-bg-muted",
                    m.expensive ? "text-amber-700" : "text-toss-text-tertiary",
                  )}
                >
                  {m.cardName} ×{m.count}
                  {m.expensive && " (고레어)"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
