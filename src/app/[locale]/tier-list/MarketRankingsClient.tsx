"use client";

import { useState } from "react";
import {
  Button,
  Container,
  DeltaBadge,
  EmptyState,
  RankingTable,
  SearchField,
  Tag,
  ToggleGroup,
} from "@/components/toss";
import { searchCardsAction, type CardSearchHit } from "@/lib/actions/searchCards";
import { cn } from "@/lib/utils";
import { CardVersionResults } from "./CardVersionResults";
import { CardPriceByRegion } from "./CardPriceByRegion";

// ── 데이터 타입 (서버에서 주입) ───────────────────────────────────────────────

export type MarketCardRow = {
  cardId: string;
  name: string; // 표시명 (한글 우선)
  set: string; // 표시 세트명 (한글 우선)
  imageUrl: string | null;
  priceKrw: number | null;
  change1w: number | null;
  change1m: number | null;
  change3m: number | null;
  txCount: number;
  volumeKrw: number;
  athKrw: number | null;
  wishlist: number;
  trendBadge?: string;
  dropPct?: number;
};

export interface MarketRankingsData {
  gainers1w: MarketCardRow[];
  gainers1m: MarketCardRow[];
  gainers3m: MarketCardRow[];
  volume: MarketCardRow[];
  trending: MarketCardRow[];
  dips: MarketCardRow[];
  highs: MarketCardRow[];
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  // 토스 패턴: 동그라미 없이 단순 숫자만 (Top 3는 색만 강조)
  const color = rank <= 3 ? "text-toss-text-primary font-bold" : "text-toss-text-tertiary font-semibold";
  return <span className={`w-6 text-center text-toss-body shrink-0 ${color}`}>{rank}</span>;
}

function CardThumb({ row }: { row: MarketCardRow }) {
  return (
    <div className="w-12 h-[68px] rounded-toss-md overflow-hidden bg-toss-bg-muted shrink-0">
      {row.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.imageUrl} alt={row.name} className="w-full h-full object-cover" />
      ) : null}
    </div>
  );
}

function PctBadge({ value, positive = true }: { value: number; positive?: boolean }) {
  const signed = positive ? Math.abs(value) : -Math.abs(value);
  return <DeltaBadge percent={signed} mode="text" size="md" decimals={1} />;
}

function EmptyRanking() {
  return (
    <EmptyState
      title="아직 집계된 데이터가 없습니다"
      description="시세·거래 데이터가 쌓이면 랭킹이 표시됩니다."
    />
  );
}

// ── 탭별 콘텐츠 ──────────────────────────────────────────────────────────────

function GainersTab({ data }: { data: MarketRankingsData }) {
  const [period, setPeriod] = useState<"1w" | "1m" | "3m">("1m");
  const PERIODS = [{ id: "1w", label: "1주" }, { id: "1m", label: "1달" }, { id: "3m", label: "3달" }] as const;

  const rows = period === "1w" ? data.gainers1w : period === "1m" ? data.gainers1m : data.gainers3m;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-toss-caption text-toss-text-tertiary">기간</span>
        <ToggleGroup
          options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
          value={period}
          onChange={(v) => setPeriod(v as typeof period)}
          size="sm"
        />
      </div>
      {rows.length === 0 ? (
        <EmptyRanking />
      ) : (
        <RankingTable.Root>
          <RankingTable.Head>
            <RankingTable.HeadRow>
              <RankingTable.Header align="center" className="w-12 flex-none">순위</RankingTable.Header>
              <RankingTable.Header>카드</RankingTable.Header>
              <RankingTable.Header align="right">변동률</RankingTable.Header>
              <RankingTable.Header align="right">현재가</RankingTable.Header>
            </RankingTable.HeadRow>
          </RankingTable.Head>
          <RankingTable.Body>
            {rows.map((row, i) => {
              const change = period === "1w" ? row.change1w : period === "1m" ? row.change1m : row.change3m;
              return (
                <RankingTable.Row key={row.cardId} className="h-[72px]">
                  <RankingTable.Cell align="center" className="w-12 flex-none">
                    <RankBadge rank={i + 1} />
                  </RankingTable.Cell>
                  <RankingTable.Cell>
                    <div className="flex items-center gap-3 min-w-0">
                      <CardThumb row={row} />
                      <div className="min-w-0">
                        <p className="text-toss-label font-semibold text-toss-text-primary truncate">{row.name}</p>
                        <p className="text-toss-micro text-toss-text-tertiary truncate">{row.set}</p>
                      </div>
                    </div>
                  </RankingTable.Cell>
                  <RankingTable.Cell align="right" numeric>
                    {change != null ? (
                      <DeltaBadge percent={change} mode="text" size="md" decimals={1} />
                    ) : (
                      <span className="text-toss-caption text-toss-text-quaternary">—</span>
                    )}
                  </RankingTable.Cell>
                  <RankingTable.Cell align="right" numeric>
                    <span className="text-toss-label font-semibold text-toss-text-primary">
                      {row.priceKrw != null ? `₩${row.priceKrw.toLocaleString("ko-KR")}` : "—"}
                    </span>
                  </RankingTable.Cell>
                </RankingTable.Row>
              );
            })}
          </RankingTable.Body>
        </RankingTable.Root>
      )}
    </div>
  );
}

