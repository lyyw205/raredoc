import type { Metadata } from "next";
import { DexCatalog, type DexSet } from "@/components/dex/DexCatalog";
import { Container } from "@/components/toss";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserCollection } from "@/lib/services/collection";
import { getDexCatalog, type DexPreferred } from "@/lib/cards/dex-catalog";

export const metadata: Metadata = { title: "카드 도감 — Raredoc" };

export default async function DexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const preferred: DexPreferred =
    locale === "ja" ? "ja" : locale === "en" ? "en" : "ko";

  // 카탈로그(유저 무관, 1h 캐시)와 세션 조회는 독립 — 병렬
  const [catalog, user] = await Promise.all([
    getDexCatalog(preferred),
    getCurrentUser(),
  ]);

  // 로그인 시 보유 컬렉션을 불변 오버레이 (캐시 객체 변형 금지 — dex-catalog.ts 주석 참조)
  let sets: DexSet[] = catalog;
  if (user) {
    const owned = new Map<string, { grade: string; certified: boolean }>();
    const collection = await getUserCollection(user.id);
    for (const item of collection) {
      if (!owned.has(item.cardId)) {
        owned.set(item.cardId, { grade: item.grade, certified: item.certified });
      }
    }
    if (owned.size > 0) {
      sets = catalog.map((s) => ({
        ...s,
        cards: s.cards.map((c) => {
          const own = owned.get(c.id);
          return own ? { ...c, owned: true, grade: own.grade, certified: own.certified } : c;
        }),
      }));
    }
  }

  return (
    <Container size="xl" padding="md" className="py-8">
      <DexCatalog sets={sets} locale={locale} />
    </Container>
  );
}
