"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { RARITY_KO, RARITY_ORDER } from "@/lib/constants";

type ViewFilter = "all" | "owned" | "missing";

interface BookCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  imageSmall: string;
  owned: boolean;
  grade?: string;
  certified?: boolean;
}

interface SetInfo {
  id: string;
  name: string;
  total: number;
  logoUrl?: string;
}

function rarityRank(rarity?: string) {
  if (!rarity) return 99;
  const idx = RARITY_ORDER.indexOf(rarity);
  return idx === -1 ? 50 : idx;
}

export function CollectionBook({
  set,
  cards,
}: {
  set: SetInfo;
  cards: BookCard[];
}) {
  const locale = useLocale();
  const [view, setView] = useState<ViewFilter>("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");

  const owned = cards.filter((c) => c.owned).length;
  const pct = Math.round((owned / cards.length) * 100);

  // 세트 내 희귀도 목록
  const rarities = useMemo(() => {
    const set = new Set(cards.map((c) => c.rarity ?? "Unknown"));
    return ["all", ...RARITY_ORDER.filter((r) => set.has(r)), ...[...set].filter((r) => !RARITY_ORDER.includes(r))];
  }, [cards]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (view === "owned" && !c.owned) return false;
      if (view === "missing" && c.owned) return false;
      if (rarityFilter !== "all" && c.rarity !== rarityFilter) return false;
      return true;
    });
  }, [cards, view, rarityFilter]);

  // 희귀도별 그룹
  const grouped = useMemo(() => {
    const map = new Map<string, BookCard[]>();
    for (const card of filtered) {
      const key = card.rarity ?? "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return [...map.entries()].sort(([a], [b]) => rarityRank(a) - rarityRank(b));
  }, [filtered]);

  const GRADE_COLOR: Record<string, string> = {
    NM: "bg-green-600", LP: "bg-blue-600", MP: "bg-yellow-600",
    HP: "bg-orange-600", D: "bg-red-700",
  };

  return (
    <div>
      {/* 세트 헤더 */}
      <div className="mb-6 p-5 rounded-xl bg-gray-900 border border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          {set.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={set.logoUrl} alt={set.name} className="h-8 object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{set.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">전체 {set.total}장</p>
          </div>
          <Link
            href={`/${locale}/profile/yujin?tab=collection`}
            className="ml-auto text-xs text-gray-500 hover:text-white transition-colors"
          >
            ← 컬렉션으로
          </Link>
        </div>

        {/* 완성도 */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">{owned} / {cards.length}</span>
              <span className={`font-bold ${pct >= 80 ? "text-yellow-400" : pct >= 50 ? "text-blue-400" : "text-gray-400"}`}>
                {pct}%
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pct >= 80 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                  pct >= 50 ? "bg-gradient-to-r from-blue-700 to-blue-400" : "bg-gray-600"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold text-yellow-400 shrink-0">{pct}%</div>
        </div>

        {/* 희귀도별 현황 */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-800">
          {[...new Map(cards.map((c) => [c.rarity ?? "Unknown", 0]))]
            .map(([r]) => ({
              rarity: r,
              total: cards.filter((c) => (c.rarity ?? "Unknown") === r).length,
              owned: cards.filter((c) => (c.rarity ?? "Unknown") === r && c.owned).length,
            }))
            .sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity))
            .map(({ rarity, total, owned: o }) => (
              <div key={rarity} className="text-center">
                <p className="text-xs font-bold text-gray-300">{o}/{total}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {locale === "ko" ? (RARITY_KO[rarity] ?? rarity) : rarity}
                </p>
              </div>
            ))
          }
        </div>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* 보유 필터 */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
          {([["all", "전체"], ["owned", "보유"], ["missing", "미보유"]] as [ViewFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === key ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
              <span className={`ml-1 ${view === key ? "text-gray-400" : "text-gray-600"}`}>
                {key === "all" ? cards.length : key === "owned" ? owned : cards.length - owned}
              </span>
            </button>
          ))}
        </div>

        {/* 희귀도 필터 */}
        <div className="flex gap-1 flex-wrap">
          {rarities.map((r) => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                rarityFilter === r
                  ? "bg-gray-700 text-white"
                  : "text-gray-600 hover:text-gray-400 border border-gray-800"
              }`}
            >
              {r === "all" ? "전체 등급" : (locale === "ko" ? (RARITY_KO[r] ?? r) : r)}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 (희귀도별 그룹) */}
      <div className="space-y-8">
        {grouped.map(([rarity, groupCards]) => (
          <div key={rarity}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                {locale === "ko" ? (RARITY_KO[rarity] ?? rarity) : rarity}
              </h2>
              <span className="text-xs text-gray-600">
                {groupCards.filter((c) => c.owned).length}/{groupCards.length}
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-2">
              {groupCards
                .sort((a, b) => parseInt(a.number) - parseInt(b.number) || a.number.localeCompare(b.number))
                .map((card) => (
                  <Link
                    key={card.id}
                    href={`/${locale}/cards/${card.id}`}
                    className="relative group"
                    title={`#${card.number} ${card.name}`}
                  >
                    <div className={`rounded-lg overflow-hidden border transition-all ${
                      card.owned
                        ? "border-gray-700 group-hover:border-gray-400"
                        : "border-gray-800/50 opacity-30 group-hover:opacity-50"
                    }`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.imageSmall}
                        alt={card.name}
                        className={`w-full aspect-[2.5/3.5] object-cover ${
                          card.owned ? "" : "grayscale"
                        }`}
                      />
                    </div>

                    {/* 보유 뱃지 */}
                    {card.owned && card.grade && (
                      <span className={`absolute bottom-1 left-1 text-[9px] font-bold text-white px-1 py-0.5 rounded ${GRADE_COLOR[card.grade] ?? "bg-gray-600"}`}>
                        {card.grade}
                      </span>
                    )}
                    {card.owned && card.certified && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 border border-gray-900" />
                    )}

                    {/* 번호 */}
                    <p className="text-[9px] text-gray-600 text-center mt-0.5 leading-none truncate">
                      #{card.number}
                    </p>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
