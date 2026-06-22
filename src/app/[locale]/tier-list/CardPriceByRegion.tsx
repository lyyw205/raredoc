"use client";

import { useEffect, useState } from "react";
import { getCardPrices, type CardPriceRow } from "@/lib/actions/getCardPrices";
import { Card, DataRow, EmptyState } from "@/components/toss";
import { REGION_LABEL } from "@/lib/cards/card-fields";
import { PRICE_SOURCE_META, formatPrice } from "@/lib/cards/price-display";

// PriceSource.marketRegion(US/GLOBAL/JP/KR) → 표시 지역(JP/EN/KR).
// ★ getCardPrices 의 region 값은 US/GLOBAL/JP/KR 이라 REGION_ORDER(JP/EN/KR)로 바로 키잉하면 US/GLOBAL 이 누락됨.
type DisplayRegion = "JP" | "EN" | "KR";
function toDisplayRegion(marketRegion: string): DisplayRegion {
  if (marketRegion === "JP") return "JP";
  if (marketRegion === "KR") return "KR";
  return "EN"; // US · GLOBAL · 기타 → 영문판
}
const DISPLAY_REGION_ORDER: DisplayRegion[] = ["JP", "EN", "KR"];

function recordedLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 선택한 카드(RegionCard)의 시세를 지역별 섹션(일본판/영문판/한국판)으로 나열.
// getCardPrices 는 같은 Card 의 EN/JP/KR 형제 RegionCard 가격을 출처별 최신 1건으로 통합 반환.
export function CardPriceByRegion({ regionCardId }: { regionCardId: string }) {
  const [prices, setPrices] = useState<CardPriceRow[] | null>(null);

  // 패널은 상위에서 key={regionCardId} 로 카드별 remount → 초기 state(null=로딩)가 항상 새 카드 기준.
  useEffect(() => {
    let cancelled = false;
    getCardPrices(regionCardId).then((rows) => {
      if (!cancelled) setPrices(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [regionCardId]);

  if (prices === null) {
    return (
      <p className="text-toss-body text-toss-text-tertiary py-10 text-center">시세 불러오는 중…</p>
    );
  }

  // 1차(전체) 빈 상태 — 어느 지역에도 가격 행이 없음
  if (prices.length === 0) {
    return (
      <EmptyState
        title="아직 수집된 시세가 없어요"
        description="이 카드의 지역별 시세 데이터가 쌓이면 여기에 표시됩니다."
      />
    );
  }

  const byRegion = new Map<DisplayRegion, CardPriceRow[]>();
  for (const r of prices) {
    const dr = toDisplayRegion(r.region);
    const arr = byRegion.get(dr) ?? [];
    arr.push(r);
    byRegion.set(dr, arr);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {DISPLAY_REGION_ORDER.map((dr) => {
        const rows = byRegion.get(dr) ?? [];
        return (
          <Card key={dr} padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-toss-label font-bold text-toss-text-primary">{REGION_LABEL[dr]}</h3>
              {rows.length > 0 && (
                <span className="text-toss-micro text-toss-text-quaternary">{rows.length}개 출처</span>
              )}
            </div>
            {/* 2차(섹션) 빈 상태 — 이 지역만 가격 행 없음 */}
            {rows.length === 0 ? (
              <p className="text-toss-caption text-toss-text-quaternary py-6 text-center">수집된 시세 없음</p>
            ) : (
              <div>
                {rows.map((r, idx) => {
                  const meta = PRICE_SOURCE_META[r.sourceCode] ?? { flag: "🏷️", sub: r.region };
                  return (
                    <DataRow
                      key={r.sourceCode}
                      divider={idx < rows.length - 1}
                      label={
                        <span className="flex items-center gap-2">
                          <span className="text-base">{meta.flag}</span>
                          <span className="min-w-0 block">
                            <span className="block text-toss-caption font-semibold text-toss-text-secondary truncate">
                              {meta.name ?? r.sourceName}
                              {meta.native && (
                                <span className="ml-1 text-toss-micro font-normal text-toss-text-quaternary">{meta.native}</span>
                              )}
                            </span>
                            <span className="block text-toss-micro text-toss-text-quaternary truncate">{meta.sub}</span>
                          </span>
                        </span>
                      }
                      value={
                        <span className="block text-right">
                          <span className="block text-toss-title-2 font-bold text-toss-text-primary toss-numeric">
                            {formatPrice(r.market, r.currency)}
                          </span>
                          <span className="block text-toss-micro text-toss-text-quaternary">{recordedLabel(r.recordedAt)}</span>
                        </span>
                      }
                    />
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
