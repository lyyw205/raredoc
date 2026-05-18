import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCardsBySet, getAllSets } from "@/lib/api/pokemontcg";
import { CollectionBook } from "@/components/collection/CollectionBook";

export const revalidate = 86400;

// 목업: 보유한 카드 ID 시뮬레이션 (실제로는 DB에서 유저별 조회)
// sv3pt5 카드 중 번호 1~143은 보유, 그 외 미보유 (87% 완성)
function simulateOwned(cards: { id: string; number: string }[]): Set<string> {
  const sorted = [...cards].sort(
    (a, b) => parseInt(a.number) - parseInt(b.number) || a.number.localeCompare(b.number)
  );
  const ownedCount = Math.floor(sorted.length * 0.87);
  return new Set(sorted.slice(0, ownedCount).map((c) => c.id));
}

// 보유 카드 중 인증된 카드 (일부)
const CERTIFIED_IDS = new Set([
  "sv3pt5-215", "sv3pt5-205", "sv3pt5-198",
  "sv4pt5-191", "sv4pt5-182", "sv4pt5-184",
]);

// 보유 카드 컨디션 (랜덤 시뮬레이션용)
const GRADES = ["NM", "NM", "NM", "LP", "LP", "MP"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ setId: string }>;
}): Promise<Metadata> {
  const { setId } = await params;
  const sets = await getAllSets().catch(() => []);
  const set = sets.find((s) => s.id === setId);
  return {
    title: set ? `${set.name} 도감` : "컬렉션 도감",
  };
}

export default async function CollectionBookPage({
  params,
}: {
  params: Promise<{ setId: string; locale: string }>;
}) {
  const { setId } = await params;

  const [cards, sets] = await Promise.all([
    getCardsBySet(setId).catch(() => null),
    getAllSets().catch(() => [] as Awaited<ReturnType<typeof getAllSets>>),
  ]);

  if (!cards || cards.length === 0) notFound();

  const tcgSet = sets.find((s) => s.id === setId);
  const ownedIds = simulateOwned(cards);

  const bookCards = cards.map((card, i) => ({
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity,
    imageSmall: card.images.small,
    owned: ownedIds.has(card.id),
    grade: ownedIds.has(card.id) ? GRADES[i % GRADES.length] : undefined,
    certified: CERTIFIED_IDS.has(card.id),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <CollectionBook
        set={{
          id: setId,
          name: tcgSet?.name ?? setId,
          total: tcgSet?.total ?? cards.length,
          logoUrl: tcgSet?.images.logo,
        }}
        cards={bookCards}
      />
    </div>
  );
}
