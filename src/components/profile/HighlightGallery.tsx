"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card } from "@/components/toss";
import {
  setHighlightAction,
  toggleForSaleAction,
  certifyItemAction,
  searchExternalCardsAction,
  type CardSearchResult,
} from "@/lib/actions/collection";


export interface HighlightItem {
  id: string;        // CollectionItem id
  name: string;
  set: string;
  grade: string;
  certified: boolean;
  imageUrl: string;
  valueKrw: number;
  isLocked?: boolean; // !forSale
}

/** 하이라이트에 추가할 수 있는 (아직 하이라이트 아닌) 보유 카드 */
export interface MyCollectionCard {
  id: string;        // CollectionItem id
  name: string;
  set: string;
  grade: string;
  certified: boolean;
  imageUrl: string;
  valueKrw: number;
}

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
  myCollection,
  emptySlot,
}: {
  onClose: () => void;
  myCollection: MyCollectionCard[];
  emptySlot: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"collection" | "certify">("collection");
  const [isPending, startTransition] = useTransition();

  // 인증 신청 탭 상태
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [dexResults, setDexResults] = useState<CardSearchResult[]>([]);
  const [selectedDex, setSelectedDex] = useState<CardSearchResult | null>(null);
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

  // 카드 검색 (debounce)
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(() => {
      if (q.length < 1) {
        setDexResults([]);
        return;
      }
      void searchExternalCardsAction(q).then(setDexResults);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  function handleAddFromCollection(card: MyCollectionCard) {
    startTransition(async () => {
      await setHighlightAction(card.id, emptySlot);
      router.refresh();
      close();
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
  }

  function handleSubmitCertify() {
    if (!selectedDex) return;
    const fd = new FormData();
    fd.set("cardId", selectedDex.id);
    fd.set("grade", grade);
    if (photoFile) fd.set("photo", photoFile);
    startTransition(async () => {
      const res = await certifyItemAction(fd);
      if (res.ok) {
        setSubmitted(true);
        router.refresh();
      }
    });
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
            myCollection.length === 0 ? (
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
                {myCollection.map((card) => (
                  <button
                    key={card.id}
                    disabled={isPending}
                    onClick={() => handleAddFromCollection(card)}
                    className="group flex flex-col items-center text-left rounded-toss-lg overflow-hidden border border-toss-border hover:border-toss-brand/50 transition-colors bg-toss-bg-subtle disabled:opacity-50"
                  >
                    <div className="w-full aspect-[63/88] overflow-hidden bg-toss-bg-muted">
                      {card.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : null}
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
                        onClick={() => { setPhoto(null); setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
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
                          {card.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                          ) : null}
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
              disabled={!selectedDex || isPending}
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
  item, isOwnProfile, onToggleLock, disabled,
}: {
  item: HighlightItem;
  isOwnProfile: boolean;
  onToggleLock: (id: string, locked: boolean) => void;
  disabled: boolean;
}) {
  const locale = useLocale();
  const locked = item.isLocked ?? false;

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative rounded-toss-lg overflow-hidden bg-toss-bg-muted border border-toss-border group-hover:border-toss-border-strong transition-colors w-full aspect-[2.5/3.5]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className={`w-full h-full object-cover transition-all ${locked ? "brightness-50" : ""}`}
          />
        ) : null}
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
            disabled={disabled}
            onClick={() => onToggleLock(item.id, locked)}
            className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
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
  items,
  totalSlots = 5,
  totalValue,
  isOwnProfile = false,
  myCollection = [],
}: {
  items: HighlightItem[];
  totalSlots?: number;
  totalValue: number;
  isOwnProfile?: boolean;
  myCollection?: MyCollectionCard[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const emptyCount = Math.max(0, totalSlots - items.length);
  const lockedCount = items.filter((i) => i.isLocked).length;
  const usedSlots = new Set(items.map((_, idx) => idx + 1));
  const firstEmptySlot = (() => {
    for (let s = 1; s <= totalSlots; s++) if (!usedSlots.has(s)) return s;
    return 1;
  })();

  function toggleLock(id: string, locked: boolean) {
    // locked = !forSale → 잠금 해제는 판매중(true), 잠금은 판매중지(false)
    startTransition(async () => {
      await toggleForSaleAction(id, locked);
      router.refresh();
    });
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

        {items.length === 0 && !isOwnProfile ? (
          <div className="py-10 text-center text-toss-text-quaternary text-toss-caption">
            아직 등록된 대표 소장품이 없어요
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {items.map((item) => (
              <HighlightCard key={item.id} item={item} isOwnProfile={isOwnProfile} onToggleLock={toggleLock} disabled={isPending} />
            ))}
            {isOwnProfile && Array.from({ length: emptyCount }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} onClick={() => setModalOpen(true)} />
            ))}
          </div>
        )}
      </Card>

      {modalOpen && (
        <AddCardModal
          onClose={() => setModalOpen(false)}
          myCollection={myCollection}
          emptySlot={firstEmptySlot}
        />
      )}
    </>
  );
}
