"use server";

import {
  searchLogicalCards,
  pickLocale,
  type LogicalCardSearchFilters,
} from "@/lib/cards/queries";
import { pickRarityLabel } from "@/lib/cards/card-fields";

export interface CardSearchHit {
  id: string; // = CardLocale.id (URL용)
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
  rarity?: string; // Rarity.code
  setId?: string; // CardPack.id (그룹 단위 필터)
  limit?: number;
}

export async function searchCardsAction(
  params: CardSearchParams
): Promise<CardSearchHit[]> {
  const filters: LogicalCardSearchFilters = {
    q: params.q,
    type: params.type,
    rarityCode: params.rarity,
    cardPackId: params.setId,
    limit: params.limit,
  };

  // LogicalCard 단위 dedupe 후, KO 우선 locale 1개만 결과로.
  const rows = await searchLogicalCards(filters);

  const hits: CardSearchHit[] = [];
  for (const { logicalCard, locales } of rows) {
    if (locales.length === 0) continue;
    const primary = pickLocale(locales, "ko") ?? locales[0];
    const koLocale = locales.find((l) => l.region === "KR") ?? null;
    const rarity = pickRarityLabel(primary.region, {
      nameJa: logicalCard.rarityNameJa,
      nameEn: logicalCard.rarityNameEn,
      nameKo: logicalCard.rarityNameKo,
      code: logicalCard.rarityCode,
    }) ?? null;
    hits.push({
      id: primary.id,
      name: primary.name,
      nameKo: koLocale?.name ?? null,
      imageSmall: primary.imageSmall,
      rarity,
      number: primary.number,
      setId: primary.setId,
      setName: primary.setName,
      setNameKo: primary.setNameKo,
    });
  }

  return hits;
}
