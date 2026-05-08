import { getCardsBySet, getAllSets } from "@/lib/api/pokemontcg";
import { prisma } from "@/lib/prisma";
import { RARITY_KO, SERIES_KO } from "@/lib/constants";
import { CardFilter } from "@/components/expansions/CardFilter";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const sets = await getAllSets();
    return sets.slice(0, 50).map((s) => ({ setId: s.id }));
  } catch {
    return [];
  }
}

async function getSetDetail(setId: string) {
  try {
    const set = await prisma.set.findUnique({ where: { id: setId } });
    if (set) return set;
  } catch {}
  const sets = await getAllSets();
  const found = sets.find((s) => s.id === setId);
  if (!found) return null;
  return {
    id: found.id,
    name: found.name,
    nameKo: null as string | null,
    series: found.series,
    seriesKo: SERIES_KO[found.series] ?? found.series,
    releaseDate: new Date(found.releaseDate),
    cardCount: found.total || found.printedTotal,
    logoUrl: found.images?.logo ?? null,
    symbolUrl: found.images?.symbol ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ setId: string }>;
}): Promise<Metadata> {
  const { setId } = await params;
  const set = await getSetDetail(setId);
  if (!set) return {};
  return {
    title: set.nameKo ?? set.name,
    description: `${set.nameKo ?? set.name} 카드 목록과 시세 정보. ${set.cardCount}장 수록.`,
  };
}

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ setId: string; locale: string }>;
}) {
  const { setId, locale } = await params;
  const [set, cards] = await Promise.all([getSetDetail(setId), getCardsBySet(setId)]);
  if (!set) notFound();

  // DB 가격 조회 (실패해도 계속)
  const priceMap = new Map<string, { normal?: number | null; holofoil?: number | null }>();
  try {
    const prices = await prisma.price.findMany({
      where: { cardId: { in: cards.map((c) => c.id) } },
      orderBy: { recordedAt: "desc" },
      distinct: ["cardId"],
    });
    prices.forEach((p) => priceMap.set(p.cardId, { normal: p.normal, holofoil: p.holofoil }));
  } catch {}

  // 카드 + 가격 합산
  const cardData = cards.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    rarity: c.rarity,
    types: c.types,
    supertype: c.supertype,
    subtypes: c.subtypes,
    artist: c.artist,
    imageSmall: c.images.small,
    imageLarge: c.images.large,
    price: priceMap.get(c.id) ?? undefined,
  }));

  // 통계
  const pricedCards = cardData.filter((c) => c.price?.holofoil ?? c.price?.normal);
  const prices = pricedCards.map((c) => c.price!.holofoil ?? c.price!.normal ?? 0);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-start gap-4 mb-6">
        {set.logoUrl && (
          <img src={set.logoUrl} alt={set.name} className="h-16 object-contain flex-shrink-0" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">
            {locale === "ko" ? (set.nameKo ?? set.name) : set.name}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {locale === "ko" ? (set.seriesKo ?? set.series) : set.series} · {set.id.toUpperCase()}{" "}
            · {set.cardCount}장 ·{" "}
            {new Date(set.releaseDate).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US")}
          </p>
        </div>
      </div>

      {/* 요약 stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "전체 카드", value: `${cards.length}장` },
          { label: "시세 집계", value: `${pricedCards.length}장` },
          { label: "평균 시세", value: avgPrice ? `$${avgPrice.toFixed(2)}` : "—" },
          { label: "최고 시세", value: maxPrice ? `$${maxPrice.toFixed(2)}` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 rounded-lg border border-gray-800 p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* 카드 목록 (클라이언트 컴포넌트) */}
      <CardFilter cards={cardData} locale={locale} />
    </div>
  );
}
