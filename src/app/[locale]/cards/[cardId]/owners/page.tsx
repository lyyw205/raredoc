import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { searchCards } from "@/lib/api/pokemontcg";
import { loadCardByLocaleId } from "@/lib/cards/queries";
import { pickRarityLabel } from "@/lib/cards/card-fields";
import { OwnersList, type Owner } from "@/components/cards/OwnersList";
import { getOwnersForCard } from "@/lib/services/marketplace";
import { getCurrentUser } from "@/lib/auth/session";

// 실데이터(보유자/세션) 의존 → 정적 캐시 비활성
export const dynamic = "force-dynamic";

// ── 카드 조회 (새 ERD 우선 + pokemontcg.io fallback) ──────────────────────────
async function getCard(cardId: string) {
  const loaded = await loadCardByLocaleId(cardId).catch(() => null);

  if (loaded) {
    const { locale, card } = loaded;
    const region = locale.region;
    const rarityLabel = pickRarityLabel(region, {
      nameJa: card.rarityNameJa,
      nameEn: card.rarityNameEn,
      nameKo: card.rarityNameKo,
      code: card.rarityCode,
    });
    return {
      id: locale.id,
      name: locale.name,
      // 한국어명 우선 표시(있을 때만). KR locale 의 name 자체가 한국어.
      nameKo: region === "KR" ? locale.name : null,
      number: locale.number,
      rarity: rarityLabel,
      imageSmall: locale.imageSmall ?? "",
      imageLarge: locale.imageLarge ?? locale.imageSmall ?? "",
      setName: locale.setName,
      setNameKo: locale.setNameKo,
    };
  }

  try {
    const res = await searchCards(`id:${cardId}`, 1);
    const c = res.data[0];
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      nameKo: null,
      number: c.number,
      rarity: c.rarity ?? null,
      imageSmall: c.images.small,
      imageLarge: c.images.large ?? c.images.small,
      setName: c.set.name,
      setNameKo: null,
    };
  } catch {
    return null;
  }
}

// ── 메타데이터 ───────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ cardId: string }>;
}): Promise<Metadata> {
  const { cardId } = await params;
  const card = await getCard(cardId);
  return {
    title: card ? `${card.nameKo ?? card.name} 보유자 — Raredoc` : "보유자 — Raredoc",
  };
}

// ── 페이지 ───────────────────────────────────────────────────────────────────
export default async function CardOwnersPage({
  params,
}: {
  params: Promise<{ cardId: string; locale: string }>;
}) {
  const { cardId, locale } = await params;
  const card = await getCard(cardId);
  if (!card) notFound();

  const viewer = await getCurrentUser();
  const ownerRows = await getOwnersForCard(cardId, viewer?.id ?? null);
  const owners: Owner[] = ownerRows.map((o) => ({
    listingId: o.listingId,
    sellerId: o.seller.id,
    username: o.seller.username,
    displayName: o.seller.displayName,
    initial: o.seller.initial,
    tier: o.seller.tier,
    grade: o.grade,
    certified: o.certified,
    askingPrice: o.askingKrw,
    offerAvailable: o.offerAvailable,
  }));
  const totalOfferable = owners.filter((o) => o.offerAvailable).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* 뒤로 */}
      <a
        href={`../${cardId}`}
        className="text-sm text-gray-400 hover:text-white transition-colors inline-block"
      >
        ← 카드 상세로
      </a>

      {/* 카드 헤더 */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-800 bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {card.imageSmall ? (
          <img
            src={card.imageSmall}
            alt={card.name}
            className="w-16 rounded-lg shrink-0"
          />
        ) : (
          <div className="w-16 h-[88px] rounded-lg shrink-0 bg-gray-800" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">
            {card.nameKo ?? card.name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {card.setNameKo ?? card.setName} · No.{card.number}
            {card.rarity && <> · {card.rarity}</>}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">
            👥 <span className="text-white font-semibold">{owners.length}명</span> 등록
            <span className="text-gray-700 mx-2">·</span>
            💬 <span className="text-yellow-400 font-semibold">{totalOfferable}명</span> 제안 가능
          </p>
        </div>
      </div>

      {/* 안내 */}
      <p className="text-[11px] text-gray-600 px-1">
        ※ 카드를 판매중으로 등록한 보유자에게 구매 제안을 보낼 수 있습니다.
      </p>

      {/* 보유자 리스트 (필터/정렬) */}
      {owners.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500 rounded-2xl border border-gray-800 bg-gray-900">
          아직 이 카드를 판매중으로 등록한 보유자가 없습니다.
        </div>
      ) : (
        <OwnersList
          owners={owners}
          locale={locale}
          cardId={cardId}
          isLoggedIn={!!viewer}
        />
      )}
    </div>
  );
}
