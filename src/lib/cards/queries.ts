// Phase 3 어댑터 — 새 ERD(Card + RegionCard + Rarity + PriceSource)를
// 기반으로 페이지가 호출하는 공통 쿼리·변환 헬퍼.
//
// 기존 prisma.card / prisma.cardGroup 의존 코드와 공존(Phase 4 에서 제거).
// 모든 새 쿼리는 Card/RegionCard/Rarity/PriceSource 만 참조한다.

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TCGCard } from "@/lib/api/pokemontcg";
import { pickRarityLabel, REGION_SORT_PRIORITY } from "./card-fields";
import { resolveSiblings, isUnavailable, type SiblingCandidate, type Region } from "./sibling-resolver";
import { matchesSearch, buildSearchText } from "@/lib/search";

// ── 공용 타입 ─────────────────────────────────────────────────────────────────

export type LocaleSummary = {
  id: string;
  language: string;
  region: string;
  name: string;
  number: string;
  numberInt: number | null;
  flavorText: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  setId: string;
  setName: string;
  setNameKo: string | null;
  setNameJa: string | null;
  setCode: string | null;
  setCardCount?: number | null;
  setSymbolUrl?: string | null;
  // 인쇄본별 표시필드(RegionCard 하강) — regMark/legalities/rarity 만 유지(per-printing/per-region).
  //   게임필드(weak/resist/retreat/evolves/subtypes)는 diff=0 순수복제라 Card 직독으로 이관(Stage2 2026-06-11).
  regulationMark?: string | null;
  legalities?: Prisma.JsonValue;
  rarityCode?: string | null;
  rarityNameKo?: string | null;
  rarityNameJa?: string | null;
  rarityNameEn?: string | null;
};

export type CardMeta = {
  id: string;
  primarySetId: string | null;
  primaryNumber: string | null;
  primaryNumberInt: number | null;
  pokedexNumbers: number[];
  supertype: string | null;
  subtypes: string[];
  types: string[];
  hp: number | null;
  retreatCost: number | null;
  weakness: string | null;
  resistance: string | null;
  regulationMark: string | null;
  illustrator: string | null;
  evolvesFrom: string | null;
  evolvesTo: string[];
  abilities: Prisma.JsonValue;
  attacks: Prisma.JsonValue;
  legalities: Prisma.JsonValue;
  rules: string[];
  flavorText: string | null;
  rarityCode: string | null;
  rarityNameKo: string | null;
  rarityNameJa: string | null;
  rarityNameEn: string | null;
  // 카테고리 레이어 (11개 그룹)
  rarityCategoryCode: string | null;
  rarityCategoryNameKo: string | null;
  rarityCategoryNameJa: string | null;
  rarityCategoryNameEn: string | null;
  rarityCategoryTier: number | null;
  // ── 한국 유저 대상 한글 overlay ──
  nameKo: string | null;
};


// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function asArray<T>(v: Prisma.JsonValue): T[] | undefined {
  return Array.isArray(v) ? (v as unknown as T[]) : undefined;
}

function asObject(v: Prisma.JsonValue): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

function parseTypeValue(
  raw: string | null
): { type: string; value: string }[] | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // DB 에는 두 형식이 혼재: 평문("Fire x2") 과 JSON([{"type":"Fire","value":"x2"}]).
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const result = arr
        .filter((e) => e && typeof e === "object" && typeof e.type === "string")
        .map((e) => ({ type: String(e.type), value: e.value != null ? String(e.value) : "" }));
      if (result.length > 0) return result;
    } catch {
      /* JSON 파싱 실패 시 평문 파싱으로 폴백 */
    }
  }
  const m = trimmed.match(/^(.+?)\s*([×x]\s*\d+|[-+]\d+)$/i);
  if (m) return [{ type: m[1].trim(), value: m[2].replace(/\s+/g, "") }];
  return [{ type: trimmed, value: "" }];
}

// 사용자 locale 우선의 RegionCard 선택. 없으면 EN > JP > KR 순.
export function pickLocale<T extends { language: string; region: string }>(
  locales: T[],
  preferred: "en" | "ja" | "ko"
): T | null {
  if (locales.length === 0) return null;
  const lang = locales.find((l) => l.language === preferred);
  if (lang) return lang;
  // 폴백: region 우선순위
  const sorted = [...locales].sort(
    (a, b) => (REGION_SORT_PRIORITY[a.region] ?? 9) - (REGION_SORT_PRIORITY[b.region] ?? 9)
  );
  return sorted[0] ?? null;
}

