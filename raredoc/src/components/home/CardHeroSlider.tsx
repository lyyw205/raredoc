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

const RANK = [
  { emoji: "👑", label: "1위", bg: "#EAB308", color: "#000" },
  { emoji: "🥈", label: "2위", bg: "#CBD5E1", color: "#1e293b" },
  { emoji: "🥉", label: "3위", bg: "#92400E", color: "#fff" },
];

function getStyle(rawDist: number, total: number) {
  let d = rawDist;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  const abs = Math.abs(d);
  return {
    tx: d * 192,
    scale: Math.max(0.38, 1 - abs * 0.18),
    opacity: abs > 2 ? 0 : Math.max(0, 1 - abs * 0.40),
    z: 20 - abs * 3,
  };
}

export function CardHeroSlider({
  cards,
  locale,
}: {
  cards: CardItem[];
  locale: string;
}) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setCurrent((p) => (p + 1) % cards.length),
      3600
    );
  }, [cards.length]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  const go = (i: number) => {
    setCurrent(i);
    resetTimer();
  };

  const card = cards[current];
  const badge = current < 3 ? RANK[current] : null;

  return (
    <div className="w-full rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5">
        <div>
          <h2 className="text-sm font-semibold text-white">최근 등록 · 가격순</h2>
          <p className="text-xs text-gray-600 mt-0.5">커뮤니티가 오늘 등록한 카드</p>
        </div>
        <Link
          href={`/${locale}/recent`}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          전체보기 →
        </Link>
      </div>

      {/* Rank badge zone — gives badge space above stage without clipping */}
      <div className="relative h-9 flex items-end justify-center pb-1">
        {badge && (
          <div
            key={`badge-${current}`}
            className="flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 rounded-full shadow-lg"
            style={{
              background: badge.bg,
              color: badge.color,
              boxShadow: `0 3px 12px ${badge.bg}55`,
              animation: "badgePop 0.35s cubic-bezier(.22,1,.36,1) both",
            }}
          >
            {badge.emoji} {badge.label}
          </div>
        )}
        <style>{`
          @keyframes badgePop {
            from { opacity: 0; transform: scale(0.72) translateY(4px); }
            to   { opacity: 1; transform: scale(1)    translateY(0); }
          }
        `}</style>
      </div>

      {/* Stage */}
      <div className="relative" style={{ height: 260 }}>
        {/* Spotlight glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 80% at 50% 100%, rgba(234,179,8,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Cards — absolutely positioned, slide via CSS transition */}
        <div className="absolute inset-0 flex items-end justify-center">
          {cards.map((c, i) => {
            const { tx, scale, opacity, z } = getStyle(i - current, cards.length);
            const isActive = i === current;
            return (
              <div
                key={c.id}
                className="absolute"
                style={{
                  bottom: 0,
                  width: 162,
                  transform: `translateX(${tx}px) scale(${scale})`,
                  transformOrigin: "bottom center",
                  opacity,
                  zIndex: z,
                  transition:
                    "transform 0.72s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.72s cubic-bezier(0.25, 0.1, 0.25, 1)",
                  cursor: isActive ? "default" : "pointer",
                }}
                onClick={isActive ? undefined : () => go(i)}
              >
                {/* Certified dot */}
                {isActive && c.certified && (
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-green-500 ring-2 ring-gray-900 flex items-center justify-center shadow">
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path
                        d="M1.5 4.5l2 2 4-4"
                        stroke="white"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="w-full rounded-xl block"
                  style={
                    isActive
                      ? {
                          boxShadow:
                            "0 0 52px rgba(234,179,8,0.18), 0 20px 44px rgba(0,0,0,0.7)",
                          outline: "2px solid rgba(234,179,8,0.22)",
                          outlineOffset: "2px",
                        }
                      : {}
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Card info */}
      <div className="text-center pt-5 pb-4 px-6">
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
          style={{ fontSize: 26 }}
        >
          ₩{card.valueKrw.toLocaleString("ko-KR")}
        </p>
        <p className="text-xs text-gray-600 mt-1.5">
          <span className="text-gray-400 font-medium">{card.collector}</span> ·{" "}
          {card.addedAt}
        </p>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 pb-5">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === current ? 22 : 6,
              height: 6,
              background: i === current ? "#EAB308" : "#374151",
            }}
          />
        ))}
      </div>
    </div>
  );
}
