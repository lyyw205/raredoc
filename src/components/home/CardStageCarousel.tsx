"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Tag } from "@/components/toss";

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

// 1위는 강조(warning solid), 2·3위는 약하게 — 토스 단일 톤 정책 (warning 계열만 사용)
const RANK_BADGE = [
  { emoji: "👑", label: "1위", bg: "var(--toss-warning)",      color: "#fff" },
  { emoji: "🥈", label: "2위", bg: "var(--toss-text-tertiary)", color: "#fff" },
  { emoji: "🥉", label: "3위", bg: "var(--toss-warning-weak)",  color: "var(--toss-warning)" },
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

  const VISIBLE_SIDE = 4;
  const card = cards[idx];
  const badge = RANK_BADGE[idx];

  function offset(i: number) {
    let d = i - idx;
    if (d > cards.length / 2) d -= cards.length;
    if (d < -cards.length / 2) d += cards.length;
    return d;
  }

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

      <Card padding="none" className="overflow-hidden">
        {/* Header */}
        <CardHeader className="px-5 pt-5 pb-1">
          <div>
            <CardTitle className="text-toss-subtitle">최근 등록 · 가격순</CardTitle>
            <p className="text-toss-caption text-toss-text-quaternary mt-0.5">커뮤니티가 오늘 등록한 카드</p>
          </div>
          <Link
            href={`/${locale}/profile/yujin?tab=collection`}
            className="text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary transition-colors"
          >
            전체보기 →
          </Link>
        </CardHeader>

        {/* Stage */}
        <div className="relative pt-10 pb-6 select-none">
          {/* Spotlight glow (라이트 모드에서도 살짝 강조) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-80 h-80 rounded-full blur-[64px]"
              style={{ background: "radial-gradient(circle, rgba(255,177,52,0.16) 0%, transparent 70%)" }}
            />
          </div>

          {/* Cards row */}
          <div className="relative h-[280px] flex items-center justify-center">
            {cards.map((c, i) => {
              const d = offset(i);
              const abs = Math.abs(d);
              if (abs > VISIBLE_SIDE) return null;
              const isActive = d === 0;
              const scale = isActive ? 1 : Math.max(0.34, 1 - abs * 0.14);
              const tx = d * 105;
              const opacity = isActive ? 1 : Math.max(0.18, 0.78 - abs * 0.14);
              const z = 20 - abs;

              return (
                <button
                  key={c.id}
                  aria-label={isActive ? undefined : `${c.name} 으로 이동`}
                  onClick={() => !isActive && navigate(i)}
                  className={isActive ? "absolute cursor-default" : "absolute cursor-pointer"}
                  style={{
                    width: 188,
                    transform: `translateX(${tx}px) scale(${scale})`,
                    transformOrigin: "bottom center",
                    opacity,
                    zIndex: z,
                    transition: "transform 0.45s cubic-bezier(.22,1,.36,1), opacity 0.3s",
                  }}
                >
                  <div className="relative">
                    {isActive && badge && (
                      <div
                        key={`badge-${idx}`}
                        className="badge-stage-in absolute z-20 flex items-center gap-1 text-toss-micro font-bold px-3 py-1 rounded-toss-pill shadow-toss-md"
                        style={{
                          top: -22,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: badge.bg,
                          color: badge.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {badge.emoji} {badge.label}
                      </div>
                    )}
                    {isActive && c.certified && (
                      <div className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-toss-success flex items-center justify-center shadow-toss-md ring-2 ring-toss-bg-base">
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
                      className={`w-full overflow-hidden ${isActive ? "rounded-toss-xl" : "rounded-toss-lg"}`}
                      style={
                        isActive
                          ? {
                              boxShadow:
                                "0 0 52px rgba(255,177,52,0.20), 0 12px 32px rgba(0,0,0,0.12)",
                              outline: "2px solid rgba(255,177,52,0.32)",
                              outlineOffset: "2px",
                            }
                          : undefined
                      }
                    >
                      <img src={c.imageUrl} alt={c.name} className="w-full block" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Card info below */}
          <div className="text-center mt-6 px-6">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <span className="text-toss-subtitle font-bold text-toss-text-primary">{card.name}</span>
              <Tag color="neutral" shape="soft" className="text-toss-micro">{card.grade}</Tag>
              {card.certified && (
                <Tag color="success" shape="soft" className="text-toss-micro">인증</Tag>
              )}
            </div>
            <p className="text-toss-caption text-toss-text-tertiary">
              {card.set} · No.{card.number}
            </p>
            <p
              className="font-extrabold text-toss-warning mt-2 leading-none tracking-tight toss-numeric"
              style={{ fontSize: 28 }}
            >
              ₩{card.valueKrw.toLocaleString("ko-KR")}
            </p>
            <p className="text-toss-caption text-toss-text-quaternary mt-1.5">
              <span className="text-toss-text-tertiary font-medium">{card.collector}</span>{" "}
              · {card.addedAt}
            </p>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => navigate(i)}
                aria-label={`${i + 1}번 카드`}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === idx ? 20 : 6,
                  height: 6,
                  background: i === idx ? "var(--toss-warning)" : "var(--toss-border-strong)",
                }}
              />
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
