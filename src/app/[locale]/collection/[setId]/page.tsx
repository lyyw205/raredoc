import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCardsBySet, getAllSets } from "@/lib/api/pokemontcg";
import { CollectionBook } from "@/components/collection/CollectionBook";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserCollection } from "@/lib/services/collection";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ setId: string }>;
}): Promise<Metadata> {
  const { setId } = await params;
  const dbSet = await prisma.set
    .findUnique({ where: { id: setId }, select: { name: true } })
    .catch(() => null);
  if (dbSet) return { title: `${dbSet.name} 도감` };

  const sets = await getAllSets().catch(() => []);
  const set = sets.find((s) => s.id === setId);
  return {
    title: set ? `${set.name} 도감` : "컬렉션 도감",
  };
}

export default async function CollectionBookPage({
  params,
}: {
  params: Promise<{ setId: string; locale: string }>;
}) {
  const { setId } = await params;

  const user = await getCurrentUser();

  // 새 ERD: Set + CardLocale + LogicalCard.rarity 조인.
  const dbSet = await prisma.set
    .findUnique({
      where: { id: setId },
      include: {
        localeCards: {
          orderBy: { number: "asc" },
          include: {
            logicalCard: {
              select: {
                rarity: {
                  select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true, category: { select: { code: true, nameKo: true, nameJa: true, nameEn: true, tier: true } } },
                },
              },
            },
          },
        },
      },
    })
    .catch(() => null);

  const collection = user ? await getUserCollection(user.id) : [];

  // 이 세트에서 보유 중인 카드 (cardId → 보유 정보)
  const owned = new Map<string, { grade: string; certified: boolean }>();
  for (const item of collection) {
    if (item.setId === setId && !owned.has(item.cardId)) {
      owned.set(item.cardId, { grade: item.grade, certified: item.certified });
    }
  }

  // ── DB 경로: CardLocale 이 있으면 새 ERD 로 렌더 ──
  if (dbSet && dbSet.localeCards.length > 0) {
    const bookCards = dbSet.localeCards.map((card) => {
      const own = owned.get(card.id);
      const r = card.logicalCard.rarity;
      const rarityLabel =
        card.region === "JP"
          ? r?.nameJa ?? r?.nameEn ?? r?.code
          : card.region === "KR"
            ? r?.nameKo ?? r?.nameEn ?? r?.code
            : r?.nameEn ?? r?.code;
      return {
        id: card.id,
        name: card.name,
        number: card.number,
        rarity: rarityLabel ?? undefined,
        rarityTier: r?.tier ?? null,
        rarityCategoryCode: r?.category?.code ?? undefined,
        rarityCategoryNameKo: r?.category?.nameKo ?? undefined,
        rarityCategoryNameJa: r?.category?.nameJa ?? undefined,
        rarityCategoryNameEn: r?.category?.nameEn ?? undefined,
        rarityCategoryTier: r?.category?.tier ?? null,
        imageSmall: card.imageSmall ?? card.imageLarge ?? "",
        owned: !!own,
        grade: own?.grade,
        certified: own?.certified ?? false,
        region: card.region,
      };
    });

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <CollectionBook
          set={{
            id: setId,
            name: dbSet.name,
            total: dbSet.cardCount || dbSet.localeCards.length,
            logoUrl: dbSet.logoUrl ?? undefined,
          }}
          cards={bookCards}
        />
      </div>
    );
  }

  // ── 영문 API 폴백: DB 에 카드가 없는 EN 세트 보존 ──
  const [cards, sets] = await Promise.all([
    getCardsBySet(setId).catch(() => null),
    getAllSets().catch(() => [] as Awaited<ReturnType<typeof getAllSets>>),
  ]);

  if (!cards || cards.length === 0) notFound();

  const tcgSet = sets.find((s) => s.id === setId);

  const bookCards = cards.map((card) => {
    const own = owned.get(card.id);
    return {
      id: card.id,
      name: card.name,
      number: card.number,
      rarity: card.rarity,
      imageSmall: card.images.small,
      owned: !!own,
      grade: own?.grade,
      certified: own?.certified ?? false,
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <CollectionBook
        set={{
          id: setId,
          name: tcgSet?.name ?? setId,
          total: tcgSet?.total ?? cards.length,
          logoUrl: tcgSet?.images.logo,
        }}
        cards={bookCards}
      />
    </div>
  );
}
