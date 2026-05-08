import { searchCards, getCardsBySet } from "@/lib/api/pokemontcg";
import { prisma } from "@/lib/prisma";
import { RARITY_KO } from "@/lib/constants";
import { PriceChart } from "@/components/cards/PriceChart";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

async function getCard(cardId: string) {
  try {
    const res = await searchCards(`id:${cardId}`, 1);
    return res.data[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cardId: string }>;
}): Promise<Metadata> {
  const { cardId } = await params;
  const card = await getCard(cardId);
  if (!card) return {};
  return {
    title: card.name,
    description: `${card.name} 카드 시세 및 정보. ${card.set.name} 수록. 희귀도: ${card.rarity ?? "—"}.`,
    openGraph: { images: [card.images.large] },
  };
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string; locale: string }>;
}) {
  const { cardId, locale } = await params;
  const card = await getCard(cardId);
  if (!card) notFound();

  // DB 가격 히스토리
  let priceHistory: { recordedAt: Date; normal: number | null; holofoil: number | null }[] = [];
  try {
    priceHistory = await prisma.price.findMany({
      where: { cardId },
      orderBy: { recordedAt: "asc" },
      select: { recordedAt: true, normal: true, holofoil: true },
    });
  } catch {}

  const latest = priceHistory.at(-1);

  // 같은 세트 인접 카드 (이전/다음)
  let prevCard: { id: string; name: string; images: { small: string } } | null = null;
  let nextCard: { id: string; name: string; images: { small: string } } | null = null;
  try {
    const setCards = await getCardsBySet(card.set.id);
    const idx = setCards.findIndex((c) => c.id === cardId);
    if (idx > 0) prevCard = setCards[idx - 1];
    if (idx >= 0 && idx < setCards.length - 1) nextCard = setCards[idx + 1];
  } catch {}

  const historyForChart = priceHistory.map((p) => ({
    recordedAt: p.recordedAt.toISOString(),
    normal: p.normal,
    holofoil: p.holofoil,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 뒤로 가기 */}
      <a
        href={`../../expansions/${card.set.id}`}
        className="text-sm text-gray-400 hover:text-white transition-colors mb-6 inline-block"
      >
        ← {card.set.name}
      </a>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 카드 이미지 */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={card.images.large}
            alt={card.name}
            className="rounded-xl shadow-2xl w-full max-w-xs"
          />

          {/* 이전/다음 네비게이션 */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            {prevCard ? (
              <a
                href={`../${prevCard.id}`}
                className="flex items-center gap-2 flex-1 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <img
                  src={prevCard.images.small}
                  alt={prevCard.name}
                  className="h-10 w-7 object-contain"
                />
                <span className="text-xs text-gray-400 truncate">← {prevCard.name}</span>
              </a>
            ) : (
              <div className="flex-1" />
            )}
            {nextCard ? (
              <a
                href={`../${nextCard.id}`}
                className="flex items-center gap-2 flex-1 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors justify-end"
              >
                <span className="text-xs text-gray-400 truncate">{nextCard.name} →</span>
                <img
                  src={nextCard.images.small}
                  alt={nextCard.name}
                  className="h-10 w-7 object-contain"
                />
              </a>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>

        {/* 카드 정보 */}
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-white">{card.name}</h1>
            <p className="text-gray-400 mt-1">
              {card.set.name} · #{card.number}
            </p>
          </div>

          {/* 메타 정보 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {card.rarity && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">희귀도</p>
                <p className="text-white font-medium">
                  {locale === "ko" ? (RARITY_KO[card.rarity] ?? card.rarity) : card.rarity}
                </p>
              </div>
            )}
            {card.artist && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">일러스트레이터</p>
                <p className="text-white font-medium">{card.artist}</p>
              </div>
            )}
            {card.supertype && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">카드 종류</p>
                <p className="text-white font-medium">{card.supertype}</p>
              </div>
            )}
            {card.types && card.types.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">속성</p>
                <p className="text-white font-medium">{card.types.join(", ")}</p>
              </div>
            )}
          </div>

          {/* 현재 시세 */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">현재 시세</h2>
            {latest ? (
              <div className="space-y-2">
                {latest.normal != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">노말</span>
                    <span className="text-lg font-bold text-yellow-400">
                      ${latest.normal.toFixed(2)}
                    </span>
                  </div>
                )}
                {latest.holofoil != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">홀로포일</span>
                    <span className="text-lg font-bold text-yellow-400">
                      ${latest.holofoil.toFixed(2)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-800">
                  출처: eBay 실거래가 기준 ·{" "}
                  {new Date(priceHistory.at(-1)!.recordedAt).toLocaleDateString("ko-KR")} 기준
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">시세 데이터 수집 중</p>
            )}
          </div>

          {/* 가격 히스토리 차트 */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
            <PriceChart history={historyForChart} />
          </div>
        </div>
      </div>
    </div>
  );
}
