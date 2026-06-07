import type { Metadata } from "next";
import { CommunityBoard, type Post } from "@/components/community/CommunityBoard";
import { getPosts } from "@/lib/services/community";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "커뮤니티 — Raredoc" };

export default async function CardgameCommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [{ posts }, user] = await Promise.all([
    getPosts({ pageSize: 100 }).catch(() => ({ posts: [] as Post[] })),
    getCurrentUser().catch(() => null),
  ]);

  return <CommunityBoard posts={posts} locale={locale} isLoggedIn={!!user} mode="board" />;
}
