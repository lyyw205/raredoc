// Phase 3 어댑터 — 새 ERD(LogicalCard + CardLocale + Rarity + PriceSource)를
// 기반으로 페이지가 호출하는 공통 쿼리·변환 헬퍼.
//
// 기존 prisma.card / prisma.cardGroup 의존 코드와 공존(Phase 4 에서 제거).
// 모든 새 쿼리는 LogicalCard/CardLocale/Rarity/PriceSource 만 참조한다.

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TCGCard } from "@/lib/api/pokemontcg";

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
};

export type LogicalCardMeta = {
  id: string;
  setGroupId: string | null;
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
  rarityTier: number | null;
  // 카테고리 레이어 (11개 그룹)
  rarityCategoryCode: string | null;
  rarityCategoryNameKo: string | null;
  rarityCategoryNameJa: string | null;
  rarityCategoryNameEn: string | null;
  rarityCategoryTier: number | null;
  // ── 한국 유저 대상 한글 overlay ──
  nameKo: string | null;
  attacksKo: Prisma.JsonValue;
  abilitiesKo: Prisma.JsonValue;
  rulesKo: string[];
  flavorTextKo: string | null;
};

const REGION_ORDER: Record<string, number> = { EN: 0, JP: 1, KR: 2 };

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
  const m = trimmed.match(/^(.+?)\s*([×x]\s*\d+|[-+]\d+)$/i);
  if (m) return [{ type: m[1].trim(), value: m[2].replace(/\s+/g, "") }];
  return [{ type: trimmed, value: "" }];
}

// 사용자 locale 우선의 CardLocale 선택. 없으면 EN > JP > KR 순.
export function pickLocale<T extends { language: string; region: string }>(
  locales: T[],
  preferred: "en" | "ja" | "ko"
): T | null {
  if (locales.length === 0) return null;
  const lang = locales.find((l) => l.language === preferred);
  if (lang) return lang;
  // 폴백: region 우선순위
  const sorted = [...locales].sort(
    (a, b) => (REGION_ORDER[a.region] ?? 9) - (REGION_ORDER[b.region] ?? 9)
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
  set: { name: string; nameKo: string | null; nameJa: string | null };
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
  };
}

function toLogicalCardMeta(lc: {
  id: string;
  setGroupId: string | null;
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
  attacksKo: Prisma.JsonValue;
  abilitiesKo: Prisma.JsonValue;
  rulesKo: string[];
  flavorTextKo: string | null;
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
}): LogicalCardMeta {
  return {
    id: lc.id,
    setGroupId: lc.setGroupId,
    primarySetId: lc.primarySetId,
    primaryNumber: lc.primaryNumber,
    primaryNumberInt: lc.primaryNumberInt,
    pokedexNumbers: lc.pokedexNumbers,
    supertype: lc.supertype,
    subtypes: lc.subtypes,
    types: lc.types,
    hp: lc.hp,
    retreatCost: lc.retreatCost,
    weakness: lc.weakness,
    resistance: lc.resistance,
    regulationMark: lc.regulationMark,
    illustrator: lc.illustrator,
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
    rarityTier: lc.rarity?.tier ?? null,
    rarityCategoryCode: lc.rarity?.category?.code ?? null,
    rarityCategoryNameKo: lc.rarity?.category?.nameKo ?? null,
    rarityCategoryNameJa: lc.rarity?.category?.nameJa ?? null,
    rarityCategoryNameEn: lc.rarity?.category?.nameEn ?? null,
    rarityCategoryTier: lc.rarity?.category?.tier ?? null,
    nameKo: lc.nameKo,
    attacksKo: lc.attacksKo,
    abilitiesKo: lc.abilitiesKo,
    rulesKo: lc.rulesKo,
    flavorTextKo: lc.flavorTextKo,
  };
}

// ── 쿼리 ──────────────────────────────────────────────────────────────────────

/**
 * CardLocale.id 로 시작해 LogicalCard + 같은 LogicalCard 의 모든 locale 을 조회.
 * URL `/cards/{cardId}` 진입점.
 */
export async function loadCardByLocaleId(localeId: string): Promise<{
  locale: LocaleSummary;
  logicalCard: LogicalCardMeta;
  allLocales: LocaleSummary[];
} | null> {
  const cl = await prisma.cardLocale.findUnique({
    where: { id: localeId },
    include: {
      set: { select: { name: true, nameKo: true, nameJa: true } },
      logicalCard: {
        include: {
          rarity: {
            select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } },
          },
          locales: {
            include: {
              set: { select: { name: true, nameKo: true, nameJa: true } },
            },
          },
        },
      },
    },
  });
  if (!cl) return null;

  const allLocales = cl.logicalCard.locales
    .map(toLocaleSummary)
    .sort(
      (a, b) => (REGION_ORDER[a.region] ?? 9) - (REGION_ORDER[b.region] ?? 9)
    );

  return {
    locale: toLocaleSummary(cl),
    logicalCard: toLogicalCardMeta(cl.logicalCard),
    allLocales,
  };
}

