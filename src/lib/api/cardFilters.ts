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
  const [rarityRows, sets] = await Promise.all([
    prisma.card.groupBy({
      by: ["rarity"],
      where: { rarity: { not: null } },
      orderBy: { rarity: "asc" },
    }),
    prisma.set.findMany({
      select: { id: true, name: true, nameKo: true, releaseDate: true },
      orderBy: { releaseDate: "desc" },
    }),
  ]);

  return {
    types: [...POKEMON_TYPES],
    rarities: rarityRows
      .map((r) => r.rarity)
      .filter((r): r is string => !!r),
    sets,
  };
}
