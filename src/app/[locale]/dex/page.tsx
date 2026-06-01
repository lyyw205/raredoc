import type { Metadata } from "next";
import { DexCatalog, type DexSet } from "@/components/dex/DexCatalog";
import { Container } from "@/components/toss";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserCollection } from "@/lib/services/collection";
import {
  pickLocale,
  type LocaleSummary,
  type LogicalCardMeta,
} from "@/lib/cards/queries";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "카드 도감 — Raredoc" };

export default async function DexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 로그인 시 실제 보유 컬렉션 조회 (cardId → 보유 정보)
  const user = await getCurrentUser();
  const owned = new Map<string, { grade: string; certified: boolean }>();
  if (user) {
    const collection = await getUserCollection(user.id);
    for (const item of collection) {
      if (!owned.has(item.cardId)) {
        owned.set(item.cardId, { grade: item.grade, certified: item.certified });
      }
    }
  }

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

  const preferred: "ko" | "ja" | "en" =
    locale === "ja" ? "ja" : locale === "en" ? "en" : "ko";

  const REGION_ORDER = ["EN", "JP", "KR"] as const;
  const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

  const sets: DexSet[] = groupMetas
    .filter((meta) => meta.logicalCards.length > 0)
    .map((meta) => {
    const id = meta.id;
    const logo = meta.sets.find((s) => s.logoUrl)?.logoUrl ?? undefined;
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
        const own = owned.get(primary.id);
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
          owned: !!own,
          grade: own?.grade,
          certified: own?.certified ?? false,
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

    return {
      id,
      name,
      era: meta.era,
      logoUrl: logo,
      cards,
      names,
      releaseDate: fmtDate(meta.releaseDate),
      regions: [...regions],
      regionSets,
    };
  });

  return (
    <Container size="xl" padding="md" className="py-8">
      <DexCatalog sets={sets} locale={locale} />
    </Container>
  );
}
