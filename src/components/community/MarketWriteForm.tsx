"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Plus, Search, X } from "lucide-react";
import { createPost } from "@/lib/actions/community";
import { Button, TextField } from "@/components/toss";
import { cn } from "@/lib/utils";
import { PhotoUploader } from "./PhotoUploader";

// ── .pen 정확 스펙 칩 (h28 · pad[0,10] · pill · 13px) ──────────────────────
function PChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 shrink-0 items-center rounded-toss-pill px-2.5 text-toss-caption transition-colors",
        selected
          ? "bg-toss-brand-weak font-semibold text-toss-brand"
          : "bg-toss-bg-muted font-medium text-toss-text-secondary hover:opacity-80"
      )}
    >
      {children}
    </button>
  );
}

// ── .pen 정확 스펙 토글 (44×24, 노브 20) ──────────────────────────────────
function PToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-toss-pill transition-colors",
        checked ? "bg-toss-brand" : "bg-toss-text-quaternary"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

const GRADES = ["NM", "LP", "MP", "HP"] as const;
const CERTS = [
  ["none", "미인증"],
  ["PSA10", "PSA 10"],
  ["PSA9", "PSA 9"],
  ["PSA8-", "PSA 8 이하"],
] as const;
const METHODS = [
  ["direct", "직거래"],
  ["delivery", "택배"],
  ["both", "직거래·택배"],
] as const;

