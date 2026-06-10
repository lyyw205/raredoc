import { prisma } from "@/lib/prisma";
import { CARDS } from "@/lib/cardgame/mock";
import { REAL_TO_MOCK } from "@/lib/cardgame/mockToReal";
import { resolveTypes } from "@/lib/cards/card-fields";

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
  // Phase 4: prisma.card → prisma.cardLocale (read). 메타(types/hp/supertype)는 LogicalCard 가 보유.
  // CardLocale 행이 자체 locale 의 표시명 보유 → resolveDeckCard 입력 호환 위해 nameKo 슬롯에 name 그대로 사용.
  const dbLocales = unique.length
    ? await prisma.cardLocale.findMany({
        where: { id: { in: unique } },
        select: {
          id: true,
          name: true,
          imageSmall: true,
          imageLarge: true,
          setId: true,
          // P7: types→ArtCard, hp/supertype→GameCard(P4b/P6 복제). LC 폴백은 전환기(드롭 시 제거).
          logicalCard: {
            select: {
              types: true,
              hp: true,
              supertype: true,
              artCard: { select: { types: true } },
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
        // types=종류별 분기 — ArtCard 폼변종 over-merge 회피: Pokémon은 LC우선·AC폴백, Trainer/Energy는 LC직독.
        types: resolveTypes(
          l.logicalCard.gameCard?.supertype ?? l.logicalCard.supertype,
          l.logicalCard.types,
          l.logicalCard.artCard?.types,
        ),
        hp: l.logicalCard.gameCard?.hp ?? l.logicalCard.hp,
        setId: l.setId,
        supertype: l.logicalCard.gameCard?.supertype ?? l.logicalCard.supertype,
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
  /** 카드매칭 보류로 빈 배열일 수 있음 (옵셔널 체이닝 필수). */
  heroCardIds: string[];
  cardList: { cardId: string; count: number; role: string | null }[];
  strengths: string[];
  weaknesses: string[];
  counters: string[];
  description: string;
  variants: { id: string; nameKo: string }[];
};

export type ArchetypeWithCards = ArchetypeSummary & {
  /** cardList/heroCard 에 등장하는 모든 cardId 의 표시용 해석 맵. */
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
  cards: { logicalCardId: string; count: number; role: string | null }[];
  variants: { id: string; nameKo: string }[];
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
    // heroCardIds: cardList 앞 4장(채용 ✓ 우선) — 화면 썸네일용.
    // 실데이터 아키타입은 DeckCard 없음 → 빈 배열(폴백 처리는 화면에서).
    heroCardIds: [...a.cards]
      .sort((x, y) => (x.role === "✓" ? 0 : 1) - (y.role === "✓" ? 0 : 1))
      .slice(0, 4)
      .map((c) => c.logicalCardId),
    cardList: a.cards.map((c) => ({ cardId: c.logicalCardId, count: c.count, role: c.role })),
    strengths: a.strengths,
    weaknesses: a.weaknesses,
    counters: a.counters,
    description: a.description,
    variants: a.variants.map((v) => ({ id: v.id, nameKo: v.nameKo })),
  };
}

const ARCHETYPE_INCLUDE = {
  cards: { select: { logicalCardId: true, count: true, role: true } },
  variants: { select: { id: true, nameKo: true } },
} as const;

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

  const rows = await prisma.deckArchetype.findMany({ where, include: ARCHETYPE_INCLUDE });
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
  const row = await prisma.deckArchetype.findUnique({ where: { id }, include: ARCHETYPE_INCLUDE });
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
    include: ARCHETYPE_INCLUDE,
  });
  const list = rows.map(toSummary).sort((a, b) => {
    const t = (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9);
    return t !== 0 ? t : b.usageRate - a.usageRate;
  });
  const decks = list.slice(0, n);
  const cards = await resolveDeckCardMap(decks.flatMap((d) => [...d.cardList.map((c) => c.cardId), ...d.heroCardIds]));
  return { decks, cards };
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

export type RecipeCard = {
  cardName: string;
  setCode: string | null;
  number: string | null;
  avgCount: number;
  adoptionRate: number;
  isCore: boolean;
  /** 채용률 30~70% = 테크 카드(옅게 표시). */
  isTech: boolean;
  /** 덱 핵심 카드 (archetype.iconKeys 에 해당하는 대표 포켓몬). */
  isHero: boolean;
  /** 대표 인쇄판 썸네일 (KR>JP>EN locale 우선, 미연결 시 null) — UI-1a. */
  cardImage: string | null;
  /** 카드 상세(/cards/[id]) 링크용 대표 locale id. */
  cardLocaleId: string | null;
};

/** logicalCardId[] → 대표 locale 이미지/id (KR>JP>EN 우선) — 레시피·리스트 뷰어 공용 (UI-1a). */
async function resolveLogicalCardImages(
  ids: string[],
): Promise<Map<string, { image: string | null; cardLocaleId: string }>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const locales = await prisma.cardLocale.findMany({
    where: { logicalCardId: { in: unique } },
    select: { id: true, logicalCardId: true, region: true, imageSmall: true, imageLarge: true },
  });
  const PRIORITY: Record<string, number> = { KR: 0, JP: 1, EN: 2 };
  const byLc = new Map<string, typeof locales>();
  for (const l of locales) {
    const arr = byLc.get(l.logicalCardId) ?? [];
    arr.push(l);
    byLc.set(l.logicalCardId, arr);
  }
  const map = new Map<string, { image: string | null; cardLocaleId: string }>();
  for (const [lcId, arr] of byLc) {
    // 이미지 보유 우선 → 같은 조건이면 KR>JP>EN
    const best = [...arr].sort((a, b) => {
      const ai = a.imageSmall ?? a.imageLarge ? 0 : 1;
      const bi = b.imageSmall ?? b.imageLarge ? 0 : 1;
      return ai - bi || (PRIORITY[a.region] ?? 9) - (PRIORITY[b.region] ?? 9);
    })[0];
    map.set(lcId, { image: best.imageSmall ?? best.imageLarge ?? null, cardLocaleId: best.id });
  }
  return map;
}

