"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchField, ToggleGroup } from "@/components/toss";

// ── 필터 옵션 ─────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "all",        label: "전체"   },
  { value: "Fire",       label: "불꽃"   },
  { value: "Water",      label: "물"     },
  { value: "Grass",      label: "풀"     },
  { value: "Lightning",  label: "번개"   },
  { value: "Psychic",    label: "에스퍼" },
  { value: "Fighting",   label: "격투"   },
  { value: "Darkness",   label: "어둠"   },
  { value: "Metal",      label: "강철"   },
  { value: "Dragon",     label: "드래곤" },
  { value: "Colorless",  label: "무색"   },
];

const RARITY_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "C",   label: "C"   },
  { value: "U",   label: "U"   },
  { value: "R",   label: "R"   },
  { value: "RR",  label: "RR"  },
  { value: "AR",  label: "AR"  },
  { value: "SR",  label: "SR"  },
  { value: "SAR", label: "SAR" },
  { value: "UR",  label: "UR"  },
];

const REGION_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "KR",  label: "한국" },
  { value: "JP",  label: "일본" },
  { value: "EN",  label: "영문" },
];

export type CardgameCardsFiltersValue = {
  q?: string;
  type?: string;
  rarity?: string;
  region?: string;
};

export function CardgameCardsFilters({ initial }: { initial: CardgameCardsFiltersValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initial.q ?? "");
  const [typeFilter, setTypeFilter] = useState(initial.type ?? "all");
  const [rarityFilter, setRarityFilter] = useState(initial.rarity ?? "all");
  const [regionFilter, setRegionFilter] = useState(initial.region ?? "all");

  function pushQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp?.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all" || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="space-y-3 mb-6">
      <SearchField
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          // 디바운스 없이 간단히 URL 동기화 (Next.js 16 transition 내).
          pushQuery({ q: e.target.value });
        }}
        placeholder="카드명 검색 (한/일/영)"
        className="w-full max-w-sm"
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-toss-caption text-toss-text-tertiary shrink-0">타입</span>
          <ToggleGroup
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              pushQuery({ type: v });
            }}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-toss-caption text-toss-text-tertiary shrink-0">희귀도</span>
          <ToggleGroup
            options={RARITY_OPTIONS}
            value={rarityFilter}
            onChange={(v) => {
              setRarityFilter(v);
              pushQuery({ rarity: v });
            }}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-toss-caption text-toss-text-tertiary shrink-0">지역</span>
          <ToggleGroup
            options={REGION_OPTIONS}
            value={regionFilter}
            onChange={(v) => {
              setRegionFilter(v);
              pushQuery({ region: v });
            }}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
