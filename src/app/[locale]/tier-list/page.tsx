"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Container,
  DeltaBadge,
  RankingTable,
  Tag,
  ToggleGroup,
} from "@/components/toss";
import { cn } from "@/lib/utils";

// ── 목업 데이터 ──────────────────────────────────────────────────────────────

type Card = {
  id: string;
  name: string;
  set: string;
  imageUrl: string;
  currentPrice: number;
};

const BASE_CARDS: Record<string, Card> = {
  "sv3pt5-215": { id: "sv3pt5-215", name: "피카츄 ex SAR",    set: "포켓몬 151",         imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png", currentPrice: 280000 },
  "sv3pt5-200": { id: "sv3pt5-200", name: "리자몽 ex SAR",    set: "포켓몬 151",         imageUrl: "https://images.pokemontcg.io/sv3pt5/200_hires.png", currentPrice: 195000 },
  "sv3pt5-207": { id: "sv3pt5-207", name: "뮤츠 ex SAR",      set: "포켓몬 151",         imageUrl: "https://images.pokemontcg.io/sv3pt5/207_hires.png", currentPrice: 310000 },
  "sv3pt5-218": { id: "sv3pt5-218", name: "이브이 SAR",       set: "포켓몬 151",         imageUrl: "https://images.pokemontcg.io/sv3pt5/218_hires.png", currentPrice: 220000 },
  "sv3pt5-205": { id: "sv3pt5-205", name: "뮤 ex SAR",        set: "포켓몬 151",         imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png", currentPrice: 165000 },
  "sv3pt5-198": { id: "sv3pt5-198", name: "이상해꽃 ex SAR",  set: "포켓몬 151",         imageUrl: "https://images.pokemontcg.io/sv3pt5/198_hires.png", currentPrice:  92000 },
  "sv3pt5-202": { id: "sv3pt5-202", name: "거북왕 ex SAR",    set: "포켓몬 151",         imageUrl: "https://images.pokemontcg.io/sv3pt5/202_hires.png", currentPrice:  88000 },
  "sv4pt5-191": { id: "sv4pt5-191", name: "리자몽 ex SAR",    set: "파라다이스 드래고나", imageUrl: "https://images.pokemontcg.io/sv4pt5/191_hires.png", currentPrice: 420000 },
  "sv4pt5-182": { id: "sv4pt5-182", name: "가이오가 ex SAR",  set: "파라다이스 드래고나", imageUrl: "https://images.pokemontcg.io/sv4pt5/182_hires.png", currentPrice: 380000 },
  "sv4pt5-176": { id: "sv4pt5-176", name: "아마루르가 ex SAR",set: "파라다이스 드래고나", imageUrl: "https://images.pokemontcg.io/sv4pt5/176_hires.png", currentPrice: 195000 },
  "sv4pt5-188": { id: "sv4pt5-188", name: "피카츄 ex SAR",    set: "파라다이스 드래고나", imageUrl: "https://images.pokemontcg.io/sv4pt5/188_hires.png", currentPrice: 145000 },
  "sv8-180":    { id: "sv8-180",    name: "잠만보 ex SAR",    set: "초승달의 섬",         imageUrl: "https://images.pokemontcg.io/sv8/180_hires.png",   currentPrice:  48000 },
  "sv1-198":    { id: "sv1-198",    name: "리자몽 ex SIR",    set: "스칼렛 & 바이올렛",  imageUrl: "https://images.pokemontcg.io/sv1/198_hires.png",   currentPrice: 520000 },
  "sv1-197":    { id: "sv1-197",    name: "미라이돈 ex SIR",  set: "스칼렛 & 바이올렛",  imageUrl: "https://images.pokemontcg.io/sv1/197_hires.png",   currentPrice: 145000 },
};

// 상승률 (1주/1달/3달)
const GAINERS = [
  { cardId: "sv3pt5-215", change1w: 18.4, change1m: 42.1, change3m: 87.5 },
  { cardId: "sv4pt5-191", change1w: 14.2, change1m: 38.7, change3m: 65.3 },
  { cardId: "sv3pt5-207", change1w: 11.8, change1m: 29.4, change3m: 54.2 },
  { cardId: "sv4pt5-182", change1w:  9.3, change1m: 24.6, change3m: 41.8 },
  { cardId: "sv3pt5-218", change1w:  8.7, change1m: 21.3, change3m: 38.9 },
  { cardId: "sv1-198",    change1w:  7.2, change1m: 18.9, change3m: 35.1 },
  { cardId: "sv4pt5-176", change1w:  5.4, change1m: 14.2, change3m: 29.7 },
  { cardId: "sv3pt5-205", change1w:  4.1, change1m: 11.8, change3m: 22.4 },
];

// 거래량 (최근 30일)
const VOLUME = [
  { cardId: "sv3pt5-215", txCount: 1284, txKrw: 359_520_000 },
  { cardId: "sv4pt5-191", txCount:  987, txKrw: 414_540_000 },
  { cardId: "sv3pt5-207", txCount:  834, txKrw: 258_540_000 },
  { cardId: "sv1-198",    txCount:  762, txKrw: 396_240_000 },
  { cardId: "sv4pt5-182", txCount:  621, txKrw: 235_980_000 },
  { cardId: "sv3pt5-218", txCount:  543, txKrw: 119_460_000 },
  { cardId: "sv3pt5-200", txCount:  498, txKrw:  97_020_000 },
  { cardId: "sv3pt5-205", txCount:  412, txKrw:  67_980_000 },
];

// 트렌딩 (최근 7일 조회수 변화율)
const TRENDING = [
  { cardId: "sv4pt5-191", viewChange: 342, wishlistCount: 2841, badge: "급등" },
  { cardId: "sv3pt5-215", viewChange: 218, wishlistCount: 5102, badge: "인기" },
  { cardId: "sv4pt5-182", viewChange: 187, wishlistCount: 1923, badge: "급등" },
  { cardId: "sv3pt5-207", viewChange: 143, wishlistCount: 3214, badge: "인기" },
  { cardId: "sv8-180",    viewChange: 129, wishlistCount:  874, badge: "신흥" },
  { cardId: "sv4pt5-176", viewChange:  98, wishlistCount: 1102, badge: "상승" },
  { cardId: "sv3pt5-218", viewChange:  87, wishlistCount: 2310, badge: "상승" },
  { cardId: "sv1-197",    viewChange:  74, wishlistCount: 1567, badge: "상승" },
];

// 고점 대비 낙폭 (저점 매수 후보)
const DIPS = [
  { cardId: "sv3pt5-202", athPrice: 145000, currentPrice:  88000, dropPct: -39.3 },
  { cardId: "sv3pt5-198", athPrice: 148000, currentPrice:  92000, dropPct: -37.8 },
  { cardId: "sv1-197",    athPrice: 220000, currentPrice: 145000, dropPct: -34.1 },
  { cardId: "sv3pt5-205", athPrice: 240000, currentPrice: 165000, dropPct: -31.3 },
  { cardId: "sv4pt5-188", athPrice: 198000, currentPrice: 145000, dropPct: -26.8 },
  { cardId: "sv8-180",    athPrice:  64000, currentPrice:  48000, dropPct: -25.0 },
  { cardId: "sv3pt5-200", athPrice: 255000, currentPrice: 195000, dropPct: -23.5 },
  { cardId: "sv4pt5-176", athPrice: 248000, currentPrice: 195000, dropPct: -21.4 },
];

// 52주 신고가
const HIGHS = [
  { cardId: "sv3pt5-215", newHigh: 280000, prevHigh: 237000, changePct: 18.1, achievedAt: "오늘" },
  { cardId: "sv4pt5-191", newHigh: 420000, prevHigh: 365000, changePct: 15.1, achievedAt: "어제" },
  { cardId: "sv3pt5-207", newHigh: 310000, prevHigh: 278000, changePct: 11.5, achievedAt: "2일 전" },
  { cardId: "sv4pt5-182", newHigh: 380000, prevHigh: 345000, changePct: 10.1, achievedAt: "3일 전" },
  { cardId: "sv1-198",    newHigh: 520000, prevHigh: 478000, changePct:  8.8, achievedAt: "5일 전" },
  { cardId: "sv3pt5-218", newHigh: 220000, prevHigh: 204000, changePct:  7.8, achievedAt: "1주 전" },
];

// ── 공통 컴포넌트 ─────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  // 토스 패턴: 동그라미 없이 단순 숫자만 (Top 3는 색만 강조)
  const color = rank <= 3 ? "text-toss-text-primary font-bold" : "text-toss-text-tertiary font-semibold";
  return <span className={`w-6 text-center text-toss-body shrink-0 ${color}`}>{rank}</span>;
}

function CardThumb({ card }: { card: Card }) {
  return (
    <div className="w-12 h-[68px] rounded-toss-md overflow-hidden bg-toss-bg-muted shrink-0">
      <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
    </div>
  );
}

function PctBadge({ value, positive = true }: { value: number; positive?: boolean }) {
  const signed = positive ? Math.abs(value) : -Math.abs(value);
  return <DeltaBadge percent={signed} mode="text" size="md" decimals={1} />;
}

// ── 탭별 콘텐츠 ──────────────────────────────────────────────────────────────

function GainersTab() {
  const [period, setPeriod] = useState<"1w" | "1m" | "3m">("1m");
  const PERIODS = [{ id: "1w", label: "1주" }, { id: "1m", label: "1달" }, { id: "3m", label: "3달" }] as const;

  const sorted = [...GAINERS].sort((a, b) => {
    const key = period === "1w" ? "change1w" : period === "1m" ? "change1m" : "change3m";
    return b[key] - a[key];
  });

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
            {sorted.map((row, i) => {
              const card = BASE_CARDS[row.cardId];
              if (!card) return null;
              const change = period === "1w" ? row.change1w : period === "1m" ? row.change1m : row.change3m;
              return (
                <RankingTable.Row key={row.cardId} className="h-[72px]">
                  <RankingTable.Cell align="center" className="w-12 flex-none">
                    <RankBadge rank={i + 1} />
                  </RankingTable.Cell>
                  <RankingTable.Cell>
                    <div className="flex items-center gap-3 min-w-0">
                      <CardThumb card={card} />
                      <div className="min-w-0">
                        <p className="text-toss-label font-semibold text-toss-text-primary truncate">{card.name}</p>
                        <p className="text-toss-micro text-toss-text-tertiary truncate">{card.set}</p>
                      </div>
                    </div>
                  </RankingTable.Cell>
                  <RankingTable.Cell align="right" numeric>
                    <DeltaBadge percent={change} mode="text" size="md" decimals={1} />
                  </RankingTable.Cell>
                  <RankingTable.Cell align="right" numeric>
                    <span className="text-toss-label font-semibold text-toss-text-primary">₩{card.currentPrice.toLocaleString("ko-KR")}</span>
                  </RankingTable.Cell>
                </RankingTable.Row>
              );
            })}
          </RankingTable.Body>
        </RankingTable.Root>
    </div>
  );
}

