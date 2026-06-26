import { prisma } from "@/lib/prisma";
import { USD_KRW, conditionCoefficient, pickPriceUsd } from "@/lib/trades/shared";
import { listRegionPacks, type Region, type RegionPack } from "@/lib/cards/dex-region";

// ─────────────────────────────────────────────────────────────────────────────
// 추정가 계산
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CollectionItem 의 추정 KRW.
 * 직접 입력된 estimatedKrw 가 있으면 우선, 없으면 카드 최신 Price × 컨디션 계수 × 환율.
 * 산출 불가 시 null.
 */
function estimateItemKrw(item: {
  estimatedKrw: number | null;
  grade: string;
  regionCard: { prices: { amount: number | null }[] };
}): number | null {
  if (item.estimatedKrw != null) return item.estimatedKrw;
  const latest = item.regionCard.prices[0];
  if (!latest) return null;
  const usd = pickPriceUsd(latest);
  if (usd == null || !Number.isFinite(usd)) return null;
  return Math.round(usd * USD_KRW * conditionCoefficient(item.grade));
}

// CollectionItem + regionCard(표시 데이터) + card(rarity) + 최신 Price 공통 include
const itemInclude = {
  regionCard: {
    include: {
      set: { select: { id: true, name: true, nameKo: true } },
      prices: {
        orderBy: { recordedAt: "desc" as const },
        take: 1,
        select: {
          amount: true,
        },
      },
    },
  },
  card: {
    select: {
      rarity: { select: { code: true, nameKo: true, nameEn: true } },
    },
  },
  certification: { select: { status: true } },
};

// ─────────────────────────────────────────────────────────────────────────────
// 도메인 타입 (UI 컴포넌트가 소비하는 형태)
// ─────────────────────────────────────────────────────────────────────────────

export interface CollectionItemView {
  id: string;
  cardId: string;
  name: string;
  number: string;
  rarity: string | null;
  region: string;
  setId: string;
  setName: string;
  imageSmall: string | null;
  imageLarge: string | null;
  grade: string;
  certified: boolean;
  certStatus: string | null;
  forSale: boolean;
  highlightSlot: number | null;
  estimatedKrw: number;
  createdAt: Date;
}

type RawItem = {
  id: string;
  regionCardId: string;
  cardId: string;
  grade: string;
  certified: boolean;
  estimatedKrw: number | null;
  forSale: boolean;
  highlightSlot: number | null;
  createdAt: Date;
  regionCard: {
    name: string;
    number: string;
    region: string;
    imageSmall: string | null;
    imageLarge: string | null;
    set: { id: string; name: string; nameKo: string | null };
    prices: { amount: number | null }[];
  };
  card: {
    rarity: { code: string; nameKo: string | null; nameEn: string | null } | null;
  };
  certification: { status: string } | null;
};

