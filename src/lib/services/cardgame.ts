import { prisma } from "@/lib/prisma";
import { CARDS } from "@/lib/cardgame/mock";
import { REAL_TO_MOCK } from "@/lib/cardgame/mockToReal";

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
          logicalCard: {
            select: {
              types: true,
              hp: true,
              supertype: true,
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
        types: l.logicalCard.types,
        hp: l.logicalCard.hp,
        setId: l.setId,
        supertype: l.logicalCard.supertype,
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
  tier: string;
  regulation: string;
  usageRate: number;
  winCount: number;
  avgRank: number;
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
  tier: string;
  regulation: string;
  usageRate: number;
  winCount: number;
  avgRank: number;
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
    tier: a.tier,
    regulation: a.regulation,
    usageRate: a.usageRate,
    winCount: a.winCount,
    avgRank: a.avgRank,
    // heroCardIds: cardList 앞 4장(채용 ✓ 우선) — 화면 썸네일용.
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
  sort?: "usage" | "wins" | "new";
  tier?: string;
  regulation?: string;
}): Promise<ArchetypeSummary[]> {
  const where: { tier?: string; regulation?: string } = {};
  if (opts?.tier && opts.tier !== "all") where.tier = opts.tier;
  if (opts?.regulation && opts.regulation !== "all") where.regulation = opts.regulation;

  const rows = await prisma.deckArchetype.findMany({ where, include: ARCHETYPE_INCLUDE });
  const list = rows.map(toSummary);

  const sort = opts?.sort ?? "usage";
  list.sort((a, b) => {
    switch (sort) {
      case "wins":
        return b.winCount - a.winCount;
      case "new":
        return a.id.localeCompare(b.id);
      case "usage":
      default:
        return b.usageRate - a.usageRate;
    }
  });
  return list;
}

export async function getArchetype(id: string): Promise<ArchetypeWithCards | null> {
  const row = await prisma.deckArchetype.findUnique({ where: { id }, include: ARCHETYPE_INCLUDE });
  if (!row) return null;
  const summary = toSummary(row);
  const cards = await resolveDeckCardMap([...summary.cardList.map((c) => c.cardId), ...summary.heroCardIds]);
  return { ...summary, cards };
}

/** 홈 추천메타용: 티어순(S→A→B→C) 상위 n개 + 표시용 카드 맵. */
export async function getRecommendedDecks(n = 4): Promise<{
  decks: ArchetypeSummary[];
  cards: Record<string, ResolvedCard>;
}> {
  const rows = await prisma.deckArchetype.findMany({ include: ARCHETYPE_INCLUDE });
  const list = rows.map(toSummary).sort((a, b) => {
    const t = (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9);
    return t !== 0 ? t : b.usageRate - a.usageRate;
  });
  const decks = list.slice(0, n);
  const cards = await resolveDeckCardMap(decks.flatMap((d) => [...d.cardList.map((c) => c.cardId), ...d.heroCardIds]));
  return { decks, cards };
}

/** 메타 페이지 사용률 추이 차트용. */
export async function getArchetypeTrends(): Promise<{
  weeks: string[];
  series: { archetypeId: string; nameKo: string; points: Record<string, number> }[];
}> {
  const rows = await prisma.deckArchetype.findMany({
    include: { trends: { select: { week: true, usage: true } } },
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

// ── 대회 ───────────────────────────────────────────────────────────────────────

export type TournamentRow = {
  id: string;
  nameKo: string;
  date: string;
  region: string;
  format: string;
  players: number;
  winnerArchetypeId: string | null;
  winnerNameKo: string | null;
  status: string;
};

export async function getTournaments(opts?: {
  region?: string;
  status?: string;
}): Promise<TournamentRow[]> {
  const where: { region?: string; status?: string } = {};
  if (opts?.region && opts.region !== "all") where.region = opts.region;
  if (opts?.status && opts.status !== "all") where.status = opts.status;

  const rows = await prisma.tournament.findMany({ where, orderBy: { date: "desc" } });
  // 우승 덱 이름 환산
  const archIds = Array.from(
    new Set(rows.map((t) => t.winnerArchetypeId).filter((v): v is string => !!v))
  );
  const archs = archIds.length
    ? await prisma.deckArchetype.findMany({
        where: { id: { in: archIds } },
        select: { id: true, nameKo: true },
      })
    : [];
  const nameById = new Map(archs.map((a) => [a.id, a.nameKo]));

  return rows.map((t) => ({
    id: t.id,
    nameKo: t.nameKo,
    date: t.date.toISOString().slice(0, 10),
    region: t.region,
    format: t.format,
    players: t.players,
    winnerArchetypeId: t.winnerArchetypeId,
    winnerNameKo: t.winnerArchetypeId ? nameById.get(t.winnerArchetypeId) ?? null : null,
    status: t.status,
  }));
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

// ── 봉입률 ─────────────────────────────────────────────────────────────────────

export type PullRateRow = {
  rarity: string;
  types: number;
  probability: number;
  perBox: string;
};

export async function getPullRates(setId: string): Promise<PullRateRow[]> {
  const rows = await prisma.pullRate.findMany({ where: { setId } });
  return rows.map((p) => ({
    rarity: p.rarity,
    types: p.types,
    probability: p.probability,
    perBox: p.perBox,
  }));
}