function VolumeTab({ rows }: { rows: MarketCardRow[] }) {
  if (rows.length === 0) return <EmptyRanking />;
  return (
    <RankingTable.Root>
        <RankingTable.Head>
          <RankingTable.HeadRow>
            <RankingTable.Header align="center" className="w-12 flex-none">순위</RankingTable.Header>
            <RankingTable.Header>카드</RankingTable.Header>
            <RankingTable.Header align="right">거래량</RankingTable.Header>
          </RankingTable.HeadRow>
        </RankingTable.Head>
        <RankingTable.Body>
          {rows.map((row, i) => (
            <RankingTable.Row key={row.cardId} className="h-[72px]">
              <RankingTable.Cell align="center" className="w-12 flex-none">
                <RankBadge rank={i + 1} />
              </RankingTable.Cell>
              <RankingTable.Cell>
                <div className="flex items-center gap-3 min-w-0">
                  <CardThumb row={row} />
                  <div className="min-w-0">
                    <p className="text-toss-label font-semibold text-toss-text-primary truncate">{row.name}</p>
                    <p className="text-toss-micro text-toss-text-tertiary truncate">{row.set}</p>
                  </div>
                </div>
              </RankingTable.Cell>
              <RankingTable.Cell align="right" numeric>
                <span className="text-toss-label font-semibold text-toss-text-primary">
                  {row.txCount.toLocaleString()}<span className="text-toss-caption text-toss-text-tertiary ml-0.5 font-normal">건</span>
                </span>
              </RankingTable.Cell>
            </RankingTable.Row>
          ))}
        </RankingTable.Body>
      </RankingTable.Root>
  );
}

function TrendingTab({ rows }: { rows: MarketCardRow[] }) {
  if (rows.length === 0) return <EmptyRanking />;
  return (
    <RankingTable.Root>
        <RankingTable.Head>
          <RankingTable.HeadRow>
            <RankingTable.Header align="center" className="w-12 flex-none">순위</RankingTable.Header>
            <RankingTable.Header>카드</RankingTable.Header>
            <RankingTable.Header align="right">변동률</RankingTable.Header>
            <RankingTable.Header align="right">관심수</RankingTable.Header>
          </RankingTable.HeadRow>
        </RankingTable.Head>
        <RankingTable.Body>
          {rows.map((row, i) => (
            <RankingTable.Row key={row.cardId} className="h-[72px]">
              <RankingTable.Cell align="center" className="w-12 flex-none">
                <RankBadge rank={i + 1} />
              </RankingTable.Cell>
              <RankingTable.Cell>
                <div className="flex items-center gap-3 min-w-0">
                  <CardThumb row={row} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-toss-label font-semibold text-toss-text-primary truncate">{row.name}</p>
                      {row.trendBadge && <Tag color="brand" shape="soft">{row.trendBadge}</Tag>}
                    </div>
                    <p className="text-toss-micro text-toss-text-tertiary truncate">{row.set}</p>
                  </div>
                </div>
              </RankingTable.Cell>
              <RankingTable.Cell align="right" numeric>
                {row.change1w != null ? (
                  <DeltaBadge percent={row.change1w} mode="text" size="md" decimals={0} />
                ) : (
                  <span className="text-toss-caption text-toss-text-quaternary">—</span>
                )}
              </RankingTable.Cell>
              <RankingTable.Cell align="right" numeric>
                <span className="text-toss-label font-semibold text-toss-text-primary">
                  {row.wishlist > 0 ? row.wishlist.toLocaleString() : "—"}
                </span>
              </RankingTable.Cell>
            </RankingTable.Row>
          ))}
        </RankingTable.Body>
      </RankingTable.Root>
  );
}