function toLocaleSummary(l: {
  id: string;
  language: string;
  region: string;
  name: string;
  number: string;
  numberInt: number | null;
  flavorText: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  setId: string;
  set: { name: string; nameKo: string | null; nameJa: string | null; code: string | null; cardCount: number; symbolUrl?: string | null };
  regulationMark?: string | null;
  legalities?: Prisma.JsonValue;
  rarity?: { code: string; nameKo: string | null; nameJa: string | null; nameEn: string | null } | null;
}): LocaleSummary {
  return {
    id: l.id,
    language: l.language,
    region: l.region,
    name: l.name,
    number: l.number,
    numberInt: l.numberInt,
    flavorText: l.flavorText,
    imageSmall: l.imageSmall,
    imageLarge: l.imageLarge,
    setId: l.setId,
    setName: l.set.name,
    setNameKo: l.set.nameKo,
    setNameJa: l.set.nameJa,
    setCode: l.set.code,
    setCardCount: l.set.cardCount,
    setSymbolUrl: l.set.symbolUrl ?? null,
    regulationMark: l.regulationMark ?? null,
    legalities: l.legalities ?? null,
    rarityCode: l.rarity?.code ?? null,
    rarityNameKo: l.rarity?.nameKo ?? null,
    rarityNameJa: l.rarity?.nameJa ?? null,
    rarityNameEn: l.rarity?.nameEn ?? null,
  };
}

function toCardMeta(lc: {
  id: string;
  primarySetId: string | null;
  primaryNumber: string | null;
  primaryNumberInt: number | null;
  pokedexNumbers: number[];
  supertype: string | null;
  subtypes: string[];
  types: string[];
  hp: number | null;
  retreatCost: number | null;
  weakness: string | null;
  resistance: string | null;
  regulationMark: string | null;
  illustrator: string | null;
  evolvesFrom: string | null;
  evolvesTo: string[];
  abilities: Prisma.JsonValue;
  attacks: Prisma.JsonValue;
  legalities: Prisma.JsonValue;
  rules: string[];
  flavorText: string | null;
  nameKo: string | null;
  rarity: {
    code: string;
    nameKo: string | null;
    nameJa: string | null;
    nameEn: string | null;
    tier: number;
    category: {
      code: string;
      nameKo: string;
      nameJa: string | null;
      nameEn: string;
      tier: number;
    } | null;
  } | null;
  gameCard?: {
    supertype: string | null;
    hp: number | null;
  } | null;
  texts?: { name: string | null }[];
}): CardMeta {
  const gc = lc.gameCard;
  const supertype = gc?.supertype ?? lc.supertype;
  return {
    id: lc.id,
    primarySetId: lc.primarySetId,
    primaryNumber: lc.primaryNumber,
    primaryNumberInt: lc.primaryNumberInt,
    pokedexNumbers: lc.pokedexNumbers,
    supertype,
    subtypes: lc.subtypes,
    types: lc.types,
    hp: gc?.hp ?? lc.hp,
    illustrator: lc.illustrator,
    // 아래는 LC 잔류 — regMark/legalities=인쇄본별(→CL 후속), weakness/resist/retreat/
    //   evolves=GameCard 과병합 노출(effectSig 정련 후), attacks/abilities/rules=언어종속(P8).
    retreatCost: lc.retreatCost,
    weakness: lc.weakness,
    resistance: lc.resistance,
    regulationMark: lc.regulationMark,
    evolvesFrom: lc.evolvesFrom,
    evolvesTo: lc.evolvesTo,
    abilities: lc.abilities,
    attacks: lc.attacks,
    legalities: lc.legalities,
    rules: lc.rules,
    flavorText: lc.flavorText,
    rarityCode: lc.rarity?.code ?? null,
    rarityNameKo: lc.rarity?.nameKo ?? null,
    rarityNameJa: lc.rarity?.nameJa ?? null,
    rarityNameEn: lc.rarity?.nameEn ?? null,
    rarityCategoryCode: lc.rarity?.category?.code ?? null,
    rarityCategoryNameKo: lc.rarity?.category?.nameKo ?? null,
    rarityCategoryNameJa: lc.rarity?.category?.nameJa ?? null,
    rarityCategoryNameEn: lc.rarity?.category?.nameEn ?? null,
    rarityCategoryTier: lc.rarity?.category?.tier ?? null,
    nameKo: lc.texts?.[0]?.name ?? lc.nameKo, // P8a: CardText(ko) 우선
  };
}

