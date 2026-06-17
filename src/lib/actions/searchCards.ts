"use server";

import {
  searchCards,
  pickLocale,
  type CardSearchFilters,
} from "@/lib/cards/queries";
import { pickRarityLabel } from "@/lib/cards/card-fields";

export interface CardSearchHit {
  id: string; // = RegionCard.id (URL용)
  name: string;
  nameKo: string | null;
  imageSmall: string | null;
  rarity: string | null;
  number: string;
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
  const filters: CardSearchFilters = {
    q: params.q,
    type: params.type,
    rarityCode: params.rarity,
    cardPackId: params.setId,
    limit: params.limit,
  };

  // Card 단위 dedupe 후, KO 우선 locale 1개만 결과로.
  const rows = await searchCards(filters);

  const hits: CardSearchHit[] = [];
  for (const { card, locales } of rows) {
    if (locales.length === 0) continue;
    const primary = pickLocale(locales, "ko") ?? locales[0];
    // nameKo 는 반드시 한국판(KR) 인쇄본 고유명 — primary 가 JP/EN 폴백이면 null
    const koLocale = locales.find((l) => l.region === "KR") ?? null;
    const rarity = pickRarityLabel(primary.region, {
      nameJa: card.rarityNameJa,
      nameEn: card.rarityNameEn,
      nameKo: card.rarityNameKo,
      code: card.rarityCode,
    }) ?? null;
    hits.push({
      id: primary.id,
      name: primary.name,
      nameKo: koLocale?.name ?? null,
      imageSmall: primary.imageSmall,
      rarity,
      number: primary.number,
      setName: primary.setName,
      setNameKo: primary.setNameKo,
    });
  }

  return hits;
}