function VolumeTab() {
  const sorted = [...VOLUME].sort((a, b) => b.txCount - a.txCount);

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
          {sorted.map((row, i) => {
            const card = BASE_CARDS[row.cardId];
            if (!card) return null;
            return (
              <RankingTable.Row key={row.cardId} className="h-[72px]">
                <RankingTable.Cell align="center" className="w-12 flex-none">
                  <RankBadge rank={i + 1} />
                </RankingTable.Cell>
                <RankingTable.Cell>
                  <div className="flex items-center gap-3 min-w-0">
                    <CardThumb card={card} />
                    <div className="min-w-0">
                      <p className="text-toss-label font-semibold text-toss-text-primary truncate">{card.name}</p>
                      <p className="text-toss-micro text-toss-text-tertiary truncate">{card.set}</p>
                    </div>
                  </div>
                </RankingTable.Cell>
                <RankingTable.Cell align="right" numeric>
                  <span className="text-toss-label font-semibold text-toss-text-primary">
                    {row.txCount.toLocaleString()}<span className="text-toss-caption text-toss-text-tertiary ml-0.5 font-normal">건</span>
                  </span>
                </RankingTable.Cell>
              </RankingTable.Row>
            );
          })}
        </RankingTable.Body>
      </RankingTable.Root>
  );
}

