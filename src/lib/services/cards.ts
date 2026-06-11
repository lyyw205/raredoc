import { prisma } from "@/lib/prisma";
import { searchCards } from "@/lib/api/pokemontcg";
import type { RegionCard } from "@/generated/prisma/client";
import type { Prisma as PrismaTypes } from "@/generated/prisma/client";

/**
 * localeId 에 해당하는 RegionCard 이 DB 에 있으면 반환, 없으면 pokemontcg.io
 * 에서 가져와 LogicalCard + RegionCard 로 upsert 후 반환한다. 실패 시 null.
 *
 * CollectionItem 등록 전에 호출해 FK 무결성을 보장한다.
 * (이전 ensureCard 의 후속 — Card 모델 제거 후 단일 경로로 통일)
 */
export async function ensureLocale(localeId: string): Promise<RegionCard | null> {
  const existing = await prisma.regionCard.findUnique({ where: { id: localeId } });
  if (existing) return existing;

  let fetched;
  try {
    const res = await searchCards(`id:${localeId}`, 1);
    fetched = res.data.find((c) => c.id === localeId) ?? res.data[0];
  } catch {
    return null;
  }
  if (!fetched) return null;

  const setId = fetched.set?.id;
  if (!setId) return null;

  const setExists = await prisma.set.findUnique({
    where: { id: setId },
    select: { id: true },
  });
  if (!setExists) return null;

  try {
    const logical = await prisma.logicalCard.create({
      data: {
        id: `lc-orphan-${fetched.id}`,
        primarySetId: setId,
        primaryNumber: fetched.number,
        primaryNumberInt: Number.parseInt(fetched.number, 10) || null,
        pokedexNumbers: fetched.nationalPokedexNumbers ?? [],
        supertype: fetched.supertype ?? null,
        subtypes: fetched.subtypes ?? [],
        types: fetched.types ?? [],
        hp: fetched.hp ? Number.parseInt(fetched.hp, 10) || null : null,
        retreatCost: fetched.convertedRetreatCost ?? null,
        weakness: fetched.weaknesses?.[0]
          ? `${fetched.weaknesses[0].type} ${fetched.weaknesses[0].value}`
          : null,
        resistance: fetched.resistances?.[0]
          ? `${fetched.resistances[0].type} ${fetched.resistances[0].value}`
          : null,
        regulationMark: fetched.regulationMark ?? null,
        illustrator: fetched.artist ?? null,
        evolvesFrom: fetched.evolvesFrom ?? null,
        evolvesTo: fetched.evolvesTo ?? [],
        abilities: (fetched.abilities ?? undefined) as PrismaTypes.InputJsonValue | undefined,
        attacks: (fetched.attacks ?? undefined) as PrismaTypes.InputJsonValue | undefined,
        legalities: (fetched.legalities ?? undefined) as PrismaTypes.InputJsonValue | undefined,
        rules: fetched.rules ?? [],
        flavorText: fetched.flavorText ?? null,
      },
    });

    return await prisma.regionCard.create({
      data: {
        id: fetched.id, // URL/외부 FK 호환
        logicalCardId: logical.id,
        language: "en",
        region: "EN",
        setId,
        number: fetched.number,
        numberInt: Number.parseInt(fetched.number, 10) || null,
        name: fetched.name,
        flavorText: fetched.flavorText ?? null,
        imageSmall: fetched.images?.small ?? null,
        imageLarge: fetched.images?.large ?? null,
      },
    });
  } catch {
    return null;
  }
}
