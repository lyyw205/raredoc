"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ── 타입 ─────────────────────────────────────────────────────────────────

export type Post = {
  id: string;
  collectibleCategory: string;
  category: string;
  title: string;
  preview: string;
  author: string;
  authorInitial: string;
  ago: string;
  replies: number;
  views: number;
  likes: number;
  hot: boolean;
  pinned?: boolean;
  negotiable?: boolean;     // 거래 글: 가격 네고 가능 여부 (DM 자체는 항상 가능)

  // 거래 전용 (category 가 "팝니다" / "삽니다" 일 때만 사용) — 당근마켓 스타일
  imageUrl?: string;
  priceKrw?: number | null;                       // null = "가격 제안"
  condition?: "NM" | "LP" | "MP" | "HP";
  certified?: boolean;
  location?: string;                              // 거래 지역
  dealMethod?: "direct" | "delivery" | "both";    // 직거래 / 택배 / 모두
  tradeStatus?: "active" | "reserved" | "completed" | "hidden" | "deleted"; // 판매중 / 예약중 / 거래완료 / 숨김 / 삭제됨
};

// ── 수집 카테고리 메타 ────────────────────────────────────────────────────

const COLLECT_CATS = [
  { id: "all",      label: "전체",       emoji: "🌐" },
  { id: "pokemon",  label: "포켓몬 TCG", emoji: "🃏" },
  { id: "yugioh",   label: "유희왕",      emoji: "⚡" },
  { id: "onepiece", label: "원피스 TCG", emoji: "⚓" },
  { id: "sneakers", label: "스니커즈",   emoji: "👟" },
  { id: "figures",  label: "피규어",     emoji: "🎭" },
] as const;

// ── 게시글 유형 메타 ──────────────────────────────────────────────────────

const CATS = [
  { id: "all",    label: "전체" },
  { id: "free",   label: "자유" },
  { id: "sell",   label: "팝니다" },
  { id: "buy",    label: "삽니다" },
  { id: "guide",  label: "공략" },
  { id: "meta",   label: "메타분석" },
  { id: "brag",   label: "자랑" },
  { id: "qa",     label: "질문" },
  { id: "info",   label: "정보" },
  { id: "review", label: "거래후기" },
] as const;

