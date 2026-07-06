"use client";

import { useEffect, useState } from "react";
import { getCardPrintPrices, type PrintPriceGroup } from "@/lib/actions/getCardPrices";
import { Card, DataRow, EmptyState } from "@/components/toss";
import { REGION_LABEL } from "@/lib/cards/card-fields";
import { PRICE_SOURCE_META, formatPrice } from "@/lib/cards/price-display";

// 에디션은 RegionCard.region(JP/EN/KR) 그대로 — 실물 판본 = 에디션.
type DisplayRegion = "JP" | "EN" | "KR";
const DISPLAY_REGION_ORDER: DisplayRegion[] = ["JP", "EN", "KR"];
function toDisplayRegion(region: string): DisplayRegion {
  return region === "JP" || region === "KR" ? region : "EN";
}

function recordedLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 선택한 아트의 시세를 ★에디션(일/영/한) × 팩별★로 나열.
// 같은 그림이 여러 팩(본탄·재판·하이클래스)에 있으면 가격이 수배~수십배 갈리므로 합치지 않고
// 프린트(RegionCard=에디션×세트×번호) 단위로 보여준다. (docs/plans/card-model-and-pricing-taxonomy.md ④)
export function CardPriceByRegion({ regionCardId }: { regionCardId: string }) {
  const [groups, setGroups] = useState<PrintPriceGroup[] | null>(null);

  // 상위에서 key={regionCardId} 로 remount → 초기 state(null=로딩)가 항상 새 카드 기준.
  useEffect(() => {
    let cancelled = false;
    getCardPrintPrices(regionCardId).then((g) => {
      if (!cancelled) setGroups(g);
    });
    return () => {
      cancelled = true;
    };
  }, [regionCardId]);

  if (groups === null) {
    return (
      <p className="text-toss-body text-toss-text-tertiary py-10 text-center">시세 불러오는 중…</p>
    );
  }

  // 전체 빈 상태 — 어느 에디션·팩에도 가격 행이 없음
  if (groups.length === 0) {
    return (
      <EmptyState
        title="아직 수집된 시세가 없어요"
        description="이 카드의 에디션·팩별 시세 데이터가 쌓이면 여기에 표시됩니다."
      />
    );
  }

  const byRegion = new Map<DisplayRegion, PrintPriceGroup[]>();
  for (const g of groups) {
    const dr = toDisplayRegion(g.region);
    const arr = byRegion.get(dr) ?? [];
    arr.push(g);
    byRegion.set(dr, arr);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {DISPLAY_REGION_ORDER.map((dr) => {
        const packs = byRegion.get(dr) ?? [];
        return (
          <Card key={dr} padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-toss-label font-bold text-toss-text-primary">{REGION_LABEL[dr]}</h3>
              {packs.length > 0 && (
                <span className="text-toss-micro text-toss-text-quaternary">{packs.length}개 팩</span>
              )}
            </div>
            {/* 이 에디션만 가격 행 없음 */}
            {packs.length === 0 ? (
              <p className="text-toss-caption text-toss-text-quaternary py-6 text-center">수집된 시세 없음</p>
            ) : (
              <div className="flex flex-col gap-4">
                {packs.map((pk) => (
                  <div key={pk.regionCardId}>
                    {/* 팩 헤더 — 같은 그림이라도 출처 팩이 다르면 별 시세 */}
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                      <span className="min-w-0 truncate text-toss-caption font-bold text-toss-text-secondary">
                        {pk.setName}
                      </span>
                      <span className="shrink-0 text-toss-micro text-toss-text-quaternary toss-numeric">
                        #{pk.number}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {pk.variants.map((v) => {
                        // 일반판 단독이면 변형 라벨 생략(기존 표시와 동일). 실변형이 있으면 라벨로 구분.
                        const showLabel = !(pk.variants.length === 1 && v.kind === "standard");
                        return (
                          <div key={`${v.kind}-${v.slug}`}>
                            {showLabel && (
                              <div className="mb-0.5 text-toss-micro font-semibold text-toss-text-tertiary">
                                {v.label ?? "일반판"}
                              </div>
                            )}
                            {v.prices.map((r, idx) => {
                        const meta = PRICE_SOURCE_META[r.sourceCode] ?? { flag: "🏷️", sub: r.region };
                        return (
                          <DataRow
                            key={r.sourceCode}
                            divider={idx < v.prices.length - 1}
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
                                <span className="block text-toss-label font-bold text-toss-text-primary toss-numeric">
                                  {formatPrice(r.market, r.currency)}
                                </span>
                                <span className="block text-toss-micro text-toss-text-quaternary">{recordedLabel(r.recordedAt)}</span>
                              </span>
                            }
                          />
                        );
                      })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
