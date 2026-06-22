/**
 * /dex 지역탭(JP/KR/EN) 데이터층 — 팩 목록은 Set 테이블 출발(세트당 1행 = 자연 dedupe),
 * 카드는 팩 선택 시 lazy 로드(getSetCardsCached). 둘 다 유저 무관 인메모리 TTL(1h) 캐시.
 *   - 팩목록을 CardPackLink 로 뽑으면 합본(sv1)이 여러 wave 에 중복 등재돼 폭발 → Set 기준이 정답.
 *   - 정렬: Era.order(asc, MEGA=0..BASE) → Set.releaseDate(asc) → Set.id. isEtc(EN 프로모 등)는 맨뒤.
 *   - 캐시 항목은 프로세스 공유 참조 — 호출부 절대 변형(mutate) 금지. owned 오버레이는 액션이 불변으로 얹는다.
 *   - 무효화는 clearRegionCaches().
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { pickRarityLabel } from "./card-fields";
import { resolveSiblings, isUnavailable, type SiblingCandidate } from "./sibling-resolver";
import { CROSS_PACK_SIBLINGS_ENABLED, loadArtGroupCandidatesBatch, type ArtGroupEntry } from "./cross-pack-siblings";
import { canonEra, eraOrderIndex, isKnownEra } from "./eras";
import { resolveSidebarTitle } from "./set-meta";
import { buildSearchText, matchesSearch } from "@/lib/search";
import type { DexCard, DexCardVariant } from "@/components/dex/DexCatalog";

export type Region = "JP" | "EN" | "KR";

export type RegionPack = {
  setId: string;
  code: string | null; // 지역 세트 코드 (JP M5/svXX, EN ptcgoCode, KR 사이트ID)
  cardPackId: string | null; // 그룹(CardPack) id — 지역 트윈(JP/KR/EN) 매칭용
  name: string;
  nameSub?: string; // 병기 부제(EN판=한글명, JP/KR판=일본 원어명) — name 과 다를 때만 채움
  era: string;
  eraOrder: number;
  releaseDate: string | null; // ISO yyyy-mm-dd
  cardCount: number;
  logoUrl: string | null;
  isEtc: boolean;
  packType: string | null; // set-meta.ts PackType slug (확장팩/특전박스/…) — 사이드바 뱃지·필터·정렬용
  mergeOf?: number; // CardPackLink wave 수(>1 합본) — 합본 뱃지용
  searchText?: string; // 교차언어 팩명 검색 인덱스(다국어 팩명 + 코드 정규화 결합)
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
        cardPackId: true,
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
      // setGroupId NULL(EN 프로모/POP/맥도날드/킷 등) — series 폴백으로 시대 추정.
      // 알려진 era(ERA_ORDER)면 그 시대로 분류, 아니면 '기타'. (Era.order == ERA_ORDER 인덱스라 grouped 과 정렬 호환)
      era = canonEra(s.series);
      eraOrder = eraOrderIndex(era);
      isEtc = !isKnownEra(era);
    }
    const wave = mergeMap.get(s.id) ?? 0;
    // locale 우선 클린 팩명 — 3단 폴백(set-meta.ts resolveSidebarTitle):
    //   Set.titleClean{locale}(백필) → CardPack.name{locale}(canonical) → shortenPackName(미백필 폴백).
    const setTitleClean =
      preferred === "ja" ? s.titleCleanJa : preferred === "ko" ? s.titleCleanKo : s.titleCleanEn;
    const cardPackName =
      preferred === "ja" ? s.cardPack?.nameJa : preferred === "ko" ? s.cardPack?.nameKo : s.cardPack?.nameEn;
    const legacyName = (preferred === "ja" ? s.nameJa : preferred === "ko" ? s.nameKo : null) || s.name;
    const name = resolveSidebarTitle({
      setTitleClean: setTitleClean ?? null,
      cardPackName: cardPackName ?? null,
      legacyName,
      rawEra: s.cardPack?.era,
      shortenPackName,
    });
    // 병기 부제(nameSub) — 영문판=한글명, 그 외(JP/KR)=일본 원어명. name 과 다를 때만 노출.
    //   카드 상세 패널과 동일 규칙(EN=영문/한글, JP·KR=한글/일본).
    const nameJaResolved = resolveSidebarTitle({
      setTitleClean: s.titleCleanJa ?? null,
      cardPackName: s.cardPack?.nameJa ?? null,
      legacyName: s.nameJa || s.name,
      rawEra: s.cardPack?.era,
      shortenPackName,
    });
    const nameKoResolved = resolveSidebarTitle({
      setTitleClean: s.titleCleanKo ?? null,
      cardPackName: s.cardPack?.nameKo ?? null,
      legacyName: s.nameKo || s.name,
      rawEra: s.cardPack?.era,
      shortenPackName,
    });
    const nameSub = region === "EN" ? nameKoResolved : nameJaResolved;
    return {
      setId: s.id,
      code: s.code ?? null,
      cardPackId: s.cardPackId ?? null,
      name,
      ...(nameSub && nameSub !== name ? { nameSub } : {}),
      era,
      eraOrder,
      releaseDate: s.releaseDate ? s.releaseDate.toISOString().slice(0, 10) : null,
      cardCount: s._count.localeCards,
      logoUrl: s.logoUrl ?? null,
      isEtc,
      packType: s.packType ?? null,
      ...(wave > 1 ? { mergeOf: wave } : {}),
      // 교차언어 팩명 검색 — 표시명 + 전 지역 팩명/클린명 + 코드 정규화 결합
      searchText: buildSearchText([
        name, nameJaResolved, s.name, s.nameKo, s.nameJa,
        s.titleCleanKo, s.titleCleanJa, s.titleCleanEn,
        s.cardPack?.nameKo, s.cardPack?.nameJa, s.cardPack?.nameEn,
        s.code,
      ]),
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
// RegionCard → DexCard 매핑 공용 select(세트단위·지역단위 페이저 공유). RegionCard 는 @@unique 없음 — dedupe 금지.
const CARD_SELECT = {
  id: true,
  name: true,
  number: true,
  numberInt: true,
  imageSmall: true,
  imageLarge: true,
  region: true,
  setId: true,
  set: { select: { releaseDate: true } },
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
      nameKo: true, // 교차언어 검색 인덱스용(한글 오버레이)
      artCardId: true, // cross-pack 형제 풀 확장용(flag ON 시 사용, flag OFF 시 무시)
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
          id: true, region: true, name: true, number: true, numberInt: true, imageSmall: true,
          setId: true,
          set: { select: { releaseDate: true } },
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
} satisfies Prisma.RegionCardSelect;

type CardRow = Prisma.RegionCardGetPayload<{ select: typeof CARD_SELECT }>;

const REGS = ["JP", "EN", "KR"] as const;

function mapRowToDexCard(
  rc: CardRow,
  artGroupMap?: Map<string, ArtGroupEntry[]> | null,
): DexCard {
  const rar = rc.rarity ?? rc.card.rarity; // 인쇄본별 rarity 우선, LC 폴백
  // 지역 형제(variants) = D3 형제 리졸버(표시 전용). anchor = rc(이 세트/지역의 이 카드).
  //   flag OFF(기본): 풀 = 같은 Card 의 locales(per-pack) — 기존과 동일.
  //   flag ON: artGroupMap 에서 artCardId 그룹 전체 RegionCard 를 후보로(cross-pack). (§0′)
  const toCand = (l: {
    id: string; region: string; setId: string; set: { releaseDate: Date };
    imageSmall: string | null; imageLarge?: string | null;
    numberInt: number | null; number: string;
  }): SiblingCandidate => ({
    id: l.id, region: l.region, setId: l.setId, releaseDate: l.set.releaseDate,
    hasImage: !!(l.imageLarge || l.imageSmall), numberInt: l.numberInt, number: l.number,
  });

  // cross-pack 후보풀 분기(§0′)
  const artCands = rc.card.artCardId ? artGroupMap?.get(rc.card.artCardId) : undefined;
  const candidates: SiblingCandidate[] =
    artCands && artCands.length > 0 ? artCands : rc.card.locales.map(toCand);

  const resolved = resolveSiblings(toCand(rc), candidates);
  const localeById = new Map(rc.card.locales.map((l) => [l.id, l] as const));
  // artGroupMap 이 있을 때는 cross-pack 형제 상세도 맵에서 조회
  const artEntryById = artCands ? new Map(artCands.map((e) => [e.id, e] as const)) : null;
  const byRegion = new Map<string, DexCardVariant>();
  for (const reg of REGS) {
    const pick = resolved[reg];
    if (isUnavailable(pick)) continue;
    if (pick.id === rc.id) {
      byRegion.set(reg, {
        id: rc.id, region: rc.region, name: rc.name, number: rc.number,
        imageSmall: rc.imageSmall ?? rc.imageLarge ?? null,
        rarity: pickRarityLabel(rc.region, rar) ?? undefined,
        rarityCategoryNameKo: rar?.category?.nameKo ?? undefined,
      });
      continue;
    }
    // per-pack 에서 먼저 찾고, 없으면 artGroupMap 에서 조회(cross-pack 형제)
    const v = localeById.get(pick.id);
    if (v) {
      const vr = v.rarity ?? rc.card.rarity;
      byRegion.set(reg, {
        id: v.id, region: v.region, name: v.name, number: v.number, imageSmall: v.imageSmall,
        rarity: pickRarityLabel(v.region, vr) ?? undefined,
        rarityCategoryNameKo: vr?.category?.nameKo ?? undefined,
      });
    } else if (artEntryById) {
      const e = artEntryById.get(pick.id);
      if (e) {
        byRegion.set(reg, {
          id: e.id, region: e.region, name: e.name, number: e.number ?? "", imageSmall: e.imageSmall,
          rarity: pickRarityLabel(e.region, e.rarity) ?? undefined,
          rarityCategoryNameKo: e.rarity?.category?.nameKo ?? undefined,
        });
      }
    }
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
    // 교차언어 검색 인덱스 — 대표명 + 한글 오버레이 + 전 지역 형제명(JP/EN/KR…) 정규화 결합
    searchText: buildSearchText([rc.name, rc.card.nameKo, ...rc.card.locales.map((l) => l.name)]),
  };
}

async function buildSetCards(setId: string): Promise<DexCard[]> {
  const rcs = await prisma.regionCard.findMany({
    where: { setId },
    select: CARD_SELECT,
    orderBy: [{ numberInt: "asc" }, { number: "asc" }],
  });

  // flag ON: 세트 내 고유 artCardId 를 IN 1회로 배치 프리페치(N+1 방지)
  let artGroupMap: Map<string, ArtGroupEntry[]> | null = null;
  if (CROSS_PACK_SIBLINGS_ENABLED) {
    const artIds = [
      ...new Set(
        rcs
          .map((rc) => rc.card.artCardId)
          .filter((id): id is string => id != null),
      ),
    ];
    if (artIds.length > 0) {
      artGroupMap = await loadArtGroupCandidatesBatch(artIds);
    }
  }

  return rcs.map((rc) => mapRowToDexCard(rc, artGroupMap));
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

/**
 * 카드 목록에 로그인 유저의 보유(owned) 상태를 불변 오버레이. 캐시 객체 변형 금지 → 새 배열 반환.
 * loadSetCards / loadRegionCardsPage 공용.
 */
