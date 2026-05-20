"use client";

import { useState, useMemo } from "react";
import { Plus, MapPin, MessageCircle, Eye, Heart, Pin } from "lucide-react";
import {
  Avatar,
  Button,
  Chip,
  Modal,
  RankingTable,
  SearchField,
  SegmentedControl,
  Tag,
  TextField,
} from "@/components/toss";
import { cn } from "@/lib/utils";

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
  allowInquiry?: boolean;   // 문의 가능 표시 (구함/직거래 글 등)

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

// ── CAT 단일 톤 매핑 ──────────────────────────────────────────────────────

const CAT_TAG_COLOR: Record<string, "brand" | "warning" | "positive" | "neutral"> = {
  공지:   "warning",
  팝니다: "positive",
  삽니다: "brand",
};

function catColor(cat: string): "brand" | "warning" | "positive" | "neutral" {
  return CAT_TAG_COLOR[cat] ?? "neutral";
}

// TRADE_STATUS → toss 색 매핑
function tradeStatusColor(status: string): "brand" | "warning" | "neutral" {
  if (status === "active")    return "brand";
  if (status === "reserved")  return "warning";
  return "neutral";
}

// ── 작성 모달 ─────────────────────────────────────────────────────────────

function WriteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    <Modal.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Modal.Content maxWidth="max-w-xl" className="p-0 max-h-[92vh] flex flex-col overflow-hidden">
        <Modal.Header className="px-5 py-4 mb-0 border-b border-toss-divider">
          <Modal.Title>새 글 작성</Modal.Title>
          <Modal.Close />
        </Modal.Header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 수집 카테고리 */}
          <div>
            <p className="text-toss-caption font-semibold text-toss-text-tertiary mb-1.5">카테고리</p>
            <div className="flex flex-wrap gap-1.5">
              {COLLECT_CATS.filter((c) => c.id !== "all").map((c) => (
                <Chip
                  key={c.id}
                  variant="filter"
                  size="sm"
                  selected={collectCat === c.label}
                  onClick={() => setCollectCat(c.label)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* 글 유형 */}
          <div>
            <p className="text-toss-caption font-semibold text-toss-text-tertiary mb-1.5">글 유형</p>
            <div className="flex flex-wrap gap-1.5">
              {CATS.filter((c) => c.id !== "all").map((c) => (
                <Chip
                  key={c.id}
                  variant="filter"
                  size="sm"
                  selected={category === c.label}
                  onClick={() => {
                    setCategory(c.label);
                    if (c.label !== "팝니다" && c.label !== "삽니다") setNegotiable(false);
                  }}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* 거래 글 (팝니다 / 삽니다) 전용 폼 */}
          {isTrade && (
            <div className="space-y-3 p-3.5 rounded-toss-md bg-toss-bg-subtle border border-toss-border">
              <p className="text-toss-caption font-semibold text-toss-text-secondary">
                거래 정보 <span className="text-toss-text-quaternary font-normal">(모두 필수)</span>
              </p>

              {/* 카드 선택 */}
              <div>
                <p className="text-toss-micro text-toss-text-quaternary mb-1">카드 선택 *</p>
                <TextField
                  type="text"
                  placeholder="예) 리자몽 ex SAR (sv4pt5-191) 또는 카드명 검색"
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  size="sm"
                />
              </div>

              {/* 가격 */}
              <div>
                <p className="text-toss-micro text-toss-text-quaternary mb-1">희망 가격 (₩) *</p>
                <TextField
                  type="number"
                  inputMode="numeric"
                  placeholder="예) 250000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  size="sm"
                />
              </div>

              {/* 사진 */}
              <div>
                <p className="text-toss-micro text-toss-text-quaternary mb-1">사진 * <span className="text-toss-text-quaternary">(최대 5장)</span></p>
                <div className="flex gap-2 flex-wrap">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-toss-md bg-toss-bg-muted flex items-center justify-center text-xs text-toss-text-quaternary">
                      <span className="text-toss-caption text-toss-text-tertiary">사진</span>
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-toss-bg-base text-toss-text-secondary text-[10px] border border-toss-border"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPhotos([...photos, `photo-${photos.length + 1}`])}
                      className="w-16 h-16 rounded-toss-md border border-dashed border-toss-border flex flex-col items-center justify-center text-toss-text-quaternary hover:text-toss-text-tertiary hover:border-toss-border-strong transition-colors"
                    >
                      <Plus size={16} />
                      <span className="text-[9px] mt-0.5">추가</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 상품 등급 */}
              <div>
                <p className="text-toss-micro text-toss-text-quaternary mb-1">상품 등급 *</p>
                <SegmentedControl
                  size="sm"
                  value={condition}
                  onChange={(v) => setCondition(v as "NM" | "LP" | "MP" | "HP")}
                  options={[
                    { value: "NM", label: "NM" },
                    { value: "LP", label: "LP" },
                    { value: "MP", label: "MP" },
                    { value: "HP", label: "HP" },
                  ]}
                />
              </div>

              {/* 등급 인증 (PSA) */}
              <div>
                <p className="text-toss-micro text-toss-text-quaternary mb-1">등급 인증 *</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    ["none",   "미인증"],
                    ["PSA10",  "PSA 10"],
                    ["PSA9",   "PSA 9"],
                    ["PSA8-",  "PSA 8 이하"],
                  ] as const).map(([key, label]) => (
                    <Chip
                      key={key}
                      variant="filter"
                      size="sm"
                      selected={certified === key}
                      onClick={() => setCertified(key)}
                      className="justify-center"
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* 거래 방식 */}
              <div>
                <p className="text-toss-micro text-toss-text-quaternary mb-1">거래 방식 *</p>
                <SegmentedControl
                  size="sm"
                  value={dealMethod}
                  onChange={(v) => setDealMethod(v as "direct" | "delivery" | "both")}
                  options={[
                    { value: "direct",   label: "직거래" },
                    { value: "delivery", label: "택배" },
                    { value: "both",     label: "직거래·택배" },
                  ]}
                />
              </div>

              {/* 지역 (직거래/모두 시) */}
              {(dealMethod === "direct" || dealMethod === "both") && (
                <div>
                  <p className="text-toss-micro text-toss-text-quaternary mb-1">거래 지역</p>
                  <TextField
                    type="text"
                    placeholder="예) 서울 강남구"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    leftIcon={<MapPin size={14} className="text-toss-icon" />}
                    size="sm"
                  />
                </div>
              )}

              {/* 가격 네고 가능 */}
              <button
                type="button"
                onClick={() => setNegotiable((v) => !v)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-toss-md border transition-all text-left",
                  negotiable
                    ? "bg-toss-brand-weak border-toss-brand/30 text-toss-brand"
                    : "bg-toss-bg-base border-toss-border text-toss-text-secondary hover:bg-toss-hover"
                )}
              >
                <div className={cn(
                  "w-9 h-5 rounded-full flex items-center transition-all duration-200 px-0.5",
                  negotiable ? "bg-toss-brand" : "bg-toss-input-bg border border-toss-border"
                )}>
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                    negotiable ? "translate-x-4" : "translate-x-0"
                  )} />
                </div>
                <div>
                  <p className="text-toss-label font-semibold">가격 네고 가능</p>
                  <p className="text-toss-micro text-toss-text-quaternary mt-0.5">꺼두면 "정찰가 · 네고 불가" 로 표시돼서 흥정 DM을 줄일 수 있어요</p>
                </div>
              </button>
            </div>
          )}

          {/* 제목 */}
          <TextField
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            size="md"
          />

          {/* 본문 */}
          <textarea
            placeholder={"자유롭게 작성해 주세요\n직거래 · 공략 · 자랑 · 질문 · 무엇이든 OK"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 rounded-toss-md bg-toss-input-bg text-toss-body text-toss-text-primary placeholder:text-toss-text-quaternary focus:outline-none focus:ring-1 focus:ring-toss-brand transition-shadow resize-none"
          />

          <p className="text-toss-micro text-toss-text-quaternary">
            허위 직거래 · 욕설 · 도배는 제재 대상입니다.
          </p>
        </div>

        <Modal.Footer className="px-5 py-4 border-t border-toss-divider">
          <Button variant="ghost" size="md" onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            size="md"
            disabled={!title.trim() || !content.trim()}
            onClick={onClose}
          >
            작성 완료
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

// ── 통합 게시글 행 (일반/거래 통합) ───────────────────────────────────────

function PostRow({ post, locale }: { post: Post; locale: string }) {
  const isTrade = post.category === "팝니다" || post.category === "삽니다";
  const status = post.tradeStatus ?? "active";
  const statusMeta = TRADE_STATUS_STYLE[status];
  const isCompleted = status === "completed";

  return (
    <RankingTable.Row
      interactive
      href={`/${locale}/community/${post.id}`}
      className="h-[88px] items-stretch"
    >
      {/* 1. 분류 (Pin + 썸네일 + 카테고리 Tag) */}
      <RankingTable.Cell className="w-[140px] shrink-0 flex-none pl-4 pr-0 items-center gap-2">
        {post.pinned && (
          <Pin size={12} className="text-toss-warning shrink-0" />
        )}
        {isTrade && post.imageUrl ? (
          <div className={cn(
            "w-10 h-14 rounded-toss-sm overflow-hidden bg-toss-bg-muted shrink-0",
            isCompleted && "opacity-50"
          )}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : null}
        <Tag color={catColor(post.category)} shape="soft" className="shrink-0">{post.category}</Tag>
      </RankingTable.Cell>

      {/* 2. 제목 + 메타 */}
      <RankingTable.Cell className="flex-1 min-w-0 flex-col items-start gap-1 px-3 justify-center">
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          {post.hot && (
            <Tag color="positive" shape="solid" className="shrink-0">HOT</Tag>
          )}
          {isTrade && status !== "active" && (
            <Tag color={tradeStatusColor(status)} shape="soft" className="shrink-0">{statusMeta.label}</Tag>
          )}
          {isTrade && post.condition && (
            <Tag color="neutral" shape="soft" className="shrink-0">{post.condition}</Tag>
          )}
          {isTrade && post.certified && (
            <Tag color="positive" shape="soft" className="shrink-0">PSA</Tag>
          )}
          <p className="text-toss-label font-semibold text-toss-text-primary truncate">
            {post.title}
          </p>
        </div>
        {!isTrade && post.preview && (
          <p className="text-toss-caption text-toss-text-tertiary line-clamp-1">{post.preview}</p>
        )}
        {isTrade && (
          <div className="flex items-center gap-1 text-toss-caption text-toss-text-tertiary min-w-0">
            {post.location && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin size={11} className="shrink-0" />
                {post.location}
              </span>
            )}
            {post.location && post.dealMethod && <span>·</span>}
            {post.dealMethod && <span className="truncate">{DEAL_METHOD_LABEL[post.dealMethod]}</span>}
            {post.negotiable === false && (
              <>
                <span>·</span>
                <span>네고불가</span>
              </>
            )}
          </div>
        )}
      </RankingTable.Cell>

      {/* 3. 우측 메타 (거래: 가격 / 일반: 작성자) */}
      <RankingTable.Cell className="w-[160px] shrink-0 flex-none flex-col items-end gap-1 px-3 justify-center">
        {isTrade ? (
          <>
            <p className={cn(
              "text-toss-subtitle font-bold toss-numeric truncate",
              isCompleted ? "text-toss-text-tertiary line-through" : "text-toss-text-primary"
            )}>
              {post.priceKrw != null ? `₩${post.priceKrw.toLocaleString("ko-KR")}` : "가격 제안"}
            </p>
            <span className="text-toss-micro text-toss-text-quaternary">{post.ago}</span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar name={post.author} size="xs" />
              <span className="text-toss-caption text-toss-text-secondary font-medium truncate">{post.author}</span>
            </div>
            <span className="text-toss-micro text-toss-text-quaternary">{post.ago}</span>
          </>
        )}
      </RankingTable.Cell>

      {/* 4. 통계 — 가로 한 줄 */}
      <RankingTable.Cell className="w-[170px] shrink-0 flex-none items-center justify-end gap-3 pr-4 text-toss-caption text-toss-text-tertiary toss-numeric">
        <span className="flex items-center gap-1"><Eye size={14} />{post.views.toLocaleString()}</span>
        <span className="flex items-center gap-1"><MessageCircle size={14} />{post.replies}</span>
        <span className="flex items-center gap-1"><Heart size={14} />{post.likes}</span>
      </RankingTable.Cell>
    </RankingTable.Row>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export function CommunityBoard({ posts, locale }: { posts: Post[]; locale: string }) {
  const [collectCat, setCollectCat] = useState("all");
  const [group, setGroup]           = useState<GroupId>("all");
  const [activeCat, setActiveCat]   = useState("all");
  const [sort, setSort]             = useState<SortKey>("latest");
  const [writeOpen, setWriteOpen]   = useState(false);
  const [search, setSearch]         = useState("");

  // 현재 그룹에 표시할 세부 카테고리
  const groupCats = GROUPS.find((g) => g.id === group)?.cats ?? null;

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
      list = list.filter((p) => (groupCatLabels as Set<string>).has(p.category));
    }

    if (activeCat !== "all") {
      const cat = CATS.find((c) => c.id === activeCat);
      list = list.filter((p) => cat ? p.category === cat.label : true);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) || p.preview.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sort === "hot")   return (b.likes + b.replies * 2) - (a.likes + a.replies * 2);
      if (sort === "views") return b.views - a.views;
      return 0;
    });
  }, [posts, collectCat, group, groupCatLabels, activeCat, sort, search]);

  const pinned  = filtered.filter((p) => p.pinned);
  const regular = filtered.filter((p) => !p.pinned);

  // 현재 그룹에 속한 사이드바 카테고리
  const sidebarGroupCats = useMemo(() => {
    const groupDef = GROUPS.find((g) => g.id === group);
    if (!groupDef || !groupDef.cats) return CATS;
    return CATS.filter((c) => c.id === "all" || (groupDef.cats as readonly string[]).includes(c.id));
  }, [group]);

  return (
    <>
      <WriteModal open={writeOpen} onClose={() => setWriteOpen(false)} />

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        {/* ── 좌측 사이드바: 수집품 대분류 (포켓몬/유희왕/스니커즈/...) ─── */}
        <aside className="lg:sticky lg:top-[68px] lg:self-start">
          <div>
            <p className="px-4 pt-3 pb-2 text-toss-body text-toss-text-secondary">카테고리</p>
            <nav>
              {COLLECT_CATS.map((c) => {
                const active = collectCat === c.id;
                const count = c.id === "all"
                  ? posts.length
                  : posts.filter((p) => p.collectibleCategory === c.label).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setCollectCat(c.id); setActiveCat("all"); }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 h-10 text-toss-body transition-colors rounded-toss-md",
                      active
                        ? "bg-toss-brand-weak text-toss-brand font-semibold"
                        : "text-toss-text-secondary hover:bg-toss-hover"
                    )}
                  >
                    <span>{c.label}</span>
                    <span className={cn(
                      "text-toss-caption tabular-nums",
                      active ? "text-toss-brand" : "text-toss-text-quaternary"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── 메인 영역 ────────────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* 헤더 */}
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-toss-display font-bold text-toss-text-primary">커뮤니티</h1>
              <p className="text-toss-body text-toss-text-tertiary mt-1">
                수집가들의 거래 · 정보 · 잡담
              </p>
            </div>
            <Button variant="primary" size="md" onClick={() => setWriteOpen(true)}>
              새 글 작성
            </Button>
          </header>

          {/* 메가 탭: 전체/커뮤니티/거래 */}
          <div className="flex items-center gap-1 mb-4">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => { setGroup(g.id); setActiveCat("all"); }}
                className={cn(
                  "px-3 py-1.5 rounded-toss-pill text-toss-caption font-semibold transition-all",
                  group === g.id
                    ? "bg-toss-text-primary text-toss-bg-base"
                    : "text-toss-text-tertiary hover:text-toss-text-secondary hover:bg-toss-hover"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* 세부 카테고리 탭 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar mb-4">
            {sidebarGroupCats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-toss-pill text-toss-caption font-semibold transition-all duration-150 border",
                  activeCat === c.id
                    ? "bg-toss-brand-weak text-toss-brand border-transparent"
                    : "bg-transparent border-toss-border text-toss-text-tertiary hover:text-toss-text-secondary"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* 검색 + 정렬 */}
          <div className="flex items-center gap-3 mb-4">
            <SearchField
              placeholder="제목·내용 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <SegmentedControl
              size="sm"
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={[
                { value: "latest", label: "최신" },
                { value: "hot",    label: "인기" },
                { value: "views",  label: "조회" },
              ]}
            />
          </div>

          {/* 게시글 수 */}
          <p className="text-toss-caption text-toss-text-tertiary mb-2">{filtered.length}개</p>

          {/* 글 리스트 */}
          <RankingTable.Root className="rounded-toss-lg overflow-hidden shadow-toss-hairline">
            <RankingTable.Head>
              <RankingTable.HeadRow>
                <RankingTable.Header className="w-[140px] shrink-0 flex-none pl-4 pr-0">분류</RankingTable.Header>
                <RankingTable.Header className="flex-1 px-3">제목</RankingTable.Header>
                <RankingTable.Header className="w-[160px] shrink-0 flex-none px-3" align="right">작성자 · 가격</RankingTable.Header>
                <RankingTable.Header className="w-[170px] shrink-0 flex-none pr-4" align="right">조회 · 댓글 · 좋아요</RankingTable.Header>
              </RankingTable.HeadRow>
            </RankingTable.Head>
            <RankingTable.Body>
              {pinned.map((p) => <PostRow key={p.id} post={p} locale={locale} />)}
              {regular.map((p) => <PostRow key={p.id} post={p} locale={locale} />)}
              {filtered.length === 0 && (
                <div className="text-center py-16 text-toss-text-quaternary">
                  <p className="text-toss-title-2 mb-2">—</p>
                  <p className="text-toss-body">아직 게시글이 없어요</p>
                  <button
                    onClick={() => setWriteOpen(true)}
                    className="mt-3 text-toss-caption text-toss-brand hover:underline underline-offset-2"
                  >
                    첫 글을 작성해보세요
                  </button>
                </div>
              )}
            </RankingTable.Body>
          </RankingTable.Root>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
