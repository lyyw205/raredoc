import type { Metadata } from "next";
import { getRecentFeed } from "@/lib/services/collection";
import { RecentFeed, type RecentCard } from "@/components/recent/RecentFeed";
import { formatRelativeKo } from "@/lib/format/relative-time";

export const metadata: Metadata = { title: "최근 등록 카드 — Raredoc" };

// label 은 일 단위까지의 공용 사다리, daysAgo(=경과 일수)는 별도 계산해 반환형 보존.
function relativeKo(date: Date): { label: string; daysAgo: number } {
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  return { label: formatRelativeKo(date, { maxUnit: "day" }), daysAgo };
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
