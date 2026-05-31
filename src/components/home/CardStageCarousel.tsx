"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CardHeader, CardTitle, Tag } from "@/components/toss";

type CardItem = {
  uid: string;
  id: string;
  name: string;
  set: string;
  number: string;
  grade: string;
  certified: boolean;
  valueKrw: number;
  imageUrl: string;
  collector: string;
  collectorInitial: string;
  addedAt: string;
  // 새 ERD: 지역(EN/JP/KR) 정보. 있으면 카드 우상단에 뱃지로 표시.
  region?: string;
};

const AUTO_INTERVAL = 2800;

function CardTile({
  card,
  rank,
  locale,
}: {
  card: CardItem;
  rank: number;
  locale: string;
}) {
  const isTop3 = rank <= 3;
  const rankEmoji = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <Link
      href={`/${locale}/cards/${card.id}`}
      className="group flex w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-toss-lg border border-toss-border bg-toss-bg-base transition-shadow hover:shadow-toss-md lg:w-[calc((100%-60px)/6)]"
    >
      {/* 이미지 */}
      <div className="relative aspect-[5/7] overflow-hidden bg-toss-bg-muted">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : null}
        {/* 랭크 뱃지 */}
        <span
          className="absolute left-2 top-2 flex items-center gap-0.5 rounded-toss-pill px-2 py-0.5 text-toss-micro font-bold shadow-toss-xs"
          style={{
            background: isTop3 ? "var(--toss-warning)" : "rgba(0,0,0,0.55)",
            color: "#fff",
          }}
        >
          {rankEmoji ?? `#${rank}`}
        </span>
        {/* 인증 뱃지 */}
        {card.certified && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-toss-success shadow-toss-xs ring-2 ring-toss-bg-base">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5l2 2.5 4-4"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        {/* 지역 뱃지 (EN/JP/KR) — 인증 뱃지가 없을 때만 노출 */}
        {!card.certified && card.region && (
          <span className="absolute right-2 top-2 rounded-toss-sm bg-black/55 px-1.5 py-0.5 text-toss-micro font-semibold text-white shadow-toss-xs">
            {card.region}
          </span>
        )}
      </div>

      {/* 정보 */}
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-center gap-1">
          <p className="truncate text-toss-label font-semibold text-toss-text-primary">
            {card.name}
          </p>
          <Tag color="neutral" shape="soft" className="shrink-0 text-toss-micro">
            {card.grade}
          </Tag>
        </div>
        <p className="mt-0.5 truncate text-toss-caption text-toss-text-quaternary">
          {card.set} · No.{card.number}
        </p>
        <p className="mt-2 toss-numeric text-toss-subtitle font-extrabold leading-none text-toss-warning">
          ₩{card.valueKrw.toLocaleString("ko-KR")}
        </p>
        <p className="mt-1.5 truncate text-toss-caption text-toss-text-quaternary">
          {card.collector} · {card.addedAt}
        </p>
      </div>
    </Link>
  );
}

export function CardStageCarousel({
  cards,
  locale,
}: {
  cards: CardItem[];
  locale: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 한 칸(카드 폭 + gap) 단위로 스크롤
  const step = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    const cardW = first ? first.offsetWidth + gap : el.clientWidth * 0.8;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;

    if (dir === 1 && atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: dir * cardW, behavior: "smooth" });
    }
  }, []);

  const startAuto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => step(1), AUTO_INTERVAL);
  }, [step]);

  const stopAuto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [startAuto, stopAuto]);

  const handleArrow = (dir: 1 | -1) => {
    step(dir);
    startAuto(); // 수동 조작 시 타이머 리셋
  };

  return (
    <section>
      {/* Header */}
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-toss-subtitle">오늘의 컬렉션</CardTitle>
          <p className="mt-0.5 text-toss-caption text-toss-text-quaternary">
            컬렉터들이 지금 등록하고 있는 카드
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleArrow(-1)}
              aria-label="이전"
              className="flex h-8 w-8 items-center justify-center rounded-full text-toss-icon transition-colors hover:bg-toss-hover"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => handleArrow(1)}
              aria-label="다음"
              className="flex h-8 w-8 items-center justify-center rounded-full text-toss-icon transition-colors hover:bg-toss-hover"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Link
            href={`/${locale}/profile/yujin?tab=collection`}
            className="text-toss-caption text-toss-text-tertiary transition-colors hover:text-toss-text-primary"
          >
            전체보기 →
          </Link>
        </div>
      </CardHeader>

      {/* 가로 슬라이드 행 (op.gg 스타일) */}
      <div
        ref={scrollerRef}
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        className="flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((c, i) => (
          <CardTile key={c.uid} card={c} rank={i + 1} locale={locale} />
        ))}
      </div>
    </section>
  );
}
