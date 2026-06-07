/**
 * /dex 카탈로그 데이터 빌더 — 유저 무관 부분(SetGroup 전체 × LC × locale 쿼리 + 매핑 + 정렬)을
 * unstable_cache(1h, 태그 "dex-catalog")로 캐시한다. 보유(owned) 오버레이는 page 가 요청별로 얹는다.
 *   - 캐시 항목은 같은 프로세스에서 참조 공유될 수 있으므로 호출부에서 절대 변형(mutate) 금지 — 불변 오버레이만.
 *   - 데이터 갱신 직후 즉시 반영이 필요하면 revalidateTag("dex-catalog").
 * 배경: 2GB 셀프호스트에서 매 요청 ~8초 SSR(원격 DB 수만 행) → 캐시 적중 시 DB 0회.
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pickLocale, type LocaleSummary, type LogicalCardMeta } from "./queries";
import { canonEra, eraOrderIndex } from "./eras";
import type { DexSet } from "@/components/dex/DexCatalog";

export type DexPreferred = "ko" | "ja" | "en";

async function buildDexCatalog(preferred: DexPreferred): Promise<DexSet[]> {
  // SetGroup 전체(출시일 desc) — 카드 메타는 가벼운 select 로(JSON/큰 배열 제외)
  const groupMetas = await prisma.setGroup
    .findMany({
      orderBy: [{ releaseDate: "desc" }, { order: "asc" }],
      include: {
        sets: {
          select: {
            id: true,
            region: true,
            name: true,
            nameKo: true,
            nameJa: true,
            releaseDate: true,
            cardCount: true,
            code: true,
            logoUrl: true,
          },
        },
        logicalCards: {
          select: {
            id: true,
            types: true,
            supertype: true,
            rarity: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } } },
            locales: {
              select: {
                id: true,
                language: true,
                region: true,
                name: true,
                number: true,
                numberInt: true,
                flavorText: true,
                imageSmall: true,
                imageLarge: true,
                setId: true,
                set: { select: { name: true, nameKo: true, nameJa: true } },
              },
            },
          },
        },
      },
    })
    .catch(() => []);

  const REGION_ORDER = ["EN", "JP", "KR"] as const;
  const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

  const sets: DexSet[] = groupMetas
    .filter((meta) => meta.logicalCards.length > 0)
    .map((meta) => {
    const id = meta.id;
    // 그룹 대표 로고: JP 우선(도감 JP 기준) → EN(영판 한정발매) → KR → 없으면 숨김
    const logo =
      meta.sets.find((s) => s.region === "JP" && s.logoUrl)?.logoUrl ??
      meta.sets.find((s) => s.region === "EN" && s.logoUrl)?.logoUrl ??
      meta.sets.find((s) => s.logoUrl)?.logoUrl ?? undefined;
    const name = meta.nameKo ?? meta.nameEn ?? meta.nameJa ?? id;

    const cards = meta.logicalCards
      .map((lc) => {
        const locales: LocaleSummary[] = lc.locales.map((l) => ({
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
        }));
        const primary = pickLocale(locales, preferred);
        if (!primary) return null;
        const lcMeta: Pick<LogicalCardMeta, "types" | "supertype"> = {
          types: lc.types,
          supertype: lc.supertype,
        };
        const rarityLabel =
          primary.region === "JP"
            ? lc.rarity?.nameJa ?? lc.rarity?.nameEn ?? lc.rarity?.code
            : primary.region === "KR"
              ? lc.rarity?.nameKo ?? lc.rarity?.nameEn ?? lc.rarity?.code
              : lc.rarity?.nameEn ?? lc.rarity?.code;
        return {
          id: primary.id,
          name: primary.name,
          number: primary.number,
          rarity: rarityLabel ?? undefined,
          rarityTier: lc.rarity?.tier ?? null,
          rarityCategoryCode: lc.rarity?.category?.code ?? undefined,
          rarityCategoryNameKo: lc.rarity?.category?.nameKo ?? undefined,
          rarityCategoryNameJa: lc.rarity?.category?.nameJa ?? undefined,
          rarityCategoryNameEn: lc.rarity?.category?.nameEn ?? undefined,
          rarityCategoryTier: lc.rarity?.category?.tier ?? null,
          types: lcMeta.types.length > 0 ? lcMeta.types : undefined,
          supertype: lcMeta.supertype ?? undefined,
          region: primary.region,
          imageSmall: primary.imageSmall ?? primary.imageLarge ?? null,
          imageLarge: primary.imageLarge ?? primary.imageSmall ?? null,
          // 보유 정보는 유저별 — page 의 불변 오버레이가 채운다 (캐시에는 기본값만)
          owned: false,
          grade: undefined as string | undefined,
          certified: false,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        const na = parseInt(a.number, 10);
        const nb = parseInt(b.number, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.number.localeCompare(b.number);
      });

    // 지역별 발매 정보 + 다국어명 (확장팩 페이지와 동일 규칙)
    const regions = REGION_ORDER.filter((r) => meta.sets.some((s) => s.region === r));
    const krSet = meta.sets.find((s) => s.region === "KR");
    const jpSet = meta.sets.find((s) => s.region === "JP");
    const enSet = meta.sets.find((s) => s.region === "EN");
    const names: { KR?: string; JA?: string; EN?: string } = {};
    if (krSet) { const v = krSet.nameKo ?? krSet.name ?? meta.nameKo ?? undefined; if (v) names.KR = v; }
    if (jpSet) { const v = jpSet.nameJa ?? jpSet.name ?? meta.nameJa ?? undefined; if (v) names.JA = v; }
    if (enSet) { const v = enSet.name ?? meta.nameEn ?? undefined; if (v) names.EN = v; }

    const regionSets = [...meta.sets]
      .sort((a, b) => REGION_ORDER.indexOf(a.region as never) - REGION_ORDER.indexOf(b.region as never))
      .map((s) => ({
        region: s.region,
        name: s.name,
        releaseDate: fmtDate(s.releaseDate),
        cardCount: s.cardCount,
        code: s.code ?? null,
      }));

    // EN 단독 발매 = EN 발매판은 있으나 JP 원판이 없는 그룹 (Generations·Champion's Path·Promos 등)
    const isEnOnly = regions.includes("EN") && !regions.includes("JP");
    // 강화확장팩·특수상품(덱/굿즈) — 해당 era 하단에 몰아 노출
    const isSpecial = /-SP$/.test(meta.era) || /-(decks|goods)$/.test(meta.id);

    return {
      id,
      name,
      era: canonEra(meta.era),
      logoUrl: logo,
      cards,
      names,
      releaseDate: fmtDate(meta.releaseDate),
      regions: [...regions],
      regionSets,
      enName: names.EN ?? null,
      isEnOnly,
      isSpecial,
    };
  });

  // 카테고리(era) 연대 신→구, 카테고리 내부는 JP 발매 내림차순(최신→base), 특수상품은 하단.
  sets.sort((a, b) => {
    const ea = eraOrderIndex(a.era) - eraOrderIndex(b.era);
    if (ea !== 0) return ea;
    const sp = (a.isSpecial ? 1 : 0) - (b.isSpecial ? 1 : 0);
    if (sp !== 0) return sp;
    if (a.releaseDate && b.releaseDate) return b.releaseDate.localeCompare(a.releaseDate);
    if (a.releaseDate) return -1; // 날짜 없는 그룹은 항상 하단
    if (b.releaseDate) return 1;
    return 0;
  });

  return sets;
}

export const getDexCatalog = unstable_cache(buildDexCatalog, ["dex-catalog"], {
  revalidate: 3600,
  tags: ["dex-catalog"],
});
