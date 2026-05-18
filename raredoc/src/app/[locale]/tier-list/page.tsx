"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  if (rank === 1) return <span className="w-6 h-6 rounded-full bg-yellow-500 text-black text-[11px] font-black flex items-center justify-center shrink-0">1</span>;
  if (rank === 2) return <span className="w-6 h-6 rounded-full bg-slate-400 text-slate-900 text-[11px] font-black flex items-center justify-center shrink-0">2</span>;
  if (rank === 3) return <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-[11px] font-black flex items-center justify-center shrink-0">3</span>;
  return <span className="w-6 text-center text-xs text-gray-600 font-semibold shrink-0">{rank}</span>;
}

function CardThumb({ card }: { card: Card }) {
  return (
    <div className="w-10 h-14 rounded-lg overflow-hidden bg-gray-800 shrink-0">
      <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
    </div>
  );
}

function PctBadge({ value, positive = true }: { value: number; positive?: boolean }) {
  const color = positive ? "text-red-400" : "text-blue-400";
  const sign = positive ? "+" : "";
  return <span className={`text-sm font-bold tabular-nums ${color}`}>{sign}{value.toFixed(1)}%</span>;
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
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-gray-500">기간</span>
        <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 transition-colors ${period === p.id ? "bg-gray-700 text-white font-semibold" : "text-gray-500 hover:text-gray-300"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map((row, i) => {
          const card = BASE_CARDS[row.cardId];
          if (!card) return null;
          const change = period === "1w" ? row.change1w : period === "1m" ? row.change1m : row.change3m;
          return (
            <div key={row.cardId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
              <RankBadge rank={i + 1} />
              <CardThumb card={card} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{card.set}</p>
              </div>
              <div className="text-right shrink-0">
                <PctBadge value={change} />
                <p className="text-[11px] text-gray-500 mt-0.5">₩{card.currentPrice.toLocaleString("ko-KR")}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VolumeTab() {
  const sorted = [...VOLUME].sort((a, b) => b.txCount - a.txCount);

  return (
    <div>
      <p className="text-xs text-gray-600 mb-5">최근 30일 거래 횟수 기준</p>
      <div className="space-y-2">
        {sorted.map((row, i) => {
          const card = BASE_CARDS[row.cardId];
          if (!card) return null;
          return (
            <div key={row.cardId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
              <RankBadge rank={i + 1} />
              <CardThumb card={card} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{card.set}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">{row.txCount.toLocaleString()}<span className="text-xs font-normal text-gray-500 ml-0.5">건</span></p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TREND_BADGE_COLOR: Record<string, string> = {
  급등: "bg-red-500/20 text-red-400",
  인기: "bg-yellow-500/20 text-yellow-400",
  신흥: "bg-purple-500/20 text-purple-400",
  상승: "bg-green-500/20 text-green-400",
};

function TrendingTab() {
  return (
    <div>
      <p className="text-xs text-gray-600 mb-5">최근 7일 조회수 급증 카드</p>
      <div className="space-y-2">
        {TRENDING.map((row, i) => {
          const card = BASE_CARDS[row.cardId];
          if (!card) return null;
          return (
            <div key={row.cardId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
              <RankBadge rank={i + 1} />
              <CardThumb card={card} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${TREND_BADGE_COLOR[row.badge]}`}>{row.badge}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">{card.set}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-red-400">+{row.viewChange}%</p>
                <p className="text-[11px] text-gray-500 mt-0.5">관심 {row.wishlistCount.toLocaleString()}명</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DipsTab() {
  return (
    <div>
      <p className="text-xs text-gray-600 mb-5">역대 최고가(ATH) 대비 낙폭 — 저점 매수 후보</p>
      <div className="space-y-2">
        {DIPS.map((row, i) => {
          const card = BASE_CARDS[row.cardId];
          if (!card) return null;
          return (
            <div key={row.cardId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
              <RankBadge rank={i + 1} />
              <CardThumb card={card} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  ATH ₩{row.athPrice.toLocaleString("ko-KR")} → 현재 ₩{row.currentPrice.toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <PctBadge value={Math.abs(row.dropPct)} positive={false} />
                <p className="text-[11px] text-blue-400/70 mt-0.5">ATH 대비</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HighsTab() {
  return (
    <div>
      <p className="text-xs text-gray-600 mb-5">최근 52주 신고가 달성 카드</p>
      <div className="space-y-2">
        {HIGHS.map((row, i) => {
          const card = BASE_CARDS[row.cardId];
          if (!card) return null;
          return (
            <div key={row.cardId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
              <RankBadge rank={i + 1} />
              <CardThumb card={card} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{card.set} · {row.achievedAt} 달성</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-yellow-400">₩{row.newHigh.toLocaleString("ko-KR")}</p>
                <p className="text-[11px] text-red-400 mt-0.5">+{row.changePct.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "gainers",  label: "상승률",     icon: "📈" },
  { id: "volume",   label: "거래량",     icon: "🔄" },
  { id: "trending", label: "트렌딩",     icon: "🔥" },
  { id: "dips",     label: "고점 대비 낙폭", icon: "📉" },
  { id: "highs",    label: "52주 신고가", icon: "🏆" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function MarketRankingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [activeTab, setActiveTab] = useState<TabId>("gainers");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-bold text-white">카드 마켓 랭킹</h1>
        <p className="text-sm text-gray-500 mt-1">시세·거래량·트렌드 기반 카드 순위</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeTab === tab.id
                ? "bg-yellow-500 text-black font-semibold"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "gainers"  && <GainersTab />}
        {activeTab === "volume"   && <VolumeTab />}
        {activeTab === "trending" && <TrendingTab />}
        {activeTab === "dips"     && <DipsTab />}
        {activeTab === "highs"    && <HighsTab />}
      </div>

      <p className="text-[11px] text-gray-700 mt-8 text-center">
        시세 데이터는 번개장터·포켓마켓 거래 기반 추정값입니다. 실제 투자 손익을 보장하지 않습니다.
      </p>
    </div>
  );
}