// ── 쿼리 ──────────────────────────────────────────────────────────────────────

/**
 * RegionCard.id 로 시작해 Card + 같은 Card 의 모든 locale 을 조회.
 * URL `/cards/{cardId}` 진입점.
 */
export async function loadCardByLocaleId(localeId: string): Promise<{
  locale: LocaleSummary;
  card: CardMeta;
  allLocales: LocaleSummary[];
  // D3 형제 리졸버 결과 — 지역별 대표 1장(표시 전용). 미발매 지역은 키 없음.
  siblingByRegion: Partial<Record<Region, LocaleSummary>>;
} | null> {
  const cl = await prisma.regionCard.findUnique({
    where: { id: localeId },
    include: {
      set: { select: { name: true, nameKo: true, nameJa: true, code: true, cardCount: true, releaseDate: true } },
      card: {
        include: {
          rarity: {
            select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } },
          },
          gameCard: { select: { supertype: true, hp: true } },
          texts: { where: { language: "ko" }, select: { name: true } },
          locales: {
            include: {
              set: { select: { name: true, nameKo: true, nameJa: true, code: true, cardCount: true, releaseDate: true } },
              rarity: { select: { code: true, nameKo: true, nameJa: true, nameEn: true } },
            },
          },
        },
      },
    },
  });
  if (!cl) return null;

  const allLocales = cl.card.locales
    .map(toLocaleSummary)
    .sort(
      (a, b) => (REGION_SORT_PRIORITY[a.region] ?? 9) - (REGION_SORT_PRIORITY[b.region] ?? 9)
    );

  // D3 형제 리졸버(표시 전용). P5 collapse 후 card.locales = artCardId 그룹이므로
  //   풀은 무조건 card.locales(추가 쿼리 없음). ★시세는 이 결과를 쓰지 않는다(D5).
  const toCand = (l: {
    id: string;
    region: string;
    setId: string;
    set: { releaseDate: Date };
    imageSmall: string | null;
    imageLarge: string | null;
    numberInt: number | null;
    number: string;
  }): SiblingCandidate => ({
    id: l.id,
    region: l.region,
    setId: l.setId,
    releaseDate: l.set.releaseDate,
    hasImage: !!(l.imageLarge || l.imageSmall),
    numberInt: l.numberInt,
    number: l.number,
  });
  const candidates: SiblingCandidate[] = cl.card.locales.map(toCand);
  const resolved = resolveSiblings(toCand(cl), candidates);
  const byId = new Map(allLocales.map((l) => [l.id, l] as const));
  const siblingByRegion: Partial<Record<Region, LocaleSummary>> = {};
  for (const region of ["EN", "JP", "KR"] as const) {
    const pick = resolved[region];
    if (isUnavailable(pick)) continue;
    siblingByRegion[region] = byId.get(pick.id);
  }

  return {
    locale: toLocaleSummary(cl),
    card: toCardMeta(cl.card),
    allLocales,
    siblingByRegion,
  };
}

/**
 * CardPack(팩) id 로 그 팩에 속한 Card id 목록 도출.
 * '도둑질' 방지: 가변·재포인트 대상인 Card.cardPackId 대신,
 * 각 LC의 앵커 locale(JP>KR>EN)의 Set.cardPackId(불변 물리관계)로 계산한다.
 * (cardPackId 컬럼과 전 그룹 diff=0 검증됨 — p7-setgroup-rewire-regression.ts)
 */
