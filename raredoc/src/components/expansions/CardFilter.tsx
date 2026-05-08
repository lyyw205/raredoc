"use client";
import { useState, useMemo } from "react";
import { RARITY_KO, RARITY_ORDER } from "@/lib/constants";

interface CardData {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  supertype?: string;
  subtypes?: string[];
  artist?: string;
  imageSmall: string;
  imageLarge: string;
  price?: { normal?: number | null; holofoil?: number | null };
}

type ViewMode = "grid" | "list" | "table";
type SortKey = "number" | "price_asc" | "price_desc" | "rarity" | "name";

interface Props {
  cards: CardData[];
  locale: string;
}

export function CardFilter({ cards, locale }: Props) {
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("number");
  const [filterSupertype, setFilterSupertype] = useState<string>("all");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const supertypes = useMemo(
    () => ["all", ...Array.from(new Set(cards.map((c) => c.supertype).filter(Boolean)))],
    [cards]
  );
  const rarities = useMemo(() => {
    const found = Array.from(new Set(cards.map((c) => c.rarity).filter(Boolean))) as string[];
    return ["all", ...found.sort((a, b) => RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b))];
  }, [cards]);
  const types = useMemo(
    () => ["all", ...Array.from(new Set(cards.flatMap((c) => c.types ?? [])))],
    [cards]
  );

  const filtered = useMemo(() => {
    let result = cards.filter((c) => {
      if (filterSupertype !== "all" && c.supertype !== filterSupertype) return false;
      if (filterRarity !== "all" && c.rarity !== filterRarity) return false;
      if (filterType !== "all" && !(c.types ?? []).includes(filterType)) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      const ap = a.price?.holofoil ?? a.price?.normal ?? 0;
      const bp = b.price?.holofoil ?? b.price?.normal ?? 0;
      switch (sort) {
        case "price_desc":
          return bp - ap;
        case "price_asc":
          return ap - bp;
        case "rarity":
          return (
            RARITY_ORDER.indexOf(b.rarity ?? "") - RARITY_ORDER.indexOf(a.rarity ?? "")
          );
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return a.number.localeCompare(b.number, undefined, { numeric: true });
      }
    });

    return result;
  }, [cards, filterSupertype, filterRarity, filterType, sort, search]);

  const displayPrice = (card: CardData) => {
    const p = card.price?.holofoil ?? card.price?.normal;
    return p ? `$${p.toFixed(2)}` : "—";
  };

  return (
    <div>
      {/* 컨트롤 바 */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="카드 이름 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 w-48"
        />

        <select
          value={filterSupertype}
          onChange={(e) => setFilterSupertype(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none"
        >
          {supertypes.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "전체 타입" : s}
            </option>
          ))}
        </select>

        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none"
        >
          {rarities.map((r) => (
            <option key={r} value={r}>
              {r === "all" ? "전체 희귀도" : locale === "ko" ? (RARITY_KO[r] ?? r) : r}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "전체 속성" : t}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none"
        >
          <option value="number">번호순</option>
          <option value="price_desc">가격 높은순</option>
          <option value="price_asc">가격 낮은순</option>
          <option value="rarity">희귀도순</option>
          <option value="name">이름순</option>
        </select>

        <div className="ml-auto flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {(["grid", "list", "table"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                view === v ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {v === "grid" ? "그리드" : v === "list" ? "리스트" : "테이블"}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-500">{filtered.length}장</span>
      </div>

      {/* 그리드 뷰 */}
      {view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((card) => (
            <a
              key={card.id}
              href={`../../cards/${card.id}`}
              className="group block rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-600 transition-all overflow-hidden"
            >
              <div className="bg-gray-800 flex items-center justify-center p-2 aspect-[2/3]">
                <img
                  src={card.imageSmall}
                  alt={card.name}
                  className="h-full object-contain group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-white truncate">{card.name}</p>
                <p className="text-xs text-gray-500">#{card.number}</p>
                {card.rarity && (
                  <p className="text-xs text-gray-400 truncate">
                    {locale === "ko" ? (RARITY_KO[card.rarity] ?? card.rarity) : card.rarity}
                  </p>
                )}
                <p className="text-xs font-semibold mt-1 text-yellow-400">{displayPrice(card)}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 리스트 뷰 */}
      {view === "list" && (
        <div className="space-y-2">
          {filtered.map((card) => (
            <a
              key={card.id}
              href={`../../cards/${card.id}`}
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-600 transition-all"
            >
              <img
                src={card.imageSmall}
                alt={card.name}
                className="h-16 w-12 object-contain flex-shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{card.name}</p>
                <p className="text-xs text-gray-500">
                  #{card.number} ·{" "}
                  {card.rarity
                    ? locale === "ko"
                      ? (RARITY_KO[card.rarity] ?? card.rarity)
                      : card.rarity
                    : ""}
                </p>
                {card.artist && <p className="text-xs text-gray-600">{card.artist}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-yellow-400">{displayPrice(card)}</p>
                {card.price?.holofoil && card.price?.normal && (
                  <p className="text-xs text-gray-500">노말 ${card.price.normal?.toFixed(2)}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 테이블 뷰 */}
      {view === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="pb-2 pr-4 font-medium">번호</th>
                <th className="pb-2 pr-4 font-medium">카드</th>
                <th className="pb-2 pr-4 font-medium">희귀도</th>
                <th className="pb-2 pr-4 font-medium">속성</th>
                <th className="pb-2 pr-4 font-medium">노말</th>
                <th className="pb-2 font-medium">홀로포일</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => (
                <tr
                  key={card.id}
                  className="border-b border-gray-900 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-2 pr-4 text-gray-500">#{card.number}</td>
                  <td className="py-2 pr-4">
                    <a
                      href={`../../cards/${card.id}`}
                      className="flex items-center gap-2 hover:text-red-400 transition-colors"
                    >
                      <img
                        src={card.imageSmall}
                        alt={card.name}
                        className="h-10 w-7 object-contain"
                        loading="lazy"
                      />
                      <span className="text-white font-medium">{card.name}</span>
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {card.rarity
                      ? locale === "ko"
                        ? (RARITY_KO[card.rarity] ?? card.rarity)
                        : card.rarity
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {(card.types ?? []).join(", ") || "—"}
                  </td>
                  <td className="py-2 pr-4 text-yellow-400">
                    {card.price?.normal ? `$${card.price.normal.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 text-yellow-400">
                    {card.price?.holofoil ? `$${card.price.holofoil.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