function toView(item: RawItem): CollectionItemView {
  return {
    id: item.id,
    cardId: item.regionCardId, // URL 호환: cardId 명은 그대로, 값은 RegionCard.id
    name: item.regionCard.name,
    number: item.regionCard.number,
    rarity: item.card.rarity?.nameKo ?? item.card.rarity?.nameEn ?? item.card.rarity?.code ?? null,
    region: item.regionCard.region,
    setId: item.regionCard.set.id,
    setName: item.regionCard.set.nameKo ?? item.regionCard.set.name,
    imageSmall: item.regionCard.imageSmall,
    imageLarge: item.regionCard.imageLarge,
    grade: item.grade,
    certified: item.certified,
    certStatus: item.certification?.status ?? null,
    forSale: item.forSale,
    highlightSlot: item.highlightSlot,
    estimatedKrw: estimateItemKrw(item) ?? 0,
    createdAt: item.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function addCollectionItem(input: {
  userId: string;
  /** RegionCard.id (= 기존 cardId — URL 호환 유지) */
  cardId: string;
  grade: string;
  estimatedKrw?: number | null;
  forSale?: boolean;
  certified?: boolean;
}) {
  const locale = await prisma.regionCard.findUnique({
    where: { id: input.cardId },
    select: { id: true, cardId: true },
  });
  if (!locale) {
    throw new Error(`RegionCard not found: ${input.cardId}`);
  }
  return prisma.collectionItem.create({
    data: {
      userId: input.userId,
      regionCardId: locale.id,
      cardId: locale.cardId,
      grade: input.grade,
      estimatedKrw: input.estimatedKrw ?? null,
      forSale: input.forSale ?? false,
      certified: input.certified ?? false,
    },
  });
}

export async function updateCollectionItem(
  itemId: string,
  userId: string,
  patch: {
    grade?: string;
    estimatedKrw?: number | null;
    forSale?: boolean;
    highlightSlot?: number | null;
  }
) {
  // 소유권 확인 후 수정 (updateMany 로 userId 조건 강제)
  const res = await prisma.collectionItem.updateMany({
    where: { id: itemId, userId },
    data: patch,
  });
  return res.count > 0;
}

export async function deleteCollectionItem(itemId: string, userId: string) {
  const res = await prisma.collectionItem.deleteMany({
    where: { id: itemId, userId },
  });
  return res.count > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserCollection(userId: string): Promise<CollectionItemView[]> {
  const items = await prisma.collectionItem.findMany({
    where: { userId },
    include: itemInclude,
    orderBy: { createdAt: "desc" },
  });
  return (items as unknown as RawItem[]).map(toView);
}

// ── 컬렉션 탭: 보유 세트의 "전체 카드" 카탈로그 (도감 내카드보기처럼 보유/미보유 표시) ──
export interface CollectionCatalogCard {
  cardId: string; // RegionCard.id
  logicalCardId: string; // 논리 Card.id — 트윈(같은 논리카드 다른 지역판) 보유 판정용
  name: string;
  number: string;
  imageUrl: string | null;
  owned: boolean;
  // 희귀도 카테고리 — 컬렉션 탭 "등급 구성"용(인쇄본 rarity 우선, 논리카드 폴백)
  rarityCategoryCode?: string;
  rarityCategoryTier?: number | null;
  rarityCategoryNameKo?: string;
  // 보유 카드만 채워짐
  itemId?: string;
  grade?: string;
  certified?: boolean;
  forSale?: boolean;
  highlightSlot?: number | null;
  valueKrw?: number;
}

export interface CollectionCatalogSet {
  setId: string;
  name: string;
  totalCards: number;
  ownedCount: number;
  estimatedKrw: number;
  cards: CollectionCatalogCard[]; // 세트 전체 카드(보유+미보유)
}

/**
 * 유저가 보유한 세트마다 그 세트의 "모든 카드"를 반환(보유=실데이터, 미보유=회색용 메타).
 * 같은 카드 중복 보유(등급 다름)는 카드 1장으로 합치고 첫 항목 기준으로 표시.
 */
export async function getUserSetCatalog(userId: string): Promise<CollectionCatalogSet[]> {
  const items = await getUserCollection(userId);
  if (items.length === 0) return [];

  const ownedByCardId = new Map<string, CollectionItemView>();
  for (const it of items) {
    if (!ownedByCardId.has(it.cardId)) ownedByCardId.set(it.cardId, it);
  }
  const setIds = [...new Set(items.map((i) => i.setId))];

  const locales = await prisma.regionCard.findMany({
    where: { setId: { in: setIds } },
    select: {
      id: true,
      name: true,
      number: true,
      imageSmall: true,
      imageLarge: true,
      setId: true,
      cardId: true, // 논리 Card.id (트윈 판정용)
      rarity: { select: { category: { select: { code: true, tier: true, nameKo: true } } } },
      card: { select: { rarity: { select: { category: { select: { code: true, tier: true, nameKo: true } } } } } },
      set: { select: { name: true, nameKo: true } },
    },
  });

  const bySet = new Map<string, CollectionCatalogSet>();
  for (const l of locales) {
    let set = bySet.get(l.setId);
    if (!set) {
      set = { setId: l.setId, name: l.set.nameKo ?? l.set.name, totalCards: 0, ownedCount: 0, estimatedKrw: 0, cards: [] };
      bySet.set(l.setId, set);
    }
    const own = ownedByCardId.get(l.id);
    const cat = l.rarity?.category ?? l.card?.rarity?.category ?? null; // 인쇄본 rarity 우선, 논리카드 폴백
    set.cards.push({
      cardId: l.id,
      logicalCardId: l.cardId,
      name: l.name,
      number: l.number,
      imageUrl: l.imageSmall ?? l.imageLarge ?? null,
      owned: !!own,
      ...(cat ? { rarityCategoryCode: cat.code, rarityCategoryTier: cat.tier, rarityCategoryNameKo: cat.nameKo ?? undefined } : {}),
      ...(own
        ? {
            itemId: own.id,
            grade: own.grade,
            certified: own.certified,
            forSale: own.forSale,
            highlightSlot: own.highlightSlot,
            valueKrw: own.estimatedKrw,
          }
        : {}),
    });
    set.totalCards += 1;
    if (own) {
      set.ownedCount += 1;
      set.estimatedKrw += own.estimatedKrw;
    }
  }

  for (const s of bySet.values()) {
    s.cards.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }
  return [...bySet.values()].sort((a, b) => b.ownedCount - a.ownedCount);
}

// ── 컬렉션 탭 사이드바: 보유 세트에 도감 팩 메타(지역/시대/클린명/로고/타입) 보강 ──
export interface CollectionViewSet extends CollectionCatalogSet {
  region: Region;
  era: string;
  eraOrder: number;
  isEtc: boolean;
  releaseDate: string | null;
  logoUrl: string | null;
  packType: string | null;
  mergeOf?: number;
  code: string | null;
  nameSub?: string;
  searchText: string;
}

/**
 * 컬렉션 탭용 — getUserSetCatalog 결과(보유 세트+카드)에 도감 사이드바와 동일한 팩 메타를
 * 조인해 반환(지역탭/시대그룹/클린팩명/로고/뱃지 렌더용). 팩명은 도감과 같은 클린명 사용.
 */
export async function getUserCollectionView(
  userId: string,
  preferred: "ko" | "ja" | "en",
): Promise<CollectionViewSet[]> {
  const catalog = await getUserSetCatalog(userId);
  if (catalog.length === 0) return [];
  const REGIONS: Region[] = ["JP", "EN", "KR"];
  const lists = await Promise.all(REGIONS.map((r) => listRegionPacks(r, preferred)));
  const packMap = new Map<string, { pack: RegionPack; region: Region }>();
  REGIONS.forEach((r, i) => { for (const p of lists[i]) packMap.set(p.setId, { pack: p, region: r }); });

  return catalog.map((s): CollectionViewSet => {
    const hit = packMap.get(s.setId);
    if (!hit) {
      // 도감 팩목록에 없는 세트(예외) — 기타 그룹 폴백.
      return { ...s, region: "JP", era: "", eraOrder: ETC_VIEW_ORDER, isEtc: true, releaseDate: null, logoUrl: null, packType: null, code: null, searchText: s.name };
    }
    const { pack, region } = hit;
    return {
      ...s,
      name: pack.name, // 도감과 동일한 클린 팩명
      region,
      era: pack.era,
      eraOrder: pack.eraOrder,
      isEtc: pack.isEtc,
      releaseDate: pack.releaseDate,
      logoUrl: pack.logoUrl,
      packType: pack.packType,
      ...(pack.mergeOf ? { mergeOf: pack.mergeOf } : {}),
      code: pack.code,
      ...(pack.nameSub ? { nameSub: pack.nameSub } : {}),
      searchText: pack.searchText ?? pack.name,
    };
  });
}
const ETC_VIEW_ORDER = 9_000;

// ── 컬렉션 탭: 단일 세트의 전체 카드(보유 오버레이) — 미보유 팩 지연 로드용 ──
export async function getCollectionSetCards(userId: string, setId: string): Promise<CollectionCatalogCard[]> {
  // 해당 세트만 타깃 조회(전체 컬렉션 over-fetch 방지). 지연로드 대상은 직접보유 0인 팩이라
  // 가격 기반 추정가는 불필요 — 저장된 estimatedKrw 만 사용.
  const [owned, locales] = await Promise.all([
    prisma.collectionItem.findMany({
      where: { userId, regionCard: { setId } },
      select: { id: true, regionCardId: true, grade: true, certified: true, forSale: true, highlightSlot: true, estimatedKrw: true },
    }),
    prisma.regionCard.findMany({
      where: { setId },
      select: {
        id: true, name: true, number: true, imageSmall: true, imageLarge: true, cardId: true,
        rarity: { select: { category: { select: { code: true, tier: true, nameKo: true } } } },
        card: { select: { rarity: { select: { category: { select: { code: true, tier: true, nameKo: true } } } } } },
      },
    }),
  ]);
  const ownedByRegionCardId = new Map<string, (typeof owned)[number]>();
  for (const o of owned) if (!ownedByRegionCardId.has(o.regionCardId)) ownedByRegionCardId.set(o.regionCardId, o);
  const cards: CollectionCatalogCard[] = locales.map((l) => {
    const own = ownedByRegionCardId.get(l.id);
    const cat = l.rarity?.category ?? l.card?.rarity?.category ?? null; // 인쇄본 rarity 우선, 논리카드 폴백
    return {
      cardId: l.id,
      logicalCardId: l.cardId,
      name: l.name,
      number: l.number,
      imageUrl: l.imageSmall ?? l.imageLarge ?? null,
      owned: !!own,
      ...(cat ? { rarityCategoryCode: cat.code, rarityCategoryTier: cat.tier, rarityCategoryNameKo: cat.nameKo ?? undefined } : {}),
      ...(own
        ? { itemId: own.id, grade: own.grade, certified: own.certified, forSale: own.forSale, highlightSlot: own.highlightSlot, valueKrw: own.estimatedKrw ?? 0 }
        : {}),
    };
  });
  cards.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  return cards;
}

// ── 컬렉션 탭 번들: 보유 세트(eager) + 전 지역 전 팩 메타·카운트 + 보유 id 집합 ──
export interface CollectionPackMeta {
  setId: string;
  region: Region;
  era: string;
  eraOrder: number;
  isEtc: boolean;
  releaseDate: string | null;
  name: string;
  nameSub?: string;
  logoUrl: string | null;
  packType: string | null;
  mergeOf?: number;
  code: string | null;
  searchText: string;
  totalCards: number;
  directOwnedCount: number; // 직접 보유(regionCard 기준)
  twinOwnedCount: number;   // 트윈 포함(논리카드 기준) — 클램프는 클라에서
}
export interface CollectionTabData {
  sets: CollectionViewSet[];                    // 보유 세트(전체 카드 eager)
  packs: Record<Region, CollectionPackMeta[]>;  // 전 지역 전 팩(메타+카운트, 카드 없음)
  ownedRegionCardIds: string[];
  ownedLogicalCardIds: string[];
}
export async function getCollectionTabData(userId: string, preferred: "ko" | "ja" | "en"): Promise<CollectionTabData> {
  const REGIONS: Region[] = ["JP", "EN", "KR"];
  // 경량 보유 행(regionCardId+논리cardId+setId) — 무거운 getUserCollection 재호출 대신 1회.
  //   (getUserCollectionView 내부에서 eager 세트용으로 getUserCollection 1회는 필요)
  const [sets, ownedLite, lists] = await Promise.all([
    getUserCollectionView(userId, preferred),
    prisma.collectionItem.findMany({
      where: { userId },
      select: { regionCardId: true, cardId: true, regionCard: { select: { setId: true } } },
    }),
    Promise.all(REGIONS.map((r) => listRegionPacks(r, preferred))),
  ]);
  const ownedRegionCardIds = [...new Set(ownedLite.map((o) => o.regionCardId))];
  const ownedLogicalCardIds = [...new Set(ownedLite.map((o) => o.cardId))];

  // 세트별 직접 보유 수(distinct regionCardId)
  const directBySet = new Map<string, Set<string>>();
  for (const o of ownedLite) {
    const sid = o.regionCard.setId;
    let s = directBySet.get(sid);
    if (!s) { s = new Set(); directBySet.set(sid, s); }
    s.add(o.regionCardId);
  }
  // 세트별 트윈 보유 수: 그 세트의 카드 중 논리카드를 보유한 수
  const twinBySet = new Map<string, number>();
  if (ownedLogicalCardIds.length > 0) {
    const twinRows = await prisma.regionCard.groupBy({
      by: ["setId"],
      where: { cardId: { in: ownedLogicalCardIds } },
      _count: { _all: true },
    });
    for (const r of twinRows) twinBySet.set(r.setId, r._count._all);
  }

  const packs: Record<Region, CollectionPackMeta[]> = { JP: [], EN: [], KR: [] };
  REGIONS.forEach((r, i) => {
    packs[r] = lists[i].map((p) => ({
      setId: p.setId,
      region: r,
      era: p.era,
      eraOrder: p.eraOrder,
      isEtc: p.isEtc,
      releaseDate: p.releaseDate,
      name: p.name,
      ...(p.nameSub ? { nameSub: p.nameSub } : {}),
      logoUrl: p.logoUrl,
      packType: p.packType,
      ...(p.mergeOf ? { mergeOf: p.mergeOf } : {}),
      code: p.code,
      searchText: p.searchText ?? p.name,
      totalCards: p.cardCount,
      directOwnedCount: directBySet.get(p.setId)?.size ?? 0,
      twinOwnedCount: twinBySet.get(p.setId) ?? 0,
    }));
  });

  return { sets, packs, ownedRegionCardIds, ownedLogicalCardIds };
}

/** 프로필 하이라이트(슬롯 1~5). slot 오름차순. */
export async function getHighlights(userId: string): Promise<CollectionItemView[]> {
  const items = await prisma.collectionItem.findMany({
    where: { userId, highlightSlot: { not: null } },
    include: itemInclude,
    orderBy: { highlightSlot: "asc" },
  });
  return (items as unknown as RawItem[]).map(toView);
}

export interface RecentFeedItem extends CollectionItemView {
  collectorUsername: string | null;
  collectorDisplayName: string | null;
  collectorInitial: string;
}

/** 최근 등록 글로벌 피드 (홈/recent). */
export async function getRecentFeed(limit = 30): Promise<RecentFeedItem[]> {
  const items = await prisma.collectionItem.findMany({
    include: {
      ...itemInclude,
      user: {
        select: { username: true, displayName: true, avatarInitial: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return (items as unknown as (RawItem & {
    user: { username: string | null; displayName: string | null; avatarInitial: string | null; name: string | null };
  })[]).map((it) => {
    const display = it.user.displayName ?? it.user.name ?? it.user.username ?? "?";
    return {
      ...toView(it),
      collectorUsername: it.user.username,
      collectorDisplayName: display,
      collectorInitial: it.user.avatarInitial ?? display.charAt(0) ?? "?",
    };
  });
}

export interface UserStats {
  cards: number;
  certified: number;
  totalKrw: number;
}

/** 보유수/인증수/추정총액. */
export async function getUserStats(userId: string): Promise<UserStats> {
  const items = await getUserCollection(userId);
  return {
    cards: items.length,
    certified: items.filter((i) => i.certified).length,
    totalKrw: items.reduce((sum, i) => sum + i.estimatedKrw, 0),
  };
}