function TrendingTab() {
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
          {TRENDING.map((row, i) => {
            const card = BASE_CARDS[row.cardId];
            if (!card) return null;
            return (
              <RankingTable.Row key={row.cardId} className="h-[72px]">
                <RankingTable.Cell align="center" className="w-12 flex-none">
                  <RankBadge rank={i + 1} />
                </RankingTable.Cell>
                <RankingTable.Cell>
                  <div className="flex items-center gap-3 min-w-0">
                    <CardThumb card={card} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-toss-label font-semibold text-toss-text-primary truncate">{card.name}</p>
                        <Tag color="brand" shape="soft">{row.badge}</Tag>
                      </div>
                      <p className="text-toss-micro text-toss-text-tertiary truncate">{card.set}</p>
                    </div>
                  </div>
                </RankingTable.Cell>
                <RankingTable.Cell align="right" numeric>
                  <DeltaBadge percent={row.viewChange} mode="text" size="md" decimals={0} />
                </RankingTable.Cell>
                <RankingTable.Cell align="right" numeric>
                  <span className="text-toss-label font-semibold text-toss-text-primary">{row.wishlistCount.toLocaleString()}</span>
                </RankingTable.Cell>
              </RankingTable.Row>
            );
          })}
        </RankingTable.Body>
      </RankingTable.Root>
  );
}

