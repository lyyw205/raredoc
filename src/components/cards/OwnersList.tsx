"use client";

import { useState, useMemo } from "react";

export type Owner = {
  username: string;
  displayName: string;
  initial: string;
  tier: "LEGEND" | "DIAMOND" | "GOLD" | "SILVER" | "BRONZE";
  grade: "NM" | "LP" | "MP" | "HP";
  certified: boolean;
  askingPrice: number | null;
  offerAvailable: boolean;
  addedAt: string;
};

const TIER_RING: Record<Owner["tier"], string> = {
  LEGEND:  "ring-purple-400",
  DIAMOND: "ring-cyan-400",
  GOLD:    "ring-yellow-500",
  SILVER:  "ring-slate-400",
  BRONZE:  "ring-amber-700",
};

const GRADE_COLOR: Record<Owner["grade"], string> = {
  NM: "bg-green-900/60 text-green-300",
  LP: "bg-blue-900/60 text-blue-300",
  MP: "bg-yellow-900/60 text-yellow-300",
  HP: "bg-orange-900/60 text-orange-300",
};

type Filter = "all" | "offerable" | "withPrice";
type Sort = "priceAsc" | "priceDesc" | "gradeBest" | "recent";

export function OwnersList({ owners, locale, cardId }: { owners: Owner[]; locale: string; cardId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort]     = useState<Sort>("priceAsc");

  const filtered = useMemo(() => {
    let list = owners.slice();
    if (filter === "offerable") list = list.filter((o) => o.offerAvailable);
    if (filter === "withPrice") list = list.filter((o) => o.askingPrice != null);

    list.sort((a, b) => {
      switch (sort) {
        case "priceAsc":  return (a.askingPrice ?? Infinity) - (b.askingPrice ?? Infinity);
        case "priceDesc": return (b.askingPrice ?? -Infinity) - (a.askingPrice ?? -Infinity);
        case "gradeBest": {
          const order: Owner["grade"][] = ["NM", "LP", "MP", "HP"];
          return order.indexOf(a.grade) - order.indexOf(b.grade);
        }
        case "recent":    return a.addedAt.localeCompare(b.addedAt);
      }
    });
    return list;
  }, [owners, filter, sort]);

  const totalOfferable = owners.filter((o) => o.offerAvailable).length;
  const totalWithPrice = owners.filter((o) => o.askingPrice != null).length;

  return (
    <div className="space-y-4">
      {/* 필터 + 정렬 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          {([
            ["all",       "전체",         owners.length],
            ["offerable", "제안 가능",    totalOfferable],
            ["withPrice", "호가 있음",    totalWithPrice],
          ] as [Filter, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                filter === key
                  ? "bg-white text-black font-semibold"
                  : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              {label} <span className="ml-0.5 opacity-60">{count}</span>
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="text-xs bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-gray-300 hover:border-gray-700 focus:outline-none focus:border-gray-500"
        >
          <option value="priceAsc">호가 낮은 순</option>
          <option value="priceDesc">호가 높은 순</option>
          <option value="gradeBest">등급 좋은 순</option>
          <option value="recent">최신 등록순</option>
        </select>
      </div>

      {/* 보유자 카드 리스트 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-600 rounded-xl border border-gray-800 bg-gray-900">
            조건에 맞는 보유자가 없습니다.
          </div>
        ) : (
          filtered.map((o) => (
            <div
              key={o.username}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
                o.offerAvailable
                  ? "bg-gray-900 border-gray-800"
                  : "bg-gray-900/40 border-gray-800/50 opacity-60"
              }`}
            >
              {/* 아바타 */}
              <a href={`/${locale}/profile/${o.username}`} className="shrink-0">
                <div
                  className={`w-10 h-10 rounded-full bg-gray-700 ring-2 ${TIER_RING[o.tier]} flex items-center justify-center text-sm font-bold text-white hover:ring-offset-2 hover:ring-offset-gray-950 transition-all`}
                >
                  {o.initial}
                </div>
              </a>

              {/* 유저 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`/${locale}/profile/${o.username}`}
                    className="text-sm font-semibold text-gray-100 hover:text-white truncate transition-colors"
                  >
                    {o.displayName}
                  </a>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${GRADE_COLOR[o.grade]}`}>
                    {o.grade}
                  </span>
                  {o.certified && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
                      PSA인증
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  @{o.username} · {o.addedAt}
                </p>
              </div>

              {/* 호가 */}
              <div className="text-right shrink-0 min-w-[80px]">
                {o.askingPrice != null ? (
                  <>
                    <p className="text-sm font-bold text-yellow-400">
                      ₩{o.askingPrice.toLocaleString("ko-KR")}
                    </p>
                    <p className="text-[10px] text-gray-600">희망 호가</p>
                  </>
                ) : (
                  <p className="text-[11px] text-gray-600">호가 미공개</p>
                )}
              </div>

              {/* 제안 버튼 */}
              {o.offerAvailable ? (
                <a
                  href={`/${locale}/messages/c1?cardId=${cardId}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  구매 제안
                </a>
              ) : (
                <span className="shrink-0 text-[10px] text-gray-600 whitespace-nowrap px-2">
                  제안 불가
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
