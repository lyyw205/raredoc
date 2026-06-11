/**
 * /dex 지역탭(JP/KR/EN) 데이터층 — 팩 목록은 Set 테이블 출발(세트당 1행 = 자연 dedupe),
 * 카드는 팩 선택 시 lazy 로드(getSetCardsCached). 둘 다 유저 무관 인메모리 TTL(1h) 캐시.
 *   - 팩목록을 CardPackLink 로 뽑으면 합본(sv1)이 여러 wave 에 중복 등재돼 폭발 → Set 기준이 정답.
 *   - 정렬: Era.order(asc, MEGA=0..BASE) → Set.releaseDate(asc) → Set.id. isEtc(EN 프로모 등)는 맨뒤.
 *   - 캐시 항목은 프로세스 공유 참조 — 호출부 절대 변형(mutate) 금지. owned 오버레이는 액션이 불변으로 얹는다.
 *   - 무효화는 clearRegionCaches().
 */
import { prisma } from "@/lib/prisma";
import { pickRarityLabel } from "./card-fields";
import { canonEra, eraOrderIndex } from "./eras";
import type { DexCard } from "@/components/dex/DexCatalog";

export type Region = "JP" | "EN" | "KR";

export type RegionPack = {
  setId: string;
  name: string;
  era: string;
  eraOrder: number;
  releaseDate: string | null; // ISO yyyy-mm-dd
  cardCount: number;
  logoUrl: string | null;
  isEtc: boolean;
  mergeOf?: number; // CardPackLink wave 수(>1 합본) — 합본 뱃지용
};

const REGION_TTL_MS = 3_600_000; // 1h
const ETC_ERA_ORDER = 9_000; // isEtc 는 항상 맨뒤로(eraOrder 큰값)

