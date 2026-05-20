"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RARITY_KO } from "@/lib/constants";
import { Button, SearchField } from "@/components/toss";
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

// 토스 톤 native select className
const SELECT_CLASS =
  "w-full bg-toss-input-bg rounded-toss-md px-2.5 py-1.5 text-toss-caption " +
  "text-toss-text-primary border border-transparent " +
  "focus:outline-none focus:ring-2 focus:ring-toss-brand/30 cursor-pointer " +
  "appearance-none bg-no-repeat bg-[right_8px_center] " +
  "[background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'><path d='M1 1l4 4 4-4' stroke='%236B7684' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")] " +
  "pr-7";

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
    <div className="flex flex-col max-h-[calc(100vh-72px)] bg-toss-bg-base border border-toss-border rounded-toss-lg overflow-hidden">
      {/* Search + filters */}
      <div className="p-3 border-b border-toss-divider shrink-0 space-y-2">
        <SearchField
          placeholder="포켓몬 이름 검색..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="sm"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={SELECT_CLASS}
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
            className={SELECT_CLASS}
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
          className={SELECT_CLASS}
        >
          <option value="">확장팩 전체</option>
          {filterOptions.sets.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "ko" ? s.nameKo ?? s.name : s.name}
            </option>
          ))}
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-toss-caption"
          >
            필터 초기화 ✕
          </Button>
        )}
      </div>

      {/* Result list */}
      <div
        className={`overflow-y-auto flex-1 pb-4 transition-opacity ${
          pending ? "opacity-60" : "opacity-100"
        }`}
      >
        {results.length === 0 ? (
          <p className="text-center text-toss-caption text-toss-text-tertiary py-10">
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
                    ? "bg-toss-brand-weak border-toss-brand"
                    : "border-transparent hover:bg-toss-hover"
                }`}
              >
                <div className="w-8 h-11 shrink-0 flex items-center justify-center bg-toss-bg-muted rounded-toss-sm overflow-hidden">
                  {card.imageSmall ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageSmall}
                      alt={card.name}
                      loading="lazy"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-toss-text-quaternary text-base">🃏</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-toss-label truncate leading-tight ${
                      isActive
                        ? "text-toss-brand font-semibold"
                        : "text-toss-text-secondary"
                    }`}
                  >
                    {displayName}
                  </p>
                  <p className="text-toss-micro text-toss-text-tertiary truncate mt-0.5">
                    {setName} · #{card.number}
                    {rarityDisplay && (
                      <span className="ml-1 text-toss-text-quaternary">· {rarityDisplay}</span>
                    )}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Count footer */}
      <div className="border-t border-toss-divider px-3 py-2 text-toss-micro text-toss-text-tertiary shrink-0">
        {results.length}건 표시 {results.length >= 200 && "(상위 200건)"}
      </div>
    </div>
  );
}
