import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { CARDS } from "@/lib/cardgame/mock";
import { REAL_TO_MOCK } from "@/lib/cardgame/mockToReal";
import { toKrw } from "@/lib/trades/shared";
import { USE_GAMECARD_RESOLVER } from "@/lib/cards/flags";
import { getCandidatePool } from "@/lib/cards/build-candidate-pool";
import { resolveRecipeCard } from "@/lib/cards/decklist-gamecard-resolver";

/**
 * Phase 5 — 카드게임 메타 서비스 (DB 기반).
 *
 * 화면(메타/덱/대회/가이드/홈 추천메타)이 소비하는 직렬화 가능한 plain 객체를 반환한다.
 * 디자인/문구 유지를 위해 반환 형태는 기존 mock 타입과 최대한 동일하게 맞춘다.
 *
 * 카드 표시 데이터(nameKo/imageUrl/setNameKo/type/hp)는 `resolveDeckCard` 로 해석:
 *   1) DB Card (실제 pokemontcg) → 있으면 사용
 *   2) mock CARDS 폴백 (가상 카드 또는 DB 미적재 카드)
 * 어느 경우든 화면이 기존과 동일하게 보이도록 보장한다.
 */

// ── 표시용 카드 타입 (화면이 소비) ─────────────────────────────────────────────

export type ResolvedCard = {
  id: string;
  nameKo: string;
  imageUrl: string;
  setNameKo: string;
  /** 화면 타입 분류/링 색상용. mock 타입 문자열(grass/fire/...)로 정규화. */
  type: string;
  /** 포켓몬 여부 판정용 (hp>0 → 포켓몬). */
  hp: number;
};

// pokemontcg.io types(영문) → mock 타입 문자열(소문자) 정규화 맵.
const TYPE_MAP: Record<string, string> = {
  Grass: "grass",
  Fire: "fire",
  Water: "water",
  Lightning: "lightning",
  Psychic: "psychic",
  Fighting: "fighting",
  Darkness: "darkness",
  Metal: "metal",
  Dragon: "dragon",
  Colorless: "colorless",
  Fairy: "fairy",
};

function mockCardFor(cardId: string) {
  // DeckCard.cardId 는 실제 id 또는 mock id. mock 폴백은 양쪽 키를 시도.
  return CARDS[cardId] ?? CARDS[REAL_TO_MOCK[cardId] ?? ""] ?? null;
}

/**
 * DeckCard.cardId 를 표시용 카드 데이터로 해석한다. (DB → mock 폴백)
 * @param cardId  DeckCard.cardId (실제 pokemontcg id 또는 mock id)
 * @param dbCard  사전 조회된 DB Card (없으면 mock 폴백)
 */
export function resolveDeckCard(
  cardId: string,
  dbCard?: {
    id: string;
    nameKo: string | null;
    name: string;
    imageSmall: string | null;
    imageLarge: string | null;
    types: string[];
    hp: number | null;
    setId: string;
    supertype: string | null;
  } | null
): ResolvedCard {
  const mock = mockCardFor(cardId);
  if (dbCard) {
    const dbType = dbCard.types[0] ? TYPE_MAP[dbCard.types[0]] ?? mock?.type ?? "colorless" : mock?.type ?? "colorless";
    // hp: DB hp 우선, 없으면 supertype 으로 포켓몬 판정(트레이너/에너지는 0).
    const hp =
      dbCard.hp ??
      (dbCard.supertype && dbCard.supertype !== "Pokémon" ? 0 : mock?.hp ?? 0);
    return {
      id: cardId,
      nameKo: dbCard.nameKo ?? mock?.nameKo ?? dbCard.name,
      imageUrl: dbCard.imageLarge ?? dbCard.imageSmall ?? mock?.imageUrl ?? "",
      setNameKo: mock?.setNameKo ?? dbCard.setId,
      type: dbType,
      hp,
    };
  }
  // DB 미적재 → mock 폴백
  return {
    id: cardId,
    nameKo: mock?.nameKo ?? cardId,
    imageUrl: mock?.imageUrl ?? "",
    setNameKo: mock?.setNameKo ?? "",
    type: mock?.type ?? "colorless",
    hp: mock?.hp ?? 0,
  };
}

/** 주어진 cardId 집합에 대한 표시용 카드 맵을 만든다 (DB 일괄 조회 + mock 폴백). */
export async function resolveDeckCardMap(cardIds: string[]): Promise<Record<string, ResolvedCard>> {
  const unique = Array.from(new Set(cardIds));
  // Phase 4: prisma.card → prisma.regionCard (read). 메타(types/hp/supertype)는 Card 가 보유.
  // RegionCard 행이 자체 locale 의 표시명 보유 → resolveDeckCard 입력 호환 위해 nameKo 슬롯에 name 그대로 사용.
  const dbLocales = unique.length
    ? await prisma.regionCard.findMany({
        where: { id: { in: unique } },
        select: {
          id: true,
          name: true,
          imageSmall: true,
          imageLarge: true,
          setId: true,
          card: {
            select: {
              types: true,
              hp: true,
              supertype: true,
              gameCard: { select: { hp: true, supertype: true } },
            },
          },
        },
      })
    : [];
  const byId = new Map(
    dbLocales.map((l) => [
      l.id,
      {
        id: l.id,
        nameKo: l.name,
        name: l.name,
        imageSmall: l.imageSmall,
        imageLarge: l.imageLarge,
        types: l.card.types,
        hp: l.card.gameCard?.hp ?? l.card.hp,
        setId: l.setId,
        supertype: l.card.gameCard?.supertype ?? l.card.supertype,
      },
    ])
  );
  const map: Record<string, ResolvedCard> = {};
  for (const id of unique) {
    map[id] = resolveDeckCard(id, byId.get(id) ?? null);
  }
  return map;
}

// ── 아키타입(덱) ───────────────────────────────────────────────────────────────

export type ArchetypeSummary = {
  id: string;
  nameKo: string;
  /** Limitless deck.name 원문 (한글명 폴백/표시용). */
  nameEn: string | null;
  tier: string;
  regulation: string;
  usageRate: number;
  winCount: number;
  avgRank: number;
  /** 승률 (record 집계). 실데이터 전용. */
  winRate: number;
  /** 입상률 (Top컷 진출 / 참가). */
  conversion: number;
  /** 안정성 (placing 분산 기반). */
  consistency: number;
  /** 집계 표본 수 (신뢰도 표시용). 0 이면 목업. */
  sampleSize: number;
  /** 사용률↓ + 승률↑ (#9). */
  isUnderdog: boolean;
  /** 사용률↑ + 승률→ (#10). */
  isTrap: boolean;
  /** 상위덱 종합 우세 (#14). */
  isMetaCounter: boolean;
  /** Limitless 아이콘 키 (히어로 카드 식별 — 현재 CDN 미사용). */
  iconKeys: string[];
  /** 덱 구축 비용 캐시(저레어 기준, KRW) — update-deck-costs 배치 갱신. null=견적 전 (UI-1b). */
  deckCostBudget: number | null;
  /** 덱 구축 비용 캐시(고레어 기준, KRW). */
  deckCostPremium: number | null;
  /** @deprecated DeckCard/DeckVariant 테이블 드롭(2026-06-11)으로 **현재 항상 빈 배열**.
   *  카드매칭 복원 시 `toSummary()` 한 곳만 채우면 전 계약이 살아난다. 소비처는 빈 배열 가드 필수. */
  heroCardIds: string[];
  /** @deprecated heroCardIds 와 동일 — 현재 항상 빈 배열(복원 시 toSummary 에서 채움). */
  cardList: { cardId: string; count: number; role: string | null }[];
  strengths: string[];
  weaknesses: string[];
  counters: string[];
  description: string;
  /** @deprecated 현재 항상 빈 배열(복원 시 toSummary 에서 채움). */
  variants: { id: string; nameKo: string }[];
};

/** @deprecated `cards` 소스(cardList/heroCardIds)가 현재 항상 비어 `cards` 도 항상 `{}`.
 *  복원 전까지 소비처는 `ArchetypeSummary` 로 충분(`getArchetype` 는 결선 보존 위해 유지). */
export type ArchetypeWithCards = ArchetypeSummary & {
  /** cardList/heroCard 에 등장하는 모든 cardId 의 표시용 해석 맵. 현재 항상 `{}`. */
  cards: Record<string, ResolvedCard>;
};

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };

type DbArchetype = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  tier: string;
  regulation: string;
  usageRate: number;
  winCount: number;
  avgRank: number;
  winRate: number;
  conversion: number;
  consistency: number;
  sampleSize: number;
  isUnderdog: boolean;
  isTrap: boolean;
  isMetaCounter: boolean;
  iconKeys: string[];
  deckCostBudget: number | null;
  deckCostPremium: number | null;
  description: string;
  strengths: string[];
  weaknesses: string[];
  counters: string[];
};

function toSummary(a: DbArchetype): ArchetypeSummary {
  return {
    id: a.id,
    nameKo: a.nameKo,
    nameEn: a.nameEn,
    tier: a.tier,
    regulation: a.regulation,
    usageRate: a.usageRate,
    winCount: a.winCount,
    avgRank: a.avgRank,
    winRate: a.winRate,
    conversion: a.conversion,
    consistency: a.consistency,
    sampleSize: a.sampleSize,
    isUnderdog: a.isUnderdog,
    isTrap: a.isTrap,
    isMetaCounter: a.isMetaCounter,
    iconKeys: a.iconKeys,
    deckCostBudget: a.deckCostBudget,
    deckCostPremium: a.deckCostPremium,
    // DeckCard/DeckVariant 테이블 드롭(2026-06-11 DB정리) — 항상 빈 배열(폴백은 화면에서).
    heroCardIds: [],
    cardList: [],
    strengths: a.strengths,
    weaknesses: a.weaknesses,
    counters: a.counters,
    description: a.description,
    variants: [],
  };
}

export async function getArchetypes(opts?: {
  sort?: "usage" | "wins" | "new" | "winRate" | "conversion" | "consistency";
  tier?: string;
  regulation?: string;
  /** true 면 sampleSize>0 실데이터만 (메타/덱뷰). 미지정 시 전체(목업 포함). */
  realOnly?: boolean;
}): Promise<ArchetypeSummary[]> {
  const where: { tier?: string; regulation?: string; sampleSize?: { gt: number } } = {};
  if (opts?.tier && opts.tier !== "all") where.tier = opts.tier;
  if (opts?.regulation && opts.regulation !== "all") where.regulation = opts.regulation;
  if (opts?.realOnly) where.sampleSize = { gt: 0 };

  const rows = await prisma.deckArchetype.findMany({ where });
  const list = rows.map(toSummary);

  const sort = opts?.sort ?? "usage";
  list.sort((a, b) => {
    switch (sort) {
      case "wins":
        return b.winCount - a.winCount;
      case "winRate":
        return b.winRate - a.winRate;
      case "conversion":
        return b.conversion - a.conversion;
      case "consistency":
        return b.consistency - a.consistency;
      case "new":
        return a.id.localeCompare(b.id);
      case "usage":
      default:
        return b.usageRate - a.usageRate;
    }
  });
  return list;
}