export async function overlayOwnedStatus(cards: DexCard[], userId: string): Promise<DexCard[]> {
  if (cards.length === 0) return cards;
  const items = await prisma.collectionItem.findMany({
    where: { userId, regionCardId: { in: cards.map((c) => c.id) } },
    select: { regionCardId: true, grade: true, certified: true },
  });
  if (items.length === 0) return cards;

  const owned = new Map<string, { grade: string; certified: boolean }>();
  for (const it of items) {
    if (!owned.has(it.regionCardId)) owned.set(it.regionCardId, { grade: it.grade, certified: it.certified });
  }
  return cards.map((c) => {
    const own = owned.get(c.id);
    return own ? { ...c, owned: true, grade: own.grade, certified: own.certified } : c;
  });
}

// ── 지역 전체("전체" 가상 팩) — 정렬·필터·페이지네이션 ─────────────────────────
// 무한스크롤용. 무거운 이미지 없이 지역 전체 카드의 정렬/필터 키만 담은 라이트 카탈로그를
// 1회 빌드·캐시하고, 필터·정렬은 JS 에서 적용(클라 필터 로직과 동일), 페이지 id 만 풀 로드.
type RegionCatalogRow = {
  id: string;
  name: string;
  numberInt: number | null;
  number: string;
  supertype: string | null;
  types: string[];
  categoryCode: string | null;
  categoryTier: number | null;
  categoryNameKo: string | null;
  categoryNameJa: string | null;
  categoryNameEn: string | null;
  searchText: string; // 교차 언어 검색용 — 대표명 + 논리카드 다국어명(JP/EN/KR) 소문자 결합
};