export async function lcIdsInPack(cardPackId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ lc: string }[]>`
    SELECT a.lc FROM (
      SELECT DISTINCT ON (cl."logicalCardId") cl."logicalCardId" AS lc, s."setGroupId" AS grp
      FROM "CardLocale" cl JOIN "Set" s ON s.id = cl."setId"
      WHERE s."setGroupId" IS NOT NULL
      ORDER BY cl."logicalCardId",
        CASE cl.region WHEN 'JP' THEN 0 WHEN 'KR' THEN 1 WHEN 'EN' THEN 2 ELSE 3 END
    ) a WHERE a.grp = ${cardPackId}`;
  return rows.map((r) => r.lc);
}

export type CardSearchFilters = {
  q?: string;
  supertype?: string;
  type?: string;
  rarityCode?: string;
  cardPackId?: string;
  limit?: number;
  // true → q 를 "종(Species)"으로도 해석해 그 종의 모든 Card 를 포함(이름-글자 일치로만 잡지 않음).
  //   KR판 없는 JP/EN 단독 아트가 한글 검색에서 누락되던 문제 해결. opt-in(시세 검색 등에서만 사용).
  expandSpecies?: boolean;
  // 지정 시 그 지역(RegionCard.region) 인쇄본이 있는 Card 만 — 시세 검색 필터 탭(전체/KR/EN/JP)용.
  region?: "EN" | "JP" | "KR";
};

/**
 * 쿼리가 가리키는 종(Species)에 속한 모든 Card id.
 *   언어무관 매칭(matchesSearch: NFKC+토큰 AND)으로 Species.nameKo/Ja/En 을 검사해
 *   매칭된 종들의 CardSpecies 링크에서 Card id 를 수집한다(도감/`/test` 와 동일한 종 해석 기준).
 *   매칭 종이 없으면 [] — 호출부는 이름-글자 검색으로 폴백한다.
 *   ※ "리자몽 ex" 같이 종이름에 없는 토큰("ex")이 섞이면 AND 매칭이 실패해 종으로 안 잡힘(의도).
 */
async function cardIdsForQuerySpecies(q: string): Promise<string[]> {
  const norm = q.trim();
  if (!norm) return [];
  const species = await prisma.species.findMany({
    select: { id: true, nameKo: true, nameJa: true, nameEn: true },
  });
  const speciesIds = species
    .filter((s) => matchesSearch(buildSearchText([s.nameKo, s.nameJa, s.nameEn]), norm))
    .map((s) => s.id);
  if (speciesIds.length === 0) return [];
  const links = await prisma.cardSpecies.findMany({
    where: { speciesId: { in: speciesIds } },
    select: { cardId: true },
  });
  return [...new Set(links.map((l) => l.cardId))];
}

/**
 * Card 메타 + 모든 locale 조인 검색. dedupe 는 Card 단위로 보장.
 * 결과의 cardId(URL용) = 선택된 locale.id.
 */
export async function searchCards(
  filters: CardSearchFilters
): Promise<
  {
    card: CardMeta;
    locales: LocaleSummary[];
  }[]
> {
  const q = (filters.q ?? "").trim();
  const where: Prisma.CardWhereInput = {};
  if (filters.supertype) where.supertype = filters.supertype;
  if (filters.type) where.types = { has: filters.type };
  if (filters.rarityCode) where.rarity = { code: filters.rarityCode };
  if (filters.cardPackId) where.id = { in: await lcIdsInPack(filters.cardPackId) };

  // locales 관계를 건드리는 조건(이름/종 검색 + 지역 필터)은 where.AND 로 모아 독립적으로 AND.
  //   (where.locales 를 두 번 대입하면 뒤의 대입이 앞을 덮어써 버리므로 분리)
  const and: Prisma.CardWhereInput[] = [];
  if (q) {
    const nameMatch: Prisma.CardWhereInput = {
      locales: { some: { name: { contains: q, mode: "insensitive" } } },
    };
    // expandSpecies: 이름-글자(언어종속) 일치에 더해, 쿼리가 가리키는 종의 Card 전부를 합집합으로.
    //   예) "이상해씨"(한글) → species#1 → KR판 없는 JP/EN 단독 아트까지 포함.
    const speciesCardIds = filters.expandSpecies ? await cardIdsForQuerySpecies(q) : [];
    and.push(
      speciesCardIds.length > 0
        ? { OR: [{ id: { in: speciesCardIds } }, nameMatch] }
        : nameMatch
    );
  }
  // region: 그 지역 인쇄본(RegionCard)이 있는 Card 만 — 필터 탭(전체/KR/EN/JP)용.
  if (filters.region) {
    and.push({ locales: { some: { region: filters.region } } });
  }
  if (and.length > 0) where.AND = and;

  const lcs = await prisma.card.findMany({
    where,
    include: {
      rarity: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } } },
      gameCard: { select: { supertype: true, hp: true } },
      texts: { where: { language: "ko" }, select: { name: true } },
      locales: {
        include: { set: { select: { name: true, nameKo: true, nameJa: true, code: true, cardCount: true, symbolUrl: true } }, rarity: { select: { code: true, nameKo: true, nameJa: true, nameEn: true } } },
      },
    },
    take: Math.min(filters.limit ?? 100, 200),
  });

  return lcs.map((lc) => ({
    card: toCardMeta(lc),
    locales: lc.locales
      .map(toLocaleSummary)
      .sort(
        (a, b) =>
          (REGION_SORT_PRIORITY[a.region] ?? 9) - (REGION_SORT_PRIORITY[b.region] ?? 9)
      ),
  }));
}

