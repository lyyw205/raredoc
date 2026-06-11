"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/toss";
import {
  deleteItemAction,
  setHighlightAction,
  toggleForSaleAction,
} from "@/lib/actions/collection";

// ── 타입 (서버 getUserSetCatalog 와 구조 일치) ───────────────────────────────

export type CollectionCard = {
  cardId: string; // RegionCard id
  name: string;
  number: string;
  imageUrl: string | null;
  owned: boolean;
  // 보유 카드만 채워짐
  itemId?: string;
  grade?: string;
  certified?: boolean;
  forSale?: boolean;
  highlightSlot?: number | null;
  valueKrw?: number;
};

export type CollectionSet = {
  setId: string;
  name: string;
  totalCards: number;
  ownedCount: number;
  estimatedKrw: number;
  cards: CollectionCard[]; // 세트 전체(보유+미보유)
};

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-toss-bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-toss-brand transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function CollectionTab({
  sets = [],
  isOwnProfile = false,
}: {
  sets?: CollectionSet[];
  isOwnProfile?: boolean;
}) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [isPending, startTransition] = useTransition();

  const totalOwned = sets.reduce((n, s) => n + s.ownedCount, 0);
  const totalValue = sets.reduce((n, s) => n + s.estimatedKrw, 0);
  const totalCertified = sets.reduce(
    (n, s) => n + s.cards.filter((c) => c.owned && c.certified).length,
    0
  );

  const [selectedSetId, setSelectedSetId] = useState<string>(sets[0]?.setId ?? "");
  const [cols, setCols] = useState(10); // 한 줄당 카드 수
  const selectedSet = sets.find((s) => s.setId === selectedSetId) ?? sets[0];

  if (!selectedSet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-toss-text-quaternary">
        <p className="text-toss-body">아직 등록한 카드가 없어요</p>
        {isOwnProfile && (
          <p className="text-toss-caption mt-1">하이라이트 갤러리에서 카드를 등록해 보세요</p>
        )}
      </div>
    );
  }

  const setCompletionPct =
    selectedSet.totalCards > 0
      ? Math.round((selectedSet.ownedCount / selectedSet.totalCards) * 100)
      : 0;
  const setValue = selectedSet.estimatedKrw;

  function runAction(fn: () => Promise<unknown>) {
    startTransition(() => {
      void fn();
    });
  }

  return (
    <div>
      {/* ── 전체 요약 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "총 보유 카드", value: `${totalOwned}장`,                        colorClass: "text-toss-text-primary" },
          { label: "총 추정가",   value: `₩${(totalValue / 10000).toFixed(0)}만`,   colorClass: "text-toss-warning" },
          { label: "인증 카드",   value: `${totalCertified}장`,                      colorClass: "text-toss-positive" },
          { label: "보유 세트",   value: `${sets.length}세트`,                       colorClass: "text-toss-brand" },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-toss-caption text-toss-text-tertiary mb-1">{stat.label}</p>
            <p className={`text-toss-title-2 font-bold toss-numeric ${stat.colorClass}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className="flex gap-4 items-start">

        {/* 왼쪽: 세트 리스트 */}
        <div className="w-52 shrink-0 space-y-1.5">
          <p className="text-toss-caption text-toss-text-quaternary font-medium px-1 mb-2">보유 세트</p>
          {sets.map((set) => {
            const pct = set.totalCards > 0 ? Math.round((set.ownedCount / set.totalCards) * 100) : 0;
            const isSelected = set.setId === selectedSetId;
            return (
              <button
                key={set.setId}
                onClick={() => setSelectedSetId(set.setId)}
                className={`w-full text-left px-3 py-3 rounded-toss-lg border transition-colors ${
                  isSelected
                    ? "bg-toss-bg-subtle border-toss-brand/40"
                    : "bg-toss-bg-base border-toss-border hover:border-toss-border-strong"
                }`}
              >
                <p className={`text-toss-caption font-semibold truncate mb-1.5 ${isSelected ? "text-toss-text-primary" : "text-toss-text-secondary"}`}>
                  {set.name}
                </p>
                <ProgressBar value={pct} />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-toss-micro text-toss-text-quaternary">{set.ownedCount}/{set.totalCards}장</span>
                  <span className={`text-toss-micro font-bold ${isSelected ? "text-toss-brand" : "text-toss-text-tertiary"}`}>{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 오른쪽: 선택 세트 상세 */}
        <div className="flex-1 min-w-0">

          {/* 세트 요약 */}
          <Card padding="md" className="mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-toss-title-2 font-bold text-toss-text-primary">{selectedSet.name}</h2>
              </div>
              <div className="text-right shrink-0">
                <p className="text-toss-title-2 font-bold text-toss-warning toss-numeric">₩{setValue.toLocaleString("ko-KR")}</p>
                <p className="text-toss-micro text-toss-text-tertiary">추정 총가치</p>
              </div>
            </div>

            <ProgressBar value={setCompletionPct} />

            <div className="flex items-center gap-4 mt-2.5 text-toss-caption text-toss-text-tertiary">
              <span><span className="text-toss-text-primary font-semibold toss-numeric">{selectedSet.ownedCount}</span> / {selectedSet.totalCards}장 보유</span>
              <span><span className="text-toss-positive font-semibold toss-numeric">{selectedSet.cards.filter((c) => c.owned && c.certified).length}</span>장 인증</span>
              <span className="ml-auto text-toss-brand font-bold toss-numeric">{setCompletionPct}% 완성</span>
            </div>
          </Card>

          {/* 카드 도감 그리드 — 전체 표시, 보유=컬러 / 미보유=회색 */}
          <Card padding="md">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-toss-caption text-toss-text-tertiary shrink-0">
                <span className="text-toss-text-primary font-semibold toss-numeric">{selectedSet.ownedCount}</span>
                {" / "}{selectedSet.totalCards}장 보유
              </p>
              <div className="flex items-center gap-3 text-toss-micro text-toss-text-quaternary">
                {/* 열 수 슬라이더 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-toss-text-tertiary">열</span>
                  <input
                    type="range"
                    min={5}
                    max={15}
                    step={1}
                    value={cols}
                    onChange={(e) => setCols(Number(e.target.value))}
                    className="w-20 cursor-pointer accent-[var(--toss-brand)]"
                  />
                  <span className="font-semibold text-toss-brand w-4 text-right">{cols}</span>
                </div>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-toss-positive inline-block" />인증</span>
                {isOwnProfile && (
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-toss-warning inline-block" />판매중</span>
                )}
              </div>
            </div>

            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {selectedSet.cards.map((card) => (
                <div key={card.cardId} className="group relative cursor-pointer" title={`${card.name} · No.${card.number}`}>
                  <a href={`/${locale}/cards/${card.cardId}`} className="block">
                    <div
                      className="rounded-toss-sm overflow-hidden"
                      style={{
                        aspectRatio: "63 / 88",
                        filter: card.owned ? "none" : "grayscale(100%)",
                        opacity: card.owned ? 1 : 0.35,
                        transition: "opacity 0.2s, filter 0.2s",
                      }}
                    >
                      {card.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : null}
                    </div>
                  </a>

                  {/* 인증 점 (보유) */}
                  {card.owned && card.certified && (
                    <div className="absolute top-[3px] right-[3px] w-2.5 h-2.5 rounded-full bg-toss-positive ring-1 ring-toss-bg-base shadow" />
                  )}

                  {/* 판매중 점 (보유) */}
                  {card.owned && card.forSale && (
                    <div className="absolute top-[3px] left-[3px] w-2.5 h-2.5 rounded-full bg-toss-warning ring-1 ring-toss-bg-base shadow" />
                  )}

                  {/* 등급 뱃지 (보유) */}
                  {card.owned && card.grade && (
                    <div className="absolute bottom-[14px] left-[2px] text-[7px] font-bold bg-black/75 text-white px-1 py-[1px] rounded leading-tight">
                      {card.grade}
                    </div>
                  )}

                  {/* 소유자 편집 오버레이 (보유 카드만) */}
                  {isOwnProfile && card.owned && card.itemId && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-toss-sm">
                      <button
                        disabled={isPending}
                        onClick={() =>
                          runAction(() =>
                            setHighlightAction(card.itemId!, card.highlightSlot != null ? null : 1)
                          )
                        }
                        className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-toss-brand/90 hover:bg-toss-brand disabled:opacity-50"
                        title={card.highlightSlot != null ? "하이라이트 해제" : "하이라이트 추가"}
                      >
                        {card.highlightSlot != null ? "★해제" : "★대표"}
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => runAction(() => toggleForSaleAction(card.itemId!, !card.forSale))}
                        className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-toss-warning/90 hover:bg-toss-warning disabled:opacity-50"
                      >
                        {card.forSale ? "판매중지" : "판매"}
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => {
                          if (confirm(`${card.name} 카드를 삭제할까요?`)) {
                            runAction(() => deleteItemAction(card.itemId!));
                          }
                        }}
                        className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-red-600/90 hover:bg-red-600 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  )}

                  <p className="text-toss-tiny text-center text-toss-text-quaternary mt-[2px] leading-none truncate">
                    {card.number}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
