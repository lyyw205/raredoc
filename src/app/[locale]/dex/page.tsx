import type { Metadata } from "next";
import { getCardsBySet, getAllSets } from "@/lib/api/pokemontcg";
import { DexCatalog, type DexSet } from "@/components/dex/DexCatalog";

export const metadata: Metadata = { title: "카드 도감 — Raredoc" };
export const revalidate = 86400;

// 도감에 포함할 세트 (최신 순)
const DEX_SETS = [
  { id: "sv4pt5", label: "파라다이스 드래고나" },
  { id: "sv3pt5", label: "포켓몬 151" },
];

const CERTIFIED_IDS = new Set([
  "sv3pt5-215", "sv3pt5-205", "sv3pt5-198",
  "sv4pt5-191", "sv4pt5-182",
]);

const GRADES = ["NM", "NM", "NM", "LP", "LP", "MP"];

function simulateOwned(cards: { id: string; number: string }[]): Set<string> {
  const sorted = [...cards].sort(
    (a, b) =>
      parseInt(a.number) - parseInt(b.number) || a.number.localeCompare(b.number)
  );
  const ownedCount = Math.floor(sorted.length * 0.62);
  return new Set(sorted.slice(0, ownedCount).map((c) => c.id));
}

export default async function DexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const allSets = await getAllSets().catch(() => []);

  // 병렬로 각 세트 카드 패치
  const cardResults = await Promise.all(
    DEX_SETS.map(({ id }) => getCardsBySet(id).catch(() => []))
  );

  const sets: DexSet[] = DEX_SETS.map(({ id, label }, idx) => {
    const rawCards = cardResults[idx];
    const tcgSet = allSets.find((s) => s.id === id);
    const ownedIds = simulateOwned(rawCards);

    return {
      id,
      name: tcgSet?.name ?? label,
      logoUrl: tcgSet?.images.logo,
      cards: rawCards.map((card, i) => ({
        id: card.id,
        name: card.name,
        number: card.number,
        rarity: card.rarity,
        types: card.types,
        supertype: card.supertype,
        imageSmall: card.images.small,
        owned: ownedIds.has(card.id),
        grade: ownedIds.has(card.id) ? GRADES[i % GRADES.length] : undefined,
        certified: CERTIFIED_IDS.has(card.id),
      })),
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <DexCatalog sets={sets} locale={locale} />
    </div>
  );
}