/**
 * Card + 선택된 locale → 기존 TCGCard 형태로 변환.
 * 기존 컴포넌트들이 TCGCard 를 받으므로 호환 유지.
 */
export function cardToTCG(
  lc: CardMeta,
  primary: LocaleSummary
): TCGCard {
  // 지역별 rarity 표기: 사용자 region 우선, 없으면 EN, 없으면 code. P4a: primary(RegionCard) 우선.
  const rJa = primary.rarityNameJa ?? lc.rarityNameJa;
  const rKo = primary.rarityNameKo ?? lc.rarityNameKo;
  const rEn = primary.rarityNameEn ?? lc.rarityNameEn;
  const rCode = primary.rarityCode ?? lc.rarityCode;
  const rarityLabel = pickRarityLabel(primary.region, {
    nameJa: rJa,
    nameEn: rEn,
    nameKo: rKo,
    code: rCode,
  });

  const legalitiesObj = asObject(primary.legalities ?? lc.legalities); // P4c: 인쇄본별→CL

  return {
    id: primary.id,
    name: primary.name,
    number: primary.number,
    rarity: rarityLabel,
    types: lc.types.length > 0 ? lc.types : undefined,
    supertype: lc.supertype ?? undefined,
    subtypes: lc.subtypes.length > 0 ? lc.subtypes : undefined,
    artist: lc.illustrator ?? undefined,
    set: { id: primary.setId, name: primary.setName },
    images: {
      small: primary.imageSmall ?? "",
      large: primary.imageLarge ?? primary.imageSmall ?? "",
    },
    hp: lc.hp != null ? String(lc.hp) : undefined,
    evolvesFrom: lc.evolvesFrom ?? undefined,
    evolvesTo: lc.evolvesTo.length > 0 ? lc.evolvesTo : undefined,
    abilities: asArray<{ name: string; text: string; type: string }>(
      lc.abilities
    ),
    attacks: asArray<{
      name: string;
      cost?: string[];
      convertedEnergyCost?: number;
      damage?: string;
      text?: string;
    }>(lc.attacks),
    weaknesses: parseTypeValue(lc.weakness),
    resistances: parseTypeValue(lc.resistance),
    convertedRetreatCost: lc.retreatCost ?? undefined,
    flavorText: primary.flavorText ?? lc.flavorText ?? undefined,
    nationalPokedexNumbers:
      lc.pokedexNumbers.length > 0 ? lc.pokedexNumbers : undefined,
    legalities: legalitiesObj
      ? {
          standard:
            typeof legalitiesObj.standard === "string"
              ? legalitiesObj.standard
              : undefined,
          expanded:
            typeof legalitiesObj.expanded === "string"
              ? legalitiesObj.expanded
              : undefined,
          unlimited:
            typeof legalitiesObj.unlimited === "string"
              ? legalitiesObj.unlimited
              : undefined,
        }
      : undefined,
    regulationMark: (primary.regulationMark ?? lc.regulationMark) ?? undefined,
    rules: lc.rules.length > 0 ? lc.rules : undefined,
  };
}
