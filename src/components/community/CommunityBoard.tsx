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
  allowInquiry?: boolean;   // 직거래 글 작성자가 문의 허용 선택 시에만 true
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
  { id: "trade",  label: "직거래" },
  { id: "wanted", label: "구함" },
  { id: "guide",  label: "공략" },
  { id: "meta",   label: "메타분석" },
  { id: "brag",   label: "자랑" },
  { id: "qa",     label: "질문" },
  { id: "info",   label: "정보" },
  { id: "review", label: "거래후기" },
] as const;

const CAT_STYLE: Record<string, string> = {
  공지:     "bg-red-900/50 text-red-400",
  자유:     "bg-gray-700/60 text-gray-300",
  직거래:   "bg-green-900/50 text-green-400",
  구함:     "bg-pink-900/50 text-pink-400",
  공략:     "bg-blue-900/50 text-blue-400",
  메타분석: "bg-purple-900/50 text-purple-400",
  자랑:     "bg-yellow-900/50 text-yellow-400",
  질문:     "bg-orange-900/50 text-orange-400",
  정보:     "bg-sky-900/50 text-sky-400",
  거래후기: "bg-teal-900/50 text-teal-400",
};

type SortKey = "latest" | "hot" | "views";

// ── 작성 모달 ─────────────────────────────────────────────────────────────

function WriteModal({ onClose }: { onClose: () => void }) {
  const [collectCat, setCollectCat] = useState("포켓몬 TCG");
  const [category, setCategory] = useState("자유");
  const [allowInquiry, setAllowInquiry] = useState(false);
  const [wantedCard, setWantedCard] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

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
                  onClick={() => { setCategory(c.label); if (c.label !== "직거래") setAllowInquiry(false); }}
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

          {/* 구함: 원하는 카드명 입력 */}
          {category === "구함" && (
            <div>
              <p className="text-[11px] text-gray-500 mb-1.5 font-semibold">원하는 카드명</p>
              <input
                type="text"
                placeholder="예) 피카츄 ex SAR · 리자몽 SAR NM"
                value={wantedCard}
                onChange={(e) => setWantedCard(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800 border border-pink-500/30 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/60 transition-colors"
              />
              <p className="text-[10px] text-gray-600 mt-1">카드를 보유한 유저에게 DM을 받을 수 있어요</p>
            </div>
          )}

          {/* 구매 문의 허용 (직거래 글에서만 표시) */}
          {category === "직거래" && (
            <button
              onClick={() => setAllowInquiry((v) => !v)}
              className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl border transition-all text-left ${
                allowInquiry
                  ? "bg-green-500/10 border-green-500/40 text-green-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300"
              }`}
            >
              <div className={`w-9 h-5 rounded-full flex items-center transition-all duration-200 px-0.5 ${allowInquiry ? "bg-green-500" : "bg-gray-600"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${allowInquiry ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <div>
                <p className="text-xs font-semibold">구매 문의 허용</p>
                <p className="text-[10px] text-gray-500 mt-0.5">활성화하면 관심 있는 사용자가 개인 메세지로 문의할 수 있어요</p>
              </div>
            </button>
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

// ── 게시글 행 ─────────────────────────────────────────────────────────────

function PostRow({ post, locale }: { post: Post; locale: string }) {
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
  const [activeCat, setActiveCat]   = useState("all");
  const [sort, setSort]             = useState<SortKey>("latest");
  const [writeOpen, setWriteOpen]   = useState(false);

  const filtered = useMemo(() => {
    let list = posts;

    if (collectCat !== "all") {
      const cc = COLLECT_CATS.find((c) => c.id === collectCat);
      list = list.filter((p) => p.collectibleCategory === cc?.label);
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
  }, [posts, collectCat, activeCat, sort]);

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

          {/* 카테고리 탭 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATS.map((c) => (
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