export type ArchetypeRecipe = {
  pokemon: RecipeCard[];
  trainer: RecipeCard[];
  energy: RecipeCard[];
};

/** #16/#17 표준 레시피: DeckRecipeCard 를 category별 그룹 + 코어/테크 구분("핵심 카드 먼저" 정렬). */
export async function getArchetypeRecipe(deckId: string): Promise<ArchetypeRecipe> {
  const [arch, rows] = await Promise.all([
    prisma.deckArchetype.findUnique({ where: { id: deckId }, select: { iconKeys: true } }),
    // region 필터: INTL 의미 고정 — P2 에서 JP/KR 레시피 행이 생겨도 본체 화면 혼합 방지 (multisource P0)
    prisma.deckRecipeCard.findMany({ where: { archetypeId: deckId, region: "INTL" } }),
  ]);
  // 핵심 카드 매칭: iconKeys(예 "dragapult") 가 cardName(소문자) 에 포함되면 그 덱의 대표 카드.
  // icon 직접 매칭만 (라인 카드는 제외) — icon slug 가 cardName 에 부분 포함되면 hero.
  const iconKeys = (arch?.iconKeys ?? []).map((k) => k.toLowerCase());
  const isHeroCard = (name: string): boolean => {
    const n = name.toLowerCase();
    return iconKeys.some((ic) => n.includes(ic));
  };

  type RankedRow = (typeof rows)[number] & { _hero: boolean };
  const ranked: RankedRow[] = rows.map((r) => ({ ...r, _hero: isHeroCard(r.cardName) }));

  // 대표 인쇄판 썸네일 (UI-1a) — logicalCardId 연결 행만
  const imageMap = await resolveLogicalCardImages(ranked.map((r) => r.logicalCardId).filter((v): v is string => !!v));

  // 정렬 우선순위:
  //   1) 핵심 카드(iconKeys 매칭) 먼저
  //   2) isCore(채용률≥90)
  //   3) 사용량(채용률 × 평균 장수), 동률은 채용률
  ranked.sort((a, b) => {
    if (a._hero !== b._hero) return a._hero ? -1 : 1;
    if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
    const ua = a.adoptionRate * a.avgCount;
    const ub = b.adoptionRate * b.avgCount;
    return ub - ua || b.adoptionRate - a.adoptionRate;
  });

  const toCard = (r: RankedRow): RecipeCard => {
    const resolved = r.logicalCardId ? imageMap.get(r.logicalCardId) : undefined;
    return {
      cardName: r.cardName,
      setCode: r.setCode,
      number: r.number,
      avgCount: Math.round(r.avgCount * 10) / 10,
      adoptionRate: Math.round(r.adoptionRate * 10) / 10,
      isCore: r.isCore,
      isTech: !r.isCore && r.adoptionRate >= 30 && r.adoptionRate <= 70,
      isHero: r._hero,
      cardImage: resolved?.image ?? null,
      cardLocaleId: resolved?.cardLocaleId ?? null,
    };
  };
  return {
    pokemon: ranked.filter((r) => r.category === "pokemon").map(toCard),
    trainer: ranked.filter((r) => r.category === "trainer").map(toCard),
    energy: ranked.filter((r) => r.category === "energy").map(toCard),
  };
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
 * 작업2: 카드(logicalCardId)별 메타 채용 지표.
 *
 * DeckRecipeCard 에서 logicalCardId NOT NULL 인 행을 logicalCardId별 집계.
 * - deckCount: 등장 아키타입 수
 * - adoptionRate: 평균 채용률
 * - usageScore: Σ(adoptionRate × avgCount)
 *
 * ★게임 dedup(P3): 재수록 카드가 여러 logicalCardId 로 쪼개져 채용률이 분산되던 것을
 *   gameCardId(게임상 같은 카드) 로 통합 집계 후, 그 gameCard 의 모든 인쇄본(LC) 키로 펼침.
 *   gameCardId 없는 카드(빈-LC 등)는 logicalCardId 자기 키로 무회귀.
 *   반환 Map 은 여전히 logicalCardId 키 — 소비처(loadCards) 무변경.
 */
export async function getCardAdoption(): Promise<Map<string, CardAdoption>> {
  const rows = await prisma.deckRecipeCard.findMany({
    // region 필터: INTL 한정 — region 행 분리 시 deckCount/usageScore 이중계상 방지 (multisource P0)
    where: { logicalCardId: { not: null }, region: "INTL" },
    select: { logicalCardId: true, archetypeId: true, adoptionRate: true, avgCount: true },
  });
  if (rows.length === 0) return new Map();

  // logicalCardId → gameCardId (게임상 같은 카드 = 덱 4장 단위)
  const lcIds = [...new Set(rows.map((r) => r.logicalCardId!))];
  const lcRows = await prisma.logicalCard.findMany({ where: { id: { in: lcIds } }, select: { id: true, gameCardId: true } });
  const lcToGc = new Map(lcRows.map((l) => [l.id, l.gameCardId]));

  // 키 = gameCardId ?? logicalCardId 로 집계(dedup)
  type Acc = { archs: Set<string>; rateSum: number; rowCount: number; usageScore: number };
  const acc = new Map<string, Acc>();
  for (const r of rows) {
    const key = lcToGc.get(r.logicalCardId!) ?? r.logicalCardId!;
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

  // logicalCardId 키로 펼침 — 메타 gameCard 의 *모든* 인쇄본 LC 가 통합 채용률을 받게 함
  const gcKeys = [...acc.keys()].filter((k) => k.startsWith("gc_"));
  const allLcOfGc = gcKeys.length
    ? await prisma.logicalCard.findMany({ where: { gameCardId: { in: gcKeys } }, select: { id: true, gameCardId: true } })
    : [];
  const out = new Map<string, CardAdoption>();
  for (const lc of allLcOfGc) { const v = perKey.get(lc.gameCardId!); if (v) out.set(lc.id, v); }
  for (const [key, v] of perKey) if (!key.startsWith("gc_")) out.set(key, v); // gameCardId 없는 카드
  return out;
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
  // multisource P0: limitlessId → source (신규 소스도 실데이터로 인정)
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
  logicalCardId: string;
  name: string;
  image: string | null;
  cardLocaleId: string | null;
  deckCount: number;
  avgAdoption: number;
};

/** #20 메타 필수 카드 — INTL 레시피에서 채용 아키타입 수 상위 (기본 에너지 제외). */
export async function getTopAdoptedCards(n = 10): Promise<TopCard[]> {
  const rows = await prisma.deckRecipeCard.findMany({
    where: { region: "INTL", logicalCardId: { not: null }, category: { not: "energy" } },
    select: { logicalCardId: true, cardName: true, adoptionRate: true },
  });
  const acc = new Map<string, { name: string; decks: number; rateSum: number }>();
  for (const r of rows) {
    const a = acc.get(r.logicalCardId!) ?? { name: r.cardName, decks: 0, rateSum: 0 };
    a.decks++;
    a.rateSum += r.adoptionRate;
    acc.set(r.logicalCardId!, a);
  }
  const top = [...acc.entries()]
    .sort((x, y) => y[1].decks - x[1].decks || y[1].rateSum - x[1].rateSum)
    .slice(0, n);
  const imageMap = await resolveLogicalCardImages(top.map(([id]) => id));
  return top.map(([id, a]) => ({
    logicalCardId: id,
    name: a.name,
    image: imageMap.get(id)?.image ?? null,
    cardLocaleId: imageMap.get(id)?.cardLocaleId ?? null,
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
export async function getDecksUsingCard(logicalCardId: string, n = 5): Promise<DeckUsingCard[]> {
  const rows = await prisma.deckRecipeCard.findMany({
    where: { region: "INTL", logicalCardId },
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
    where: { region: "INTL", logicalCardId: { not: null }, adoptionRate: { gte: 30 } },
    select: { archetypeId: true, logicalCardId: true },
  });
  if (recipes.length === 0) return null;
  const lcIds = [...new Set(recipes.map((r) => r.logicalCardId!))];
  const locales = await prisma.cardLocale.findMany({
    where: { logicalCardId: { in: lcIds }, region: "EN" },
    select: { logicalCardId: true, set: { select: { id: true, name: true, releaseDate: true } } },
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
  const newLcIds = new Set(locales.filter((l) => l.set?.id === latestId).map((l) => l.logicalCardId));
  const byArch = new Map<string, number>();
  for (const r of recipes) {
    if (newLcIds.has(r.logicalCardId!)) byArch.set(r.archetypeId, (byArch.get(r.archetypeId) ?? 0) + 1);
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
  cardLocaleId: string | null;
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

type RawDeckEntry = { name?: string; count?: number; logicalCardId?: string | null };
type RawDecklist = { pokemon?: RawDeckEntry[]; trainer?: RawDeckEntry[]; energy?: RawDeckEntry[] };

/** 리스트 뷰어 — standing 1건의 덱리스트를 카드 이미지로 해석 (docs/cardgame-ui-plan.md §4-5). */
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
  for (const b of ["pokemon", "trainer", "energy"] as const) {
    for (const c of dl[b] ?? []) if (c?.logicalCardId) lcIds.push(c.logicalCardId);
  }
  const imageMap = await resolveLogicalCardImages(lcIds);

  let totalCards = 0;
  let unresolved = 0;
  const toView = (entries: RawDeckEntry[] | undefined): DecklistViewCard[] =>
    (entries ?? []).map((c) => {
      const count = c.count ?? 0;
      totalCards += count;
      const resolved = c.logicalCardId ? imageMap.get(c.logicalCardId) : undefined;
      if (!resolved?.image) unresolved += count;
      return {
        name: c.name ?? "?",
        count,
        image: resolved?.image ?? null,
        cardLocaleId: resolved?.cardLocaleId ?? null,
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
  logicalCardId: string | null;
  question: string;
  answer: string;
  sourceUrl: string | null;
  card: ResolvedCard | null;
};

export async function getRulings(logicalCardId?: string): Promise<RulingRow[]> {
  const rows = await prisma.ruling.findMany({
    where: logicalCardId ? { logicalCardId } : undefined,
    orderBy: { id: "asc" },
  });
  const cardIds = rows.map((r) => r.logicalCardId).filter((v): v is string => !!v);
  const cardMap = await resolveDeckCardMap(cardIds);
  return rows.map((r) => ({
    id: r.id,
    logicalCardId: r.logicalCardId,
    question: r.question,
    answer: r.answer,
    sourceUrl: r.sourceUrl,
    card: r.logicalCardId ? cardMap[r.logicalCardId] ?? null : null,
  }));
}

// ── 용어 사전 ─────────────────────────────────────────────────────────────────

export type GlossaryRow = { term: string; definition: string; example: string | null };

export async function getGlossary(locale = "ko"): Promise<GlossaryRow[]> {
  const rows = await prisma.glossaryEntry.findMany({ where: { locale }, orderBy: { term: "asc" } });
  return rows.map((g) => ({ term: g.term, definition: g.definition, example: g.example }));
}
