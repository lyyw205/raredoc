"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { SERIES_KO } from "@/lib/constants";

interface SetItem {
  id: string;
  name: string;
  nameKo: string | null;
  series: string;
  releaseDate: Date;
  cardCount: number;
  logoUrl: string | null;
  symbolUrl: string | null;
}

export function ExpansionSidebar({
  sets,
  locale,
}: {
  sets: SetItem[];
  locale: string;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const filtered = query
    ? sets.filter((s) => {
        const q = query.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.nameKo ?? "").toLowerCase().includes(q)
        );
      })
    : sets;

  const grouped = new Map<string, SetItem[]>();
  filtered.forEach((s) => {
    if (!grouped.has(s.series)) grouped.set(s.series, []);
    grouped.get(s.series)!.push(s);
  });

  return (
    // max-h: 헤더(56px) + 레이아웃 상단 패딩(16px) 제외한 뷰포트 높이
    <div className="flex flex-col max-h-[calc(100vh-72px)]">
      {/* 검색 */}
      <div className="p-3 border-b border-gray-800 shrink-0">
        <input
          type="text"
          placeholder="확장팩 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 transition-shadow"
        />
      </div>

      {/* 목록 */}
      <div className="overflow-y-auto flex-1 pb-4">
        {grouped.size === 0 && (
          <p className="text-center text-sm text-gray-500 py-10">검색 결과 없음</p>
        )}
        {Array.from(grouped.entries()).map(([series, seriesSets]) => (
          <div key={series}>
            {/* 시리즈 헤더 */}
            <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
              {locale === "ko" ? (SERIES_KO[series] ?? series) : series}
              <span className="ml-1 font-normal opacity-70">({seriesSets.length})</span>
            </div>

            {/* 팩 목록 */}
            {seriesSets.map((set) => {
              const isActive = pathname.endsWith(`/expansions/${set.id}`);
              const year = new Date(set.releaseDate).getFullYear();
              const displayName = locale === "ko" ? (set.nameKo ?? set.name) : set.name;

              return (
                <Link
                  key={set.id}
                  href={`/${locale}/expansions/${set.id}`}
                  className={`flex items-center gap-3 px-3 py-2 border-l-2 transition-colors ${
                    isActive
                      ? "bg-gray-800 border-red-500"
                      : "border-transparent hover:bg-gray-800/50 hover:border-gray-600"
                  }`}
                >
                  {/* 로고 */}
                  <div className="w-10 h-6 shrink-0 flex items-center justify-center">
                    {set.logoUrl ? (
                      <img
                        src={set.logoUrl}
                        alt={set.name}
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-gray-600 text-base">📦</span>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm truncate leading-tight ${
                        isActive ? "text-white font-medium" : "text-gray-300"
                      }`}
                    >
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {year} · {set.cardCount}장
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
