"use server";

/**
 * 상세 슬라이드 패널용 — 카드 한 장(RegionCard)의 지역판 목록 + 풍부한 카드 정보를 한 번에 반환.
 *
 * - 입력: regionCardId (패널이 보여주고 있는 카드)
 * - variants: 같은 Card 의 한/영/일 이미지(지역판 탭용, region EN→JP→KR 정렬)
 * - info: HP·타입·약점·기술·특성·룰·일러스트 등 카드 메타 (상세 페이지와 동일 소스)
 */

import { loadCardByLocaleId, cardToTCG } from "@/lib/cards/queries";
import { REGION_SORT_PRIORITY } from "@/lib/cards/card-fields";

export type RegionCardVariant = {
  id: string;
  region: string; // EN | JP | KR
  name: string;
  number: string;
  imageSmall: string | null;
  imageLarge: string | null;
  setCode: string | null;
};

export type CardInfo = {
  nameKo?: string; // Card 한글 오버레이 (KR 지역판이 없어도 한글명 표시용)
  supertype?: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  convertedRetreatCost?: number;
  regulationMark?: string;
  nationalPokedexNumbers?: number[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  abilities?: { name: string; text: string; type: string }[];
  attacks?: { name: string; cost?: string[]; damage?: string; text?: string }[];
  rules?: string[];
  flavorText?: string;
  legalities?: { standard?: string; expanded?: string; unlimited?: string };
};

export type CardDetail = {
  variants: RegionCardVariant[];
  info: CardInfo | null;
};

export async function getCardDetail(regionCardId: string): Promise<CardDetail> {
  const loaded = await loadCardByLocaleId(regionCardId).catch(() => null);
  if (!loaded) return { variants: [], info: null };

  const regionVariants: RegionCardVariant[] = loaded.allLocales.map((l) => ({
    id: l.id,
    region: l.region,
    name: l.name,
    number: l.number,
    imageSmall: l.imageSmall,
    imageLarge: l.imageLarge,
    setCode: l.setCode,
  }));

  // region 당 1장만(탭 key 중복 방지). 같은 region 이 여러 장이면 이미지 있는 쪽 우선.
  const byRegion = new Map<string, RegionCardVariant>();
  for (const v of regionVariants) {
    const cur = byRegion.get(v.region);
    if (!cur || (!(cur.imageSmall || cur.imageLarge) && (v.imageSmall || v.imageLarge))) {
      byRegion.set(v.region, v);
    }
  }
  const variants: RegionCardVariant[] = [...byRegion.values()].sort(
    (a, b) => (REGION_SORT_PRIORITY[a.region] ?? 9) - (REGION_SORT_PRIORITY[b.region] ?? 9)
  );

  const tcg = cardToTCG(loaded.card, loaded.locale);
  const info: CardInfo = {
    nameKo: loaded.card.nameKo ?? undefined,
    supertype: tcg.supertype,
    subtypes: tcg.subtypes,
    hp: tcg.hp,
    types: tcg.types,
    weaknesses: tcg.weaknesses,
    resistances: tcg.resistances,
    convertedRetreatCost: tcg.convertedRetreatCost,
    regulationMark: tcg.regulationMark,
    nationalPokedexNumbers: tcg.nationalPokedexNumbers,
    evolvesFrom: tcg.evolvesFrom,
    evolvesTo: tcg.evolvesTo,
    abilities: tcg.abilities,
    attacks: tcg.attacks,
    rules: tcg.rules,
    flavorText: tcg.flavorText,
    legalities: tcg.legalities,
  };

  return { variants, info };
}
