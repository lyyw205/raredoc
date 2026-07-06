"use server";

import {
  searchCards,
  pickLocale,
  type CardSearchFilters,
} from "@/lib/cards/queries";
import { pickRarityLabel } from "@/lib/cards/card-fields";
import { prisma } from "@/lib/prisma";
import { toKrw } from "@/lib/trades/shared";

export interface CardSearchHit {
  id: string; // = RegionCard.id (URL용)
  name: string;
  nameKo: string | null;
  imageSmall: string | null;
  rarity: string | null;
  number: string;
  setName: string;
  setNameKo: string | null;
  region: string; // 이 hit이 대표로 보여주는 인쇄본의 지역(EN/JP/KR) — alt 텍스트 등에 사용
  setSymbolUrl: string | null; // 세트 심볼 아이콘
  setCardCount: number | null; // 세트 총 장수(카드번호 "004/078" 표시용)
  priceKrw?: number | null; // sort: "price" 일 때만 채워짐(카드 대표 시세, KRW)
}

export interface CardSearchParams {
  q?: string;
  type?: string;
  rarity?: string; // Rarity.code
  setId?: string; // CardPack.id (그룹 단위 필터)
  limit?: number;
  sort?: "price"; // "price" → 카드 대표 시세 높은순(미지정 시 기본 무정렬)
  expandSpecies?: boolean; // true → q 를 종으로도 해석해 그 종의 모든 Card 포함(KR판 없는 아트 누락 방지)
  region?: "EN" | "JP" | "KR"; // 지정 시 그 지역 인쇄본이 있는 Card만, 그 지역판을 대표로 표시(전체=미지정)
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
    expandSpecies: params.expandSpecies,
    region: params.region,
  };

  // Card 단위 dedupe 후, 대표 locale 1개만 결과로.
  const rows = await searchCards(filters);

  // hit 과 그 카드의 전체 locale(RegionCard) id 를 함께 보관 — 시세 정렬용.
  const entries: { hit: CardSearchHit; localeIds: string[] }[] = [];
  for (const { card, locales } of rows) {
    if (locales.length === 0) continue;
    // region 필터 탭이 켜져 있으면 그 지역 인쇄본을 대표로(searchCards 가 이미 그 지역 보유 Card 만 반환).
    // 전체(미지정)면 기존 KR 우선 폴백.
    const primary = params.region
      ? locales.find((l) => l.region === params.region)
      : pickLocale(locales, "ko") ?? locales[0];
    if (!primary) continue;
    // nameKo 는 반드시 한국판(KR) 인쇄본 고유명 — primary 가 JP/EN 폴백이면 null
    const koLocale = locales.find((l) => l.region === "KR") ?? null;
    const rarity = pickRarityLabel(primary.region, {
      nameJa: card.rarityNameJa,
      nameEn: card.rarityNameEn,
      nameKo: card.rarityNameKo,
      code: card.rarityCode,
    }) ?? null;
    entries.push({
      hit: {
        id: primary.id,
        name: primary.name,
        nameKo: koLocale?.name ?? null,
        imageSmall: primary.imageSmall,
        rarity,
        number: primary.number,
        setName: primary.setName,
        setNameKo: primary.setNameKo,
        region: primary.region,
        setSymbolUrl: primary.setSymbolUrl ?? null,
        setCardCount: primary.setCardCount ?? null,
      },
      localeIds: locales.map((l) => l.id),
    });
  }

  if (params.sort === "price") {
    const maxKrwByLocale = await maxPriceKrwByRegionCard(
      entries.flatMap((e) => e.localeIds)
    );
    for (const e of entries) {
      let best: number | null = null;
      for (const id of e.localeIds) {
        const v = maxKrwByLocale.get(id);
        if (v != null && (best == null || v > best)) best = v;
      }
      e.hit.priceKrw = best;
    }
    // 시세 높은순, 값 없는 카드는 뒤로(JS sort 는 V8 에서 안정).
    entries.sort((a, b) => (b.hit.priceKrw ?? -1) - (a.hit.priceKrw ?? -1));
  }

  return entries.map((e) => e.hit);
}

/**
 * 여러 RegionCard 의 "대표 시세(KRW)"를 배치 1쿼리로 계산.
 * - 출처(sourceId)별 최신 1건만(= getCardPrices 와 동일한 dedup), 그 중 최댓값을 RegionCard 별로.
 * - 가격은 단일값 amount 사용.
 */
async function maxPriceKrwByRegionCard(
  regionCardIds: string[]
): Promise<Map<string, number>> {
  const ids = [...new Set(regionCardIds)];
  const result = new Map<string, number>();
  if (ids.length === 0) return result;

  const prices = await prisma.price.findMany({
    where: { regionCardId: { in: ids }, sourceId: { not: null } },
    select: {
      regionCardId: true,
      sourceId: true,
      amount: true,
      currency: true,
    },
    orderBy: { recordedAt: "desc" },
  });

  const seen = new Set<string>(); // regionCardId:sourceId → 최신 1건만
  for (const p of prices) {
    const key = `${p.regionCardId}:${p.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = p.amount ?? null;
    if (raw == null) continue;
    const krw = toKrw(raw, p.currency);
    const prev = result.get(p.regionCardId);
    if (prev == null || krw > prev) result.set(p.regionCardId, krw);
  }

  return result;
}
