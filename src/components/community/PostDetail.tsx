"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Pin,
  Send,
  Truck,
} from "lucide-react";
import type { PostDetail as PostDetailData, CommentView } from "@/lib/services/community";
import {
  togglePostLike,
  toggleCommentLike,
  createComment,
  deleteComment,
  deletePost,
} from "@/lib/actions/community";
import { startConversationAction } from "@/lib/actions/messaging";
import { Avatar, Button, Card, Tag } from "@/components/toss";
import { cn } from "@/lib/utils";
import {
  DEAL_METHOD_LABEL,
  TRADE_STATUS_STYLE,
  catColor,
  isTradeCategory,
  tradeStatusColor,
} from "./tradeMeta";

const CONDITION_LABEL: Record<string, string> = {
  NM: "최상 (NM)",
  LP: "상 (LP)",
  MP: "중 (MP)",
  HP: "하 (HP)",
};

// ── 이미지 갤러리 ──────────────────────────────────────────────────────────

function PostImageGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const main = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-toss-lg bg-toss-bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main} alt="" className="h-full w-full object-contain" />
        {images.length > 1 && (
          <span className="absolute bottom-2 left-2 rounded-toss-pill bg-black/60 px-2 py-0.5 text-toss-micro text-white toss-numeric">
            {Math.min(active, images.length - 1) + 1} / {images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-toss-md border-2 transition-colors",
                i === active ? "border-toss-brand" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 스펙 테이블 (라벨-값 행) ───────────────────────────────────────────────

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <span className="w-20 shrink-0 text-toss-caption text-toss-text-tertiary">{label}</span>
      <span className="text-toss-label text-toss-text-primary">{children}</span>
    </div>
  );
}

// ── 댓글 ───────────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  postId,
  isLoggedIn,
  currentUserId,
  locale,
  depth,
  onChanged,
}: {
  comment: CommentView;
  postId: string;
  isLoggedIn: boolean;
  currentUserId: string | null;
  locale: string;
  depth: number;
  onChanged: () => void;
}) {
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likes, setLikes] = useState(comment.likes);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [pending, start] = useTransition();

  function handleLike() {
    if (!isLoggedIn) return;
    start(async () => {
      const res = await toggleCommentLike(comment.id);
      if (res.ok) {
        setLiked(res.liked ?? !liked);
        setLikes(res.likeCount ?? likes);
      }
    });
  }

  function handleReply() {
    if (!replyText.trim()) return;
    start(async () => {
      const res = await createComment({ postId, body: replyText.trim(), parentId: comment.id });
      if (res.ok) {
        setReplyText("");
        setReplyOpen(false);
        onChanged();
      }
    });
  }

  function handleDelete() {
    start(async () => {
      const res = await deleteComment(comment.id);
      if (res.ok) onChanged();
    });
  }

  const mine = !!currentUserId && currentUserId === comment.userId;
  const profileHref = comment.authorUsername
    ? `/${locale}/profile/${comment.authorUsername}`
    : `/${locale}/community`;

  return (
    <div className={depth > 0 ? "pl-8" : ""}>
      <div className="px-5 py-4 flex gap-3">
        <Link href={profileHref} className="shrink-0 mt-0.5">
          <Avatar name={comment.author} size="xs" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={profileHref} className="text-toss-caption font-medium text-toss-text-secondary hover:text-toss-text-primary transition-colors">
              {comment.author}
            </Link>
            <span className="text-toss-micro text-toss-text-quaternary">{comment.ago}</span>
          </div>
          <p className="text-toss-label text-toss-text-secondary leading-relaxed whitespace-pre-line">{comment.body}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={handleLike}
              disabled={!isLoggedIn || pending}
              className={cn(
                "flex items-center gap-1 text-toss-micro transition-colors",
                liked ? "text-toss-brand" : "text-toss-text-quaternary hover:text-toss-text-tertiary"
              )}
            >
              <Heart size={12} className={liked ? "fill-current" : ""} /> {likes}
            </button>
            {isLoggedIn && depth === 0 && (
              <button
                onClick={() => setReplyOpen((v) => !v)}
                className="text-toss-micro text-toss-text-quaternary hover:text-toss-text-tertiary transition-colors"
              >
                답글
              </button>
            )}
            {mine && (
              <button
                onClick={handleDelete}
                disabled={pending}
                className="text-toss-micro text-toss-text-quaternary hover:text-toss-negative transition-colors"
              >
                삭제
              </button>
            )}
          </div>

          {replyOpen && (
            <div className="mt-2 flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="답글을 입력하세요"
                rows={2}
                className="flex-1 px-3 py-2 rounded-toss-md bg-toss-input-bg text-toss-label text-toss-text-primary placeholder:text-toss-text-quaternary focus:outline-none focus:ring-1 focus:ring-toss-brand transition-shadow resize-none"
              />
              <Button variant="primary" size="sm" className="self-end" disabled={pending || !replyText.trim()} onClick={handleReply}>
                등록
              </Button>
            </div>
          )}
        </div>
      </div>

      {comment.replies.map((r) => (
        <CommentItem
          key={r.id}
          comment={r}
          postId={postId}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          locale={locale}
          depth={depth + 1}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

// ── 메인 ───────────────────────────────────────────────────────────────────

export function PostDetail({
  post,
  body,
  comments,
  commentCount,
  locale,
  isLoggedIn,
  currentUserId,
  likedByMe,
}: {
  post: PostDetailData;
  body: string;
  comments: CommentView[];
  commentCount: number;
  locale: string;
  isLoggedIn: boolean;
  currentUserId: string | null;
  likedByMe: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(likedByMe);
  const [likes, setLikes] = useState(post.likes);
  const [commentText, setCommentText] = useState("");
  const [pending, start] = useTransition();

  const isTrade = isTradeCategory(post.category);
  const mine = !!currentUserId && currentUserId === post.userId;
  const status = post.tradeStatus ?? "active";
  const images = post.images?.length ? post.images : post.imageUrl ? [post.imageUrl] : [];
  const profileHref = post.authorUsername
    ? `/${locale}/profile/${post.authorUsername}`
    : `/${locale}/community`;
  // 거래글은 마켓(/community), 게시판 글은 카드게임 커뮤니티 탭으로 복귀.
  const listHref = isTrade ? `/${locale}/community` : `/${locale}/cardgame/community`;
  const listLabel = isTrade ? "마켓으로 돌아가기" : "커뮤니티로 돌아가기";

  function handleLike() {
    if (!isLoggedIn) {
      router.push(`/${locale}/login`);
      return;
    }
    start(async () => {
      const res = await togglePostLike(post.id);
      if (res.ok) {
        setLiked(res.liked ?? !liked);
        setLikes(res.likeCount ?? likes);
      }
    });
  }

  function handleComment() {
    if (!commentText.trim()) return;
    start(async () => {
      const res = await createComment({ postId: post.id, body: commentText.trim() });
      if (res.ok) {
        setCommentText("");
        router.refresh();
      }
    });
  }

  function handleDeletePost() {
    if (!confirm("이 게시글을 삭제할까요?")) return;
    start(async () => {
      const res = await deletePost(post.id);
      if (res.ok) router.push(listHref);
    });
  }

  function handleContactSeller() {
    if (!isLoggedIn) {
      router.push(`/${locale}/login`);
      return;
    }
    start(async () => {
      const res = await startConversationAction({
        partnerId: post.userId,
        sourceType: "community_post",
        postId: post.id,
      });
      if (res.ok && res.conversationId) {
        router.push(`/${locale}/messages/${res.conversationId}`);
      }
    });
  }

  const contactLabel = post.category === "삽니다" ? "이 카드 있어요" : "판매자에게 문의";

  return (
    <div className={cn("mx-auto px-4 py-8", isTrade ? "max-w-5xl" : "max-w-3xl", isTrade && !mine && "pb-28 lg:pb-8")}>
      {/* 뒤로 */}
      <Link
        href={listHref}
        className="inline-flex items-center gap-1.5 text-toss-caption text-toss-text-tertiary hover:text-toss-text-secondary mb-5 transition-colors"
      >
        <ArrowLeft size={14} /> {listLabel}
      </Link>

      {isTrade ? (
        /* ── 거래글: 번개장터식 2단 (좌 갤러리 / 우 정보·CTA) ── */
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 items-start">
          {/* 좌: 이미지 갤러리 (데스크톱 sticky) */}
          <div className="lg:sticky lg:top-[68px]">
            {images.length > 0 ? (
              <PostImageGallery images={images} />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-toss-lg bg-toss-bg-muted text-toss-text-quaternary">
                <span className="text-toss-body">이미지 없음</span>
              </div>
            )}
          </div>

          {/* 우: 정보 레일 */}
          <div className="space-y-4">
            {/* 배지 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag color={catColor(post.category)} shape="soft">{post.category}</Tag>
              {post.hot && <Tag color="positive" shape="solid">HOT</Tag>}
              {status !== "active" && (
                <Tag color={tradeStatusColor(status)} shape="soft">{TRADE_STATUS_STYLE[status]?.label ?? status}</Tag>
              )}
            </div>

            {/* 제목 */}
            <h1 className="text-toss-title-1 font-bold text-toss-text-primary leading-snug">{post.title}</h1>

            {/* 가격 */}
            <p className={cn(
              "toss-numeric text-toss-display font-bold",
              status === "completed" ? "text-toss-text-tertiary line-through" : "text-toss-text-primary"
            )}>
              {post.priceKrw != null ? `${post.priceKrw.toLocaleString("ko-KR")}원` : "가격 제안"}
            </p>
            {post.negotiable === false && (
              <p className="-mt-2 text-toss-caption text-toss-text-quaternary">정찰가 · 네고 불가</p>
            )}

            {/* 메타 */}
            <div className="flex items-center gap-3 text-toss-caption text-toss-text-tertiary toss-numeric border-b border-toss-divider pb-4">
              <span>{post.ago}</span>
              <span className="flex items-center gap-1"><Eye size={14} />{post.views.toLocaleString()}</span>
              <span className="flex items-center gap-1"><MessageCircle size={14} />{post.replies}</span>
              <span className="flex items-center gap-1"><Heart size={14} />{likes}</span>
              {mine && (
                <button
                  onClick={handleDeletePost}
                  disabled={pending}
                  className="ml-auto text-toss-caption text-toss-text-tertiary hover:text-toss-negative transition-colors"
                >
                  삭제
                </button>
              )}
            </div>

            {/* 스펙 테이블 */}
            <div className="rounded-toss-md bg-toss-bg-subtle px-4 divide-y divide-toss-divider">
              {post.condition && <SpecRow label="상품 상태">{CONDITION_LABEL[post.condition] ?? post.condition}</SpecRow>}
              {post.certified && (
                <SpecRow label="등급 인증"><Tag color="positive" shape="soft">PSA 인증</Tag></SpecRow>
              )}
              {post.dealMethod && (
                <SpecRow label="거래 방식">
                  <span className="inline-flex items-center gap-1">
                    <Truck size={14} className="text-toss-icon" />
                    {DEAL_METHOD_LABEL[post.dealMethod]}
                  </span>
                </SpecRow>
              )}
              {post.location && (
                <SpecRow label="거래 지역">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} className="text-toss-icon" />
                    {post.location}
                  </span>
                </SpecRow>
              )}
            </div>

            {/* 데스크톱 인라인 CTA */}
            {!mine && (
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={handleLike}
                  disabled={pending}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-toss-md border transition-colors",
                    liked
                      ? "border-toss-brand text-toss-brand"
                      : "border-toss-border text-toss-text-tertiary hover:text-toss-text-secondary"
                  )}
                  aria-label="찜"
                >
                  <Heart size={20} className={liked ? "fill-current" : ""} />
                </button>
                <Button variant="primary" size="lg" className="flex-1" disabled={pending} onClick={handleContactSeller}>
                  <Send size={16} className="mr-1.5" />
                  {contactLabel}
                </Button>
              </div>
            )}

            {/* 판매자 카드 */}
            <Link
              href={profileHref}
              className="flex items-center gap-3 rounded-toss-md border border-toss-border p-3 hover:bg-toss-hover transition-colors"
            >
              <Avatar name={post.author} size="md" />
              <div className="min-w-0">
                <p className="text-toss-label font-semibold text-toss-text-primary truncate">{post.author}</p>
                <p className="text-toss-caption text-toss-text-tertiary">판매자 · 프로필 보기</p>
              </div>
            </Link>
          </div>

          {/* 상품 설명 (그리드 좌측 컬럼 폭, 전체 하단) */}
          <div className="lg:col-span-2">
            <Card padding="lg">
              <h2 className="text-toss-label font-bold text-toss-text-primary mb-3">상품 설명</h2>
              <div className="text-toss-body text-toss-text-secondary leading-relaxed whitespace-pre-line">
                {body}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* ── 게시판 글: 단일 아티클 ── */
        <Card padding="lg" className="space-y-5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag color={catColor(post.category)} shape="soft">{post.category}</Tag>
            {post.hot && <Tag color="positive" shape="solid">HOT</Tag>}
            {post.pinned && (
              <span className="flex items-center gap-1 text-toss-caption text-toss-text-quaternary">
                <Pin size={12} className="text-toss-warning" /> 공지
              </span>
            )}
          </div>

          <h1 className="text-toss-title-1 font-bold text-toss-text-primary leading-snug">{post.title}</h1>

          {/* 작성자 + 메타 */}
          <div className="flex items-center gap-3 pb-4 border-b border-toss-divider">
            <Link href={profileHref}>
              <Avatar name={post.author} size="sm" />
            </Link>
            <div className="min-w-0">
              <Link href={profileHref} className="text-toss-label font-medium text-toss-text-primary hover:text-toss-brand transition-colors">
                {post.author}
              </Link>
              <p className="text-toss-caption text-toss-text-quaternary">{post.ago}</p>
            </div>
            <div className="ml-auto flex items-center gap-3 text-toss-caption text-toss-text-tertiary toss-numeric">
              <span className="flex items-center gap-1"><Eye size={14} />{post.views.toLocaleString()}</span>
              <span className="flex items-center gap-1"><MessageCircle size={14} />{post.replies}</span>
              {mine && (
                <button
                  onClick={handleDeletePost}
                  disabled={pending}
                  className="text-toss-caption text-toss-text-tertiary hover:text-toss-negative transition-colors"
                >
                  삭제
                </button>
              )}
            </div>
          </div>

          {/* 이미지 (있을 때) */}
          {images.length > 0 && <PostImageGallery images={images} />}

          {/* 본문 */}
          <div className="text-toss-body text-toss-text-secondary leading-relaxed whitespace-pre-line">
            {body}
          </div>

          {/* 좋아요 */}
          <div className="flex justify-center pt-2">
            <Button
              variant={liked ? "primary" : "secondary"}
              size="md"
              disabled={pending}
              onClick={handleLike}
            >
              <Heart size={16} className={cn("mr-1.5", liked && "fill-current")} />
              좋아요 {likes}
            </Button>
          </div>
        </Card>
      )}

      {/* 댓글 (공통) */}
      <Card padding="md" className="!p-0 overflow-hidden mt-5">
        <div className="px-5 py-3.5 border-b border-toss-divider">
          <h2 className="text-toss-label font-bold text-toss-text-primary">댓글 {commentCount}</h2>
        </div>

        <div className="divide-y divide-toss-divider">
          {comments.length === 0 && (
            <p className="px-5 py-8 text-center text-toss-label text-toss-text-quaternary">
              아직 댓글이 없어요. 첫 댓글을 남겨보세요.
            </p>
          )}
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={post.id}
              isLoggedIn={isLoggedIn}
              currentUserId={currentUserId}
              locale={locale}
              depth={0}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>

        {/* 댓글 입력 */}
        <div className="px-5 py-4 border-t border-toss-divider flex gap-3">
          <div className="shrink-0 mt-1">
            <Avatar name={isLoggedIn ? "나" : "?"} size="xs" />
          </div>
          <div className="flex-1">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isLoggedIn ? "댓글을 입력하세요" : "댓글을 작성하려면 로그인이 필요해요"}
              disabled={!isLoggedIn}
              rows={2}
              className="w-full px-3 py-2 rounded-toss-md bg-toss-input-bg text-toss-label text-toss-text-primary placeholder:text-toss-text-quaternary focus:outline-none focus:ring-1 focus:ring-toss-brand transition-shadow resize-none disabled:opacity-60"
            />
            <div className="flex justify-end mt-2">
              <Button variant="primary" size="sm" disabled={!isLoggedIn || pending || !commentText.trim()} onClick={handleComment}>
                등록
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 모바일 하단 고정 CTA (거래글, 본인 글 아닐 때) — 데스크톱은 우측 레일 인라인 */}
      {isTrade && !mine && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-toss-divider bg-toss-bg-base/95 backdrop-blur lg:hidden">
          <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
            <button
              onClick={handleLike}
              disabled={pending}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-toss-md border transition-colors",
                liked
                  ? "border-toss-brand text-toss-brand"
                  : "border-toss-border text-toss-text-tertiary hover:text-toss-text-secondary"
              )}
              aria-label="찜"
            >
              <Heart size={20} className={liked ? "fill-current" : ""} />
            </button>
            <Button variant="primary" size="lg" className="flex-1" disabled={pending} onClick={handleContactSeller}>
              <Send size={16} className="mr-1.5" />
              {contactLabel}
            </Button>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
