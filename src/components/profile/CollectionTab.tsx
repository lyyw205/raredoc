"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/toss";

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
    <div className="h-1.5 bg-toss-bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-toss-brand transition-all duration-500"
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
          { label: "총 보유 카드", value: `${totalOwned}장`,                              colorClass: "text-toss-text-primary" },
          { label: "총 추정가",   value: `₩${(totalValue / 10000).toFixed(0)}만`,         colorClass: "text-toss-warning" },
          { label: "인증 카드",   value: `${totalCertified}장`,                            colorClass: "text-toss-positive" },
          { label: "보유 세트",   value: `${MOCK_SETS.length}세트`,                        colorClass: "text-toss-brand" },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-toss-caption text-toss-text-tertiary mb-1">{stat.label}</p>
            <p className={`text-toss-title-2 font-bold toss-numeric ${stat.colorClass}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className="flex gap-4 items-start">

        {/* 왼쪽: 세트 리스트 */}
        <div className="w-52 shrink-0 space-y-1.5">
          <p className="text-toss-caption text-toss-text-quaternary font-medium px-1 mb-2">보유 세트</p>
          {MOCK_SETS.map((set) => {
            const pct = Math.round((set.owned.length / set.totalCards) * 100);
            const isSelected = set.setId === selectedSetId;
            return (
              <button
                key={set.setId}
                onClick={() => setSelectedSetId(set.setId)}
                className={`w-full text-left px-3 py-3 rounded-toss-lg border transition-colors ${
                  isSelected
                    ? "bg-toss-bg-subtle border-toss-brand/40"
                    : "bg-toss-bg-base border-toss-border hover:border-toss-border-strong"
                }`}
              >
                <p className={`text-toss-caption font-semibold truncate mb-1.5 ${isSelected ? "text-toss-text-primary" : "text-toss-text-secondary"}`}>
                  {set.name}
                </p>
                <ProgressBar value={pct} />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-toss-micro text-toss-text-quaternary">{set.owned.length}/{set.totalCards}장</span>
                  <span className={`text-toss-micro font-bold ${isSelected ? "text-toss-brand" : "text-toss-text-tertiary"}`}>{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 오른쪽: 선택 세트 상세 */}
        <div className="flex-1 min-w-0">

          {/* 세트 요약 */}
          <Card padding="md" className="mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-toss-title-2 font-bold text-toss-text-primary">{selectedSet.name}</h2>
                <p className="text-toss-caption text-toss-text-tertiary mt-0.5">{selectedSet.series}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-toss-title-2 font-bold text-toss-warning toss-numeric">₩{setValue.toLocaleString("ko-KR")}</p>
                <p className="text-toss-micro text-toss-text-tertiary">추정 총가치</p>
              </div>
            </div>

            <ProgressBar value={setCompletionPct} />

            <div className="flex items-center gap-4 mt-2.5 text-toss-caption text-toss-text-tertiary">
              <span><span className="text-toss-text-primary font-semibold toss-numeric">{selectedSet.owned.length}</span> / {selectedSet.totalCards}장 보유</span>
              <span><span className="text-toss-positive font-semibold toss-numeric">{selectedSet.owned.filter((c) => c.certified).length}</span>장 인증</span>
              <span className="ml-auto text-toss-brand font-bold toss-numeric">{setCompletionPct}% 완성</span>
            </div>
          </Card>

          {/* 카드 도감 그리드 */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-toss-caption text-toss-text-tertiary">
                <span className="text-toss-text-primary font-semibold toss-numeric">{allCards.length}</span>장 표시
                <span className="mx-2 text-toss-border">·</span>
                미보유 <span className="text-toss-text-quaternary toss-numeric">{selectedSet.unowned.length}</span>장
              </p>
              <div className="flex items-center gap-3 text-toss-micro text-toss-text-quaternary">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-toss-positive inline-block" />인증</span>
                <span className="flex items-center gap-1 opacity-40"><span className="w-2 h-2 rounded-full bg-toss-text-quaternary inline-block" />미보유</span>
              </div>
            </div>

            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(62px, 1fr))" }}>
              {allCards.map((card) => (
                <div key={card.id} className="group relative cursor-pointer" title={`${card.name} · No.${card.number}`}>
                  <div
                    className="rounded-toss-sm overflow-hidden"
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
                    <div className="absolute top-[3px] right-[3px] w-2.5 h-2.5 rounded-full bg-toss-positive ring-1 ring-toss-bg-base shadow" />
                  )}

                  {/* 등급 뱃지 */}
                  {card.isOwned && card.grade && (
                    <div className="absolute bottom-[14px] left-[2px] text-[7px] font-bold bg-black/75 text-white px-1 py-[1px] rounded leading-tight">
                      {card.grade}
                    </div>
                  )}

                  <p className="text-toss-tiny text-center text-toss-text-quaternary mt-[2px] leading-none truncate">
                    {card.number}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
