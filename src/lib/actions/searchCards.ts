"use server";

import { prisma } from "@/lib/prisma";

export interface CardSearchHit {
  id: string;
  name: string;
  nameKo: string | null;
  imageSmall: string | null;
  rarity: string | null;
  number: string;
  setId: string;
  setName: string;
  setNameKo: string | null;
}

export interface CardSearchParams {
  q?: string;
  type?: string;
  rarity?: string;
  setId?: string;
  limit?: number;
}

export async function searchCardsAction(
  params: CardSearchParams
): Promise<CardSearchHit[]> {
  const q = (params.q ?? "").trim();
  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { nameKo: { contains: q, mode: "insensitive" } },
    ];
  }
  if (params.type) where.types = { has: params.type };
  if (params.rarity) where.rarity = params.rarity;
  if (params.setId) where.setId = params.setId;

  const cards = await prisma.card.findMany({
    where: where as Parameters<typeof prisma.card.findMany>[0] extends
      | { where?: infer W }
      | undefined
      ? W
      : never,
    select: {
      id: true,
      name: true,
      nameKo: true,
      imageSmall: true,
      rarity: true,
      number: true,
      setId: true,
      set: { select: { name: true, nameKo: true, releaseDate: true } },
    },
    orderBy: [{ set: { releaseDate: "desc" } }, { number: "asc" }],
    take: Math.min(params.limit ?? 100, 200),
  });

  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    nameKo: c.nameKo,
    imageSmall: c.imageSmall,
    rarity: c.rarity,
    number: c.number,
    setId: c.setId,
    setName: c.set.name,
    setNameKo: c.set.nameKo,
  }));
}