async function buildRegionCatalog(region: Region): Promise<RegionCatalogRow[]> {
  const rows = await prisma.regionCard.findMany({
    where: { region },
    select: {
      id: true, name: true, numberInt: true, number: true,
      rarity: { select: { category: { select: { code: true, tier: true, nameKo: true, nameJa: true, nameEn: true } } } },
      card: {
        select: {
          supertype: true, types: true, nameKo: true,
          gameCard: { select: { supertype: true } },
          rarity: { select: { category: { select: { code: true, tier: true, nameKo: true, nameJa: true, nameEn: true } } } },
          locales: { select: { name: true } }, // 교차 언어 검색용 형제 이름(JP/EN/KR)
        },
      },
      set: { select: { releaseDate: true, series: true, cardPack: { select: { eraRef: { select: { order: true } } } } } },
    },
  });
  const lite = rows.map((r) => {
    const cat = r.rarity?.category ?? r.card.rarity?.category ?? null;
    const ref = r.set.cardPack?.eraRef;
    const row: RegionCatalogRow = {
      id: r.id,
      name: r.name,
      numberInt: r.numberInt,
      number: r.number,
      supertype: r.card.gameCard?.supertype ?? r.card.supertype ?? null,
      types: r.card.types ?? [],
      categoryCode: cat?.code ?? null,
      categoryTier: cat?.tier ?? null,
      categoryNameKo: cat?.nameKo ?? null,
      categoryNameJa: cat?.nameJa ?? null,
      categoryNameEn: cat?.nameEn ?? null,
      searchText: buildSearchText([r.name, r.card.nameKo, ...r.card.locales.map((l) => l.name)]),
    };
    // cardPack 없는 isEtc 는 맨뒤(팩목록 정렬과 동일축).
    return { row, eraOrder: ref ? ref.order : ETC_ERA_ORDER, release: r.set.releaseDate ? r.set.releaseDate.toISOString().slice(0, 10) : null };
  });
  // 기본 정렬 = 팩목록 동일축: eraOrder asc(신시대 먼저) → releaseDate desc(최신 먼저) → numberInt asc(null 뒤) → number → id
  lite.sort((a, b) => {
    if (a.eraOrder !== b.eraOrder) return a.eraOrder - b.eraOrder;
    if (a.release !== b.release) {
      if (!a.release) return 1;
      if (!b.release) return -1;
      return b.release.localeCompare(a.release);
    }
    const an = a.row.numberInt, bn = b.row.numberInt;
    if (an != null && bn != null && an !== bn) return an - bn;
    if ((an == null) !== (bn == null)) return an == null ? 1 : -1;
    const nc = a.row.number.localeCompare(b.row.number, undefined, { numeric: true });
    return nc !== 0 ? nc : a.row.id.localeCompare(b.row.id);
  });
  return lite.map((x) => x.row);
}