// ── region 메타 (JP/KR 탭 — multisource P3) ──────────────────────────────────
// 본체 DeckArchetype 집계 컬럼은 INTL 미러 의미 고정 → JP/KR 은 ArchetypeRegionStat 조인.
// realOnly 판별도 RegionStat.sampleSize 기준 (본체 sampleSize 는 INTL 표본이라 JP/KR-only 덱이 빠짐).

export type RegionArchetypeRow = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  iconKeys: string[];
  /** sampleSize<30 이면 "—" (소표본 가드) */
  tier: string;
  /** ⚠ 분모 주의: JP/KR 은 게재된 입상권(top cut) 기준 점유율 — INTL(전 참가자)과 다름 */
  usageRate: number;
  winCount: number;
  avgRank: number;
  conversion: number;
  sampleSize: number;
  tournamentCount: number;
};

export async function getRegionArchetypes(region: "JP" | "KR"): Promise<RegionArchetypeRow[]> {
  const rows = await prisma.archetypeRegionStat.findMany({
    where: { region, sampleSize: { gt: 0 } },
    include: { archetype: { select: { nameKo: true, nameEn: true, iconKeys: true } } },
    orderBy: { usageRate: "desc" },
  });
  return rows.map((r) => ({
    id: r.archetypeId,
    nameKo: r.archetype.nameKo,
    nameEn: r.archetype.nameEn,
    iconKeys: r.archetype.iconKeys,
    tier: r.tier,
    usageRate: r.usageRate,
    winCount: r.winCount,
    avgRank: r.avgRank,
    conversion: r.conversion,
    sampleSize: r.sampleSize,
    tournamentCount: r.tournamentCount,
  }));
}

export async function getArchetype(id: string): Promise<ArchetypeWithCards | null> {
  const row = await prisma.deckArchetype.findUnique({ where: { id } });
  if (!row) return null;
  const summary = toSummary(row);
  const cards = await resolveDeckCardMap([...summary.cardList.map((c) => c.cardId), ...summary.heroCardIds]);
  return { ...summary, cards };
}

/** 홈 추천메타용: 티어순(S→A→B→C) 상위 n개 + 표시용 카드 맵. 실데이터(sampleSize>0)만. */
export async function getRecommendedDecks(n = 4): Promise<{
  decks: ArchetypeSummary[];
  cards: Record<string, ResolvedCard>;
}> {
  const rows = await prisma.deckArchetype.findMany({
    where: { sampleSize: { gt: 0 } },
  });
  const list = rows.map(toSummary).sort((a, b) => {
    const t = (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9);
    return t !== 0 ? t : b.usageRate - a.usageRate;
  });
  const decks = list.slice(0, n);
  const cards = await resolveDeckCardMap(decks.flatMap((d) => [...d.cardList.map((c) => c.cardId), ...d.heroCardIds]));
  return { decks, cards };
}

export type ReprCard = { name: string; image: string | null; regionCardId: string | null };
export type RecommendedDeck = ArchetypeSummary & {
  /** 배너 배경용 대표(hero) 카드 대형 일러스트 (JP). 미해석 시 null. */
  heroImage: string | null;
  /** 대표 카드 (hero 우선 → 코어 → 사용량). 이미지·한글명·상세링크 id. */
  cards: ReprCard[];
};

/** 아키타입 id[] → 대표 카드 N장 + 배경 히어로 이미지 (추천 메타·최근 1위 덱 배너 공용).
 *  대표 카드 우선순위: hero(iconKeys 매칭) → 포켓몬>트레이너>에너지 → core → 사용량,
 *  재판(같은 cardName)은 1장으로 합쳐 서로 다른 N장 노출. 이미지·링크=JP 일본판, 표시명=KR 한국판 우선.
 *  heroImage = 첫 해석 카드의 대형 일러스트(JP). iconKeysById 는 hero 판정용(호출부가 보유한 값 재사용). */
