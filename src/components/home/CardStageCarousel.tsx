"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type CardItem = {
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
};

const RANK_BADGE = [
  { emoji: "👑", label: "1위", bg: "#EAB308", color: "#000" },
  { emoji: "🥈", label: "2위", bg: "#CBD5E1", color: "#1e293b" },
  { emoji: "🥉", label: "3위", bg: "#92400E", color: "#fff" },
];

export function CardStageCarousel({
  cards,
  locale,
}: {
  cards: CardItem[];
  locale: string;
}) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setIdx((p) => (p + 1) % cards.length),
      3200
    );
  }, [cards.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const navigate = (n: number) => {
    setIdx((n + cards.length) % cards.length);
    startTimer();
  };

  const prev = (idx - 1 + cards.length) % cards.length;
  const next = (idx + 1) % cards.length;
  const card = cards[idx];
  const badge = RANK_BADGE[idx];

  return (
    <>
      <style>{`
        @keyframes stageIn {
          from { opacity: 0; transform: scale(0.91) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0px); }
        }
        @keyframes badgeIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.7) translateY(-4px); }
          to   { opacity: 1; transform: translateX(-50%) scale(1)   translateY(0); }
        }
        .card-stage-in  { animation: stageIn  0.45s cubic-bezier(.22,1,.36,1) both; }
        .badge-stage-in { animation: badgeIn  0.35s cubic-bezier(.22,1,.36,1) 0.1s both; }
      `}</style>

      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div>
            <h2 className="text-sm font-semibold text-white">최근 등록 · 가격순</h2>
            <p className="text-xs text-gray-600 mt-0.5">커뮤니티가 오늘 등록한 카드</p>
          </div>
          <Link
            href={`/${locale}/collection`}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            전체보기 →
          </Link>
        </div>

        {/* Stage */}
        <div className="relative pt-10 pb-6 select-none">
          {/* Spotlight glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-80 h-80 rounded-full blur-[64px]"
              style={{ background: "radial-gradient(circle, rgba(234,179,8,0.10) 0%, transparent 70%)" }}
            />
          </div>

          {/* Cards row */}
          <div className="flex items-end justify-center">
            {/* Prev card */}
            <button
              aria-label="이전 카드"
              onClick={() => navigate(prev)}
              className="shrink-0 cursor-pointer"
              style={{
                width: 108,
                opacity: 0.25,
                transform: "scale(0.64) translateY(16px)",
                transformOrigin: "bottom center",
                transition: "opacity 0.3s",
              }}
            >
              <img
                src={cards[prev].imageUrl}
                alt={cards[prev].name}
                className="w-full rounded-xl"
              />
            </button>

            {/* Active center */}
            <div className="relative shrink-0 z-10" style={{ width: 188 }}>
              {/* Rank badge */}
              {badge && (
                <div
                  key={`badge-${idx}`}
                  className="badge-stage-in absolute z-20 flex items-center gap-1 text-[12px] font-bold px-3 py-1 rounded-full shadow-xl"
                  style={{
                    top: -22,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: badge.bg,
                    color: badge.color,
                    whiteSpace: "nowrap",
                    boxShadow: `0 4px 16px ${badge.bg}55`,
                  }}
                >
                  {badge.emoji} {badge.label}
                </div>
              )}

              {/* Certified dot */}
              {card.certified && (
                <div className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md ring-2 ring-gray-900">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2 2.5 4-4"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}

              <div
                key={`card-${idx}`}
                className="card-stage-in w-full rounded-2xl overflow-hidden"
                style={{
                  boxShadow: "0 0 52px rgba(234,179,8,0.22), 0 20px 48px rgba(0,0,0,0.6)",
                  outline: "2px solid rgba(234,179,8,0.28)",
                  outlineOffset: "2px",
                }}
              >
                <img src={card.imageUrl} alt={card.name} className="w-full block" />
              </div>
            </div>

            {/* Next card */}
            <button
              aria-label="다음 카드"
              onClick={() => navigate(next)}
              className="shrink-0 cursor-pointer"
              style={{
                width: 108,
                opacity: 0.25,
                transform: "scale(0.64) translateY(16px)",
                transformOrigin: "bottom center",
                transition: "opacity 0.3s",
              }}
            >
              <img
                src={cards[next].imageUrl}
                alt={cards[next].name}
                className="w-full rounded-xl"
              />
            </button>
          </div>

          {/* Card info below */}
          <div className="text-center mt-6 px-6">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <span className="text-[15px] font-bold text-white">{card.name}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-medium">
                {card.grade}
              </span>
              {card.certified && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 font-bold">
                  인증
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {card.set} · No.{card.number}
            </p>
            <p
              className="font-extrabold text-yellow-400 mt-2 leading-none tracking-tight"
              style={{ fontSize: 28 }}
            >
              ₩{card.valueKrw.toLocaleString("ko-KR")}
            </p>
            <p className="text-xs text-gray-600 mt-1.5">
              <span className="text-gray-400 font-medium">{card.collector}</span>{" "}
              · {card.addedAt}
            </p>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => navigate(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === idx ? 20 : 6,
                  height: 6,
                  background: i === idx ? "#EAB308" : "#374151",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