const catalogCache = new Map<string, { at: number; data: RegionCatalogRow[] }>();
const catalogInflight = new Map<string, Promise<RegionCatalogRow[]>>();

async function getRegionCatalog(region: Region): Promise<RegionCatalogRow[]> {
  const hit = catalogCache.get(region);
  if (hit && Date.now() - hit.at < REGION_TTL_MS) return hit.data;
  const inflight = catalogInflight.get(region);
  if (inflight) return inflight;
  const p = buildRegionCatalog(region)
    .then((data) => { if (data.length > 0) catalogCache.set(region, { at: Date.now(), data }); return data; })
    .finally(() => catalogInflight.delete(region));
  catalogInflight.set(region, p);
  return p;
}

export type RegionCardSort = "number" | "name" | "rarity";

export type RegionFilterMeta = {
  categories: { code: string; nameKo: string; nameJa?: string; nameEn: string; tier: number }[];
  types: string[];
  supertypes: string[];
};

export type RegionCardPage = {
  cards: DexCard[];
  total: number;
  nextOffset: number | null;
  meta?: RegionFilterMeta; // offset 0 에만 — 모달용 지역 전체 후보
};

/** "전체" 가상 팩: 지역 전체 카드를 서버에서 필터·정렬 후 offset/limit(50) 페이지로 반환. */
export async function buildRegionCardsPage(
  region: Region,
  input: { offset: number; limit: number; search?: string; categories?: string[]; types?: string[]; supertypes?: string[]; sort?: RegionCardSort },
): Promise<RegionCardPage> {
  const cat = await getRegionCatalog(region);
  const search = input.search ?? "";
  const cats = input.categories?.length ? new Set(input.categories) : null;
  const types = input.types?.length ? new Set(input.types) : null;
  const supers = input.supertypes?.length ? new Set(input.supertypes) : null;
  let filtered = cat.filter((c) => {
    if (cats && !(c.categoryCode != null && cats.has(c.categoryCode))) return false;
    if (types && !c.types.some((t) => types.has(t))) return false;
    if (supers && !(c.supertype != null && supers.has(c.supertype))) return false;
    if (!matchesSearch(c.searchText, search)) return false;
    return true;
  });
  if (input.sort === "name") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  else if (input.sort === "rarity") filtered = [...filtered].sort((a, b) => (b.categoryTier ?? -1) - (a.categoryTier ?? -1));
  // "number"/기본 → 카탈로그 기본 정렬(팩순) 유지

  const total = filtered.length;
  const pageIds = filtered.slice(input.offset, input.offset + input.limit).map((r) => r.id);
  let cards: DexCard[] = [];
  if (pageIds.length > 0) {
    const rcs = await prisma.regionCard.findMany({ where: { id: { in: pageIds } }, select: CARD_SELECT });
    // flag ON: 페이지 내 고유 artCardId 배치 프리페치(페이지 크기 50 — 소규모)
    let artGroupMap: Map<string, ArtGroupEntry[]> | null = null;
    if (CROSS_PACK_SIBLINGS_ENABLED) {
      const artIds = [
        ...new Set(
          rcs
            .map((rc) => rc.card.artCardId)
            .filter((id): id is string => id != null),
        ),
      ];
      if (artIds.length > 0) {
        artGroupMap = await loadArtGroupCandidatesBatch(artIds);
      }
    }
    const byId = new Map(rcs.map((rc) => [rc.id, mapRowToDexCard(rc, artGroupMap)] as const));
    cards = pageIds.map((id) => byId.get(id)).filter((c): c is DexCard => Boolean(c));
  }
  const nextOffset = input.offset + input.limit < total ? input.offset + input.limit : null;

  let meta: RegionFilterMeta | undefined;
  if (input.offset === 0) {
    const catMap = new Map<string, { tier: number; nameKo: string; nameJa: string | null; nameEn: string }>();
    const typeSet = new Set<string>();
    const superSet = new Set<string>();
    for (const c of cat) {
      if (c.categoryCode && !catMap.has(c.categoryCode)) {
        catMap.set(c.categoryCode, {
          tier: c.categoryTier ?? 999,
          nameKo: c.categoryNameKo ?? c.categoryCode,
          nameJa: c.categoryNameJa,
          nameEn: c.categoryNameEn ?? c.categoryCode,
        });
      }
      for (const t of c.types) typeSet.add(t);
      if (c.supertype) superSet.add(c.supertype);
    }
    meta = {
      categories: [...catMap.entries()]
        .map(([code, v]) => ({ code, nameKo: v.nameKo, nameJa: v.nameJa ?? undefined, nameEn: v.nameEn, tier: v.tier }))
        .sort((a, b) => a.tier - b.tier),
      types: [...typeSet],
      supertypes: [...superSet],
    };
  }
  return { cards, total, nextOffset, meta };
}

/** 데이터 갱신 후 즉시 반영이 필요할 때 호출(전 지역/세트 무효화). */
export function clearRegionCaches(): void {
  packCache.clear();
  cardCache.clear();
  catalogCache.clear();
}
