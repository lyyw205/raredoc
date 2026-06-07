"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Eye, Heart } from "lucide-react";
import {
  Avatar,
  Button,
  SearchField,
  SegmentedControl,
  Tag,
} from "@/components/toss";
import { cn } from "@/lib/utils";
import { TradeCard } from "./TradeCard";
import { isTradeCategory } from "./tradeMeta";

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
  images?: string[];                              // 다중 이미지 (있으면 images[0] 이 커버)
  priceKrw?: number | null;                       // null = "가격 제안"
  condition?: "NM" | "LP" | "MP" | "HP";
  certified?: boolean;
  location?: string;                              // 거래 지역
  dealMethod?: "direct" | "delivery" | "both";    // 직거래 / 택배 / 모두
  tradeStatus?: "active" | "reserved" | "completed" | "hidden" | "deleted"; // 판매중 / 예약중 / 거래완료 / 숨김 / 삭제됨
};

// ── 모드(최상위 탭) + 세부 카테고리 메타 ──────────────────────────────────

type Mode = "trade" | "board";

// 거래 마켓 세부 필터 (label 은 post.category 와 일치)
const TRADE_SUBCATS = [
  { id: "all",  label: "전체" },
  { id: "sell", label: "팝니다" },
  { id: "buy",  label: "삽니다" },
] as const;

// 게시판 세부 필터
const BOARD_SUBCATS = [
  { id: "all",    label: "전체" },
  { id: "free",   label: "자유" },
  { id: "guide",  label: "공략" },
  { id: "meta",   label: "메타분석" },
  { id: "brag",   label: "자랑" },
  { id: "qa",     label: "질문" },
  { id: "info",   label: "정보" },
  { id: "review", label: "거래후기" },
] as const;

type SortKey = "latest" | "hot" | "views";

// 핀 우선 정렬 (정렬 결과 유지하면서 핀만 상단으로).
function pinFirst(list: Post[]): Post[] {
  return [...list.filter((p) => p.pinned), ...list.filter((p) => !p.pinned)];
}

// ── 일반 게시글 행 (비거래) ───────────────────────────────────────────────

function PostRow({ post, locale }: { post: Post; locale: string }) {
  return (
    <Link
      href={`/${locale}/community/${post.id}`}
      className="flex items-center px-4 py-3.5 no-underline transition-colors hover:bg-toss-hover"
    >
      {/* 1. 분류 (평문, 72px) */}
      <div className="w-[72px] shrink-0">
        <span className="text-toss-caption font-medium text-toss-text-secondary">{post.category}</span>
      </div>

      {/* 2. 제목 + 미리보기 */}
      <div className="min-w-0 flex-1 px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {post.hot && (
            <Tag color="positive" shape="solid" className="shrink-0">HOT</Tag>
          )}
          <p className="truncate text-toss-body font-medium text-toss-text-primary">{post.title}</p>
        </div>
        {post.preview && (
          <p className="mt-1 line-clamp-1 text-toss-caption text-toss-text-tertiary">{post.preview}</p>
        )}
      </div>

      {/* 3. 작성자 (좌정렬, 100px) */}
      <div className="flex w-[100px] shrink-0 flex-col items-start gap-0.5 px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Avatar name={post.author} size="xs" />
          <span className="truncate text-toss-caption font-medium text-toss-text-primary">{post.author}</span>
        </div>
        <span className="text-toss-micro text-toss-text-quaternary">{post.ago}</span>
      </div>

      {/* 4. 통계 (170px, 우측 정렬) */}
      <div className="toss-numeric flex w-[170px] shrink-0 items-center justify-end gap-3 text-toss-caption text-toss-text-tertiary">
        <span className="flex items-center gap-1"><Eye size={14} />{post.views.toLocaleString()}</span>
        <span className="flex items-center gap-1"><MessageCircle size={14} />{post.replies}</span>
        <span className="flex items-center gap-1"><Heart size={14} />{post.likes}</span>
      </div>
    </Link>
  );
}

// ── 거래글 카드 그리드 ─────────────────────────────────────────────────────

function TradeGrid({ posts, locale }: { posts: Post[]; locale: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {posts.map((p) => <TradeCard key={p.id} post={p} locale={locale} />)}
    </div>
  );
}

// ── 일반글 리스트 ──────────────────────────────────────────────────────────

