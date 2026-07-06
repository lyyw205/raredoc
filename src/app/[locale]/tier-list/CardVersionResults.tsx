"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CardSearchHit } from "@/lib/actions/searchCards";
import { CardThumb } from "@/components/cardgame/CardThumb";
import { cn } from "@/lib/utils";

// 카드번호 표시 — 순수 숫자는 3자리 0패딩 + 세트 총장수(004/078), 문자 포함(SM158 등)은 원본 유지.
//   (DexCatalog.tsx padCardNumber 와 동일 규칙 — 표시 전용 헬퍼라 별도 유지)
function formatCardNumber(number: string, setCardCount: number | null): string {
  if (!/^\d+$/.test(number)) return number;
  const padded = number.padStart(3, "0");
  return setCardCount ? `${padded}/${String(setCardCount).padStart(3, "0")}` : padded;
}

// 검색된 종의 여러 카드 버전(세트·일러·레어도 차이)을 가로 1줄 슬라이더로 나열.
// 좌우 화살표로 슬라이드(양 끝에서 자동 숨김), 클릭 시 상위에서 시세 패널 표시.
export function CardVersionResults({
  hits,
  selectedId,
  onSelect,
}: {
  hits: CardSearchHit[];
  selectedId: string | null;
  onSelect: (hit: CardSearchHit) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = 0; // 새 검색결과는 맨 앞부터
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    const raf = requestAnimationFrame(update); // 레이아웃 측정은 다음 프레임에(동기 setState 회피)
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [hits]);

  const slide = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (hits.length === 0) {
    return (
      <p className="text-toss-body text-toss-text-tertiary py-10 text-center">
        검색 결과가 없어요. 다른 이름으로 검색해 보세요.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* ← 좌측 화살표 */}
      {canLeft && (
        <button
          type="button"
          onClick={() => slide(-1)}
          aria-label="이전"
          className="absolute left-0 top-[42%] -translate-y-1/2 z-10 grid place-items-center h-9 w-9 rounded-full bg-toss-bg-base border border-toss-border shadow-toss-md text-toss-text-secondary hover:bg-toss-hover transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        // p-1.5: 선택 카드의 ring(2px)이 overflow 클리핑에 잘리지 않도록 안쪽 여백 확보
        className="flex gap-3 overflow-x-auto p-1.5 scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {hits.map((hit) => {
          const active = hit.id === selectedId;
          const name = hit.nameKo ?? hit.name;
          const set = hit.setNameKo ?? hit.setName;
          return (
            <button
              key={hit.id}
              type="button"
              onClick={() => onSelect(hit)}
              aria-pressed={active}
              className={cn(
                "group w-32 shrink-0 text-left rounded-toss-lg p-1.5 transition-colors",
                active ? "bg-toss-brand-weak ring-2 ring-toss-brand" : "hover:bg-toss-hover"
              )}
            >
              <CardThumb src={hit.imageSmall} alt={name} />
              <div className="px-0.5 pt-1.5 min-w-0">
                <p className="text-toss-caption font-semibold text-toss-text-primary truncate">{name}</p>
                {hit.priceKrw != null ? (
                  <p className="text-toss-caption font-bold text-toss-text-primary truncate toss-numeric">
                    ₩{hit.priceKrw.toLocaleString("ko-KR")}
                  </p>
                ) : (
                  <p className="text-toss-micro text-toss-text-quaternary truncate">시세 없음</p>
                )}
                <p className="text-toss-micro text-toss-text-tertiary truncate">{set}</p>
                <div className="flex items-center gap-1 text-toss-micro text-toss-text-quaternary">
                  {hit.setSymbolUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hit.setSymbolUrl}
                      alt={hit.region}
                      className="h-3 w-3 shrink-0 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <span className="truncate">
                    {formatCardNumber(hit.number, hit.setCardCount)}
                    {hit.rarity ? ` · ${hit.rarity}` : ""}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* → 우측 화살표 */}
      {canRight && (
        <button
          type="button"
          onClick={() => slide(1)}
          aria-label="다음"
          className="absolute right-0 top-[42%] -translate-y-1/2 z-10 grid place-items-center h-9 w-9 rounded-full bg-toss-bg-base border border-toss-border shadow-toss-md text-toss-text-secondary hover:bg-toss-hover transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