function DipsTab() {
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
          {DIPS.map((row, i) => {
            const card = BASE_CARDS[row.cardId];
            if (!card) return null;
            return (
              <RankingTable.Row key={row.cardId} className="h-[72px]">
                <RankingTable.Cell align="center" className="w-12 flex-none">
                  <RankBadge rank={i + 1} />
                </RankingTable.Cell>
                <RankingTable.Cell>
                  <div className="flex items-center gap-3 min-w-0">
                    <CardThumb card={card} />
                    <div className="min-w-0">
                      <p className="text-toss-label font-semibold text-toss-text-primary truncate">{card.name}</p>
                      <p className="text-toss-micro text-toss-text-tertiary truncate">
                        ATH ₩{row.athPrice.toLocaleString("ko-KR")} → ₩{row.currentPrice.toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                </RankingTable.Cell>
                <RankingTable.Cell align="right" numeric>
                  <PctBadge value={Math.abs(row.dropPct)} positive={false} />
                </RankingTable.Cell>
                <RankingTable.Cell align="right">
                  <span className="text-toss-caption text-toss-text-tertiary">ATH 대비</span>
                </RankingTable.Cell>
              </RankingTable.Row>
            );
          })}
        </RankingTable.Body>
      </RankingTable.Root>
  );
}

function HighsTab() {
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
          {HIGHS.map((row, i) => {
            const card = BASE_CARDS[row.cardId];
            if (!card) return null;
            return (
              <RankingTable.Row key={row.cardId} className="h-[72px]">
                <RankingTable.Cell align="center" className="w-12 flex-none">
                  <RankBadge rank={i + 1} />
                </RankingTable.Cell>
                <RankingTable.Cell>
                  <div className="flex items-center gap-3 min-w-0">
                    <CardThumb card={card} />
                    <div className="min-w-0">
                      <p className="text-toss-label font-semibold text-toss-text-primary truncate">{card.name}</p>
                      <p className="text-toss-micro text-toss-text-tertiary truncate">{card.set} · {row.achievedAt} 달성</p>
                    </div>
                  </div>
                </RankingTable.Cell>
                <RankingTable.Cell align="right" numeric>
                  <span className="text-toss-label font-semibold text-toss-warning">₩{row.newHigh.toLocaleString("ko-KR")}</span>
                </RankingTable.Cell>
                <RankingTable.Cell align="right" numeric>
                  <DeltaBadge percent={row.changePct} mode="text" size="md" decimals={1} />
                </RankingTable.Cell>
              </RankingTable.Row>
            );
          })}
        </RankingTable.Body>
      </RankingTable.Root>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "gainers",  label: "상승률",         popular: false },
  { id: "volume",   label: "거래량",         popular: false },
  { id: "trending", label: "트렌딩",         popular: true  },
  { id: "dips",     label: "고점 대비 낙폭", popular: false },
  { id: "highs",    label: "52주 신고가",    popular: false },
] as const;

type TabId = typeof TABS[number]["id"];

const TAB_SUBTITLES: Record<TabId, string> = {
  gainers:  "기간 내 가격 상승률이 가장 높은 카드",
  volume:   "최근 30일 거래 횟수 기준",
  trending: "최근 7일 조회수 급증 카드",
  dips:     "역대 최고가(ATH) 대비 낙폭 — 저점 매수 후보",
  highs:    "최근 52주 신고가 달성 카드",
};

export default function MarketRankingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [activeTab, setActiveTab] = useState<TabId>("gainers");

  return (
    <Container size="xl" padding="md" className="py-8">
      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        {/* 좌측 사이드바 (토스 screener 패턴) */}
        <aside className="lg:sticky lg:top-[68px] lg:self-start">
          <div>
            <p className="px-4 pt-3 pb-2 text-toss-body text-toss-text-secondary">카드 랭킹</p>
            <nav>
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-1 px-4 py-2.5 h-10 text-toss-body transition-colors rounded-toss-md",
                      active
                        ? "bg-toss-brand-weak text-toss-brand font-semibold"
                        : "text-toss-text-secondary hover:bg-toss-hover"
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.popular && (
                      <Tag color="brand" shape="soft" className="ml-1">인기</Tag>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 메인 영역 */}
        <div className="min-w-0">
          <div className="mb-6">
            <h1 className="text-toss-display font-bold text-toss-text-primary">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className="text-toss-body text-toss-text-tertiary mt-1">
              {TAB_SUBTITLES[activeTab]}
            </p>
          </div>

          {activeTab === "gainers"  && <GainersTab />}
          {activeTab === "volume"   && <VolumeTab />}
          {activeTab === "trending" && <TrendingTab />}
          {activeTab === "dips"     && <DipsTab />}
          {activeTab === "highs"    && <HighsTab />}

          <p className="text-toss-micro text-toss-text-quaternary mt-8 text-center">
            시세 데이터는 번개장터·포켓마켓 거래 기반 추정값입니다. 실제 투자 손익을 보장하지 않습니다.
          </p>
        </div>
      </div>
    </Container>
  );
}
