import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Pokemon TCG types — known fixed list. Card.types stores these in an array.
 */
export const POKEMON_TYPES = [
  "Colorless",
  "Darkness",
  "Dragon",
  "Fairy",
  "Fighting",
  "Fire",
  "Grass",
  "Lightning",
  "Metal",
  "Psychic",
  "Water",
] as const;

export interface FilterOptions {
  types: string[];
  rarities: string[];
  sets: { id: string; name: string; nameKo: string | null; releaseDate: Date }[];
}

export async function getFilterOptions(): Promise<FilterOptions> {
  // Phase 4: prisma.card.groupBy(rarity) → prisma.rarity master 데이터.
  // 검색 액션(searchCards)이 Rarity.code 로 LogicalCard.rarity 를 매칭하므로 동일 도메인 사용.
  const [rarityRows, sets] = await Promise.all([
    prisma.rarity.findMany({
      select: { code: true },
      orderBy: { code: "asc" },
    }),
    prisma.set.findMany({
      select: { id: true, name: true, nameKo: true, releaseDate: true },
      orderBy: { releaseDate: "desc" },
    }),
  ]);

  return {
    types: [...POKEMON_TYPES],
    rarities: rarityRows.map((r) => r.code),
    sets,
  };
}