function DipsTab({ rows }: { rows: MarketCardRow[] }) {
  if (rows.length === 0) return <EmptyRanking />;
  return (
    <RankingTable.Root>
        <RankingTable.Head>
          <RankingTable.HeadRow>
            <RankingTable.Header align="center" className="w-12 flex-none">순위</RankingTable.Header>
            <RankingTable.Header>카드</RankingTable.Header>
            <RankingTable.Header align="right">낙폭</RankingTable.Header>
            <RankingTable.Header align="right">비고</RankingTable.Header>
          </RankingTable.HeadRow>
        </RankingTable.Head>
        <RankingTable.Body>
          {rows.map((row, i) => (
            <RankingTable.Row key={row.cardId} className="h-[72px]">
              <RankingTable.Cell align="center" className="w-12 flex-none">
                <RankBadge rank={i + 1} />
              </RankingTable.Cell>
              <RankingTable.Cell>
                <div className="flex items-center gap-3 min-w-0">
                  <CardThumb row={row} />
                  <div className="min-w-0">
                    <p className="text-toss-label font-semibold text-toss-text-primary truncate">{row.name}</p>
                    <p className="text-toss-micro text-toss-text-tertiary truncate">
                      ATH ₩{(row.athKrw ?? 0).toLocaleString("ko-KR")} → ₩{(row.priceKrw ?? 0).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              </RankingTable.Cell>
              <RankingTable.Cell align="right" numeric>
                <PctBadge value={Math.abs(row.dropPct ?? 0)} positive={false} />
              </RankingTable.Cell>
              <RankingTable.Cell align="right">
                <span className="text-toss-caption text-toss-text-tertiary">ATH 대비</span>
              </RankingTable.Cell>
            </RankingTable.Row>
          ))}
        </RankingTable.Body>
      </RankingTable.Root>
  );
}

function HighsTab({ rows }: { rows: MarketCardRow[] }) {
  if (rows.length === 0) return <EmptyRanking />;
  return (
    <RankingTable.Root>
        <RankingTable.Head>
          <RankingTable.HeadRow>
            <RankingTable.Header align="center" className="w-12 flex-none">순위</RankingTable.Header>
            <RankingTable.Header>카드</RankingTable.Header>
            <RankingTable.Header align="right">신고가</RankingTable.Header>
            <RankingTable.Header align="right">변동률</RankingTable.Header>
          </RankingTable.HeadRow>
        </RankingTable.Head>
        <RankingTable.Body>
          {rows.map((row, i) => (
            <RankingTable.Row key={row.cardId} className="h-[72px]">
              <RankingTable.Cell align="center" className="w-12 flex-none">
                <RankBadge rank={i + 1} />
              </RankingTable.Cell>
              <RankingTable.Cell>
                <div className="flex items-center gap-3 min-w-0">
                  <CardThumb row={row} />
                  <div className="min-w-0">
                    <p className="text-toss-label font-semibold text-toss-text-primary truncate">{row.name}</p>
                    <p className="text-toss-micro text-toss-text-tertiary truncate">{row.set}</p>
                  </div>
                </div>
              </RankingTable.Cell>
              <RankingTable.Cell align="right" numeric>
                <span className="text-toss-label font-semibold text-toss-warning">
                  {row.athKrw != null ? `₩${row.athKrw.toLocaleString("ko-KR")}` : "—"}
                </span>
              </RankingTable.Cell>
              <RankingTable.Cell align="right" numeric>
                {row.change1m != null ? (
                  <DeltaBadge percent={row.change1m} mode="text" size="md" decimals={1} />
                ) : (
                  <span className="text-toss-caption text-toss-text-quaternary">—</span>
                )}
              </RankingTable.Cell>
            </RankingTable.Row>
          ))}
        </RankingTable.Body>
      </RankingTable.Root>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "gainers",  label: "상승률",         short: "상승률" },
  { id: "volume",   label: "거래량",         short: "거래량" },
  { id: "trending", label: "트렌딩",         short: "트렌딩" },
  { id: "dips",     label: "고점 대비 낙폭", short: "낙폭"   },
  { id: "highs",    label: "52주 신고가",    short: "신고가" },
] as const;

type TabId = typeof TABS[number]["id"];

const TAB_SUBTITLES: Record<TabId, string> = {
  gainers:  "기간 내 가격 상승률이 가장 높은 카드",
  volume:   "최근 30일 거래 횟수 기준",
  trending: "최근 7일 조회수 급증 카드",
  dips:     "역대 최고가(ATH) 대비 낙폭 — 저점 매수 후보",
  highs:    "최근 52주 신고가 달성 카드",
};

export default function MarketRankingsClient({ data }: { data: MarketRankingsData }) {
  // 최상위 탭: 시세 검색 / 시세 랭킹
  const [mainTab, setMainTab] = useState<"search" | "ranking">("search");
  // 시세 랭킹 하위 탭
  const [activeTab, setActiveTab] = useState<TabId>("gainers");

  // 시세 검색 상태 (① 검색 → ② 카드 버전 → ③ 지역별 시세)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardSearchHit[] | null>(null);
  const [selected, setSelected] = useState<CardSearchHit | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (!q) {
      setResults(null);
      setSelected(null);
      return;
    }
    setSearching(true);
    try {
      const hits = await searchCardsAction({ q, limit: 24, sort: "price" });
      setResults(hits);
      setSelected(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Container size="xl" padding="md" className="py-8">
      {/* ── 최상위 탭: 시세 검색 / 시세 랭킹 ─────────────────────────── */}
      <div className="flex gap-1 border-b border-toss-divider mb-8">
        {([
          { id: "search", label: "시세 검색" },
          { id: "ranking", label: "시세 랭킹" },
        ] as const).map((t) => {
          const active = mainTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setMainTab(t.id)}
              className={cn(
                "relative px-4 h-11 text-toss-label font-semibold transition-colors",
                active
                  ? "text-toss-text-primary"
                  : "text-toss-text-tertiary hover:text-toss-text-secondary"
              )}
            >
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-toss-text-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* ══ 시세 검색 탭 ══════════════════════════════════════════════ */}
      {mainTab === "search" && (
        <>
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
              <h2 className="text-toss-label font-bold text-toss-text-secondary mb-3">
                카드 버전
                {results && results.length > 0 && (
                  <span className="ml-1 text-toss-text-quaternary font-normal">({results.length})</span>
                )}
              </h2>
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
        </>
      )}

      {/* ══ 시세 랭킹 탭: 좌측 세로 사이드바 ═════════════════════════ */}
      {mainTab === "ranking" && (
        <section className="grid lg:grid-cols-[220px_1fr] gap-8">
          {/* 좌측 세로 탭 */}
          <aside className="lg:sticky lg:top-[68px] lg:self-start">
            <p className="px-4 pt-1 pb-2 text-toss-body text-toss-text-secondary">카드 랭킹</p>
            <nav>
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center px-4 py-2.5 h-10 text-toss-body transition-colors rounded-toss-md",
                      active
                        ? "bg-toss-brand-weak text-toss-brand font-semibold"
                        : "text-toss-text-secondary hover:bg-toss-hover"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* 우측 본문 */}
          <div className="min-w-0">
            <div className="mb-6">
              <h3 className="text-toss-title-2 font-bold text-toss-text-primary">
                {TABS.find((t) => t.id === activeTab)?.label}
              </h3>
              <p className="text-toss-body text-toss-text-tertiary mt-1">
                {TAB_SUBTITLES[activeTab]}
              </p>
            </div>

            {activeTab === "gainers"  && <GainersTab data={data} />}
            {activeTab === "volume"   && <VolumeTab rows={data.volume} />}
            {activeTab === "trending" && <TrendingTab rows={data.trending} />}
            {activeTab === "dips"     && <DipsTab rows={data.dips} />}
            {activeTab === "highs"    && <HighsTab rows={data.highs} />}

            <p className="text-toss-micro text-toss-text-quaternary mt-8 text-center">
              시세 데이터는 번개장터·포켓마켓 거래 기반 추정값입니다. 실제 투자 손익을 보장하지 않습니다.
            </p>
          </div>
        </section>
      )}
    </Container>
  );
}
