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
import { resolveSidebarTitle } from "./set-meta";
import type { DexCard, DexCardVariant } from "@/components/dex/DexCatalog";

export type Region = "JP" | "EN" | "KR";

export type RegionPack = {
  setId: string;
  code: string | null; // 지역 세트 코드 (JP M5/svXX, EN ptcgoCode, KR 사이트ID)
  name: string;
  era: string;
  eraOrder: number;
  releaseDate: string | null; // ISO yyyy-mm-dd
  cardCount: number;
  logoUrl: string | null;
  isEtc: boolean;
  packType: string | null; // set-meta.ts PackType slug (확장팩/특전박스/…) — 사이드바 뱃지·필터·정렬용
  mergeOf?: number; // CardPackLink wave 수(>1 합본) — 합본 뱃지용
};

const REGION_TTL_MS = 3_600_000; // 1h
const ETC_ERA_ORDER = 9_000; // isEtc 는 항상 맨뒤로(eraOrder 큰값)

/**
 * 정규확장팩 사이드바 표기 축약 — "스칼렛&바이올렛 확장팩 「흑염의 지배자」" → "흑염의 지배자".
 * 본탄 확장팩/강화확장팩/하이클래스팩(raw era 가 -SP 로 끝나지 않음)에만 적용. 스타터·트레이너박스·
 * 덱·프로모·배틀강화BOX 등 SP 특전상품(era 가 *-SP)과 cardPack 없는 isEtc(rawEra=null)는 원래 이름 유지.
 * 「…」 괄호가 없으면 그대로(콜렉션 X·라이징 피스트 등). EN 은 괄호가 없어 자연히 무변환.
 */
export function shortenPackName(fullName: string, rawEra: string | null | undefined): string {
  if (!rawEra || rawEra.endsWith("-SP")) return fullName;
  const m = fullName.match(/「([^」]+)」/);
  return m ? m[1] : fullName;
}

// ── 팩 목록 (지역별) ────────────────────────────────────────────────────────
async function buildRegionPacks(region: Region, preferred: "ko" | "ja" | "en"): Promise<RegionPack[]> {
  const [sets, waveGroups] = await Promise.all([
    prisma.set.findMany({
      where: { region },
      select: {
        id: true,
        code: true,
        name: true,
        nameKo: true,
        nameJa: true,
        releaseDate: true,
        logoUrl: true,
        series: true,
        packType: true,
        titleCleanKo: true,
        titleCleanJa: true,
        titleCleanEn: true,
        cardPack: {
          select: {
            era: true,
            nameKo: true,
            nameJa: true,
            nameEn: true,
            eraRef: { select: { key: true, order: true } },
          },
        },
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
    // locale 우선 클린 팩명 — 3단 폴백(set-meta.ts resolveSidebarTitle):
    //   Set.titleClean{locale}(백필) → CardPack.name{locale}(canonical) → shortenPackName(미백필 폴백).
    const setTitleClean =
      preferred === "ja" ? s.titleCleanJa : preferred === "ko" ? s.titleCleanKo : s.titleCleanEn;
    const cardPackName =
      preferred === "ja" ? s.cardPack?.nameJa : preferred === "ko" ? s.cardPack?.nameKo : s.cardPack?.nameEn;
    const legacyName = (preferred === "ja" ? s.nameJa : preferred === "ko" ? s.nameKo : null) || s.name;
    return {
      setId: s.id,
      code: s.code ?? null,
      name: resolveSidebarTitle({
        setTitleClean: setTitleClean ?? null,
        cardPackName: cardPackName ?? null,
        legacyName,
        rawEra: s.cardPack?.era,
        shortenPackName,
      }),
      era,
      eraOrder,
      releaseDate: s.releaseDate ? s.releaseDate.toISOString().slice(0, 10) : null,
      cardCount: s._count.localeCards,
      logoUrl: s.logoUrl ?? null,
      isEtc,
      packType: s.packType ?? null,
      ...(wave > 1 ? { mergeOf: wave } : {}),
    };
  });

  // 정렬(최신순): eraOrder(asc, 신시대 먼저 — MEGA=0, isEtc 맨뒤) → releaseDate(desc, 최신 팩 먼저) → id(desc)
  packs.sort((a, b) => {
    const oa = a.isEtc ? ETC_ERA_ORDER : a.eraOrder;
    const ob = b.isEtc ? ETC_ERA_ORDER : b.eraOrder;
    if (oa !== ob) return oa - ob;
    if (a.releaseDate && b.releaseDate) return b.releaseDate.localeCompare(a.releaseDate);
    if (a.releaseDate) return -1;
    if (b.releaseDate) return 1;
    return b.setId.localeCompare(a.setId);
  });

  return packs;
}

const packCache = new Map<string, { at: number; data: RegionPack[] }>();
const packInflight = new Map<string, Promise<RegionPack[]>>();

export async function listRegionPacks(
  region: Region,
  preferred: "ko" | "ja" | "en" = "ko",
): Promise<RegionPack[]> {
  const key = `${region}:${preferred}`;
  const hit = packCache.get(key);
  if (hit && Date.now() - hit.at < REGION_TTL_MS) return hit.data;
  const inflight = packInflight.get(key);
  if (inflight) return inflight;
  const p = buildRegionPacks(region, preferred)
    .then((data) => {
      if (data.length > 0) packCache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => packInflight.delete(key));
  packInflight.set(key, p);
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
          // 임시: 카드별 지역 형제(JP/EN/KR 인라인 토글용). 매핑 검증 후 제거 예정.
          locales: {
            select: {
              id: true, region: true, name: true, number: true, imageSmall: true,
              rarity: {
                select: {
                  code: true, nameKo: true, nameJa: true, nameEn: true, tier: true,
                  category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ numberInt: "asc" }, { number: "asc" }],
  });

  const REGS = ["JP", "EN", "KR"] as const;
  return rcs.map((rc): DexCard => {
    const rar = rc.rarity ?? rc.card.rarity; // 인쇄본별 rarity 우선, LC 폴백
    // 임시: 카드별 지역 형제(variants) — 현재 region 은 rc 자신, 그 외는 같은 Card 의 첫 형제 1개씩.
    const byRegion = new Map<string, DexCardVariant>();
    byRegion.set(rc.region, {
      id: rc.id, region: rc.region, name: rc.name, number: rc.number,
      imageSmall: rc.imageSmall ?? rc.imageLarge ?? null,
      rarity: pickRarityLabel(rc.region, rar) ?? undefined,
      rarityCategoryNameKo: rar?.category?.nameKo ?? undefined,
    });
    for (const v of rc.card.locales) {
      if (byRegion.has(v.region)) continue;
      const vr = v.rarity ?? rc.card.rarity;
      byRegion.set(v.region, {
        id: v.id, region: v.region, name: v.name, number: v.number, imageSmall: v.imageSmall,
        rarity: pickRarityLabel(v.region, vr) ?? undefined,
        rarityCategoryNameKo: vr?.category?.nameKo ?? undefined,
      });
    }
    const variants = REGS.flatMap((reg) => { const v = byRegion.get(reg); return v ? [v] : []; });
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
      variants,
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
