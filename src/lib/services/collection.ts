import { prisma } from "@/lib/prisma";
import { USD_KRW } from "@/lib/trades/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 추정가 계산
// ─────────────────────────────────────────────────────────────────────────────

/** 컨디션(grade) → 시세 계수. NM(완전 새것) 기준 1.0. */
const CONDITION_COEFFICIENT: Record<string, number> = {
  미개봉: 1.15,
  "1착": 1.1,
  NM: 1.0,
  VNDS: 0.95,
  LP: 0.85,
  MP: 0.65,
  HP: 0.45,
  DS: 0.3,
  D: 0.3,
};

function conditionCoefficient(grade: string): number {
  return CONDITION_COEFFICIENT[grade] ?? 1.0;
}

/** Price 행에서 대표 USD 시세 선택 (홀로 > 노말 > 리버스 > 1ed). */
function pickPriceUsd(p: {
  normal: number | null;
  holofoil: number | null;
  reverseHolo: number | null;
  firstEdition: number | null;
}): number | null {
  return p.holofoil ?? p.normal ?? p.reverseHolo ?? p.firstEdition ?? null;
}

/**
 * CollectionItem 의 추정 KRW.
 * 직접 입력된 estimatedKrw 가 있으면 우선, 없으면 카드 최신 Price × 컨디션 계수 × 환율.
 * 산출 불가 시 null.
 */
function estimateItemKrw(item: {
  estimatedKrw: number | null;
  grade: string;
  locale: { prices: { normal: number | null; holofoil: number | null; reverseHolo: number | null; firstEdition: number | null }[] };
}): number | null {
  if (item.estimatedKrw != null) return item.estimatedKrw;
  const latest = item.locale.prices[0];
  if (!latest) return null;
  const usd = pickPriceUsd(latest);
  if (usd == null || !Number.isFinite(usd)) return null;
  return Math.round(usd * USD_KRW * conditionCoefficient(item.grade));
}

// CollectionItem + locale(표시 데이터) + logicalCard(rarity) + 최신 Price 공통 include
const itemInclude = {
  locale: {
    include: {
      set: { select: { id: true, name: true, nameKo: true } },
      prices: {
        orderBy: { recordedAt: "desc" as const },
        take: 1,
        select: {
          normal: true,
          holofoil: true,
          reverseHolo: true,
          firstEdition: true,
        },
      },
    },
  },
  logicalCard: {
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
  localeId: string;
  logicalCardId: string;
  grade: string;
  certified: boolean;
  estimatedKrw: number | null;
  forSale: boolean;
  highlightSlot: number | null;
  createdAt: Date;
  locale: {
    name: string;
    number: string;
    region: string;
    imageSmall: string | null;
    imageLarge: string | null;
    set: { id: string; name: string; nameKo: string | null };
    prices: { normal: number | null; holofoil: number | null; reverseHolo: number | null; firstEdition: number | null }[];
  };
  logicalCard: {
    rarity: { code: string; nameKo: string | null; nameEn: string | null } | null;
  };
  certification: { status: string } | null;
};

function toView(item: RawItem): CollectionItemView {
  return {
    id: item.id,
    cardId: item.localeId, // URL 호환: cardId 명은 그대로, 값은 CardLocale.id
    name: item.locale.name,
    number: item.locale.number,
    rarity: item.logicalCard.rarity?.nameKo ?? item.logicalCard.rarity?.nameEn ?? item.logicalCard.rarity?.code ?? null,
    region: item.locale.region,
    setId: item.locale.set.id,
    setName: item.locale.set.nameKo ?? item.locale.set.name,
    imageSmall: item.locale.imageSmall,
    imageLarge: item.locale.imageLarge,
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
  /** CardLocale.id (= 기존 cardId — URL 호환 유지) */
  cardId: string;
  grade: string;
  estimatedKrw?: number | null;
  forSale?: boolean;
  certified?: boolean;
}) {
  const locale = await prisma.cardLocale.findUnique({
    where: { id: input.cardId },
    select: { id: true, logicalCardId: true },
  });
  if (!locale) {
    throw new Error(`CardLocale not found: ${input.cardId}`);
  }
  return prisma.collectionItem.create({
    data: {
      userId: input.userId,
      localeId: locale.id,
      logicalCardId: locale.logicalCardId,
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

export interface SetProgress {
  setId: string;
  name: string;
  owned: number;
  total: number;
  estimatedKrw: number;
}

/** 세트별 보유/총수/추정합. total 은 Set.cardCount 기준. */
export async function getUserSetProgress(userId: string): Promise<SetProgress[]> {
  const items = await getUserCollection(userId);
  const bySet = new Map<string, SetProgress>();
  for (const it of items) {
    const cur = bySet.get(it.setId) ?? {
      setId: it.setId,
      name: it.setName,
      owned: 0,
      total: 0,
      estimatedKrw: 0,
    };
    cur.owned += 1;
    cur.estimatedKrw += it.estimatedKrw;
    bySet.set(it.setId, cur);
  }
  if (bySet.size === 0) return [];

  const sets = await prisma.set.findMany({
    where: { id: { in: [...bySet.keys()] } },
    select: { id: true, cardCount: true },
  });
  for (const s of sets) {
    const cur = bySet.get(s.id);
    if (cur) cur.total = s.cardCount;
  }
  return [...bySet.values()].sort((a, b) => b.owned - a.owned);
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
