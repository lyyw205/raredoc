import type { Metadata } from "next";
import { getRecentFeed } from "@/lib/services/collection";
import { RecentFeed, type RecentCard } from "@/components/recent/RecentFeed";

export const metadata: Metadata = { title: "최근 등록 카드 — Raredoc" };

function relativeKo(date: Date): { label: string; daysAgo: number } {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const days = Math.floor(hr / 24);
  if (min < 1) return { label: "방금 전", daysAgo: 0 };
  if (min < 60) return { label: `${min}분 전`, daysAgo: 0 };
  if (hr < 24) return { label: `${hr}시간 전`, daysAgo: 0 };
  if (days === 1) return { label: "어제", daysAgo: 1 };
  return { label: `${days}일 전`, daysAgo: days };
}

export default async function RecentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const feed = await getRecentFeed(60).catch(() => []);

  const cards: RecentCard[] = feed.map((item) => {
    const rel = relativeKo(item.createdAt);
    return {
      id: item.id,
      name: item.name,
      set: item.setName,
      setId: item.setId,
      number: item.number,
      grade: item.grade,
      certified: item.certified,
      valueKrw: item.estimatedKrw,
      imageUrl: item.imageLarge ?? item.imageSmall ?? "",
      collector: item.collectorUsername ?? item.collectorDisplayName ?? "익명",
      addedAt: rel.label,
      daysAgo: rel.daysAgo,
      category: "포켓몬 TCG",
    };
  });

  return <RecentFeed cards={cards} locale={locale} />;
}
