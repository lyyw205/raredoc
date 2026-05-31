import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/community/PostDetail";
import {
  getPost,
  getComments,
  hasLikedPost,
} from "@/lib/services/community";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id).catch(() => null);
  return { title: post ? post.title : "게시글" };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  // 상세 진입 시 조회수 +1
  const post = await getPost(id, { incrementView: true }).catch(() => null);
  if (!post) notFound();

  const user = await getCurrentUser().catch(() => null);
  const [comments, likedByMe] = await Promise.all([
    getComments(id, user?.id).catch(() => []),
    user ? hasLikedPost(id, user.id).catch(() => false) : Promise.resolve(false),
  ]);

  // 트리에서 전체 댓글 수 (대댓글 포함)
  const commentCount = comments.reduce(
    (sum, c) => sum + 1 + c.replies.length,
    0
  );

  return (
    <PostDetail
      post={post}
      body={post.body}
      comments={comments}
      commentCount={commentCount}
      locale={locale}
      isLoggedIn={!!user}
      currentUserId={user?.id ?? null}
      likedByMe={likedByMe}
    />
  );
}