async function buildArchetypeReprCards(
  ids: string[],
  iconKeysById: Map<string, string[]>,
  cardsPerDeck: number,
): Promise<Map<string, { cards: ReprCard[]; heroImage: string | null }>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();

  // INTL 레시피 일괄 조회 (region 필터: 본체=INTL 의미 고정)
  const recipeRows = await prisma.deckRecipeCard.findMany({
    where: { archetypeId: { in: uniqueIds }, region: "INTL" },
  });
  const byArch = new Map<string, typeof recipeRows>();
  for (const r of recipeRows) {
    const arr = byArch.get(r.archetypeId) ?? [];
    arr.push(r);
    byArch.set(r.archetypeId, arr);
  }

  const CAT_ORDER: Record<string, number> = { pokemon: 0, trainer: 1, energy: 2 };
  const topByArch = new Map<string, typeof recipeRows>();
  for (const id of uniqueIds) {
    const icons = (iconKeysById.get(id) ?? []).map((k) => k.toLowerCase());
    const isHero = (n: string) => {
      const x = n.toLowerCase();
      return icons.some((ic) => x.includes(ic));
    };
    const sorted = [...(byArch.get(id) ?? [])].sort((a, b) => {
      const ah = isHero(a.cardName), bh = isHero(b.cardName);
      if (ah !== bh) return ah ? -1 : 1;
      const ca = CAT_ORDER[a.category] ?? 9, cb = CAT_ORDER[b.category] ?? 9;
      if (ca !== cb) return ca - cb;
      if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
      return b.adoptionRate * b.avgCount - a.adoptionRate * a.avgCount || b.adoptionRate - a.adoptionRate;
    });
    const seen = new Set<string>();
    const distinct = sorted.filter((r) => {
      const k = normalizeRecipeCardName(r.cardName); // 레시피와 동일 통합 키(인쇄판/재판 변형 흡수)
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    topByArch.set(id, distinct.slice(0, cardsPerDeck));
  }

  const allCardIds = [...topByArch.values()].flat().map((r) => r.cardId).filter((v): v is string => !!v);
  // regionCard 1회 조회 → 같은 행 셋에서 JP우선(이미지·링크)·KR우선(이름) 두 픽을 파생 (DB 라운드트립 1회)
  const byLc = await fetchLocaleRowsByCard(allCardIds);
  const imageMap = new Map<string, ResolvedImage>(); // JP 일러스트·상세 링크
  const nameMap = new Map<string, ResolvedImage>(); // KR 우선 이름 (기본 우선순위)
  for (const [lcId, arr] of byLc) {
    imageMap.set(lcId, pickResolvedImage(arr, REGION_PRIORITY_JP));
    nameMap.set(lcId, pickResolvedImage(arr, REGION_PRIORITY));
  }

  const out = new Map<string, { cards: ReprCard[]; heroImage: string | null }>();
  for (const id of uniqueIds) {
    const rows = topByArch.get(id) ?? [];
    const cards = rows.map((r) => {
      const img = r.cardId ? imageMap.get(r.cardId) : undefined;
      const nm = r.cardId ? nameMap.get(r.cardId) : undefined;
      return {
        name: nm?.name ?? r.cardName, // KR 인쇄판명 우선, 폴백 레시피 영문명
        image: img?.image ?? null, // JP 일러스트
        regionCardId: img?.regionCardId ?? null, // JP 카드 상세 링크
      };
    });
    // 배경 히어로 = 첫 해석된 카드의 대형 이미지(JP)
    let heroImage: string | null = null;
    for (const r of rows) {
      const img = r.cardId ? imageMap.get(r.cardId) : undefined;
      if (img?.imageLarge) {
        heroImage = img.imageLarge;
        break;
      }
    }
    out.set(id, { cards, heroImage });
  }
  return out;
}

/** 추천 메타 탭 — 티어순 상위 덱 + 각 덱의 대표 카드 N장(레시피 hero-first) + 배경 히어로 이미지. */
export async function getRecommendedDecksWithCards(
  deckCount = 12,
  cardsPerDeck = 8,
): Promise<RecommendedDeck[]> {
  const rows = await prisma.deckArchetype.findMany({ where: { sampleSize: { gt: 0 } } });
  const decks = rows
    .map(toSummary)
    .sort((a, b) => {
      const t = (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9);
      return t !== 0 ? t : b.usageRate - a.usageRate;
    })
    .slice(0, deckCount);
  if (decks.length === 0) return [];

  const iconKeysById = new Map(decks.map((d) => [d.id, d.iconKeys]));
  const enrich = await buildArchetypeReprCards(decks.map((d) => d.id), iconKeysById, cardsPerDeck);

  return decks.map((d) => {
    const e = enrich.get(d.id);
    return { ...d, heroImage: e?.heroImage ?? null, cards: e?.cards ?? [] };
  });
}

/** 메타 페이지 사용률 추이 차트용. 실데이터(sampleSize>0)만. */
export async function getArchetypeTrends(): Promise<{
  weeks: string[];
  series: { archetypeId: string; nameKo: string; points: Record<string, number> }[];
}> {
  const rows = await prisma.deckArchetype.findMany({
    where: { sampleSize: { gt: 0 } },
    // region 필터: 본체 화면은 INTL 의미 고정 — JP/KR 트렌드 행 적재 시 혼합 방지 (multisource P0)
    include: { trends: { where: { region: "INTL" }, select: { week: true, usage: true } } },
  });
  const weekSet = new Set<string>();
  for (const a of rows) for (const t of a.trends) weekSet.add(t.week);
  const weeks = Array.from(weekSet);

  const series = rows
    .filter((a) => a.trends.length > 0)
    .map((a) => ({
      archetypeId: a.id,
      nameKo: a.nameKo,
      points: Object.fromEntries(a.trends.map((t) => [t.week, t.usage])),
    }));
  return { weeks, series };
}

// ── 메타 집중도 / 급상승 / 상성 / 레시피 (실데이터 전용) ──────────────────────

export type ArchetypeMatchup = {
  opponentId: string;
  opponentNameKo: string;
  /** 이 덱(deckId) 기준 승률 (%). */
  winRate: number;
  games: number;
  /** games < 5 면 신뢰도 낮음. */
  lowSample: boolean;
};

/** #13 상성: 주어진 덱의 DeckMatchup 양방향 조회 → 이 덱 기준 승률 리스트(승률 내림차순). */
export async function getArchetypeMatchups(deckId: string): Promise<ArchetypeMatchup[]> {
  const rows = await prisma.deckMatchup.findMany({
    where: { OR: [{ deckAId: deckId }, { deckBId: deckId }] },
  });
  if (rows.length === 0) return [];

  // 이 덱 기준으로 정규화 (B쪽이면 winRate/wins 반전).
  const normalized = rows.map((m) => {
    const isA = m.deckAId === deckId;
    const opponentId = isA ? m.deckBId : m.deckAId;
    const winRate = isA ? m.winRateA : 100 - m.winRateA;
    return { opponentId, winRate, games: m.games };
  });

  // 상대 한글명 환산.
  const oppIds = Array.from(new Set(normalized.map((n) => n.opponentId)));
  const opps = await prisma.deckArchetype.findMany({
    where: { id: { in: oppIds } },
    select: { id: true, nameKo: true, nameEn: true },
  });
  const nameById = new Map(opps.map((o) => [o.id, o.nameKo || o.nameEn || o.id]));

  return normalized
    .map((n) => ({
      opponentId: n.opponentId,
      opponentNameKo: nameById.get(n.opponentId) ?? n.opponentId,
      winRate: Math.round(n.winRate * 10) / 10,
      games: n.games,
      lowSample: n.games < 5,
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

export type RecipeCategory = "pokemon" | "trainer" | "energy";

/** 코어/플렉스 분류 (통합 채용률 기준). core=거의 모두 채용·고정, flex=갈리는 선택, minor=노이즈(접기). */
export type RecipeSlotTier = "core" | "flex" | "minor";

/** 한 플레이 카드의 인쇄판(버전) — 버전 목록·시세 힌트용. */
export type RecipePrinting = {
  /** 카드 상세(/cards/[id]) 링크용 locale id. */
  regionCardId: string | null;
  /** 이 인쇄판 썸네일 — 버전 나열용. */
  image: string | null;
  setCode: string | null;
  number: string | null;
  /** 이 인쇄판 단독 채용률(%). */
  adoptionRate: number;
};

/** 통합 레시피 슬롯 = 한 플레이 카드(성능 같은 인쇄판·재판 통합 — deck-recipe-variants-plan §3). */
export type RecipeSlot = {
  cardName: string;
  category: RecipeCategory;
  /** 통합 장수 — 채용 리스트 기준 전체 인쇄판 매수 합산 평균(1자리 반올림). 폴백 경로는 최다 채용 인쇄판 평균. */
  count: number;
  /** 통합 채용률(인쇄판 합산 근사, %). */
  adoptionRate: number;
  /** archetype.iconKeys 매칭 핵심 포켓몬. */
  isHero: boolean;
  tier: RecipeSlotTier;
  /** 대표(최다 채용) 인쇄판 썸네일. */
  cardImage: string | null;
  /** 대표 인쇄판 카드 상세 링크. */
  regionCardId: string | null;
  /** 인쇄판 수(≥2면 "N버전" 배지). */
  printingCount: number;
  /** 인쇄판 목록(채용률 내림차순). */
  printings: RecipePrinting[];
  /** 인쇄판 통합 단가(KRW) 범위 — 💰 시세 힌트. 저가판~고가판. 시세 없으면 null. */
  priceMin: number | null;
  priceMax: number | null;
};

/** 지역 표시 우선순위 (KR>JP>EN) — 카드 카탈로그 dedupe·이미지 해석 공용 단일출처. */
const REGION_PRIORITY: Record<string, number> = { KR: 0, JP: 1, EN: 2 };

/** JP 우선 (JP>KR>EN) — 추천 메타 대표 카드 등 일본판 일러스트를 우선 노출할 때. */
const REGION_PRIORITY_JP: Record<string, number> = { JP: 0, KR: 1, EN: 2 };

type ResolvedImage = { image: string | null; imageLarge: string | null; regionCardId: string; name: string };
type LocaleRow = { id: string; cardId: string; region: string; name: string; imageSmall: string | null; imageLarge: string | null };

/** cardId[] → cardId별 locale 행 묶음 (regionCard 1회 조회). 같은 id 셋을 여러 우선순위로 풀 때 DB 라운드트립 1회로 공유. */
async function fetchLocaleRowsByCard(ids: string[]): Promise<Map<string, LocaleRow[]>> {
  const byLc = new Map<string, LocaleRow[]>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return byLc;
  const locales = await prisma.regionCard.findMany({
    where: { cardId: { in: unique } },
    select: { id: true, cardId: true, region: true, name: true, imageSmall: true, imageLarge: true },
  });
  for (const l of locales) {
    const arr = byLc.get(l.cardId) ?? [];
    arr.push(l);
    byLc.set(l.cardId, arr);
  }
  return byLc;
}

/** 한 cardId 의 locale 행들 중 대표 1장 선택 — 이미지 보유 우선 → 같은 조건이면 regionPriority 순. */
function pickResolvedImage(arr: LocaleRow[], regionPriority: Record<string, number>): ResolvedImage {
  const best = [...arr].sort((a, b) => {
    // 이미지 보유 우선(0) → 미보유(1). (?? 가 ?: 보다 우선 — 괄호로 명시)
    const ai = (a.imageSmall ?? a.imageLarge) ? 0 : 1;
    const bi = (b.imageSmall ?? b.imageLarge) ? 0 : 1;
    return ai - bi || (regionPriority[a.region] ?? 9) - (regionPriority[b.region] ?? 9);
  })[0];
  return {
    image: best.imageSmall ?? best.imageLarge ?? null,
    imageLarge: best.imageLarge ?? best.imageSmall ?? null,
    regionCardId: best.id,
    name: best.name,
  };
}

/** cardId[] → 대표 locale 이미지/대형이미지/id/이름 — 레시피·리스트 뷰어 공용 (UI-1a).
 *  regionPriority 로 지역 우선순위 지정(기본 KR>JP>EN). imageLarge=대형(배경 히어로용), name=선택 인쇄판 고유명. 소비처 무시 가능(하위호환). */
async function resolveCardImages(
  ids: string[],
  regionPriority: Record<string, number> = REGION_PRIORITY,
): Promise<Map<string, ResolvedImage>> {
  const byLc = await fetchLocaleRowsByCard(ids);
  const map = new Map<string, ResolvedImage>();
  for (const [lcId, arr] of byLc) map.set(lcId, pickResolvedImage(arr, regionPriority));
  return map;
}

export type ArchetypeRecipe = {
  /** 코어 스켈레톤(거의 모든 덱 채용·고정) — 카테고리별. */
  core: Record<RecipeCategory, RecipeSlot[]>;
  /** 플렉스 슬롯(유저마다 갈리는 선택) — 카테고리별. */
  flex: Record<RecipeCategory, RecipeSlot[]>;
  /** 마이너(<12%) 접힌 슬롯 — 노이즈. */
  minor: RecipeSlot[];
};

/** 코어/플렉스 분류 임계값(통합 채용률 %) — 튜닝 단일출처(deck-recipe-variants-plan §6 P1). */
const CORE_MIN_ADOPTION = 80; // ≥80% = 코어(고정)
const FLEX_MIN_ADOPTION = 12; // 12~80% = 플렉스 슬롯, 미만 = 마이너(접기)

/** 레시피 통합 키 — 덱리스트 소스명 기준(인쇄판/재판 무관, gameCardId 미병합 버그 우회).
 *  발음기호 제거(Poké↔Poke) + 소스 주석 태그 제거(" - Basic"/" - ACESPEC")로 명칭 변형 흡수.
 *  예: "Fire Energy"≡"Fire Energy - Basic", "Poké Pad"≡"Poke Pad", "Unfair Stamp"≡"Unfair Stamp - ACESPEC". */
function normalizeRecipeCardName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // 발음기호(악센트) 제거
    .toLowerCase()
    .replace(/\s*-\s*(basic|ace ?spec)$/i, "") // 덱리스트 소스 주석 태그 제거
    .replace(/\s+/g, " ")
    .trim();
}

/** 표시용 카드명 — 소스 주석 태그(" - Basic"/" - ACESPEC")만 제거(악센트는 보존: "Poké Pad"). */
function displayRecipeCardName(name: string): string {
  return name.replace(/\s*-\s*(basic|ace ?spec)$/i, "").trim();
}

/** category 문자열 런타임 검증(DB는 자유 문자열) — 미지값은 pokemon 폴백(빈 버킷 인덱싱 크래시 방지). */
function toRecipeCategory(v: string | null | undefined): RecipeCategory {
  return v === "trainer" || v === "energy" ? v : "pokemon";
}

// 슬롯 💰 시세 힌트용 — deck-pricing 과 동일 소스/우선순위/환산(JP 매장가 우선).
const RECIPE_PRICE_SOURCES = ["yuyu_tei_sell", "tcgplayer", "cardmarket"] as const;
const RECIPE_SOURCE_PRIORITY: Record<string, number> = { yuyu_tei_sell: 0, tcgplayer: 1, cardmarket: 2 };

/** logicalCardId[] → 카드별 대표 단가(KRW). (locale,source) 최신 1행 → 카드별 최우선 소스가.
 *  condition null·amount 단일값 — deck-pricing.computeDeckCost 와 동일 규약. */
async function fetchCardUnitKrw(cardIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = [...new Set(cardIds.filter(Boolean))];
  if (ids.length === 0) return out;
  const sources = await prisma.priceSource.findMany({
    where: { code: { in: [...RECIPE_PRICE_SOURCES] } },
    select: { id: true, code: true },
  });
  if (sources.length === 0) return out;
  const sourceCode = new Map(sources.map((s) => [s.id, s.code]));
  const rows = await prisma.price.findMany({
    where: { sourceId: { in: sources.map((s) => s.id) }, condition: null, regionCard: { cardId: { in: ids } } },
    select: {
      sourceId: true,
      currency: true,
      amount: true,
      regionCardId: true,
      recordedAt: true,
      regionCard: { select: { cardId: true } },
    },
    orderBy: { recordedAt: "desc" },
  });
  const seen = new Set<string>(); // (locale,source) 최신 1행
  const best = new Map<string, { krw: number; src: string }>();
  for (const p of rows) {
    const key = `${p.regionCardId}|${p.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = p.amount;
    if (raw == null || raw <= 0) continue;
    const code = sourceCode.get(p.sourceId!) ?? "?";
    const cardId = p.regionCard.cardId;
    const cur = best.get(cardId);
    if (!cur || (RECIPE_SOURCE_PRIORITY[code] ?? 9) < (RECIPE_SOURCE_PRIORITY[cur.src] ?? 9)) {
      best.set(cardId, { krw: Math.round(toKrw(raw, p.currency)), src: code });
    }
  }
  for (const [cardId, v] of best) out.set(cardId, v.krw);
  return out;
}

// aggregate-meta INTL 윈도우 길이와 동일(14일). 단, 분모(deckCount)는 의도적으로 다름 — getArchetypeRecipe 참조.
const INTL_RECIPE_WINDOW_DAYS = 14;

/** 인쇄판 집계(정확/폴백 공용 중간형). */
type PrintingAgg = { cardId: string | null; setCode: string | null; number: string | null; adoptionRate: number };
/** 플레이 카드 집계(통합) 중간형 — 두 경로가 공통 산출. */
type CardAgg = {
  name: string; // 대표(최다채용) 인쇄판 원문명
  category: RecipeCategory;
  adoptionRate: number; // 통합 채용률(%)
  count: number; // 채용 리스트 기준 평균 매수
  printings: PrintingAgg[]; // 채용률 내림차순
};

/** CardAgg[] → 이미지·시세 해석 + 코어/플렉스/마이너 분류 → ArchetypeRecipe. 정확/폴백 경로 공용 마무리. */
async function finalizeRecipe(
  cardAggs: CardAgg[],
  isHeroCard: (name: string) => boolean,
): Promise<ArchetypeRecipe> {
  const allCardIds = cardAggs.flatMap((c) => c.printings.map((p) => p.cardId)).filter((v): v is string => !!v);
  const [imageMap, unitKrwByCard] = await Promise.all([
    resolveCardImages(allCardIds),
    fetchCardUnitKrw(allCardIds),
  ]);

  const slots: RecipeSlot[] = cardAggs.map((c) => {
    const prints = c.printings; // 채용률 내림차순(호출부 보장)
    // 대표 썸네일/링크 = 이미지 보유한 최다 채용 인쇄판
    let cardImage: string | null = null;
    let regionCardId: string | null = null;
    for (const p of prints) {
      const img = p.cardId ? imageMap.get(p.cardId) : undefined;
      if (!regionCardId && img) regionCardId = img.regionCardId;
      if (img?.image) {
        cardImage = img.image;
        regionCardId = img.regionCardId;
        break;
      }
    }
    const printings: RecipePrinting[] = prints.map((p) => {
      const img = p.cardId ? imageMap.get(p.cardId) : undefined;
      return {
        regionCardId: img?.regionCardId ?? null,
        image: img?.image ?? null,
        setCode: p.setCode,
        number: p.number,
        adoptionRate: p.adoptionRate,
      };
    });
    // 💰 단가 범위 = 인쇄판 단가들의 저가~고가
    const krws = prints.map((p) => (p.cardId ? unitKrwByCard.get(p.cardId) : undefined)).filter((v): v is number => v != null);
    let priceMin = krws.length ? Math.min(...krws) : null;
    let priceMax = krws.length ? Math.max(...krws) : null;
    // 기본 에너지 — 장당 고정 추정(특수 일러 고가판이 슬롯 시세를 왜곡하지 않게, deck-pricing 동일 가드).
    const isBasicEnergy =
      c.category === "energy" &&
      /^(basic )?(grass|fire|water|lightning|psychic|fighting|darkness|metal) energy$/.test(normalizeRecipeCardName(c.name));
    if (isBasicEnergy || (priceMin == null && c.category === "energy")) {
      priceMin = 200;
      priceMax = 200;
    }
    const tier: RecipeSlotTier =
      c.adoptionRate >= CORE_MIN_ADOPTION ? "core" : c.adoptionRate >= FLEX_MIN_ADOPTION ? "flex" : "minor";
    return {
      cardName: displayRecipeCardName(c.name),
      category: c.category,
      count: c.count,
      adoptionRate: c.adoptionRate,
      isHero: isHeroCard(c.name),
      tier,
      cardImage,
      regionCardId,
      printingCount: prints.length,
      printings,
      priceMin,
      priceMax,
    };
  });

  // 카테고리 내 정렬: 핵심 먼저 → 통합 채용률 → 장수
  const sortSlots = (a: RecipeSlot, b: RecipeSlot) =>
    (a.isHero === b.isHero ? 0 : a.isHero ? -1 : 1) || b.adoptionRate - a.adoptionRate || b.count - a.count;
  const emptyByCat = (): Record<RecipeCategory, RecipeSlot[]> => ({ pokemon: [], trainer: [], energy: [] });
  const core = emptyByCat();
  const flex = emptyByCat();
  const minor: RecipeSlot[] = [];
  for (const s of slots) {
    if (s.tier === "core") core[s.category].push(s);
    else if (s.tier === "flex") flex[s.category].push(s);
    else minor.push(s);
  }
  (["pokemon", "trainer", "energy"] as RecipeCategory[]).forEach((cat) => {
    core[cat].sort(sortSlots);
    flex[cat].sort(sortSlots);
  });
  minor.sort(sortSlots);
  return { core, flex, minor };
}

/** 표준 레시피: "플레이 카드" 단위 통합(인쇄판/재판 합침) + 코어/플렉스/마이너.
 *  통합 채용률은 윈도우(14일·INTL) 원본 덱리스트에서 정확 재집계(같은 리스트의 여러 인쇄판은 1회만 카운트).
 *  분모 deckCount = 윈도우 내 deckKey standings 중 **덱리스트 보유분만**(null 제외). ★aggregate-meta 는 분모에 null 포함(lists.length)
 *  → 채용률이 의도적으로 다름(관측 가능한 덱만으로 정직하게 산출). 윈도우/덱리스트 비면 DeckRecipeCard 합산 근사로 폴백.
 *  (set,number)→cardId 는 DeckRecipeCard resolver 재사용. */
export async function getArchetypeRecipe(deckId: string): Promise<ArchetypeRecipe> {
  const since = new Date(Date.now() - INTL_RECIPE_WINDOW_DAYS * 86_400_000);
  const [arch, rows, standings] = await Promise.all([
    prisma.deckArchetype.findUnique({ where: { id: deckId }, select: { iconKeys: true } }),
    // (setCode|number)→cardId 매핑 + 폴백 소스. region=INTL 의미 고정 (multisource P0)
    prisma.deckRecipeCard.findMany({ where: { archetypeId: deckId, region: "INTL" } }),
    // 정확 재집계 소스 — aggregate-meta 와 동일 윈도우/필터로 fetch(분모는 후단에서 덱리스트 보유분만으로 축소)
    prisma.tournamentStanding.findMany({
      where: { deckKey: deckId, tournament: { date: { gte: since }, source: { not: null }, metaRegion: "INTL" } },
      select: { decklist: true },
    }),
  ]);
  const iconKeys = (arch?.iconKeys ?? []).map((k) => k.toLowerCase());
  const isHeroCard = (name: string): boolean => {
    const n = name.toLowerCase();
    return iconKeys.some((ic) => n.includes(ic));
  };

  // (setCode|number) → cardId : DeckRecipeCard resolver 결과 재사용(이미지/시세 링크 해석)
  const printKey = (set: string | null, num: string | null) => `${set ?? ""}|${num ?? ""}`;
  const cardIdByPrint = new Map<string, string>();
  // cardKey → DeckRecipeCard 인쇄판들(집계 전체) — "다른 버전" 표시는 윈도우보다 넓은 이 목록 사용
  const recipeRowsByCard = new Map<string, typeof rows>();

  // flag ON: DeckRecipeCard 행마다 resolveRecipeCard()로 gameCardId 기준 cardKey 생성
  // flag OFF: 현행 normalizeRecipeCardName 문자열 키 그대로
  let resolverPool: Awaited<ReturnType<typeof getCandidatePool>> | null = null;
  if (USE_GAMECARD_RESOLVER) {
    resolverPool = await getCandidatePool();
  }

  /** DeckRecipeCard 행 → cardKey 결정 (flag ON: gameCardId 우선, OFF/미해결: normalizedName 폴백) */
  const toCardKey = (r: { cardId: string | null; setCode: string | null; number: string | null; cardName: string; category: string }): string => {
    const cat = toRecipeCategory(r.category);
    if (resolverPool) {
      const res = resolveRecipeCard(
        { cardId: r.cardId, setCode: r.setCode ?? "", number: r.number ?? "", cardName: r.cardName },
        resolverPool.poolById,
        resolverPool.snIdx,
      );
      if (res.status === "resolved") return `${cat}|gc:${res.gameCardId}`;
    }
    return `${cat}|${normalizeRecipeCardName(r.cardName)}`;
  };

  for (const r of rows) {
    if (r.cardId) cardIdByPrint.set(printKey(r.setCode, r.number), r.cardId);
    const key = toCardKey(r);
    const arr = recipeRowsByCard.get(key) ?? [];
    arr.push(r);
    recipeRowsByCard.set(key, arr);
  }

  // 분모 = 관측 가능한 덱(덱리스트 보유 standing)만. 덱리스트 없는 standing 은 카드 구성을 알 수 없어 제외
  // (그래야 "거의 모든 덱이 채용"이 ~100% 로 정직하게 나옴 — 미수집 standing 으로 일률 희석 방지).
  const decklisted = standings.filter((s) => s.decklist != null);
  const deckCount = decklisted.length;
  let cardAggs: CardAgg[] = [];

  // ── 정확 재집계: 윈도우 원본 덱리스트 ──
  if (deckCount > 0) {
    type PStat = { name: string; setCode: string | null; number: string | null; decks: number };
    type CStat = { name: string; category: RecipeCategory; decks: number; copySum: number; prints: Map<string, PStat> };
    const byCard = new Map<string, CStat>();
    const cats: [keyof RawDecklist, RecipeCategory][] = [
      ["pokemon", "pokemon"],
      ["trainer", "trainer"],
      ["energy", "energy"],
    ];
    for (const s of decklisted) {
      const dl = s.decklist as RawDecklist | null;
      if (!dl) continue;
      const seenCard = new Set<string>();
      const seenPrint = new Set<string>();
      for (const [field, category] of cats) {
        for (const e of dl[field] ?? []) {
          const name = e.name ?? "";
          if (!name) continue;
          // flag ON: resolveRecipeCard 로 gameCardId 기준 cardKey 생성(미해결 시 normalizedName 폴백)
          // flag OFF: 현행 normalizeRecipeCardName 문자열 키 그대로
          let cardKey: string;
          if (resolverPool) {
            const res = resolveRecipeCard(
              { cardId: null, setCode: e.set ?? "", number: e.number ?? "", cardName: name },
              resolverPool.poolById,
              resolverPool.snIdx,
            );
            cardKey = res.status === "resolved"
              ? `${category}|gc:${res.gameCardId}`
              : `${category}|${normalizeRecipeCardName(name)}`;
          } else {
            cardKey = `${category}|${normalizeRecipeCardName(name)}`;
          }
          const pKey = `${cardKey}|${printKey(e.set ?? null, e.number ?? null)}`;
          let cs = byCard.get(cardKey);
          if (!cs) {
            cs = { name, category, decks: 0, copySum: 0, prints: new Map() };
            byCard.set(cardKey, cs);
          }
          let ps = cs.prints.get(pKey);
          if (!ps) {
            ps = { name, setCode: e.set ?? null, number: e.number ?? null, decks: 0 };
            cs.prints.set(pKey, ps);
          }
          cs.copySum += e.count ?? 0;
          if (!seenPrint.has(pKey)) { ps.decks++; seenPrint.add(pKey); }
          if (!seenCard.has(cardKey)) { cs.decks++; seenCard.add(cardKey); } // 통합: 리스트당 1회
        }
      }
    }
    cardAggs = [...byCard.entries()].map(([cardKey, cs]) => {
      const winPrints = [...cs.prints.values()].sort((a, b) => b.decks - a.decks);
      const top = winPrints[0];
      // 표시 인쇄판 = 윈도우 ∪ DeckRecipeCard 집계(더 풍부한 버전 목록). setCode|number 로 dedupe.
      const printMap = new Map<string, PrintingAgg>();
      for (const p of winPrints) {
        const k = printKey(p.setCode, p.number);
        printMap.set(k, {
          cardId: cardIdByPrint.get(k) ?? null,
          setCode: p.setCode,
          number: p.number,
          adoptionRate: Math.round((p.decks / deckCount) * 1000) / 10,
        });
      }
      for (const r of recipeRowsByCard.get(cardKey) ?? []) {
        printMap.set(printKey(r.setCode, r.number), {
          cardId: r.cardId,
          setCode: r.setCode,
          number: r.number,
          adoptionRate: Math.round(r.adoptionRate * 10) / 10,
        });
      }
      return {
        name: top.name,
        category: cs.category,
        adoptionRate: Math.round((cs.decks / deckCount) * 1000) / 10,
        count: Math.round((cs.copySum / cs.decks) * 10) / 10, // 채용 리스트 기준 평균 매수
        printings: [...printMap.values()].sort((a, b) => b.adoptionRate - a.adoptionRate),
      };
    });
  }

  // ── 폴백: 윈도우 standings/덱리스트가 비면 DeckRecipeCard 합산 근사 ──
  if (cardAggs.length === 0) {
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      // flag ON: toCardKey(resolveRecipeCard 우선) / flag OFF: 현행 normalizedName 키
      const key = toCardKey(r);
      const g = groups.get(key);
      if (g) g.push(r);
      else groups.set(key, [r]);
    }
    cardAggs = [...groups.values()].map((g) => {
      const ps = [...g].sort((a, b) => b.adoptionRate - a.adoptionRate);
      const top = ps[0];
      return {
        name: top.cardName,
        category: toRecipeCategory(top.category),
        adoptionRate: Math.round(Math.min(100, ps.reduce((s, r) => s + r.adoptionRate, 0)) * 10) / 10,
        count: Math.round(top.avgCount * 10) / 10,
        printings: ps.map((r) => ({
          cardId: r.cardId,
          setCode: r.setCode,
          number: r.number,
          adoptionRate: Math.round(r.adoptionRate * 10) / 10,
        })),
      };
    });
  }

  return finalizeRecipe(cardAggs, isHeroCard);
}

// ── 카드 채용률 (카드 탭 정렬·뱃지용) ────────────────────────────────────────

export type CardAdoption = {
  /** 이 카드가 등장하는 아키타입 수. */
  deckCount: number;
  /** 평균 채용률 (등장 아키타입들의 adoptionRate 평균, %). */
  adoptionRate: number;
  /** 사용량 점수 Σ(adoptionRate × avgCount). 정렬 키. */
  usageScore: number;
};

/**
 * 작업2: 카드(cardId)별 메타 채용 지표.
 *
 * DeckRecipeCard 에서 cardId NOT NULL 인 행을 cardId별 집계.
 * - deckCount: 등장 아키타입 수
 * - adoptionRate: 평균 채용률
 * - usageScore: Σ(adoptionRate × avgCount)
 *
 * ★게임 dedup(P3): 재수록 카드가 여러 cardId 로 쪼개져 채용률이 분산되던 것을
 *   gameCardId(게임상 같은 카드) 로 통합 집계 후, 그 gameCard 의 모든 인쇄본(LC) 키로 펼침.
 *   gameCardId 없는 카드(빈-LC 등)는 cardId 자기 키로 무회귀.
 *   반환 Map 은 여전히 cardId 키 — 소비처(loadCards) 무변경.
 */
export async function getCardAdoption(): Promise<Map<string, CardAdoption>> {
  const rows = await prisma.deckRecipeCard.findMany({
    // region 필터: INTL 한정 — region 행 분리 시 deckCount/usageScore 이중계상 방지 (multisource P0)
    where: { cardId: { not: null }, region: "INTL" },
    select: { cardId: true, archetypeId: true, adoptionRate: true, avgCount: true },
  });
  if (rows.length === 0) return new Map();

  // cardId → gameCardId (게임상 같은 카드 = 덱 4장 단위)
  const lcIds = [...new Set(rows.map((r) => r.cardId!))];
  const lcRows = await prisma.card.findMany({ where: { id: { in: lcIds } }, select: { id: true, gameCardId: true } });
  const lcToGc = new Map(lcRows.map((l) => [l.id, l.gameCardId]));

  // 키 = gameCardId ?? cardId 로 집계(dedup)
  type Acc = { archs: Set<string>; rateSum: number; rowCount: number; usageScore: number };
  const acc = new Map<string, Acc>();
  for (const r of rows) {
    const key = lcToGc.get(r.cardId!) ?? r.cardId!;
    let a = acc.get(key);
    if (!a) { a = { archs: new Set(), rateSum: 0, rowCount: 0, usageScore: 0 }; acc.set(key, a); }
    a.archs.add(r.archetypeId);
    a.rateSum += r.adoptionRate;
    a.rowCount++;
    a.usageScore += r.adoptionRate * r.avgCount;
  }
  const perKey = new Map<string, CardAdoption>();
  for (const [key, a] of acc) {
    perKey.set(key, {
      deckCount: a.archs.size, // 등장 아키타입 수(중복 인쇄본 이중계상 방지)
      adoptionRate: Math.round((a.rateSum / a.rowCount) * 10) / 10,
      usageScore: Math.round(a.usageScore * 10) / 10,
    });
  }

  // cardId 키로 펼침 — 메타 gameCard 의 *모든* 인쇄본 LC 가 통합 채용률을 받게 함
  const gcKeys = [...acc.keys()].filter((k) => k.startsWith("gc_"));
  const allLcOfGc = gcKeys.length
    ? await prisma.card.findMany({ where: { gameCardId: { in: gcKeys } }, select: { id: true, gameCardId: true } })
    : [];
  const out = new Map<string, CardAdoption>();
  for (const lc of allLcOfGc) { const v = perKey.get(lc.gameCardId!); if (v) out.set(lc.id, v); }
  for (const [key, v] of perKey) if (!key.startsWith("gc_")) out.set(key, v); // gameCardId 없는 카드
  return out;
}

// ── 카드 카탈로그 (cardgame /cards 그리드) ──────────────────────────────────────

/** DB → 카드 일람 그리드 표시용 뷰모델. cards/page.tsx 가 소비. */
export type CatalogCard = {
  id: string;             // = RegionCard.id (URL용)
  cardId: string;         // dedupe용
  name: string;           // locale 이름 (KR 우선)
  nameSub: string | null; // 보조 이름 (다른 로케일)
  imageUrl: string;
  rarity: string | null;  // rarity.code
  region: string;
  type: string | null;    // card.types[0]
  hp: number | null;
  /** 메타 채용 지표 (cardId 매칭 시에만). 없으면 null → 뱃지 미표시. */
  adoption: CardAdoption | null;
};

/**
 * 카드 일람 카탈로그 — 필터/정렬 적용 후 KR>JP>EN dedupe 상위 200장 + 채용 지표.
 * (구 cards/page.tsx 의 loadCards 를 서비스로 승격: 데이터 접근·뷰모델 구성을 단일 출입구로.
 *  채용맵은 내부 getCardAdoption() 자급.)
 */
export async function getCardCatalog(params: {
  q?: string;
  type?: string;
  rarity?: string;
  region?: string;
  sort?: string;
}): Promise<{ cards: CatalogCard[]; adoptionActive: boolean }> {
  const adoptionMap = await getCardAdoption();

  const where: Prisma.RegionCardWhereInput = {};
  if (params.region && params.region !== "all") where.region = params.region;
  // rarity → RegionCard 직접(P4a, diff=0).
  if (params.rarity && params.rarity !== "all") where.rarity = { code: params.rarity };

  const lcWhere: Prisma.CardWhereInput = {};
  if (params.type && params.type !== "all") lcWhere.types = { has: params.type };
  if (Object.keys(lcWhere).length > 0) where.card = lcWhere;

  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { card: { illustrator: { contains: q, mode: "insensitive" } } },
    ];
  }

  // DB 조회 — 메타 조인. 정렬은 후처리(set.releaseDate, locale.numberInt).
  const rows = await prisma.regionCard.findMany({
    where,
    include: {
      rarity: { select: { code: true } }, // P4a: RegionCard 직접(diff=0), LC 폴백.
      card: {
        include: {
          rarity: { select: { code: true } }, // 전환기 폴백용
          gameCard: { select: { hp: true } }, // hp 그룹균일(diff=0)
          texts: { where: { language: "ko" }, select: { name: true } },
        },
      },
      set: { select: { releaseDate: true } },
    },
    take: 600, // dedupe 전 여유 — Card 단위로 200 확보 위함.
  });

  // dedupe: 같은 Card 의 여러 locale → KR>JP>EN 우선 1개.
  const byLogical = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const cur = byLogical.get(r.cardId);
    if (!cur) { byLogical.set(r.cardId, r); continue; }
    if ((REGION_PRIORITY[r.region] ?? 9) < (REGION_PRIORITY[cur.region] ?? 9)) byLogical.set(r.cardId, r);
  }
  const deduped = [...byLogical.values()];

  // 보조 이름(nameSub)용 — 같은 card 의 다른 locale.
  const allByLogical = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = allByLogical.get(r.cardId) ?? [];
    arr.push(r);
    allByLogical.set(r.cardId, arr);
  }

  // 채용률 정렬은 채용 지표가 있을 때만 활성. 없으면 발매일순 폴백.
  const adoptionActive = params.sort === "adoption" && adoptionMap.size > 0;
  if (adoptionActive) {
    deduped.sort((a, b) => {
      const sa = adoptionMap.get(a.cardId)?.usageScore ?? -1;
      const sb = adoptionMap.get(b.cardId)?.usageScore ?? -1;
      if (sa !== sb) return sb - sa;
      const da = a.set?.releaseDate?.getTime?.() ?? 0;
      const db = b.set?.releaseDate?.getTime?.() ?? 0;
      return db - da;
    });
  } else {
    deduped.sort((a, b) => {
      const da = a.set?.releaseDate?.getTime?.() ?? 0;
      const db = b.set?.releaseDate?.getTime?.() ?? 0;
      if (da !== db) return db - da;
      return (a.numberInt ?? 0) - (b.numberInt ?? 0);
    });
  }

  const cards = deduped.slice(0, 200).map((r) => {
    const others = allByLogical.get(r.cardId) ?? [];
    const sub = others.find((o) => o.id !== r.id);
    const nameKo = r.card.texts?.[0]?.name ?? r.card.nameKo; // P8a: CardText(ko) 우선
    return {
      id: r.id,
      cardId: r.cardId,
      name: nameKo ?? r.name,
      nameSub: nameKo ? r.name : (sub?.name ?? null),
      imageUrl: r.imageSmall ?? r.imageLarge ?? "",
      rarity: r.rarity?.code ?? r.card.rarity?.code ?? null,
      region: r.region,
      type: r.card.types[0] ?? null, // ArtCard over-merge 보류 → LC 직독
      hp: r.card.gameCard?.hp ?? r.card.hp,
      adoption: adoptionMap.get(r.cardId) ?? null,
    };
  });

  return { cards, adoptionActive };
}

export type RisingDeck = {
  id: string;
  nameKo: string;
  usageRate: number;
  /** 주간 사용률 델타 (%포인트). 추이 데이터 부족 시 0. */
  delta: number;
};

/**
 * #4/#23 급상승/급하락: ArchetypeTrend 의 최근 2개 주차 비교로 사용률 델타 산출.
 * 실데이터 추이는 현재 단일 ISO week 만 존재 → 비교 불가하면 usageRate 상위로 폴백(delta=0).
 */
export async function getRisingDecks(n = 5): Promise<{ rising: RisingDeck[]; falling: RisingDeck[]; hasTrend: boolean }> {
  const rows = await prisma.deckArchetype.findMany({
    where: { sampleSize: { gt: 0 } },
    select: {
      id: true,
      nameKo: true,
      nameEn: true,
      usageRate: true,
      // region 필터: INTL 의미 고정 (multisource P0)
      trends: { where: { region: "INTL" }, select: { week: true, usage: true } },
    },
  });

  // 실데이터에 등장하는 주차들(ISO week 형식만, 2개 이상)을 모은다.
  const weekSet = new Set<string>();
  for (const a of rows) for (const t of a.trends) weekSet.add(t.week);
  const weeks = Array.from(weekSet).sort();
  const hasTrend = weeks.length >= 2;

  if (hasTrend) {
    const last = weeks[weeks.length - 1];
    const prev = weeks[weeks.length - 2];
    const withDelta = rows
      .map((a) => {
        const lastU = a.trends.find((t) => t.week === last)?.usage ?? 0;
        const prevU = a.trends.find((t) => t.week === prev)?.usage ?? 0;
        return {
          id: a.id,
          nameKo: a.nameKo || a.nameEn || a.id,
          usageRate: a.usageRate,
          delta: Math.round((lastU - prevU) * 10) / 10,
        };
      })
      .filter((d) => d.delta !== 0);
    const rising = [...withDelta].sort((a, b) => b.delta - a.delta).slice(0, n);
    const falling = [...withDelta].sort((a, b) => a.delta - b.delta).slice(0, n);
    return { rising, falling, hasTrend: true };
  }

  // 폴백: 추이 비교 불가 → 사용률 상위 n개를 "주목 덱"으로 노출(delta=0).
  const fallback = rows
    .map((a) => ({
      id: a.id,
      nameKo: a.nameKo || a.nameEn || a.id,
      usageRate: a.usageRate,
      delta: 0,
    }))
    .sort((a, b) => b.usageRate - a.usageRate)
    .slice(0, n);
  return { rising: fallback, falling: [], hasTrend: false };
}

// ── 대회 ───────────────────────────────────────────────────────────────────────

export type TournamentRow = {
  id: string;
  nameKo: string;
  /** 원문(영문) 대회명. */
  name: string | null;
  date: string;
  region: string;
  /** 집계 파티션 (INTL|JP|KR). */
  metaRegion: string;
  /** 대회 격: worlds|ic|regional|special|cl|league|city|online — 필터 탭용. */
  level: string | null;
  format: string;
  players: number;
  /** PTCGL/오프라인 등. */
  platform: string | null;
  /** 출처 링크. */
  externalUrl: string | null;
  winnerArchetypeId: string | null;
  winnerNameKo: string | null;
  status: string;
};

export async function getTournaments(opts?: {
  region?: string;
  status?: string;
  /** 집계 파티션 필터 (INTL|JP|KR) — region(참가자 최빈값)과 별개. */
  metaRegion?: string;
  /** true 면 정본 소스(source) 있는 실데이터만. 미지정 시 전체(목업 포함). */
  realOnly?: boolean;
}): Promise<TournamentRow[]> {
  const where: { region?: string; status?: string; metaRegion?: string; source?: { not: null } } = {};
  if (opts?.region && opts.region !== "all") where.region = opts.region;
  if (opts?.status && opts.status !== "all") where.status = opts.status;
  if (opts?.metaRegion) where.metaRegion = opts.metaRegion;
  // multisource P0: source 기준 (신규 소스도 실데이터로 인정)
  if (opts?.realOnly) where.source = { not: null };

  const rows = await prisma.tournament.findMany({ where, orderBy: { date: "desc" } });
  // 우승 덱 이름 환산
  const archIds = Array.from(
    new Set(rows.map((t) => t.winnerArchetypeId).filter((v): v is string => !!v))
  );
  const archs = archIds.length
    ? await prisma.deckArchetype.findMany({
        where: { id: { in: archIds } },
        select: { id: true, nameKo: true, nameEn: true },
      })
    : [];
  const nameById = new Map(archs.map((a) => [a.id, a.nameKo || a.nameEn || a.id]));

  return rows.map((t) => ({
    id: t.id,
    nameKo: t.nameKo,
    name: t.name,
    date: t.date.toISOString().slice(0, 10),
    region: t.region,
    metaRegion: t.metaRegion,
    level: t.level,
    format: t.format,
    players: t.players,
    platform: t.platform,
    externalUrl: t.externalUrl,
    winnerArchetypeId: t.winnerArchetypeId,
    winnerNameKo: t.winnerArchetypeId ? nameById.get(t.winnerArchetypeId) ?? null : null,
    status: t.status,
  }));
}

/** 대회 리스트(실데이터 전용): 정본 소스(source) 있는 Tournament + 1위 우승덱 한글명. */
export async function getRealTournaments(): Promise<TournamentRow[]> {
  return getTournaments({ realOnly: true });
}

// ── UI-2차: 상성 매트릭스 / 신선도 / 필수 카드 / 신팩 / 역링크 ──────────────────

export type MatchupMatrix = {
  decks: { id: string; nameKo: string; iconKeys: string[] }[];
  /** key = `${aId}|${bId}` (a 관점) — 양방향 키 모두 채움. */
  cells: Record<string, { winRate: number; games: number; wins: number; losses: number; ties: number }>;
};

/** 상위 N덱 상성 매트릭스 — "other"(잡주머니) 제외. 사전 SQL 게이트(2026-06-06) 96% games>=10. */
export async function getMatchupMatrix(topN = 8): Promise<MatchupMatrix> {
  const decks = await prisma.deckArchetype.findMany({
    where: { sampleSize: { gt: 0 }, id: { not: "other" } },
    orderBy: { usageRate: "desc" },
    take: topN,
    select: { id: true, nameKo: true, nameEn: true, iconKeys: true },
  });
  const ids = decks.map((d) => d.id);
  const rows = await prisma.deckMatchup.findMany({
    where: { deckAId: { in: ids }, deckBId: { in: ids } },
  });
  const cells: MatchupMatrix["cells"] = {};
  for (const m of rows) {
    const decisive = m.winsA + m.winsB;
    const rateA = decisive > 0 ? Math.round((m.winsA / decisive) * 100) : 0;
    cells[`${m.deckAId}|${m.deckBId}`] = { winRate: rateA, games: m.games, wins: m.winsA, losses: m.winsB, ties: m.ties };
    cells[`${m.deckBId}|${m.deckAId}`] = { winRate: decisive > 0 ? 100 - rateA : 0, games: m.games, wins: m.winsB, losses: m.winsA, ties: m.ties };
  }
  return {
    decks: decks.map((d) => ({ id: d.id, nameKo: d.nameKo || d.nameEn || d.id, iconKeys: d.iconKeys })),
    cells,
  };
}

export type MetaFreshness = {
  /** 마지막 대회 동기화 시각 (ISO) — "대회 데이터 기준" 한정어와 함께 표기(시세와 별개). */
  syncedAt: string | null;
  tournamentCount: number;
  standingCount: number;
  windowDays: number;
};

/** 메타 헤더 신선도 (region 패스의 윈도우와 동일 기준 — INTL 14d). */
export async function getMetaFreshness(region = "INTL", windowDays = 14): Promise<MetaFreshness> {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const where = { source: { not: null }, metaRegion: region, date: { gte: since } } as const;
  const [agg, tournamentCount, standingCount] = await Promise.all([
    prisma.tournament.aggregate({ where: { source: { not: null } }, _max: { syncedAt: true } }),
    prisma.tournament.count({ where }),
    prisma.tournamentStanding.count({ where: { deckKey: { not: null }, tournament: where } }),
  ]);
  return {
    syncedAt: agg._max.syncedAt?.toISOString() ?? null,
    tournamentCount,
    standingCount,
    windowDays,
  };
}

export type TopCard = {
  cardId: string;
  name: string;
  image: string | null;
  regionCardId: string | null;
  deckCount: number;
  avgAdoption: number;
};

/** #20 메타 필수 카드 — INTL 레시피에서 채용 아키타입 수 상위 (기본 에너지 제외). */
export async function getTopAdoptedCards(n = 10): Promise<TopCard[]> {
  const rows = await prisma.deckRecipeCard.findMany({
    where: { region: "INTL", cardId: { not: null }, category: { not: "energy" } },
    // flag ON: archetypeId 로 dedup(gameCardId 병합 시 같은 아키타입의 sibling 행이 decks 중복 계상 방지)
    select: { cardId: true, cardName: true, adoptionRate: true, archetypeId: true },
  });

  // flag ON: cardId → gameCardId 매핑 후 gameCardId 기준 dedup(재판 분산 해소)
  // flag OFF: 현행 cardId 키 집계 그대로
  let resolvedKey: (cardId: string) => string;
  if (USE_GAMECARD_RESOLVER) {
    const lcIds = [...new Set(rows.map((r) => r.cardId!))];
    const lcRows = await prisma.card.findMany({
      where: { id: { in: lcIds } },
      select: { id: true, gameCardId: true },
    });
    const lcToGc = new Map(lcRows.map((l) => [l.id, l.gameCardId]));
    resolvedKey = (cardId: string) => lcToGc.get(cardId) ?? cardId;
  } else {
    resolvedKey = (cardId: string) => cardId;
  }

  // flag ON: archetypeId Set 으로 dedup — gameCardId 병합 시 같은 아키타입의 sibling 행이
  //          decks 를 중복 계상해 avgAdoption 을 희석하는 문제 방지.
  // flag OFF: 현행 decks 카운터 그대로(바이트 동일).
  let top: [string, { name: string; decks: number; rateSum: number }][];
  if (USE_GAMECARD_RESOLVER) {
    const accGc = new Map<string, { name: string; archs: Set<string>; rateSum: number }>();
    for (const r of rows) {
      const key = resolvedKey(r.cardId!);
      const a = accGc.get(key) ?? { name: r.cardName, archs: new Set<string>(), rateSum: 0 };
      a.archs.add(r.archetypeId);
      a.rateSum += r.adoptionRate;
      accGc.set(key, a);
    }
    top = [...accGc.entries()]
      .map(([id, a]) => [id, { name: a.name, decks: a.archs.size, rateSum: a.rateSum }] as [string, { name: string; decks: number; rateSum: number }])
      .sort((x, y) => y[1].decks - x[1].decks || y[1].rateSum - x[1].rateSum)
      .slice(0, n);
  } else {
    const acc = new Map<string, { name: string; decks: number; rateSum: number }>();
    for (const r of rows) {
      const key = resolvedKey(r.cardId!);
      const a = acc.get(key) ?? { name: r.cardName, decks: 0, rateSum: 0 };
      a.decks++;
      a.rateSum += r.adoptionRate;
      acc.set(key, a);
    }
    top = [...acc.entries()]
      .sort((x, y) => y[1].decks - x[1].decks || y[1].rateSum - x[1].rateSum)
      .slice(0, n);
  }

  // 이미지 해석: flag ON 시 key가 gameCardId일 수 있음 → gc_ 키면 대표 LC id 조회
  let imageKeys: string[];
  if (USE_GAMECARD_RESOLVER) {
    const gcKeys = top.map(([id]) => id).filter((k) => k.startsWith("gc_"));
    const repMap = new Map<string, string>(); // gcId → 대표 cardId
    if (gcKeys.length > 0) {
      // artCardId===id인 카드를 대표로 우선, 없으면 첫 번째 행 폴백
      const artReps = await prisma.card.findMany({
        where: { gameCardId: { in: gcKeys } },
        select: { id: true, gameCardId: true, artCardId: true },
      });
      for (const c of artReps) {
        if (!c.gameCardId) continue;
        if (!repMap.has(c.gameCardId) || c.artCardId === c.id) {
          repMap.set(c.gameCardId, c.id);
        }
      }
    }
    imageKeys = top.map(([id]) => repMap.get(id) ?? id);
  } else {
    imageKeys = top.map(([id]) => id);
  }

  const imageMap = await resolveCardImages(imageKeys);
  return top.map(([id, a], i) => ({
    cardId: id,
    name: a.name,
    image: imageMap.get(imageKeys[i])?.image ?? null,
    regionCardId: imageMap.get(imageKeys[i])?.regionCardId ?? null,
    deckCount: a.decks,
    avgAdoption: Math.round((a.rateSum / a.decks) * 10) / 10,
  }));
}

export type DeckUsingCard = {
  archetypeId: string;
  nameKo: string;
  iconKeys: string[];
  adoptionRate: number;
  avgCount: number;
  usageRate: number;
};

/** 카드 상세 역링크 — 이 카드를 쓰는 덱 Top N (INTL 채용률순). */
export async function getDecksUsingCard(cardId: string, n = 5): Promise<DeckUsingCard[]> {
  // flag ON: cardId → gameCardId → 같은 게임카드의 모든 인쇄판(siblings)으로 확장 조회
  // flag OFF: 현행 단일 cardId WHERE 그대로
  let whereCardIds: string | { in: string[] };
  if (USE_GAMECARD_RESOLVER) {
    const lc = await prisma.card.findUnique({
      where: { id: cardId },
      select: { gameCardId: true },
    });
    const gcId = lc?.gameCardId;
    if (gcId) {
      const siblings = await prisma.card.findMany({
        where: { gameCardId: gcId },
        select: { id: true },
      });
      whereCardIds = { in: siblings.map((s) => s.id) };
    } else {
      // gameCardId 없음 → 현행 단일 cardId 폴백
      whereCardIds = cardId;
    }
  } else {
    whereCardIds = cardId;
  }

  const rows = await prisma.deckRecipeCard.findMany({
    where: { region: "INTL", cardId: whereCardIds },
    select: { archetypeId: true, adoptionRate: true, avgCount: true },
    orderBy: { adoptionRate: "desc" },
    take: n * 2, // 인쇄판별 행 중복 대비
  });
  if (rows.length === 0) return [];
  const byArch = new Map<string, { adoptionRate: number; avgCount: number }>();
  for (const r of rows) {
    const cur = byArch.get(r.archetypeId);
    if (!cur || r.adoptionRate > cur.adoptionRate) byArch.set(r.archetypeId, r);
  }
  const archs = await prisma.deckArchetype.findMany({
    where: { id: { in: [...byArch.keys()] }, sampleSize: { gt: 0 } },
    select: { id: true, nameKo: true, nameEn: true, iconKeys: true, usageRate: true },
  });
  return archs
    .map((a) => ({
      archetypeId: a.id,
      nameKo: a.nameKo || a.nameEn || a.id,
      iconKeys: a.iconKeys,
      adoptionRate: Math.round(byArch.get(a.id)!.adoptionRate * 10) / 10,
      avgCount: Math.round(byArch.get(a.id)!.avgCount * 10) / 10,
      usageRate: a.usageRate,
    }))
    .sort((x, y) => y.usageRate - x.usageRate)
    .slice(0, n);
}

export type NewSetMeta = {
  setName: string;
  releaseDate: string;
  decks: { archetypeId: string; nameKo: string; iconKeys: string[]; usageRate: number; newCards: number }[];
};

/** #25 신팩 메타덱 — 레시피에 등장하는 카드 기준 최신 EN 세트와 그 카드를 채용한 덱 Top N. */
export async function getNewSetDecks(n = 5): Promise<NewSetMeta | null> {
  const recipes = await prisma.deckRecipeCard.findMany({
    where: { region: "INTL", cardId: { not: null }, adoptionRate: { gte: 30 } },
    select: { archetypeId: true, cardId: true },
  });
  if (recipes.length === 0) return null;
  const lcIds = [...new Set(recipes.map((r) => r.cardId!))];
  const locales = await prisma.regionCard.findMany({
    where: { cardId: { in: lcIds }, region: "EN" },
    select: { cardId: true, set: { select: { id: true, name: true, releaseDate: true } } },
  });
  // 최신 세트 (releaseDate 보유) 선정
  let latest: { id: string; name: string; releaseDate: Date } | null = null;
  for (const l of locales) {
    const s = l.set;
    if (!s?.releaseDate) continue;
    if (!latest || s.releaseDate > latest.releaseDate) latest = { id: s.id, name: s.name, releaseDate: s.releaseDate };
  }
  if (!latest) return null;
  const latestId = latest.id;
  const newLcIds = new Set(locales.filter((l) => l.set?.id === latestId).map((l) => l.cardId));
  const byArch = new Map<string, number>();
  for (const r of recipes) {
    if (newLcIds.has(r.cardId!)) byArch.set(r.archetypeId, (byArch.get(r.archetypeId) ?? 0) + 1);
  }
  if (byArch.size === 0) return null;
  const archs = await prisma.deckArchetype.findMany({
    where: { id: { in: [...byArch.keys()] }, sampleSize: { gt: 0 } },
    select: { id: true, nameKo: true, nameEn: true, iconKeys: true, usageRate: true },
  });
  const decks = archs
    .map((a) => ({
      archetypeId: a.id,
      nameKo: a.nameKo || a.nameEn || a.id,
      iconKeys: a.iconKeys,
      usageRate: a.usageRate,
      newCards: byArch.get(a.id)!,
    }))
    .sort((x, y) => y.newCards - x.newCards || y.usageRate - x.usageRate)
    .slice(0, n);
  return { setName: latest.name, releaseDate: latest.releaseDate.toISOString().slice(0, 10), decks };
}

// ── 덱 입상 타임라인 + 리스트 뷰어 (UI-1a) ──────────────────────────────────────

export type ArchetypeResultRow = {
  standingId: string;
  placing: number;
  playerName: string;
  hasDecklist: boolean;
  deckCode: string | null;
  tournamentId: string;
  tournamentName: string;
  date: string;
  level: string | null;
  players: number;
};

/** 덱 상세 §최근 입상 리스트 — 이 아키타입의 최근 입상 행 (대회 컨텍스트 포함, 날짜 내림차순). */
export async function getArchetypeResults(deckId: string, limit = 12): Promise<ArchetypeResultRow[]> {
  const rows = await prisma.tournamentStanding.findMany({
    where: { deckKey: deckId, tournament: { source: { not: null } } },
    select: {
      id: true,
      placing: true,
      playerName: true,
      decklist: true,
      deckCode: true,
      tournament: { select: { id: true, nameKo: true, date: true, level: true, players: true } },
    },
    orderBy: [{ tournament: { date: "desc" } }, { placing: "asc" }],
    take: limit,
  });
  return rows.map((r) => ({
    standingId: r.id,
    placing: r.placing,
    playerName: r.playerName,
    hasDecklist: r.decklist != null,
    deckCode: r.deckCode,
    tournamentId: r.tournament.id,
    tournamentName: r.tournament.nameKo,
    date: r.tournament.date.toISOString().slice(0, 10),
    level: r.tournament.level,
    players: r.tournament.players,
  }));
}

export type DecklistViewCard = {
  name: string;
  count: number;
  image: string | null;
  regionCardId: string | null;
};

export type StandingDecklist = {
  standingId: string;
  placing: number;
  playerName: string;
  deckKey: string | null;
  deckNameKo: string | null;
  deckCode: string | null;
  tournament: { id: string; nameKo: string; date: string; players: number; externalUrl: string | null };
  buckets: { pokemon: DecklistViewCard[]; trainer: DecklistViewCard[]; energy: DecklistViewCard[] };
  totalCards: number;
  unresolved: number;
};

type RawDeckEntry = {
  name?: string;
  count?: number;
  cardId?: string | null;
  /** EN ptcgoCode 세트 코드 (Set.code) — cardId 미백필 데클리스트의 이미지 폴백 키. */
  set?: string | null;
  number?: string | null;
};
type RawDecklist = { pokemon?: RawDeckEntry[]; trainer?: RawDeckEntry[]; energy?: RawDeckEntry[] };

/** (EN 세트코드+번호) → 대표 이미지/regionCardId. cardId 미백필 데클리스트(최근 limitless-play 동기화분)의
 *  이미지 폴백 — resolveCardImages(cardId) 가 비는 카드만 보강. 미수집 EN 세트(MEG/ASC/CRI…)는 그대로 미해석. */
async function resolveImagesBySetNumber(
  pairs: { set: string; number: string }[],
): Promise<Map<string, { image: string | null; regionCardId: string }>> {
  const uniq = new Map<string, { set: string; number: string }>();
  for (const p of pairs) if (p.set && p.number) uniq.set(`${p.set}|${p.number}`, p);
  if (uniq.size === 0) return new Map();

  const setCodes = [...new Set([...uniq.values()].map((p) => p.set))];
  const numbers = [...new Set([...uniq.values()].map((p) => p.number))];
  const sets = await prisma.set.findMany({
    where: { region: "EN", code: { in: setCodes } },
    select: { id: true, code: true },
  });
  if (sets.length === 0) return new Map();
  const codeBySetId = new Map(sets.map((s) => [s.id, s.code as string]));

  const cards = await prisma.regionCard.findMany({
    where: { region: "EN", setId: { in: sets.map((s) => s.id) }, number: { in: numbers } },
    select: { id: true, setId: true, number: true, imageSmall: true, imageLarge: true },
  });
  const map = new Map<string, { image: string | null; regionCardId: string }>();
  for (const c of cards) {
    const code = codeBySetId.get(c.setId);
    if (!code) continue;
    const key = `${code}|${c.number}`;
    const image = c.imageSmall ?? c.imageLarge ?? null;
    const existing = map.get(key);
    // 이미지 보유 우선 (평행팩·서브셋 중복 시)
    if (!existing || (existing.image == null && image != null)) {
      map.set(key, { image, regionCardId: c.id });
    }
  }
  return map;
}

/** 데클리스트 엔트리 1건의 대표 이미지 — cardId 우선, 비면 (세트코드+번호) 폴백. 이미지 보유분 우선. */
function pickCardImage(
  c: RawDeckEntry,
  byCardId: Map<string, { image: string | null; regionCardId: string }>,
  bySetNumber: Map<string, { image: string | null; regionCardId: string }>,
): { image: string | null; regionCardId: string } | undefined {
  const byId = c.cardId ? byCardId.get(c.cardId) : undefined;
  const bySn = c.set && c.number ? bySetNumber.get(`${c.set}|${c.number}`) : undefined;
  if (byId?.image) return byId;
  if (bySn?.image) return bySn;
  return byId ?? bySn;
}

/** 리스트 뷰어 — standing 1건의 덱리스트를 카드 이미지로 해석 (docs/cardgame/cardgame-ui-plan.md §4-5). */
export async function getStandingDecklist(standingId: string): Promise<StandingDecklist | null> {
  const s = await prisma.tournamentStanding.findUnique({
    where: { id: standingId },
    select: {
      id: true,
      placing: true,
      playerName: true,
      deckKey: true,
      deckName: true,
      deckCode: true,
      decklist: true,
      tournament: { select: { id: true, nameKo: true, date: true, players: true, externalUrl: true } },
    },
  });
  if (!s || s.decklist == null) return null;
  const dl = s.decklist as RawDecklist;

  const lcIds: string[] = [];
  const snPairs: { set: string; number: string }[] = [];
  for (const b of ["pokemon", "trainer", "energy"] as const) {
    for (const c of dl[b] ?? []) {
      if (c?.cardId) lcIds.push(c.cardId);
      if (c?.set && c?.number) snPairs.push({ set: c.set, number: c.number });
    }
  }
  const [imageMap, snMap] = await Promise.all([
    resolveCardImages(lcIds),
    resolveImagesBySetNumber(snPairs), // cardId 미백필분 이미지 폴백
  ]);

  let totalCards = 0;
  let unresolved = 0;
  const toView = (entries: RawDeckEntry[] | undefined): DecklistViewCard[] =>
    (entries ?? []).map((c) => {
      const count = c.count ?? 0;
      totalCards += count;
      const resolved = pickCardImage(c, imageMap, snMap);
      if (!resolved?.image) unresolved += count;
      return {
        name: c.name ?? "?",
        count,
        image: resolved?.image ?? null,
        regionCardId: resolved?.regionCardId ?? null,
      };
    });

  // 덱 한글명 (deckKey → archetype.nameKo)
  let deckNameKo: string | null = s.deckName;
  if (s.deckKey) {
    const arch = await prisma.deckArchetype.findUnique({ where: { id: s.deckKey }, select: { nameKo: true } });
    deckNameKo = arch?.nameKo ?? s.deckName ?? s.deckKey;
  }

  return {
    standingId: s.id,
    placing: s.placing,
    playerName: s.playerName,
    deckKey: s.deckKey,
    deckNameKo,
    deckCode: s.deckCode,
    tournament: {
      id: s.tournament.id,
      nameKo: s.tournament.nameKo,
      date: s.tournament.date.toISOString().slice(0, 10),
      players: s.tournament.players,
      externalUrl: s.tournament.externalUrl,
    },
    buckets: {
      pokemon: toView(dl.pokemon),
      trainer: toView(dl.trainer),
      energy: toView(dl.energy),
    },
    totalCards,
    unresolved,
  };
}

export type WinnerDeck = {
  /** 리스트 뷰어(/lists/[id]) 링크용 standing id. */
  standingId: string;
  playerName: string;
  /** 아키타입 id (덱 상세 링크) — 미분류 입상은 null. */
  deckKey: string | null;
  /** 덱 한글명 (deckKey → archetype.nameKo, 폴백 deckName/deckKey). */
  deckNameKo: string | null;
  /** 아키타입 영문명 (배너 eyebrow). */
  nameEn: string | null;
  /** 공식 덱코드 (있으면 복사 버튼). */
  deckCode: string | null;
  /** 배너 배경용 대표(hero) 카드 대형 일러스트 (JP). 미해석/미분류 시 null. */
  heroImage: string | null;
  /** 우측 대표 카드 (아키타입 기준, 메타 통계와 동일). 미분류 시 빈 배열. */
  cards: ReprCard[];
  /** 덱 구축 견적(저레어, KRW) — null=견적 전. */
  deckCostBudget: number | null;
  /** 덱 구축 견적(고레어, KRW). */
  deckCostPremium: number | null;
  tournament: {
    id: string;
    nameKo: string;
    date: string;
    players: number;
    /** 대회 격 뱃지 (worlds|regional|cl|league|city|online…). */
    level: string | null;
    externalUrl: string | null;
  };
};

/** 최근 우승(placing=1) 덱리스트 — 정본 대회 최신순 N건, 카드 이미지·아키타입 메타 일괄 해석.
 *  덱 페이지 "최근 1위 덱" 탭용. 덱리스트 미보유 1위는 제외(JS 필터 — Json null 쿼리 회피 관행). */
export async function getRecentWinnerDecklists(n = 6): Promise<WinnerDeck[]> {
  const candidates = await prisma.tournamentStanding.findMany({
    where: { placing: 1, tournament: { source: { not: null } } },
    orderBy: { tournament: { date: "desc" } },
    take: Math.max(n * 4, 24), // 덱리스트 미보유 보정 버퍼
    select: {
      id: true,
      playerName: true,
      deckKey: true,
      deckName: true,
      deckCode: true,
      decklist: true,
      tournament: {
        select: { id: true, nameKo: true, date: true, players: true, level: true, externalUrl: true },
      },
    },
  });
  const winners = candidates.filter((s) => s.decklist != null).slice(0, n);
  if (winners.length === 0) return [];

  // 아키타입 메타(한글명·영문명·아이콘·견적) 1쿼리 일괄 조인
  const deckKeys = [...new Set(winners.map((w) => w.deckKey).filter((v): v is string => !!v))];
  const archs = deckKeys.length
    ? await prisma.deckArchetype.findMany({
        where: { id: { in: deckKeys } },
        select: { id: true, nameKo: true, nameEn: true, iconKeys: true, deckCostBudget: true, deckCostPremium: true },
      })
    : [];
  const archByKey = new Map(archs.map((a) => [a.id, a]));

  // 대표 카드·배경 히어로 (메타 통계 배너와 동일 레이아웃) — 우승 덱의 아키타입 기준
  const iconKeysById = new Map(archs.map((a) => [a.id, a.iconKeys]));
  const enrich = await buildArchetypeReprCards(deckKeys, iconKeysById, 8);

  return winners.map((w) => {
    const arch = w.deckKey ? archByKey.get(w.deckKey) : undefined;
    const e = w.deckKey ? enrich.get(w.deckKey) : undefined;
    return {
      standingId: w.id,
      playerName: w.playerName,
      deckKey: w.deckKey,
      deckNameKo: arch?.nameKo || arch?.nameEn || w.deckName || w.deckKey,
      nameEn: arch?.nameEn ?? null,
      deckCode: w.deckCode,
      heroImage: e?.heroImage ?? null,
      cards: e?.cards ?? [],
      deckCostBudget: arch?.deckCostBudget ?? null,
      deckCostPremium: arch?.deckCostPremium ?? null,
      tournament: {
        id: w.tournament.id,
        nameKo: w.tournament.nameKo,
        date: w.tournament.date.toISOString().slice(0, 10),
        players: w.tournament.players,
        level: w.tournament.level,
        externalUrl: w.tournament.externalUrl,
      },
    };
  });
}

export type StandingRow = {
  /** 리스트 뷰어 링크용 standing id. */
  standingId: string;
  /** 덱리스트 보유 여부 — [리스트 보기] 버튼 노출 조건. */
  hasDecklist: boolean;
  placing: number;
  playerName: string;
  country: string | null;
  deckKey: string | null;
  /** 덱 한글명 (deckKey → archetype.nameKo, 폴백 deckName/deckKey). */
  deckNameKo: string | null;
  /** Limitless 원문(영문) 덱명. */
  deckName: string | null;
  /** 공식 덱코드 (JP/KR — 복사해 공식 덱빌더 import). */
  deckCode: string | null;
  wins: number;
  losses: number;
  ties: number;
};

export type TournamentDetail = {
  id: string;
  nameKo: string;
  name: string | null;
  date: string;
  region: string;
  metaRegion: string;
  level: string | null;
  format: string;
  players: number;
  platform: string | null;
  externalUrl: string | null;
  source: string | null;
  standings: StandingRow[];
};

/** 대회 상세(실데이터): standings 순위표. deckKey → archetype 한글명 수동 조인. */
export async function getTournamentStandings(tournamentId: string): Promise<TournamentDetail | null> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { standings: { orderBy: { placing: "asc" } } },
  });
  if (!t) return null;

  // deckKey → 한글명 환산 (FK 없으므로 수동 조인).
  const deckKeys = Array.from(
    new Set(t.standings.map((s) => s.deckKey).filter((v): v is string => !!v))
  );
  const archs = deckKeys.length
    ? await prisma.deckArchetype.findMany({
        where: { id: { in: deckKeys } },
        select: { id: true, nameKo: true, nameEn: true },
      })
    : [];
  const nameByKey = new Map(archs.map((a) => [a.id, a.nameKo || a.nameEn || a.id]));

  return {
    id: t.id,
    nameKo: t.nameKo,
    name: t.name,
    date: t.date.toISOString().slice(0, 10),
    region: t.region,
    metaRegion: t.metaRegion,
    level: t.level,
    format: t.format,
    players: t.players,
    platform: t.platform,
    externalUrl: t.externalUrl,
    source: t.source,
    standings: t.standings.map((s) => ({
      standingId: s.id,
      hasDecklist: s.decklist != null,
      placing: s.placing,
      playerName: s.playerName,
      country: s.country,
      deckKey: s.deckKey,
      deckNameKo: s.deckKey ? nameByKey.get(s.deckKey) ?? s.deckName ?? s.deckKey : s.deckName,
      deckName: s.deckName,
      deckCode: s.deckCode,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
    })),
  };
}

// ── 플레이어 랭킹 ─────────────────────────────────────────────────────────────

export type PlayerRankingRow = {
  rank: number;
  name: string;
  csp: number;
  favArchetype: string;
  favArchetypeId: string | null;
  wins: number;
};

export async function getPlayerRankings(season = 2026): Promise<PlayerRankingRow[]> {
  const rows = await prisma.playerRanking.findMany({
    where: { season },
    orderBy: { rank: "asc" },
  });
  const archIds = Array.from(
    new Set(rows.map((p) => p.favArchetypeId).filter((v): v is string => !!v))
  );
  const archs = archIds.length
    ? await prisma.deckArchetype.findMany({
        where: { id: { in: archIds } },
        select: { id: true, nameKo: true },
      })
    : [];
  const nameById = new Map(archs.map((a) => [a.id, a.nameKo]));

  return rows.map((p) => ({
    rank: p.rank,
    name: p.name,
    csp: p.csp,
    favArchetype: p.favArchetypeId ? nameById.get(p.favArchetypeId) ?? "" : "",
    favArchetypeId: p.favArchetypeId,
    wins: p.wins,
  }));
}

// ── 룰 & 재정 ─────────────────────────────────────────────────────────────────

export type RulingRow = {
  id: string;
  cardId: string | null;
  question: string;
  answer: string;
  sourceUrl: string | null;
  card: ResolvedCard | null;
};

export async function getRulings(cardId?: string): Promise<RulingRow[]> {
  const rows = await prisma.ruling.findMany({
    where: cardId ? { cardId } : undefined,
    orderBy: { id: "asc" },
  });
  const cardIds = rows.map((r) => r.cardId).filter((v): v is string => !!v);
  const cardMap = await resolveDeckCardMap(cardIds);
  return rows.map((r) => ({
    id: r.id,
    cardId: r.cardId,
    question: r.question,
    answer: r.answer,
    sourceUrl: r.sourceUrl,
    card: r.cardId ? cardMap[r.cardId] ?? null : null,
  }));
}

// ── 용어 사전 ─────────────────────────────────────────────────────────────────

export type GlossaryRow = { term: string; definition: string; example: string | null };

export async function getGlossary(locale = "ko"): Promise<GlossaryRow[]> {
  const rows = await prisma.glossaryEntry.findMany({ where: { locale }, orderBy: { term: "asc" } });
  return rows.map((g) => ({ term: g.term, definition: g.definition, example: g.example }));
}
