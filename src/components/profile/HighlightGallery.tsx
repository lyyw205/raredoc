"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Card } from "@/components/toss";


export interface HighlightItem {
  id: string;
  name: string;
  set: string;
  grade: string;
  certified: boolean;
  imageUrl: string;
  valueKrw: number;
  isLocked?: boolean;
}

// 이미 등록된 컬렉션 카드 (하이라이트에 없는 것들)
const MOCK_MY_COLLECTION = [
  { id: "c1", name: "이상해꽃 ex SAR", set: "포켓몬 151",         grade: "NM", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/198_hires.png", valueKrw:  92000 },
  { id: "c2", name: "거북왕 ex SAR",   set: "포켓몬 151",         grade: "NM", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/202_hires.png", valueKrw:  88000 },
  { id: "c3", name: "뮤 ex SAR",       set: "포켓몬 151",         grade: "NM", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png", valueKrw: 165000 },
  { id: "c4", name: "가이오가 ex SAR", set: "파라다이스 드래고나", grade: "NM", certified: true,  imageUrl: "https://images.pokemontcg.io/sv4pt5/182_hires.png", valueKrw: 380000 },
  { id: "c5", name: "잠만보 ex SAR",   set: "초승달의 섬",         grade: "LP", certified: false, imageUrl: "https://images.pokemontcg.io/sv8/180_hires.png",   valueKrw:  48000 },
  { id: "c6", name: "이브이 SAR",      set: "포켓몬 151",         grade: "NM", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/218_hires.png", valueKrw: 220000 },
];


// 도감 전체 카드 목업 (실제 구현 시 API로 교체)
const MOCK_DEX_CARDS = [
  // 포켓몬 151
  { id: "sv3pt5-215", name: "피카츄 ex SAR",    set: "포켓몬 151",         number: "215", imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png" },
  { id: "sv3pt5-200", name: "리자몽 ex SAR",    set: "포켓몬 151",         number: "200", imageUrl: "https://images.pokemontcg.io/sv3pt5/200_hires.png" },
  { id: "sv3pt5-198", name: "이상해꽃 ex SAR",  set: "포켓몬 151",         number: "198", imageUrl: "https://images.pokemontcg.io/sv3pt5/198_hires.png" },
  { id: "sv3pt5-202", name: "거북왕 ex SAR",    set: "포켓몬 151",         number: "202", imageUrl: "https://images.pokemontcg.io/sv3pt5/202_hires.png" },
  { id: "sv3pt5-205", name: "뮤 ex SAR",        set: "포켓몬 151",         number: "205", imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png" },
  { id: "sv3pt5-207", name: "뮤츠 ex SAR",      set: "포켓몬 151",         number: "207", imageUrl: "https://images.pokemontcg.io/sv3pt5/207_hires.png" },
  { id: "sv3pt5-218", name: "이브이 SAR",       set: "포켓몬 151",         number: "218", imageUrl: "https://images.pokemontcg.io/sv3pt5/218_hires.png" },
  { id: "sv3pt5-201", name: "파이리 ex SAR",    set: "포켓몬 151",         number: "201", imageUrl: "https://images.pokemontcg.io/sv3pt5/201_hires.png" },
  { id: "sv3pt5-203", name: "꼬부기 ex SAR",    set: "포켓몬 151",         number: "203", imageUrl: "https://images.pokemontcg.io/sv3pt5/203_hires.png" },
  { id: "sv3pt5-204", name: "이상해씨 ex SAR",  set: "포켓몬 151",         number: "204", imageUrl: "https://images.pokemontcg.io/sv3pt5/204_hires.png" },
  { id: "sv3pt5-206", name: "잠만보 ex SAR",    set: "포켓몬 151",         number: "206", imageUrl: "https://images.pokemontcg.io/sv3pt5/206_hires.png" },
  { id: "sv3pt5-208", name: "루기아 ex SAR",    set: "포켓몬 151",         number: "208", imageUrl: "https://images.pokemontcg.io/sv3pt5/208_hires.png" },
  { id: "sv3pt5-209", name: "나시 ex SAR",      set: "포켓몬 151",         number: "209", imageUrl: "https://images.pokemontcg.io/sv3pt5/209_hires.png" },
  { id: "sv3pt5-210", name: "팬텀 ex SAR",      set: "포켓몬 151",         number: "210", imageUrl: "https://images.pokemontcg.io/sv3pt5/210_hires.png" },
  { id: "sv3pt5-211", name: "또가스 ex SAR",    set: "포켓몬 151",         number: "211", imageUrl: "https://images.pokemontcg.io/sv3pt5/211_hires.png" },
  { id: "sv3pt5-212", name: "강철톤 ex SAR",    set: "포켓몬 151",         number: "212", imageUrl: "https://images.pokemontcg.io/sv3pt5/212_hires.png" },
  { id: "sv3pt5-213", name: "마임맨 ex SAR",    set: "포켓몬 151",         number: "213", imageUrl: "https://images.pokemontcg.io/sv3pt5/213_hires.png" },
  { id: "sv3pt5-214", name: "디그다 ex SAR",    set: "포켓몬 151",         number: "214", imageUrl: "https://images.pokemontcg.io/sv3pt5/214_hires.png" },
  // 파라다이스 드래고나
  { id: "sv4pt5-191", name: "리자몽 ex SAR",    set: "파라다이스 드래고나", number: "191", imageUrl: "https://images.pokemontcg.io/sv4pt5/191_hires.png" },
  { id: "sv4pt5-182", name: "가이오가 ex SAR",  set: "파라다이스 드래고나", number: "182", imageUrl: "https://images.pokemontcg.io/sv4pt5/182_hires.png" },
  { id: "sv4pt5-176", name: "아마루르가 ex SAR",set: "파라다이스 드래고나", number: "176", imageUrl: "https://images.pokemontcg.io/sv4pt5/176_hires.png" },
  { id: "sv4pt5-180", name: "루카리오 ex SAR",  set: "파라다이스 드래고나", number: "180", imageUrl: "https://images.pokemontcg.io/sv4pt5/180_hires.png" },
  { id: "sv4pt5-185", name: "뮤 ex SAR",        set: "파라다이스 드래고나", number: "185", imageUrl: "https://images.pokemontcg.io/sv4pt5/185_hires.png" },
  { id: "sv4pt5-188", name: "피카츄 ex SAR",    set: "파라다이스 드래고나", number: "188", imageUrl: "https://images.pokemontcg.io/sv4pt5/188_hires.png" },
  // 초승달의 섬
  { id: "sv8-180",    name: "잠만보 ex SAR",    set: "초승달의 섬",         number: "180", imageUrl: "https://images.pokemontcg.io/sv8/180_hires.png" },
  { id: "sv8-175",    name: "루나아라 ex SAR",  set: "초승달의 섬",         number: "175", imageUrl: "https://images.pokemontcg.io/sv8/175_hires.png" },
  { id: "sv8-178",    name: "실버디 ex SAR",    set: "초승달의 섬",         number: "178", imageUrl: "https://images.pokemontcg.io/sv8/178_hires.png" },
];

const GRADES = ["NM", "LP", "MP", "HP"];

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── 카드 등록 모달 ─────────────────────────────────────────────────────────

function AddCardModal({
  onClose,
  onAdd,
  highlightIds,
}: {
  onClose: () => void;
  onAdd: (item: HighlightItem) => void;
  highlightIds: Set<string>;
}) {
  const [tab, setTab] = useState<"collection" | "certify">("collection");

  // 인증 신청 탭 상태
  const [photo, setPhoto] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedDex, setSelectedDex] = useState<typeof MOCK_DEX_CARDS[number] | null>(null);
  const [grade, setGrade] = useState("NM");
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [close]);

  const availableCollection = MOCK_MY_COLLECTION.filter((c) => !highlightIds.has(c.id));
  const dexResults = query.trim().length < 1
    ? MOCK_DEX_CARDS
    : MOCK_DEX_CARDS.filter((c) => c.name.includes(query) || c.set.includes(query));

  function handleAddFromCollection(card: typeof MOCK_MY_COLLECTION[number]) {
    onAdd({ ...card, isLocked: false });
    close();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhoto(url);
  }

  function handleSubmitCertify() {
    if (!photo || !selectedDex) return;
    setSubmitted(true);
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) close(); }}
    >
      <div className="w-full max-w-lg bg-toss-bg-base border border-toss-border rounded-toss-xl overflow-hidden shadow-toss-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <h2 className="text-toss-title-2 font-bold text-toss-text-primary">카드 등록</h2>
          <button onClick={close} className="text-toss-text-tertiary hover:text-toss-text-primary transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-toss-divider px-5 shrink-0">
          {(["collection", "certify"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSubmitted(false); }}
              className={`text-toss-body pb-3 mr-6 border-b-2 transition-colors ${
                tab === t
                  ? "border-toss-text-primary text-toss-text-primary font-semibold"
                  : "border-transparent text-toss-text-tertiary hover:text-toss-text-secondary"
              }`}
            >
              {t === "collection" ? "내 컬렉션에서 추가" : "카드 인증 신청"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── 내 컬렉션 탭 ── */}
          {tab === "collection" && (
            availableCollection.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-toss-text-quaternary">
                <p className="text-toss-body">하이라이트에 추가할 수 있는 카드가 없어요</p>
                <button
                  onClick={() => setTab("certify")}
                  className="mt-3 text-toss-caption text-toss-brand hover:opacity-80 transition-opacity"
                >
                  카드 인증 신청하기 →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {availableCollection.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleAddFromCollection(card)}
                    className="group flex flex-col items-center text-left rounded-toss-lg overflow-hidden border border-toss-border hover:border-toss-brand/50 transition-colors bg-toss-bg-subtle"
                  >
                    <div className="w-full aspect-[63/88] overflow-hidden bg-toss-bg-muted">
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-2 w-full">
                      <p className="text-toss-caption font-semibold text-toss-text-primary truncate">{card.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-toss-micro text-toss-text-tertiary">{card.grade}</span>
                        <span className="text-toss-caption text-toss-brand ml-auto toss-numeric">₩{card.valueKrw.toLocaleString("ko-KR")}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* ── 카드 인증 신청 탭 ── */}
          {tab === "certify" && (
            submitted ? (
              /* 신청 완료 상태 */
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-14 h-14 rounded-full bg-toss-brand-weak flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--toss-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="text-toss-subtitle font-semibold text-toss-text-primary mb-1">인증 신청이 완료됐어요</p>
                <p className="text-toss-caption text-toss-text-secondary leading-relaxed">
                  운영팀이 사진을 검토 후 승인하면<br />
                  카드가 내 컬렉션에 추가됩니다.<br />
                  보통 <span className="text-toss-brand">24시간 이내</span> 처리돼요.
                </p>
                <button onClick={close} className="mt-6 text-toss-caption px-4 py-2 rounded-toss-md bg-toss-bg-subtle text-toss-text-secondary hover:bg-toss-hover transition-colors">
                  닫기
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 1. 사진 업로드 */}
                <div>
                  <label className="text-toss-caption text-toss-text-secondary font-medium mb-1.5 block">
                    1. 카드 실물 사진 업로드
                    <span className="ml-2 text-toss-text-quaternary font-normal">카드 전면이 선명하게 나와야 해요</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {photo ? (
                    <div className="relative rounded-toss-lg overflow-hidden border border-toss-border bg-toss-bg-subtle h-40">
                      <img src={photo} alt="업로드 사진" className="w-full h-full object-contain" />
                      <button
                        onClick={() => { setPhoto(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-toss-bg-base/80 text-toss-text-tertiary hover:text-toss-text-primary flex items-center justify-center transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 rounded-toss-lg border-2 border-dashed border-toss-border hover:border-toss-brand/50 text-toss-text-quaternary hover:text-toss-text-tertiary flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="text-toss-caption">사진 선택 또는 촬영</span>
                    </button>
                  )}
                </div>

                {/* 2. 카드 선택 */}
                <div>
                  <label className="text-toss-caption text-toss-text-secondary font-medium mb-1.5 block">
                    2. 해당 카드 선택
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedDex(null); }}
                    placeholder="카드 이름 검색..."
                    className="w-full bg-toss-bg-subtle border border-toss-border rounded-toss-md px-3 py-2 text-toss-body text-toss-text-primary placeholder-toss-text-quaternary focus:outline-none focus:border-toss-brand/60 mb-2"
                  />
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {dexResults.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedDex(card)}
                        className={`rounded-toss-md overflow-hidden border-2 transition-colors ${
                          selectedDex?.id === card.id
                            ? "border-toss-brand"
                            : "border-toss-border hover:border-toss-border-strong"
                        }`}
                      >
                        <div className="aspect-[63/88] bg-toss-bg-muted">
                          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-toss-tiny text-toss-text-tertiary px-1 py-1 text-center leading-tight truncate">{card.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 컨디션 */}
                {selectedDex && (
                  <div>
                    <label className="text-toss-caption text-toss-text-secondary font-medium mb-2 block">3. 컨디션</label>
                    <div className="flex gap-2">
                      {GRADES.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGrade(g)}
                          className={`flex-1 py-1.5 rounded-toss-md text-toss-caption font-semibold border transition-colors ${
                            grade === g
                              ? "bg-toss-brand border-toss-brand text-white"
                              : "border-toss-border text-toss-text-tertiary hover:border-toss-border-strong"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    <p className="text-toss-micro text-toss-text-quaternary mt-1.5">컨디션은 운영팀 검토 후 조정될 수 있어요</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer — 인증 신청 탭, 미완료 상태에서만 */}
        {tab === "certify" && !submitted && (
          <div className="px-5 py-4 border-t border-toss-divider shrink-0">
            <button
              onClick={handleSubmitCertify}
              disabled={!photo || !selectedDex}
              className="w-full py-2.5 rounded-toss-pill text-toss-label font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-toss-brand hover:opacity-90 text-white"
            >
              인증 신청하기
            </button>
            <p className="text-toss-micro text-toss-text-quaternary text-center mt-2">
              승인 후 카드가 컬렉션에 추가됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HighlightCard ──────────────────────────────────────────────────────────

function HighlightCard({
  item, isOwnProfile, onToggleLock,
}: {
  item: HighlightItem;
  isOwnProfile: boolean;
  onToggleLock: (id: string) => void;
}) {
  const locale = useLocale();
  const locked = item.isLocked ?? false;

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative rounded-toss-lg overflow-hidden bg-toss-bg-muted border border-toss-border group-hover:border-toss-border-strong transition-colors w-full aspect-[2.5/3.5]">
        <img
          src={item.imageUrl}
          alt={item.name}
          className={`w-full h-full object-cover transition-all ${locked ? "brightness-50" : ""}`}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        {item.certified && !locked && (
          <span className="absolute top-2 right-2 text-toss-micro font-bold bg-toss-positive text-white px-1.5 py-0.5 rounded-toss-pill">
            인증
          </span>
        )}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-toss-text-tertiary">
            <LockIcon size={22} />
            <span className="text-toss-micro font-semibold">판매 안함</span>
          </div>
        )}
        {isOwnProfile && (
          <button
            onClick={() => onToggleLock(item.id)}
            className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              locked
                ? "bg-toss-brand text-white hover:opacity-90"
                : "bg-toss-bg-base/80 text-toss-text-tertiary hover:text-toss-text-primary opacity-0 group-hover:opacity-100"
            }`}
            title={locked ? "잠금 해제" : "판매 안함으로 잠금"}
          >
            <LockIcon size={11} />
          </button>
        )}
      </div>
      <div className="w-full text-center">
        <p className="text-toss-caption font-semibold text-toss-text-primary leading-tight truncate">{item.name}</p>
        <p className="text-toss-micro text-toss-text-tertiary mt-0.5">{item.set}</p>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="text-toss-micro text-toss-text-secondary bg-toss-bg-subtle px-1.5 py-0.5 rounded-toss-xs">{item.grade}</span>
          <span className="text-toss-caption font-medium text-toss-warning toss-numeric">₩{item.valueKrw.toLocaleString("ko-KR")}</span>
        </div>
        {!isOwnProfile && !locked && (
          <Link
            href={`/${locale}/messages/c1`}
            className="mt-1.5 inline-flex items-center gap-1 text-toss-micro font-semibold px-2 py-1 rounded-toss-md bg-toss-brand-weak text-toss-brand border border-toss-brand/30 hover:bg-toss-brand/15 transition-colors"
          >
            구매 제안
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptySlot({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center w-full aspect-[2.5/3.5] rounded-toss-lg border-2 border-dashed border-toss-border text-toss-text-quaternary hover:border-toss-brand/40 hover:text-toss-text-tertiary transition-colors cursor-pointer group"
    >
      <span className="text-2xl mb-1 group-hover:text-toss-brand/60 transition-colors">+</span>
      <span className="text-toss-micro">카드 등록</span>
    </button>
  );
}

// ── HighlightGallery ───────────────────────────────────────────────────────

export function HighlightGallery({
  items: initialItems,
  totalSlots = 5,
  totalValue,
  isOwnProfile = false,
}: {
  items: HighlightItem[];
  totalSlots?: number;
  totalValue: number;
  isOwnProfile?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [modalOpen, setModalOpen] = useState(false);

  const emptyCount = Math.max(0, totalSlots - items.length);
  const lockedCount = items.filter((i) => i.isLocked).length;
  const highlightIds = new Set(items.map((i) => i.id));

  function toggleLock(id: string) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, isLocked: !item.isLocked } : item));
  }

  function handleAdd(item: HighlightItem) {
    if (items.length >= totalSlots) return;
    setItems((prev) => [...prev, item]);
  }

  return (
    <>
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-toss-subtitle font-semibold text-toss-text-primary">하이라이트 갤러리</h2>
            <p className="text-toss-caption text-toss-text-tertiary mt-0.5">
              {isOwnProfile
                ? `잠금 ${lockedCount}개 · 제안 가능 ${items.length - lockedCount}개`
                : "대표 소장품"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-toss-caption text-toss-text-tertiary">
              총 추정가 <span className="text-toss-title-2 font-bold text-toss-warning toss-numeric">₩{totalValue.toLocaleString("ko-KR")}</span>
            </span>
            {isOwnProfile && emptyCount > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="text-toss-caption px-3 py-1.5 rounded-toss-md bg-toss-brand hover:opacity-90 text-white font-semibold transition-opacity"
              >
                + 카드 등록
              </button>
            )}
          </div>
        </div>

        {isOwnProfile && (
          <p className="text-toss-micro text-toss-text-quaternary mb-3">
            🔒 자물쇠 아이콘을 클릭해 판매 의사 없는 수집품을 잠글 수 있어요. 잠금 해제된 카드는 구매 제안을 받을 수 있어요.
          </p>
        )}

        <div className="grid grid-cols-5 gap-3">
          {items.map((item) => (
            <HighlightCard key={item.id} item={item} isOwnProfile={isOwnProfile} onToggleLock={toggleLock} />
          ))}
          {isOwnProfile && Array.from({ length: emptyCount }).map((_, i) => (
            <EmptySlot key={`empty-${i}`} onClick={() => setModalOpen(true)} />
          ))}
        </div>
      </Card>

      {modalOpen && (
        <AddCardModal
          onClose={() => setModalOpen(false)}
          onAdd={handleAdd}
          highlightIds={highlightIds}
        />
      )}
    </>
  );
}