export function MarketWriteForm({ locale }: { locale: string }) {
  const router = useRouter();

  const [category, setCategory] = useState<"팝니다" | "삽니다">("팝니다");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 카드 다중 선택
  const [cardInput, setCardInput] = useState("");
  const [cards, setCards] = useState<string[]>([]);

  // 거래 필드
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<"NM" | "LP" | "MP" | "HP" | "">("");
  const [certified, setCertified] = useState<"none" | "PSA10" | "PSA9" | "PSA8-" | "">("");
  const [dealMethod, setDealMethod] = useState<"direct" | "delivery" | "both" | "">("");
  const [location, setLocation] = useState("");
  const [negotiable, setNegotiable] = useState(false);

  const listHref = `/${locale}/community`;
  const isBuy = category === "삽니다";

  function addCard() {
    const v = cardInput.trim();
    if (!v) return;
    setCards((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setCardInput("");
  }

  function handleSubmit() {
    setError(null);
    startSubmit(async () => {
      const res = await createPost({
        collectibleCategory: "포켓몬 TCG",
        category,
        title: title.trim(),
        body: content.trim(),
        images,
        priceKrw: price ? Number(price) : null,
        condition: condition || undefined,
        certified: certified !== "" && certified !== "none",
        location: location.trim() || undefined,
        dealMethod: dealMethod || undefined,
        negotiable,
      });
      if (!res.ok) {
        setError(res.error ?? "등록에 실패했습니다.");
        return;
      }
      router.push(`/${locale}/community/${res.postId}`);
    });
  }

  const card = "rounded-toss-lg border border-toss-border bg-toss-bg-base p-5";
  const cardTitle = "mb-3 text-toss-body font-semibold text-toss-text-primary";
  const fieldLabel = "mb-2 text-toss-caption font-medium text-toss-text-secondary";

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(listHref)}
          className="flex h-8 w-8 items-center justify-center rounded-toss-md text-toss-text-primary transition-colors hover:bg-toss-hover"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-toss-title-1 font-bold text-toss-text-primary">마켓 글 작성</h1>
      </div>

      {/* 2단: 좌 미디어 / 우 정보 */}
      <div className="grid items-start gap-6 lg:grid-cols-[480px_1fr]">
        {/* ── 좌측 ── */}
        <div className="space-y-6">
          {/* 사진 */}
          <section className={card}>
            <p className={cardTitle}>
              사진 <span className="text-toss-caption font-normal text-toss-text-quaternary">({images.length}/5)</span>
            </p>
            <PhotoUploader images={images} onChange={setImages} onUploadingChange={setUploading} onNotice={setError} hideLabel />
          </section>

          {/* 카드 선택 (다중) */}
          <section className={card}>
            <p className={cardTitle}>
              카드 선택 <span className="text-toss-caption font-normal text-toss-text-quaternary">({cards.length})</span>
            </p>

            {/* 검색 바 */}
            <div className="flex items-center gap-2 rounded-toss-md bg-toss-input-bg px-3 h-10">
              <Search size={16} className="shrink-0 text-toss-text-quaternary" />
              <input
                type="text"
                placeholder="카드명을 검색하세요"
                value={cardInput}
                onChange={(e) => setCardInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCard();
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-toss-label text-toss-text-primary placeholder:text-toss-text-quaternary focus:outline-none"
              />
            </div>

            {/* 선택 카드 목록 (36×50 썸네일 + 이름) */}
            {cards.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {cards.map((c, i) => (
                  <div key={c} className="flex items-center gap-2.5 rounded-toss-md bg-toss-bg-subtle p-2">
                    <div className="h-[50px] w-9 shrink-0 rounded-toss-xs bg-toss-bg-muted" />
                    <p className="min-w-0 flex-1 truncate text-toss-caption font-medium text-toss-text-primary">{c}</p>
                    <button
                      type="button"
                      onClick={() => setCards(cards.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-toss-text-quaternary transition-colors hover:text-toss-negative"
                      aria-label="삭제"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 카드 추가 버튼 (brand, border) */}
            <button
              type="button"
              onClick={addCard}
              disabled={!cardInput.trim()}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-toss-md border border-toss-border px-3 py-2 text-toss-caption font-medium text-toss-brand transition-colors hover:bg-toss-brand-weak disabled:opacity-40"
            >
              <Plus size={14} /> 카드 추가
            </button>
          </section>
        </div>

        {/* ── 우측 ── */}
        <div className="space-y-5">
          {/* 거래 유형 (카드) */}
          <section className={card}>
            <p className={fieldLabel + " mb-2"}>거래 유형</p>
            <div className="flex gap-2">
              {(["팝니다", "삽니다"] as const).map((t) => (
                <PChip key={t} selected={category === t} onClick={() => setCategory(t)}>
                  {t}
                </PChip>
              ))}
            </div>
          </section>

          {/* 제목 */}
          <div>
            <p className={fieldLabel}>제목</p>
            <TextField type="text" placeholder="제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} size="md" />
          </div>

          {/* 희망 가격 */}
          <div>
            <p className={fieldLabel}>{isBuy ? "희망 가격 (₩)" : "희망 가격 (₩) *"}</p>
            <TextField type="number" inputMode="numeric" placeholder="예) 250000" value={price} onChange={(e) => setPrice(e.target.value)} size="md" />
          </div>

          {/* 상품 등급 */}
          <div>
            <p className={fieldLabel}>상품 등급</p>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <PChip key={g} selected={condition === g} onClick={() => setCondition(condition === g ? "" : g)}>
                  {g}
                </PChip>
              ))}
            </div>
          </div>

          {/* 등급 인증 */}
          <div>
            <p className={fieldLabel}>등급 인증</p>
            <div className="flex flex-wrap gap-2">
              {CERTS.map(([key, label]) => (
                <PChip key={key} selected={certified === key} onClick={() => setCertified(key)}>
                  {label}
                </PChip>
              ))}
            </div>
          </div>

          {/* 거래 방식 */}
          <div>
            <p className={fieldLabel}>거래 방식</p>
            <div className="flex flex-wrap gap-2">
              {METHODS.map(([key, label]) => (
                <PChip key={key} selected={dealMethod === key} onClick={() => setDealMethod(dealMethod === key ? "" : key)}>
                  {label}
                </PChip>
              ))}
            </div>
          </div>

          {/* 거래 지역 (직거래/모두 시) */}
          {(dealMethod === "direct" || dealMethod === "both") && (
            <div>
              <p className={fieldLabel}>거래 지역</p>
              <TextField type="text" placeholder="예) 서울 강남구" value={location} onChange={(e) => setLocation(e.target.value)} leftIcon={<MapPin size={14} className="text-toss-icon" />} size="md" />
            </div>
          )}

          {/* 가격 네고 가능 (라벨 + 토글) */}
          <div className="flex items-center justify-between">
            <p className="text-toss-caption font-medium text-toss-text-secondary">가격 네고 가능</p>
            <PToggle checked={negotiable} onChange={setNegotiable} />
          </div>

          {/* 본문 */}
          <div>
            <p className={fieldLabel}>본문</p>
            <textarea
              placeholder="상품 상태 · 거래 조건 등을 자유롭게 적어주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="min-h-[120px] w-full resize-none rounded-toss-md bg-toss-input-bg px-3 py-3 text-toss-label text-toss-text-primary transition-shadow placeholder:text-toss-text-quaternary focus:outline-none focus:ring-1 focus:ring-toss-brand"
            />
          </div>

          {error && <p className="text-toss-caption text-toss-negative">{error}</p>}

          {/* 액션 */}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" size="lg" onClick={() => router.push(listHref)}>
              취소
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={!title.trim() || !content.trim() || submitting || uploading || (!isBuy && !price)}
              onClick={handleSubmit}
            >
              {submitting ? "등록 중…" : "등록 완료"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
