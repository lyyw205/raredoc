"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostDetail as PostDetailData, CommentView } from "@/lib/services/community";
import {
  togglePostLike,
  toggleCommentLike,
  createComment,
  deleteComment,
  deletePost,
} from "@/lib/actions/community";
import { startConversationAction } from "@/lib/actions/messaging";

const CAT_STYLE: Record<string, string> = {
  공지: "bg-red-900/50 text-red-400",
  자유: "bg-gray-700/60 text-gray-300",
  팝니다: "bg-green-900/50 text-green-400",
  삽니다: "bg-pink-900/50 text-pink-400",
  공략: "bg-blue-900/50 text-blue-400",
  메타분석: "bg-purple-900/50 text-purple-400",
  자랑: "bg-yellow-900/50 text-yellow-400",
  질문: "bg-orange-900/50 text-orange-400",
  정보: "bg-sky-900/50 text-sky-400",
  거래후기: "bg-teal-900/50 text-teal-400",
};

const TRADE_CATS = new Set(["팝니다", "삽니다"]);

// ── 댓글 ───────────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  postId,
  isLoggedIn,
  currentUserId,
  depth,
  onChanged,
}: {
  comment: CommentView;
  postId: string;
  isLoggedIn: boolean;
  currentUserId: string | null;
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
      const res = await createComment({
        postId,
        body: replyText.trim(),
        parentId: comment.id,
      });
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

  return (
    <div className={depth > 0 ? "pl-8" : ""}>
      <div className="px-5 py-4 flex gap-3">
        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-300 shrink-0 mt-0.5">
          {comment.authorInitial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-300">{comment.author}</span>
            <span className="text-[11px] text-gray-600">{comment.ago}</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{comment.body}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={handleLike}
              disabled={!isLoggedIn || pending}
              className={`text-[11px] transition-colors ${liked ? "text-pink-400" : "text-gray-600 hover:text-gray-400"}`}
            >
              ❤️ {likes}
            </button>
            {isLoggedIn && depth === 0 && (
              <button
                onClick={() => setReplyOpen((v) => !v)}
                className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                답글
              </button>
            )}
            {mine && (
              <button
                onClick={handleDelete}
                disabled={pending}
                className="text-[11px] text-gray-600 hover:text-red-400 transition-colors"
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
                className="flex-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none"
              />
              <button
                onClick={handleReply}
                disabled={pending || !replyText.trim()}
                className="self-end px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-xs font-bold text-black transition-colors disabled:opacity-50"
              >
                등록
              </button>
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

  const isTrade = TRADE_CATS.has(post.category);
  const mine = !!currentUserId && currentUserId === post.userId;

  function handleLike() {
    if (!isLoggedIn) return;
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
      if (res.ok) router.push(`/${locale}/community`);
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 뒤로 */}
      <Link
        href={`/${locale}/community`}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        ← 커뮤니티로 돌아가기
      </Link>

      <div className="max-w-2xl space-y-5">
        {/* 게시글 헤더 */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${CAT_STYLE[post.category] ?? "bg-gray-800 text-gray-400"}`}>
              {post.category}
            </span>
            {post.hot && <span className="text-[11px] font-bold text-red-400">🔥 HOT</span>}
            {post.pinned && <span className="text-[11px] text-gray-500">📌 공지</span>}
          </div>

          <h1 className="text-lg font-bold text-white leading-snug mb-4">{post.title}</h1>

          {/* 거래글 정보 */}
          {isTrade && (
            <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-gray-400">
              {post.priceKrw != null ? (
                <span className="text-base font-bold text-white">₩{post.priceKrw.toLocaleString("ko-KR")}</span>
              ) : (
                <span className="text-base font-bold text-white">가격 제안</span>
              )}
              {post.condition && <span className="px-2 py-0.5 rounded bg-gray-800">{post.condition}</span>}
              {post.certified && <span className="px-2 py-0.5 rounded bg-green-900/50 text-green-400">PSA</span>}
              {post.location && <span>📍 {post.location}</span>}
              {post.negotiable === false && <span>네고불가</span>}
            </div>
          )}

          {/* 작성자 정보 */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
            <Link href={post.authorUsername ? `/${locale}/profile/${post.authorUsername}` : `/${locale}/community`}>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 shrink-0 hover:ring-2 hover:ring-gray-500 transition-all">
                {post.authorInitial}
              </div>
            </Link>
            <div>
              <Link
                href={post.authorUsername ? `/${locale}/profile/${post.authorUsername}` : `/${locale}/community`}
                className="text-sm font-medium text-gray-200 hover:text-white transition-colors"
              >
                {post.author}
              </Link>
              <p className="text-xs text-gray-600">{post.ago}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1"><span>👁</span>{post.views.toLocaleString()}</span>
                <span className="flex items-center gap-1"><span>💬</span>{post.replies}</span>
              </div>
              {mine && (
                <button
                  onClick={handleDeletePost}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 border border-gray-700 hover:text-red-400 hover:border-red-500/40 transition-colors"
                >
                  삭제
                </button>
              )}
              {/* 판매자 문의 DM(P4) — 대화 시작 */}
              {isTrade && !mine && (
                <button
                  onClick={handleContactSeller}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-yellow-500 hover:bg-yellow-400 text-black border border-yellow-500 disabled:opacity-50 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {post.category === "삽니다" ? "이 카드 있어요" : "판매자에게 문의"}
                </button>
              )}
            </div>
          </div>

          {/* 거래글 이미지 */}
          {isTrade && post.imageUrl && (
            <div className="pt-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageUrl} alt="" className="max-w-[240px] rounded-lg" />
            </div>
          )}

          {/* 본문 */}
          <div className="pt-5 text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {body}
          </div>

          {/* 좋아요 */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleLike}
              disabled={!isLoggedIn || pending}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border text-sm transition-colors ${
                liked
                  ? "border-pink-500/50 text-pink-400"
                  : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
              }`}
            >
              <span>❤️</span> 좋아요 {likes}
            </button>
          </div>
        </div>

        {/* 댓글 */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800">
            <h2 className="text-sm font-bold text-white">댓글 {commentCount}</h2>
          </div>

          <div className="divide-y divide-gray-800/60">
            {comments.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-600">
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
                depth={0}
                onChanged={() => router.refresh()}
              />
            ))}
          </div>

          {/* 댓글 입력 */}
          <div className="px-5 py-4 border-t border-gray-800 flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-300 shrink-0 mt-1">
              {isLoggedIn ? "나" : "?"}
            </div>
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isLoggedIn ? "댓글을 입력하세요" : "댓글을 작성하려면 로그인이 필요해요"}
                disabled={!isLoggedIn}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors resize-none disabled:opacity-60"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleComment}
                  disabled={!isLoggedIn || pending || !commentText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-xs font-bold text-black transition-colors disabled:opacity-50"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
