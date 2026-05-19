"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RARITY_KO } from "@/lib/constants";
import type {
  CardSearchHit,
  CardSearchParams,
} from "@/lib/actions/searchCards";

interface CardSidebarProps {
  locale: string;
  initial: CardSearchHit[];
  filterOptions: {
    types: string[];
    rarities: string[];
    sets: { id: string; name: string; nameKo: string | null }[];
  };
  fetcher: (params: CardSearchParams) => Promise<CardSearchHit[]>;
}

export function CardSidebar({
  locale,
  initial,
  filterOptions,
  fetcher,
}: CardSidebarProps) {
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");
  const [setId, setSetId] = useState("");
  const [results, setResults] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Debounce: refetch when filters change
  useEffect(() => {
    const isInitial =
      q === "" && type === "" && rarity === "" && setId === "";
    if (isInitial) {
      setResults(initial);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const next = await fetcher({ q, type, rarity, setId });
        setResults(next);
      });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, rarity, setId]);

  const clearAll = () => {
    setQ("");
    setType("");
    setRarity("");
    setSetId("");
  };

  const hasFilters =
    q !== "" || type !== "" || rarity !== "" || setId !== "";

  return (
    <div className="flex flex-col max-h-[calc(100vh-72px)]">
      {/* Search + filters */}
      <div className="p-3 border-b border-gray-800 shrink-0 space-y-2">
        <input
          type="text"
          placeholder="포켓몬 이름 검색..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none"
          >
            <option value="">타입 전체</option>
            {filterOptions.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
            className="bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none"
          >
            <option value="">희귀도 전체</option>
            {filterOptions.rarities.map((r) => (
              <option key={r} value={r}>
                {locale === "ko" ? RARITY_KO[r] ?? r : r}
              </option>
            ))}
          </select>
        </div>

        <select
          value={setId}
          onChange={(e) => setSetId(e.target.value)}
          className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none"
        >
          <option value="">확장팩 전체</option>
          {filterOptions.sets.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "ko" ? s.nameKo ?? s.name : s.name}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-white"
          >
            필터 초기화 ✕
          </button>
        )}
      </div>

      {/* Result list */}
      <div
        className={`overflow-y-auto flex-1 pb-4 transition-opacity ${
          pending ? "opacity-60" : "opacity-100"
        }`}
      >
        {results.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-10">
            결과 없음
          </p>
        ) : (
          results.map((card) => {
            const isActive = pathname.endsWith(`/cards/${card.id}`);
            const displayName =
              locale === "ko" ? card.nameKo ?? card.name : card.name;
            const setName =
              locale === "ko" ? card.setNameKo ?? card.setName : card.setName;
            const rarityDisplay = card.rarity
              ? locale === "ko"
                ? RARITY_KO[card.rarity] ?? card.rarity
                : card.rarity
              : null;

            return (
              <Link
                key={card.id}
                href={`/${locale}/cards/${card.id}`}
                className={`flex items-center gap-3 px-3 py-2 border-l-2 transition-colors ${
                  isActive
                    ? "bg-gray-800 border-red-500"
                    : "border-transparent hover:bg-gray-800/50 hover:border-gray-600"
                }`}
              >
                <div className="w-8 h-11 shrink-0 flex items-center justify-center bg-black/30 rounded overflow-hidden">
                  {card.imageSmall ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageSmall}
                      alt={card.name}
                      loading="lazy"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-600 text-base">🃏</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm truncate leading-tight ${
                      isActive ? "text-white font-medium" : "text-gray-300"
                    }`}
                  >
                    {displayName}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {setName} · #{card.number}
                    {rarityDisplay && (
                      <span className="ml-1 text-gray-600">· {rarityDisplay}</span>
                    )}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Count footer */}
      <div className="border-t border-gray-800 px-3 py-2 text-[11px] text-gray-500 shrink-0">
        {results.length}건 표시 {results.length >= 200 && "(상위 200건)"}
      </div>
    </div>
  );
}
