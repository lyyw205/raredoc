import type { Metadata } from "next";
import { CommunityBoard, type Post } from "@/components/community/CommunityBoard";
import { Container } from "@/components/toss";
import { getPosts } from "@/lib/services/community";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "커뮤니티 — Raredoc" };

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 클라이언트 컴포넌트가 카테고리/정렬/검색을 모두 처리하므로 최신순으로 충분히 가져온다.
  const [{ posts }, user] = await Promise.all([
    getPosts({ pageSize: 100 }).catch(() => ({ posts: [] as Post[] })),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <Container size="xl" padding="md" className="py-8">
      <CommunityBoard posts={posts} locale={locale} isLoggedIn={!!user} />
    </Container>
  );
}