/** LogicalCard.id 로 시작 — 메타 + 모든 locale */
export async function loadCardByLogicalId(logicalId: string): Promise<{
  logicalCard: LogicalCardMeta;
  locales: LocaleSummary[];
} | null> {
  const lc = await prisma.logicalCard.findUnique({
    where: { id: logicalId },
    include: {
      rarity: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } } },
      locales: {
        include: { set: { select: { name: true, nameKo: true, nameJa: true } } },
      },
    },
  });
  if (!lc) return null;
  const locales = lc.locales
    .map(toLocaleSummary)
    .sort(
      (a, b) => (REGION_ORDER[a.region] ?? 9) - (REGION_ORDER[b.region] ?? 9)
    );
  return { logicalCard: toLogicalCardMeta(lc), locales };
}

/** SetGroup id 로 그룹 내 전 CardLocale 조회(LogicalCard 메타 포함) */
export async function loadCardsByGroup(setGroupId: string): Promise<
  {
    logicalCardId: string;
    locales: LocaleSummary[];
  }[]
> {
  const lcs = await prisma.logicalCard.findMany({
    where: { setGroupId },
    include: {
      locales: {
        include: { set: { select: { name: true, nameKo: true, nameJa: true } } },
      },
    },
  });
  return lcs.map((lc) => ({
    logicalCardId: lc.id,
    locales: lc.locales
      .map(toLocaleSummary)
      .sort(
        (a, b) =>
          (REGION_ORDER[a.region] ?? 9) - (REGION_ORDER[b.region] ?? 9)
      ),
  }));
}

export type LogicalCardSearchFilters = {
  q?: string;
  supertype?: string;
  type?: string;
  rarityCode?: string;
  setGroupId?: string;
  limit?: number;
};

/**
 * LogicalCard 메타 + 모든 locale 조인 검색. dedupe 는 LogicalCard 단위로 보장.
 * 결과의 cardId(URL용) = 선택된 locale.id.
 */
export async function searchLogicalCards(
  filters: LogicalCardSearchFilters
): Promise<
  {
    logicalCard: LogicalCardMeta;
    locales: LocaleSummary[];
  }[]
> {
  const q = (filters.q ?? "").trim();
  const where: Prisma.LogicalCardWhereInput = {};
  if (filters.supertype) where.supertype = filters.supertype;
  if (filters.type) where.types = { has: filters.type };
  if (filters.rarityCode) where.rarity = { code: filters.rarityCode };
  if (filters.setGroupId) where.setGroupId = filters.setGroupId;
  if (q) {
    where.locales = {
      some: { name: { contains: q, mode: "insensitive" } },
    };
  }

  const lcs = await prisma.logicalCard.findMany({
    where,
    include: {
      rarity: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } } },
      locales: {
        include: { set: { select: { name: true, nameKo: true, nameJa: true } } },
      },
    },
    take: Math.min(filters.limit ?? 100, 200),
  });

  return lcs.map((lc) => ({
    logicalCard: toLogicalCardMeta(lc),
    locales: lc.locales
      .map(toLocaleSummary)
      .sort(
        (a, b) =>
          (REGION_ORDER[a.region] ?? 9) - (REGION_ORDER[b.region] ?? 9)
      ),
  }));
}

/**
 * LogicalCard + 선택된 locale → 기존 TCGCard 형태로 변환.
 * 기존 컴포넌트들이 TCGCard 를 받으므로 호환 유지.
 */
export function logicalCardToTCG(
  lc: LogicalCardMeta,
  primary: LocaleSummary
): TCGCard {
  // 지역별 rarity 표기: 사용자 region 우선, 없으면 EN, 없으면 code.
  const rarityLabel =
    primary.region === "JP"
      ? lc.rarityNameJa ?? lc.rarityNameEn ?? lc.rarityCode ?? undefined
      : primary.region === "KR"
        ? lc.rarityNameKo ?? lc.rarityNameEn ?? lc.rarityCode ?? undefined
        : lc.rarityNameEn ?? lc.rarityCode ?? undefined;

  const legalitiesObj = asObject(lc.legalities);

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
    regulationMark: lc.regulationMark ?? undefined,
    rules: lc.rules.length > 0 ? lc.rules : undefined,
  };
}