function BoardList({ posts, locale }: { posts: Post[]; locale: string }) {
  return (
    <div className="overflow-hidden rounded-toss-lg border border-toss-border bg-toss-bg-base">
      {/* 헤더 (44px, bg-subtle, 13px) */}
      <div className="flex h-11 items-center border-b border-toss-border bg-toss-bg-subtle px-4 text-toss-caption font-semibold text-toss-text-tertiary">
        <div className="w-[72px] shrink-0">분류</div>
        <div className="flex-1 px-3">제목</div>
        <div className="w-[100px] shrink-0 px-3">작성자</div>
        <div className="w-[170px] shrink-0 text-right">조회 · 댓글 · 좋아요</div>
      </div>
      {/* 본문 (행 사이 1px 디바이더) */}
      <div className="divide-y divide-toss-border">
        {posts.map((p) => <PostRow key={p.id} post={p} locale={locale} />)}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

const MODE_META: Record<Mode, { title: string; subtitle: string; searchPh: string; emptyTitle: string; emptyCta: string }> = {
  trade: {
    title: "마켓",
    subtitle: "수집가들의 안전한 카드 거래",
    searchPh: "상품·카드 검색",
    emptyTitle: "등록된 거래글이 없어요",
    emptyCta: "첫 거래글을 올려보세요",
  },
  board: {
    title: "커뮤니티",
    subtitle: "수집가들의 공략 · 정보 · 잡담",
    searchPh: "제목·내용 검색",
    emptyTitle: "아직 게시글이 없어요",
    emptyCta: "첫 글을 작성해보세요",
  },
};

export function CommunityBoard({
  posts,
  locale,
  isLoggedIn = false,
  mode,
}: {
  posts: Post[];
  locale: string;
  isLoggedIn?: boolean;
  mode: Mode;
}) {
  const router = useRouter();
  const [activeCat, setActiveCat]   = useState("all");
  const [sort, setSort]             = useState<SortKey>("latest");
  const [search, setSearch]         = useState("");

  const meta = MODE_META[mode];
  const subCats = mode === "trade" ? TRADE_SUBCATS : BOARD_SUBCATS;

  const filtered = useMemo(() => {
    // 숨김/삭제 제외 + 모드(거래/게시판)로 1차 분리
    let list = posts
      .filter((p) => p.tradeStatus !== "hidden" && p.tradeStatus !== "deleted")
      .filter((p) => (mode === "trade" ? isTradeCategory(p.category) : !isTradeCategory(p.category)));

    if (activeCat !== "all") {
      const cat = subCats.find((c) => c.id === activeCat);
      if (cat) list = list.filter((p) => p.category === cat.label);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) || p.preview.toLowerCase().includes(q)
      );
    }

    const sorted = [...list].sort((a, b) => {
      if (sort === "hot")   return (b.likes + b.replies * 2) - (a.likes + a.replies * 2);
      if (sort === "views") return b.views - a.views;
      return 0;
    });
    return pinFirst(sorted);
  }, [posts, mode, subCats, activeCat, sort, search]);

  function goWrite() {
    if (!isLoggedIn) {
      router.push(`/${locale}/login`);
      return;
    }
    router.push(
      mode === "trade"
        ? `/${locale}/community/write`
        : `/${locale}/cardgame/community/write`
    );
  }

  return (
    <>
      <div className="min-w-0">
        {/* 헤더 */}
        <header className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-toss-display font-bold text-toss-text-primary">{meta.title}</h1>
            <p className="text-toss-body text-toss-text-tertiary mt-1">{meta.subtitle}</p>
          </div>
          <Button variant="primary" size="md" onClick={goWrite}>
            새 글 작성
          </Button>
        </header>

        {/* 세부 카테고리 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar mb-4">
          {subCats.map((c) => (
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
            placeholder={meta.searchPh}
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

        {/* 결과 수 */}
        <p className="text-toss-caption text-toss-text-tertiary mb-3">{filtered.length}개</p>

        {/* 콘텐츠 — 모드별 그리드/리스트 */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-toss-text-quaternary rounded-toss-lg shadow-toss-hairline">
            <p className="text-toss-title-2 mb-2">—</p>
            <p className="text-toss-body">{meta.emptyTitle}</p>
            <button
              onClick={goWrite}
              className="mt-3 text-toss-caption text-toss-brand hover:underline underline-offset-2"
            >
              {meta.emptyCta}
            </button>
          </div>
        ) : mode === "trade" ? (
          <TradeGrid posts={filtered} locale={locale} />
        ) : (
          <BoardList posts={filtered} locale={locale} />
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
