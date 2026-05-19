"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

// ── 목업 데이터 ───────────────────────────────────────────────────────────────

type OwnedCard = {
  id: string;
  name: string;
  number: string;
  imageUrl: string;
  grade: string;
  certified: boolean;
  valueKrw: number;
};

type SetData = {
  setId: string;
  name: string;
  series: string;
  logoUrl: string;
  totalCards: number;
  owned: OwnedCard[];
  // 미소유 카드 (번호+이미지만)
  unowned: { id: string; name: string; number: string; imageUrl: string }[];
};

const MOCK_SETS: SetData[] = [
  {
    setId: "sv3pt5",
    name: "포켓몬 151",
    series: "스칼렛 & 바이올렛",
    logoUrl: "https://images.pokemontcg.io/sv3pt5/logo.png",
    totalCards: 165,
    owned: [
      { id: "sv3pt5-215", name: "피카츄 ex SAR",   number: "215", imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png", grade: "NM", certified: true,  valueKrw: 280000 },
      { id: "sv3pt5-207", name: "뮤츠 ex SAR",     number: "207", imageUrl: "https://images.pokemontcg.io/sv3pt5/207_hires.png", grade: "LP", certified: true,  valueKrw: 310000 },
      { id: "sv3pt5-205", name: "뮤 ex SAR",       number: "205", imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png", grade: "NM", certified: false, valueKrw: 165000 },
      { id: "sv3pt5-218", name: "이브이 SAR",      number: "218", imageUrl: "https://images.pokemontcg.io/sv3pt5/218_hires.png", grade: "NM", certified: false, valueKrw: 220000 },
      { id: "sv3pt5-198", name: "이상해꽃 ex SAR", number: "198", imageUrl: "https://images.pokemontcg.io/sv3pt5/198_hires.png", grade: "NM", certified: false, valueKrw:  92000 },
      { id: "sv3pt5-200", name: "리자몽 ex SAR",   number: "200", imageUrl: "https://images.pokemontcg.io/sv3pt5/200_hires.png", grade: "NM", certified: false, valueKrw: 195000 },
      { id: "sv3pt5-202", name: "거북왕 ex SAR",   number: "202", imageUrl: "https://images.pokemontcg.io/sv3pt5/202_hires.png", grade: "NM", certified: false, valueKrw:  88000 },
    ],
    unowned: [
      { id: "sv3pt5-201", name: "파이리 ex SAR",   number: "201", imageUrl: "https://images.pokemontcg.io/sv3pt5/201_hires.png" },
      { id: "sv3pt5-203", name: "꼬부기 ex SAR",   number: "203", imageUrl: "https://images.pokemontcg.io/sv3pt5/203_hires.png" },
      { id: "sv3pt5-204", name: "이상해씨 ex SAR", number: "204", imageUrl: "https://images.pokemontcg.io/sv3pt5/204_hires.png" },
      { id: "sv3pt5-206", name: "잠만보 ex SAR",   number: "206", imageUrl: "https://images.pokemontcg.io/sv3pt5/206_hires.png" },
      { id: "sv3pt5-208", name: "루기아 ex SAR",   number: "208", imageUrl: "https://images.pokemontcg.io/sv3pt5/208_hires.png" },
      { id: "sv3pt5-209", name: "나시 ex SAR",     number: "209", imageUrl: "https://images.pokemontcg.io/sv3pt5/209_hires.png" },
      { id: "sv3pt5-210", name: "팬텀 ex SAR",     number: "210", imageUrl: "https://images.pokemontcg.io/sv3pt5/210_hires.png" },
      { id: "sv3pt5-211", name: "또가스 ex SAR",   number: "211", imageUrl: "https://images.pokemontcg.io/sv3pt5/211_hires.png" },
    ],
  },
  {
    setId: "sv4pt5",
    name: "파라다이스 드래고나",
    series: "스칼렛 & 바이올렛",
    logoUrl: "https://images.pokemontcg.io/sv4pt5/logo.png",
    totalCards: 191,
    owned: [
      { id: "sv4pt5-191", name: "리자몽 ex SAR",    number: "191", imageUrl: "https://images.pokemontcg.io/sv4pt5/191_hires.png", grade: "LP", certified: true,  valueKrw: 420000 },
      { id: "sv4pt5-182", name: "가이오가 ex SAR",  number: "182", imageUrl: "https://images.pokemontcg.io/sv4pt5/182_hires.png", grade: "NM", certified: true,  valueKrw: 380000 },
      { id: "sv4pt5-176", name: "아마루르가 ex SAR",number: "176", imageUrl: "https://images.pokemontcg.io/sv4pt5/176_hires.png", grade: "NM", certified: false, valueKrw: 195000 },
    ],
    unowned: [
      { id: "sv4pt5-180", name: "루카리오 ex SAR",  number: "180", imageUrl: "https://images.pokemontcg.io/sv4pt5/180_hires.png" },
      { id: "sv4pt5-185", name: "뮤 ex SAR",        number: "185", imageUrl: "https://images.pokemontcg.io/sv4pt5/185_hires.png" },
      { id: "sv4pt5-188", name: "피카츄 ex SAR",    number: "188", imageUrl: "https://images.pokemontcg.io/sv4pt5/188_hires.png" },
    ],
  },
  {
    setId: "sv8",
    name: "초승달의 섬",
    series: "스칼렛 & 바이올렛",
    logoUrl: "https://images.pokemontcg.io/sv8/logo.png",
    totalCards: 193,
    owned: [
      { id: "sv8-180", name: "잠만보 ex SAR", number: "180", imageUrl: "https://images.pokemontcg.io/sv8/180_hires.png", grade: "NM", certified: false, valueKrw: 48000 },
    ],
    unowned: [
      { id: "sv8-175", name: "루나아라 ex SAR", number: "175", imageUrl: "https://images.pokemontcg.io/sv8/175_hires.png" },
      { id: "sv8-178", name: "실버디 ex SAR",   number: "178", imageUrl: "https://images.pokemontcg.io/sv8/178_hires.png" },
    ],
  },
];

// ── 전체 요약 계산 ────────────────────────────────────────────────────────────

const totalOwned    = MOCK_SETS.reduce((n, s) => n + s.owned.length, 0);
const totalValue    = MOCK_SETS.reduce((n, s) => n + s.owned.reduce((v, c) => v + c.valueKrw, 0), 0);
const totalCertified = MOCK_SETS.reduce((n, s) => n + s.owned.filter((c) => c.certified).length, 0);

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function CollectionTab() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";

  const [selectedSetId, setSelectedSetId] = useState<string>(MOCK_SETS[0].setId);
  const selectedSet = MOCK_SETS.find((s) => s.setId === selectedSetId) ?? MOCK_SETS[0];
  const setCompletionPct = Math.round((selectedSet.owned.length / selectedSet.totalCards) * 100);
  const setValue = selectedSet.owned.reduce((v, c) => v + c.valueKrw, 0);

  // 도감용: 소유 + 미소유 합치고 number 순 정렬
  const allCards = [
    ...selectedSet.owned.map((c) => ({ ...c, isOwned: true })),
    ...selectedSet.unowned.map((c) => ({ ...c, grade: "", certified: false, valueKrw: 0, isOwned: false })),
  ].sort((a, b) => Number(a.number) - Number(b.number));

  return (
    <div>
      {/* ── 전체 요약 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "총 보유 카드", value: `${totalOwned}장`, color: "text-white" },
          { label: "총 추정가",   value: `₩${(totalValue / 10000).toFixed(0)}만`, color: "text-yellow-400" },
          { label: "인증 카드",   value: `${totalCertified}장`, color: "text-green-400" },
          { label: "보유 세트",   value: `${MOCK_SETS.length}세트`, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className="flex gap-4 items-start">

        {/* 왼쪽: 세트 리스트 */}
        <div className="w-52 shrink-0 space-y-1.5">
          <p className="text-xs text-gray-600 font-medium px-1 mb-2">보유 세트</p>
          {MOCK_SETS.map((set) => {
            const pct = Math.round((set.owned.length / set.totalCards) * 100);
            const isSelected = set.setId === selectedSetId;
            return (
              <button
                key={set.setId}
                onClick={() => setSelectedSetId(set.setId)}
                className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
                  isSelected
                    ? "bg-gray-800 border-yellow-500/50"
                    : "bg-gray-900 border-gray-800 hover:border-gray-700"
                }`}
              >
                <p className={`text-xs font-semibold truncate mb-1.5 ${isSelected ? "text-white" : "text-gray-300"}`}>
                  {set.name}
                </p>
                <ProgressBar value={pct} />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-600">{set.owned.length}/{set.totalCards}장</span>
                  <span className={`text-[10px] font-bold ${isSelected ? "text-yellow-400" : "text-gray-500"}`}>{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 오른쪽: 선택 세트 상세 */}
        <div className="flex-1 min-w-0">

          {/* 세트 요약 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-base font-bold text-white">{selectedSet.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedSet.series}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-yellow-400">₩{setValue.toLocaleString("ko-KR")}</p>
                <p className="text-[11px] text-gray-500">추정 총가치</p>
              </div>
            </div>

            <ProgressBar value={setCompletionPct} />

            <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-500">
              <span><span className="text-white font-semibold">{selectedSet.owned.length}</span> / {selectedSet.totalCards}장 보유</span>
              <span><span className="text-green-400 font-semibold">{selectedSet.owned.filter((c) => c.certified).length}</span>장 인증</span>
              <span className="ml-auto text-yellow-400 font-bold">{setCompletionPct}% 완성</span>
            </div>
          </div>

          {/* 카드 도감 그리드 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">
                <span className="text-white font-semibold">{allCards.length}</span>장 표시
                <span className="ml-2 text-gray-700">·</span>
                <span className="ml-2">미보유 <span className="text-gray-600">{selectedSet.unowned.length}</span>장</span>
              </p>
              <div className="flex items-center gap-3 text-[10px] text-gray-600">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />인증</span>
                <span className="flex items-center gap-1 opacity-40"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />미보유</span>
              </div>
            </div>

            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(62px, 1fr))" }}>
              {allCards.map((card) => (
                <div key={card.id} className="group relative cursor-pointer" title={`${card.name} · No.${card.number}`}>
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{
                      aspectRatio: "63 / 88",
                      filter: card.isOwned ? "none" : "grayscale(100%)",
                      opacity: card.isOwned ? 1 : 0.25,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  {/* 인증 점 */}
                  {card.isOwned && card.certified && (
                    <div className="absolute top-[3px] right-[3px] w-2.5 h-2.5 rounded-full bg-green-500 ring-1 ring-gray-900 shadow" />
                  )}

                  {/* 등급 뱃지 */}
                  {card.isOwned && card.grade && (
                    <div className="absolute bottom-[14px] left-[2px] text-[7px] font-bold bg-black/75 text-white px-1 py-[1px] rounded leading-tight">
                      {card.grade}
                    </div>
                  )}

                  <p className="text-[9px] text-center text-gray-600 mt-[2px] leading-none truncate">
                    {card.number}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