// ── 팩 목록 (지역별) ────────────────────────────────────────────────────────
async function buildRegionPacks(region: Region): Promise<RegionPack[]> {
  const [sets, waveGroups] = await Promise.all([
    prisma.set.findMany({
      where: { region },
      select: {
        id: true,
        name: true,
        releaseDate: true,
        logoUrl: true,
        series: true,
        cardPack: { select: { era: true, eraRef: { select: { key: true, order: true } } } },
        _count: { select: { localeCards: true } },
      },
    }),
    // setId별 wave 수 — >1 이면 합본(CardPackLink 가 여러 wave 에 같은 setId 등재)
    prisma.cardPackLink.groupBy({
      by: ["setId"],
      where: { region, setId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const mergeMap = new Map<string, number>();
  for (const g of waveGroups) {
    if (g.setId) mergeMap.set(g.setId, g._count._all);
  }

  const packs: RegionPack[] = sets.map((s) => {
    const ref = s.cardPack?.eraRef;
    let era: string;
    let eraOrder: number;
    let isEtc: boolean;
    if (ref) {
      era = ref.key;
      eraOrder = ref.order;
      isEtc = false;
    } else {
      // setGroupId NULL(EN 프로모/맥도날드/레거시) — series 폴백 → "기타"
      era = canonEra(s.series);
      eraOrder = eraOrderIndex(era);
      isEtc = true;
    }
    const wave = mergeMap.get(s.id) ?? 0;
    return {
      setId: s.id,
      name: s.name,
      era,
      eraOrder,
      releaseDate: s.releaseDate ? s.releaseDate.toISOString().slice(0, 10) : null,
      cardCount: s._count.localeCards,
      logoUrl: s.logoUrl ?? null,
      isEtc,
      ...(wave > 1 ? { mergeOf: wave } : {}),
    };
  });

  // 정렬: eraOrder(asc, isEtc 는 큰값으로 맨뒤) → releaseDate(asc) → id
  packs.sort((a, b) => {
    const oa = a.isEtc ? ETC_ERA_ORDER : a.eraOrder;
    const ob = b.isEtc ? ETC_ERA_ORDER : b.eraOrder;
    if (oa !== ob) return oa - ob;
    if (a.releaseDate && b.releaseDate) return a.releaseDate.localeCompare(b.releaseDate);
    if (a.releaseDate) return -1;
    if (b.releaseDate) return 1;
    return a.setId.localeCompare(b.setId);
  });

  return packs;
}

const packCache = new Map<Region, { at: number; data: RegionPack[] }>();
const packInflight = new Map<Region, Promise<RegionPack[]>>();

export async function listRegionPacks(region: Region): Promise<RegionPack[]> {
  const hit = packCache.get(region);
  if (hit && Date.now() - hit.at < REGION_TTL_MS) return hit.data;
  const inflight = packInflight.get(region);
  if (inflight) return inflight;
  const p = buildRegionPacks(region)
    .then((data) => {
      if (data.length > 0) packCache.set(region, { at: Date.now(), data });
      return data;
    })
    .finally(() => packInflight.delete(region));
  packInflight.set(region, p);
  return p;
}

// ── 세트 카드 (lazy, owned 미포함) ──────────────────────────────────────────
async function buildSetCards(setId: string): Promise<DexCard[]> {
  // RegionCard 는 @@unique 없음 — id 가 물리 식별. dedupe 금지.
  const rcs = await prisma.regionCard.findMany({
    where: { setId },
    select: {
      id: true,
      name: true,
      number: true,
      numberInt: true,
      imageSmall: true,
      imageLarge: true,
      region: true,
      rarity: {
        select: {
          code: true, nameKo: true, nameJa: true, nameEn: true, tier: true,
          category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } },
        },
      },
      card: {
        select: {
          types: true,
          supertype: true,
          gameCard: { select: { supertype: true } },
          rarity: {
            select: {
              code: true, nameKo: true, nameJa: true, nameEn: true, tier: true,
              category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } },
            },
          },
        },
      },
    },
    orderBy: [{ numberInt: "asc" }, { number: "asc" }],
  });

  return rcs.map((rc): DexCard => {
    const rar = rc.rarity ?? rc.card.rarity; // 인쇄본별 rarity 우선, LC 폴백
    return {
      id: rc.id,
      name: rc.name,
      number: rc.number,
      rarity: pickRarityLabel(rc.region, rar) ?? undefined,
      rarityTier: rar?.tier ?? null,
      rarityCategoryCode: rar?.category?.code ?? undefined,
      rarityCategoryNameKo: rar?.category?.nameKo ?? undefined,
      rarityCategoryNameJa: rar?.category?.nameJa ?? undefined,
      rarityCategoryNameEn: rar?.category?.nameEn ?? undefined,
      rarityCategoryTier: rar?.category?.tier ?? null,
      types: rc.card.types.length > 0 ? rc.card.types : undefined,
      supertype: rc.card.gameCard?.supertype ?? rc.card.supertype ?? undefined,
      region: rc.region,
      imageSmall: rc.imageSmall ?? rc.imageLarge ?? null,
      imageLarge: rc.imageLarge ?? rc.imageSmall ?? null,
      // owned 는 액션(loadSetCards)이 유저별로 불변 오버레이
      owned: false,
      grade: undefined,
      certified: false,
    };
  });
}

const cardCache = new Map<string, { at: number; data: DexCard[] }>();
const cardInflight = new Map<string, Promise<DexCard[]>>();

export async function getSetCardsCached(setId: string): Promise<DexCard[]> {
  const hit = cardCache.get(setId);
  if (hit && Date.now() - hit.at < REGION_TTL_MS) return hit.data;
  const inflight = cardInflight.get(setId);
  if (inflight) return inflight;
  const p = buildSetCards(setId)
    .then((data) => {
      cardCache.set(setId, { at: Date.now(), data });
      return data;
    })
    .finally(() => cardInflight.delete(setId));
  cardInflight.set(setId, p);
  return p;
}

/** 데이터 갱신 후 즉시 반영이 필요할 때 호출(전 지역/세트 무효화). */
export function clearRegionCaches(): void {
  packCache.clear();
  cardCache.clear();
}
