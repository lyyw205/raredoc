"use client";

import { useState } from "react";
import Link from "next/link";

export type RecentCard = {
  id: string;
  name: string;
  set: string;
  setId: string;
  number: string;
  grade: string;
  certified: boolean;
  valueKrw: number;
  imageUrl: string;
  collector: string;
  addedAt: string;
  daysAgo: number; // 0 = 오늘, 1 = 어제, …
  category: string;
};

const CATS = ["전체", "포켓몬 TCG", "유희왕", "스니커즈", "피규어"];
const PERIODS: { label: string; days: number }[] = [
  { label: "오늘", days: 0 },
  { label: "3일", days: 3 },
  { label: "7일", days: 7 },
];
const SORTS = [
  { id: "recent", label: "최신순" },
  { id: "price_desc", label: "가격 높은순" },
  { id: "price_asc", label: "가격 낮은순" },
];

const GRADE_COLOR: Record<string, string> = {
  NM: "text-green-400", LP: "text-yellow-400", MP: "text-orange-400",
  HP: "text-red-400",   DS: "text-blue-400",   VNDS: "text-blue-300",
  "1착": "text-cyan-400", "미개봉": "text-purple-400",
};

function CardTile({ card, locale }: { card: RecentCard; locale: string }) {
  const gradeColor = GRADE_COLOR[card.grade] ?? "text-gray-400";

  return (
    <div className="group relative flex flex-col cursor-pointer">
      {/* Card image */}
      <div className="relative rounded-xl overflow-hidden bg-gray-800/60 aspect-[63/88]">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-700">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="text-[10px] text-center px-2 leading-tight">{card.name}</span>
          </div>
        )}

        {/* Certified badge */}
        {card.certified && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 ring-2 ring-gray-900 flex items-center justify-center shadow-lg">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Hover overlay + price pill */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 rounded-xl" />
        <div className="absolute bottom-0 inset-x-0 px-2 pb-2 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
          <div className="bg-black/75 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-yellow-400 font-bold text-sm leading-none">
              ₩{card.valueKrw.toLocaleString("ko-KR")}
            </p>
          </div>
        </div>
      </div>

      {/* Info below card */}
      <div className="mt-2 px-0.5">
        <p className="text-[12px] font-semibold text-gray-200 group-hover:text-white transition-colors leading-snug line-clamp-1">
          {card.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-bold shrink-0 ${gradeColor}`}>{card.grade}</span>
          <span className="text-[10px] text-gray-600">·</span>
          <Link
            href={`/${locale}/profile/${card.collector}`}
            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors truncate"
            onClick={(e) => e.stopPropagation()}
          >
            @{card.collector}
          </Link>
          <span className="text-[10px] text-gray-700 ml-auto shrink-0">{card.addedAt}</span>
        </div>
        <p className="text-[11px] font-bold text-yellow-400/80 mt-0.5">
          ₩{card.valueKrw.toLocaleString("ko-KR")}
        </p>
      </div>
    </div>
  );
}

export function RecentFeed({
  cards,
  locale,
}: {
  cards: RecentCard[];
  locale: string;
}) {
  const [activeCat, setActiveCat] = useState("전체");
  const [periodDays, setPeriodDays] = useState(0);
  const [sort, setSort] = useState("recent");

  const filtered = cards.filter(
    (c) =>
      (activeCat === "전체" || c.category === activeCat) &&
      c.daysAgo <= periodDays
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price_desc") return b.valueKrw - a.valueKrw;
    if (sort === "price_asc") return a.valueKrw - b.valueKrw;
    return a.daysAgo - b.daysAgo; // 최신순: daysAgo 오름차순
  });

  const activePeriod = PERIODS.find((p) => p.days === periodDays)!;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/${locale}`} className="text-xs text-gray-600 hover:text-gray-400 transition-colors mb-3 inline-block">
          ← 홈으로
        </Link>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">최근 등록 카드</h1>
            <p className="text-sm text-gray-500 mt-0.5">컬렉터들이 등록한 수집품</p>
          </div>
          <span className="text-xs text-gray-600">{sorted.length}개</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Category */}
        <div className="flex gap-1.5 flex-wrap flex-1">
          {CATS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeCat === cat
                  ? "bg-yellow-500 border-yellow-500 text-black font-semibold"
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              {cat}
              {cat !== "전체" && (
                <span className="ml-1 opacity-60">
                  {cards.filter((c) => c.category === cat && c.daysAgo <= periodDays).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Period + Sort */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Period toggle */}
          <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriodDays(p.days)}
                className={`px-3 py-1.5 transition-colors ${
                  periodDays === p.days
                    ? "bg-gray-700 text-white font-semibold"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs bg-gray-900 border border-gray-700 text-gray-400 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gray-500"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Card grid */}
      {sorted.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-3 gap-y-6">
          {sorted.map((card) => (
            <CardTile key={card.id} card={card} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-gray-700">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-3">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-sm">{activePeriod.label} 이내 등록된 카드가 없습니다</p>
        </div>
      )}
    </div>
  );
}
