"use client";

import { useState } from "react";
import { Button, Container, SearchField, SegmentedControl } from "@/components/toss";
import { searchCardsAction, type CardSearchHit } from "@/lib/actions/searchCards";
import { CardVersionResults } from "./CardVersionResults";
import { CardPriceByRegion } from "./CardPriceByRegion";

type RegionFilter = "ALL" | "KR" | "EN" | "JP";

const REGION_OPTIONS: { value: RegionFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "KR", label: "KR" },
  { value: "EN", label: "EN" },
  { value: "JP", label: "JP" },
];

export default function MarketRankingsClient() {
  // 시세 검색 (① 검색 → ② 카드 버전(지역 필터) → ③ 지역별 시세)
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionFilter>("ALL");
  const [results, setResults] = useState<CardSearchHit[] | null>(null);
  const [selected, setSelected] = useState<CardSearchHit | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = async (raw: string, regionFilter: RegionFilter = region) => {
    const q = raw.trim();
    if (!q) {
      setResults(null);
      setSelected(null);
      return;
    }
    setSearching(true);
    try {
      // expandSpecies: "이상해씨" 처럼 종 이름으로 검색하면 KR판 없는 JP/EN 단독 아트까지 전부.
      //   limit 100: 한 종의 모든 버전이 들어오도록 상향(슬라이더는 가로 스크롤).
      // region: 필터 탭이 전체가 아니면 그 지역 인쇄본이 있는 카드만, 그 지역판을 대표로.
      const hits = await searchCardsAction({
        q,
        limit: 100,
        sort: "price",
        expandSpecies: true,
        region: regionFilter === "ALL" ? undefined : regionFilter,
      });
      setResults(hits);
      setSelected(null);
    } finally {
      setSearching(false);
    }
  };

  const handleRegionChange = (value: string) => {
    const next = value as RegionFilter;
    setRegion(next);
    if (query.trim()) runSearch(query, next);
  };

  return (
    <Container size="xl" padding="md" className="py-8">
      {/* ① 히어로: 카드 검색 */}
      <section className="max-w-2xl mx-auto text-center">
        <h1 className="text-toss-display font-bold text-toss-text-primary">시세</h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1.5">
          카드 이름으로 검색해 종별·지역별 시세를 확인하세요.
        </p>
        <div className="mt-5 flex gap-2">
          <div className="flex-1">
            <SearchField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => {
                setQuery("");
                setRegion("ALL");
                setResults(null);
                setSelected(null);
              }}
              onSearch={runSearch}
              placeholder="예: 피카츄, 리자몽 ex, Charizard"
              size="lg"
            />
          </div>
          <Button size="lg" onClick={() => runSearch(query)} loading={searching}>
            검색
          </Button>
        </div>
      </section>

      {/* ② 검색 결과: 카드 버전 */}
      {(searching || results !== null) && (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-toss-label font-bold text-toss-text-secondary">
              카드 버전
              {results && results.length > 0 && (
                <span className="ml-1 text-toss-text-quaternary font-normal">({results.length})</span>
              )}
            </h2>
            <SegmentedControl
              size="sm"
              options={REGION_OPTIONS}
              value={region}
              onChange={handleRegionChange}
            />
          </div>
          {searching ? (
            <p className="text-toss-body text-toss-text-tertiary py-10 text-center">검색 중…</p>
          ) : (
            <CardVersionResults
              hits={results ?? []}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          )}
        </section>
      )}

      {/* ③ 선택 카드: 지역별 시세 */}
      {selected && (
        <section className="mt-8">
          <h2 className="text-toss-label font-bold text-toss-text-secondary mb-3">
            지역별 시세
            <span className="ml-2 text-toss-text-tertiary font-normal">{selected.nameKo ?? selected.name}</span>
          </h2>
          <CardPriceByRegion key={selected.id} regionCardId={selected.id} />
        </section>
      )}
    </Container>
  );
}