// ── 메가 탭: 커뮤니티 vs 거래 ────────────────────────────────────────────
const GROUPS = [
  { id: "all",       label: "전체",     emoji: "🌐", cats: null as null | readonly string[] },
  { id: "community", label: "커뮤니티", emoji: "💬", cats: ["free", "guide", "meta", "brag", "qa", "info", "review"] as const },
  { id: "trade",     label: "거래",     emoji: "🤝", cats: ["sell", "buy"] as const },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

const CAT_STYLE: Record<string, string> = {
  공지:     "bg-red-900/50 text-red-400",
  자유:     "bg-gray-700/60 text-gray-300",
  팝니다:   "bg-green-900/50 text-green-400",
  삽니다:   "bg-pink-900/50 text-pink-400",
  공략:     "bg-blue-900/50 text-blue-400",
  메타분석: "bg-purple-900/50 text-purple-400",
  자랑:     "bg-yellow-900/50 text-yellow-400",
  질문:     "bg-orange-900/50 text-orange-400",
  정보:     "bg-sky-900/50 text-sky-400",
  거래후기: "bg-teal-900/50 text-teal-400",
};

const DEAL_METHOD_LABEL: Record<string, string> = {
  direct:   "직거래",
  delivery: "택배",
  both:     "직거래·택배",
};

const TRADE_STATUS_STYLE: Record<string, { label: string; color: string }> = {
  active:    { label: "판매중",   color: "bg-green-500 text-black" },
  reserved:  { label: "예약중",   color: "bg-blue-500 text-white" },
  completed: { label: "거래완료", color: "bg-gray-700 text-gray-300" },
  hidden:    { label: "숨김",     color: "bg-gray-800 text-gray-400" },
  deleted:   { label: "삭제됨",   color: "bg-red-900 text-red-300" },
};

type SortKey = "latest" | "hot" | "views";

// ── 작성 모달 ─────────────────────────────────────────────────────────────

function WriteModal({ onClose }: { onClose: () => void }) {
  const [collectCat, setCollectCat] = useState("포켓몬 TCG");
  const [category, setCategory] = useState("자유");
  const [negotiable, setNegotiable] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 거래 전용 폼 상태
  const [selectedCard, setSelectedCard] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [condition, setCondition] = useState<"NM" | "LP" | "MP" | "HP" | "">("");
  const [certified, setCertified] = useState<"none" | "PSA10" | "PSA9" | "PSA8-" | "">("");
  const [dealMethod, setDealMethod] = useState<"direct" | "delivery" | "both" | "">("");
  const [location, setLocation] = useState("");

  const isTrade = category === "팝니다" || category === "삽니다";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-bold text-white">새 글 작성</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">✕</button>
        </div>

        {/* 폼 */}
        <div className="p-5 space-y-4">
          {/* 수집 카테고리 */}
          <div>
            <p className="text-[11px] text-gray-500 mb-1.5 font-semibold">카테고리</p>
            <div className="flex flex-wrap gap-1.5">
              {COLLECT_CATS.filter((c) => c.id !== "all").map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCollectCat(c.label)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    collectCat === c.label
                      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                      : "bg-gray-800 text-gray-500 border border-transparent hover:text-gray-300"
                  }`}
                >
                  <span>{c.emoji}</span><span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 글 유형 */}
          <div>
            <p className="text-[11px] text-gray-500 mb-1.5 font-semibold">글 유형</p>
            <div className="flex flex-wrap gap-1.5">
              {CATS.filter((c) => c.id !== "all").map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategory(c.label); if (c.label !== "팝니다" && c.label !== "삽니다") setNegotiable(false); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    category === c.label
                      ? CAT_STYLE[c.label] + " ring-1 ring-white/20"
                      : "bg-gray-800 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 거래 글 (팝니다 / 삽니다) 전용 폼 */}
          {isTrade && (
            <div className="space-y-3 p-3.5 rounded-xl bg-gray-800/40 border border-gray-800">
              <p className="text-[11px] text-gray-400 font-semibold">거래 정보 <span className="text-gray-600">(모두 필수)</span></p>

              {/* 카드 선택 */}
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">카드 선택 *</label>
                <input
                  type="text"
                  placeholder="예) 리자몽 ex SAR (sv4pt5-191) 또는 카드명 검색"
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>

              {/* 가격 */}
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">희망 가격 (₩) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="예) 250000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>

              {/* 사진 (UI 만) */}
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">사진 * <span className="text-gray-700">(최대 5장)</span></label>
                <div className="flex gap-2 flex-wrap">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                      📷
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-900 text-white text-[10px] border border-gray-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPhotos([...photos, `photo-${photos.length + 1}`])}
                      className="w-16 h-16 rounded-lg border border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-600 hover:text-gray-400 hover:border-gray-600 transition-colors"
                    >
                      <span className="text-base leading-none">📷</span>
                      <span className="text-[9px] mt-0.5">추가</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 상품 등급 */}
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">상품 등급 *</label>
                <div className="flex gap-1.5">
                  {(["NM", "LP", "MP", "HP"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setCondition(g)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        condition === g
                          ? "bg-white text-black"
                          : "bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-700"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 등급 인증 (PSA) */}
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">등급 인증 *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    ["none",   "미인증"],
                    ["PSA10",  "PSA 10"],
                    ["PSA9",   "PSA 9"],
                    ["PSA8-",  "PSA 8 이하"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCertified(key)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        certified === key
                          ? "bg-green-500/20 text-green-300 border border-green-500/40"
                          : "bg-gray-900 text-gray-500 border border-gray-700 hover:text-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 거래 방식 */}
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">거래 방식 *</label>
                <div className="flex gap-1.5">
                  {(["direct", "delivery", "both"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDealMethod(m)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        dealMethod === m
                          ? "bg-white text-black"
                          : "bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-700"
                      }`}
                    >
                      {DEAL_METHOD_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 지역 (직거래/모두 시) */}
              {(dealMethod === "direct" || dealMethod === "both") && (
                <div>
                  <label className="text-[10px] text-gray-600 mb-1 block">거래 지역</label>
                  <input
                    type="text"
                    placeholder="예) 서울 강남구"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
                  />
                </div>
              )}

              {/* 가격 네고 가능 */}
              <button
                type="button"
                onClick={() => setNegotiable((v) => !v)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border transition-all text-left ${
                  negotiable
                    ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-300"
                    : "bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-300"
                }`}
              >
                <div className={`w-9 h-5 rounded-full flex items-center transition-all duration-200 px-0.5 ${negotiable ? "bg-yellow-500" : "bg-gray-600"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${negotiable ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold">가격 네고 가능</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">꺼두면 "정찰가 · 네고 불가" 로 표시돼서 흥정 DM을 줄일 수 있어요</p>
                </div>
              </button>
            </div>
          )}

          {/* 제목 */}
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
          />

          {/* 본문 */}
          <textarea
            placeholder="자유롭게 작성해 주세요&#10;직거래 · 공략 · 자랑 · 질문 · 무엇이든 OK"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none"
          />

          <p className="text-[11px] text-gray-600">
            허위 직거래 · 욕설 · 도배는 제재 대상입니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            취소
          </button>
          <button
            disabled={!title.trim() || !content.trim()}
            className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-black transition-colors"
            onClick={onClose}
          >
            작성 완료
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 거래 게시글 카드 (당근마켓 스타일) ────────────────────────────────────

function TradePostRow({ post, locale }: { post: Post; locale: string }) {
  const status = post.tradeStatus ?? "active";
  const statusMeta = TRADE_STATUS_STYLE[status];
  const isCompleted = status === "completed";

  return (
    <Link
      href={`/${locale}/community/${post.id}`}
      className="flex items-stretch gap-3 px-4 py-3 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 transition-colors group"
    >
      {/* 썸네일 + 상태 뱃지 */}
      <div className="relative shrink-0">
        <div
          className={`w-24 h-24 rounded-xl overflow-hidden bg-gray-800 ${
            isCompleted ? "opacity-50" : ""
          }`}
        >
          {post.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-700">🃏</div>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {/* 카테고리/뱃지 */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CAT_STYLE[post.category] ?? "bg-gray-800 text-gray-400"}`}>
              {post.category}
            </span>
            {status !== "active" && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            )}
            {post.condition && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                {post.condition}
              </span>
            )}
            {post.certified && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
                PSA인증
              </span>
            )}
            {post.negotiable === false && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                네고불가
              </span>
            )}
            {post.hot && <span className="text-[10px] font-bold text-red-400">🔥</span>}
          </div>

          {/* 제목 */}
          <p className="text-sm text-gray-100 group-hover:text-white transition-colors font-semibold line-clamp-1">
            {post.title}
          </p>

          {/* 가격 */}
          <p className="text-base font-bold text-white mt-0.5">
            {post.priceKrw != null ? (
              <>₩{post.priceKrw.toLocaleString("ko-KR")}</>
            ) : (
              <span className="text-gray-500 text-sm font-medium">가격 제안 받음</span>
            )}
          </p>
        </div>

        {/* 메타 (지역·거래방식·시간 + 통계) */}
        <div className="flex items-end justify-between gap-2 mt-1">
          <p className="text-[11px] text-gray-600 truncate">
            {post.location && <span>{post.location}</span>}
            {post.location && post.dealMethod && <span className="mx-1.5">·</span>}
            {post.dealMethod && <span>{DEAL_METHOD_LABEL[post.dealMethod]}</span>}
            {(post.location || post.dealMethod) && <span className="mx-1.5">·</span>}
            <span>{post.ago}</span>
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-600 shrink-0">
            <span className="flex items-center gap-0.5">❤ {post.likes}</span>
            <span className="flex items-center gap-0.5">💬 {post.replies}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── 게시글 행 ─────────────────────────────────────────────────────────────

function PostRow({ post, locale }: { post: Post; locale: string }) {
  if (post.category === "팝니다" || post.category === "삽니다") {
    return <TradePostRow post={post} locale={locale} />;
  }
  return <CommunityPostRow post={post} locale={locale} />;
}

function CommunityPostRow({ post, locale }: { post: Post; locale: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 transition-colors group">
      <Link href={`/${locale}/community/${post.id}`} className="flex-1 min-w-0 block">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {post.pinned && <span className="text-[10px] text-gray-500">📌</span>}
          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${CAT_STYLE[post.category] ?? "bg-gray-800 text-gray-400"}`}>
            {post.category}
          </span>
          {post.hot && <span className="text-[10px] font-bold text-red-400">🔥 HOT</span>}
          {post.allowInquiry && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
              문의가능
            </span>
          )}
        </div>

        <p className="text-sm text-gray-200 group-hover:text-white transition-colors leading-snug font-medium line-clamp-1">
          {post.title}
        </p>

        {post.preview && (
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{post.preview}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-300 shrink-0">
            {post.authorInitial}
          </span>
          <span className="text-[11px] text-gray-500">{post.author}</span>
          <span className="text-[11px] text-gray-700">·</span>
          <span className="text-[11px] text-gray-600">{post.ago}</span>
        </div>
      </Link>

      {/* 오른쪽: 통계 */}
      <div className="flex items-center gap-3 shrink-0 pt-1">
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <span>💬</span><span>{post.replies}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <span>👁</span><span>{post.views.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <span>❤️</span><span>{post.likes}</span>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export function CommunityBoard({ posts, locale }: { posts: Post[]; locale: string }) {
  const [collectCat, setCollectCat] = useState("all");
  const [group, setGroup]           = useState<GroupId>("all");
  const [activeCat, setActiveCat]   = useState("all");
  const [sort, setSort]             = useState<SortKey>("latest");
  const [writeOpen, setWriteOpen]   = useState(false);

  // 현재 그룹에 표시할 세부 카테고리
  const groupCats = GROUPS.find((g) => g.id === group)?.cats ?? null;
  const visibleCats = useMemo(() => {
    if (!groupCats) return CATS;
    return CATS.filter((c) => c.id === "all" || groupCats.includes(c.id));
  }, [groupCats]);

  // 그룹에 속한 카테고리 라벨 셋 (게시글 필터용)
  const groupCatLabels = useMemo(() => {
    if (!groupCats) return null;
    return new Set(CATS.filter((c) => groupCats.includes(c.id)).map((c) => c.label));
  }, [groupCats]);

  const filtered = useMemo(() => {
    // 일반 사용자에게는 숨김/삭제 글 노출 안 함 (본인 글 필터는 추후 auth 도입 시)
    let list = posts.filter((p) => p.tradeStatus !== "hidden" && p.tradeStatus !== "deleted");

    if (collectCat !== "all") {
      const cc = COLLECT_CATS.find((c) => c.id === collectCat);
      list = list.filter((p) => p.collectibleCategory === cc?.label);
    }

    if (groupCatLabels) {
      list = list.filter((p) => groupCatLabels.has(p.category));
    }

    if (activeCat !== "all") {
      const cat = CATS.find((c) => c.id === activeCat);
      list = list.filter((p) => cat ? p.category === cat.label : true);
    }

    return [...list].sort((a, b) => {
      if (sort === "hot")   return (b.likes + b.replies * 2) - (a.likes + a.replies * 2);
      if (sort === "views") return b.views - a.views;
      return 0;
    });
  }, [posts, collectCat, group, groupCatLabels, activeCat, sort]);

  const pinned  = filtered.filter((p) => p.pinned);
  const regular = filtered.filter((p) => !p.pinned);

  const totalPosts = posts.length;
  const todayCount = posts.filter((p) => p.ago.includes("분") || p.ago.includes("시간")).length;

  return (
    <>
      {writeOpen && <WriteModal onClose={() => setWriteOpen(false)} />}

      {/* ── 헤더 ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">커뮤니티</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            전체 {totalPosts.toLocaleString()}개 · 오늘 {todayCount}개 작성
          </p>
        </div>
        <button
          onClick={() => setWriteOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-sm font-bold text-black transition-colors"
        >
          <span>✏️</span> 글쓰기
        </button>
      </div>

      {/* ── 수집 카테고리 필터 ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-0.5">
        {COLLECT_CATS.map((c) => {
          const on = collectCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => { setCollectCat(c.id); setActiveCat("all"); }}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                on
                  ? "bg-yellow-500 text-black shadow-md shadow-yellow-500/20"
                  : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              <span className="text-sm leading-none">{c.emoji}</span>
              <span>{c.label}</span>
              {c.id !== "all" && (
                <span className={`text-[10px] font-bold tabular-nums ${on ? "text-black/60" : "text-gray-600"}`}>
                  {posts.filter((p) => p.collectibleCategory === c.label).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 메인 ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* 메가 탭: 커뮤니티 / 거래 */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-900 border border-gray-800 w-fit">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => { setGroup(g.id); setActiveCat("all"); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  group === g.id
                    ? "bg-white text-black shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span>{g.emoji}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>

          {/* 카테고리 탭 (현재 그룹에 속한 것만) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {visibleCats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeCat === c.id
                    ? "bg-gray-700 text-white shadow"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* 정렬 + 카운트 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{filtered.length}개</span>
            <div className="flex items-center gap-1 bg-gray-800/60 rounded-xl p-1">
              {([["latest","최신순"],["hot","인기순"],["views","조회순"]] as [SortKey, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    sort === k ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 게시글 목록 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            {pinned.map((p) => <PostRow key={p.id} post={p} locale={locale} />)}
            {regular.map((p) => <PostRow key={p.id} post={p} locale={locale} />)}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm">아직 게시글이 없어요</p>
                <button onClick={() => setWriteOpen(true)} className="mt-3 text-xs text-yellow-500 hover:text-yellow-400 underline underline-offset-2">
                  첫 글을 작성해보세요
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 사이드바 ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* 이주의 인기글 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
            <h3 className="text-sm font-bold text-white mb-3">🔥 이주의 인기글</h3>
            <div className="space-y-2.5">
              {[...posts].sort((a,b) => b.likes - a.likes).slice(0,5).map((p, i) => (
                <Link
                  key={p.id}
                  href={`/${locale}/community/${p.id}`}
                  className="flex items-start gap-2.5 group"
                >
                  <span className={`text-[13px] font-black shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-700" : "text-gray-600"}`}>
                    {i + 1}
                  </span>
                  <p className="text-xs text-gray-400 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">{p.title}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* 카테고리 안내 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
            <h3 className="text-sm font-bold text-white mb-3">📋 게시판 안내</h3>
            <div className="space-y-2">
              {[
                { cat: "직거래", desc: "카드 사고팔기" },
                { cat: "구함",   desc: "원하는 카드 찾기" },
                { cat: "공략",   desc: "덱 빌드 · 게임 전략" },
                { cat: "메타분석", desc: "시세 · 투자 분석" },
                { cat: "자랑",   desc: "수집품 자랑" },
                { cat: "질문",   desc: "무엇이든 물어봐요" },
                { cat: "정보",   desc: "유용한 정보 공유" },
                { cat: "거래후기", desc: "직거래 완료 후기" },
              ].map(({ cat, desc }) => (
                <button
                  key={cat}
                  onClick={() => {
                    const found = CATS.find((c) => c.label === cat);
                    if (found) setActiveCat(found.id);
                  }}
                  className="w-full flex items-center gap-2 hover:bg-gray-800 -mx-1 px-2 py-1.5 rounded-lg transition-colors group"
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CAT_STYLE[cat]}`}>{cat}</span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-300">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 커뮤니티 규칙 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
            <h3 className="text-sm font-bold text-white mb-3">📜 이용 규칙</h3>
            <ol className="space-y-1.5 text-xs text-gray-500 list-decimal list-inside leading-relaxed">
              <li>허위 직거래 게시글 금지</li>
              <li>욕설 · 혐오 표현 금지</li>
              <li>도배 · 광고성 게시글 금지</li>
              <li>타인의 개인정보 게시 금지</li>
              <li>위반 시 제재 없이 삭제됩니다</li>
            </ol>
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
