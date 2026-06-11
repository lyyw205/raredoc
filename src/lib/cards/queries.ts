// Phase 3 어댑터 — 새 ERD(Card + RegionCard + Rarity + PriceSource)를
// 기반으로 페이지가 호출하는 공통 쿼리·변환 헬퍼.
//
// 기존 prisma.card / prisma.cardGroup 의존 코드와 공존(Phase 4 에서 제거).
// 모든 새 쿼리는 Card/RegionCard/Rarity/PriceSource 만 참조한다.

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TCGCard } from "@/lib/api/pokemontcg";
import { pickRarityLabel } from "./card-fields";

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
} | null> {
  const cl = await prisma.regionCard.findUnique({
    where: { id: localeId },
    include: {
      set: { select: { name: true, nameKo: true, nameJa: true } },
      card: {
        include: {
          rarity: {
            select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } },
          },
          gameCard: { select: { supertype: true, hp: true } },
          texts: { where: { language: "ko" }, select: { name: true } },
          locales: {
            include: {
              set: { select: { name: true, nameKo: true, nameJa: true } },
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
      (a, b) => (REGION_ORDER[a.region] ?? 9) - (REGION_ORDER[b.region] ?? 9)
    );

  return {
    locale: toLocaleSummary(cl),
    card: toCardMeta(cl.card),
    allLocales,
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
};

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
  if (q) {
    where.locales = {
      some: { name: { contains: q, mode: "insensitive" } },
    };
  }

  const lcs = await prisma.card.findMany({
    where,
    include: {
      rarity: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } } },
      gameCard: { select: { supertype: true, hp: true } },
      texts: { where: { language: "ko" }, select: { name: true } },
      locales: {
        include: { set: { select: { name: true, nameKo: true, nameJa: true } }, rarity: { select: { code: true, nameKo: true, nameJa: true, nameEn: true } } },
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
          (REGION_ORDER[a.region] ?? 9) - (REGION_ORDER[b.region] ?? 9)
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
