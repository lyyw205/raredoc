import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCardCatalog, type CatalogCard } from "@/lib/services/cardgame";
import { CardgameCardsFilters } from "./CardgameCardsFilters";

// ── 희귀도 색상 ───────────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  C:   "bg-gray-100 text-gray-600",
  U:   "bg-green-100 text-green-700",
  R:   "bg-blue-100 text-blue-700",
  RR:  "bg-indigo-100 text-indigo-700",
  AR:  "bg-purple-100 text-purple-700",
  SR:  "bg-yellow-100 text-yellow-700",
  SAR: "bg-orange-100 text-orange-700",
  UR:  "bg-red-100 text-red-700",
};

// ── 카드 그리드 아이템 ────────────────────────────────────────────────────────

function CardGridItem({ card, locale }: { card: CatalogCard; locale: string }) {
  return (
    <Link href={`/${locale}/cards/${card.id}`} className="group block">
      <div className="aspect-[5/7] rounded-toss-md overflow-hidden bg-toss-bg-muted relative">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-toss-caption text-toss-text-quaternary">
            이미지 없음
          </div>
        )}
        {/* 희귀도 배지 */}
        {card.rarity && (
          <span
            className={cn(
              "absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold",
              RARITY_COLOR[card.rarity] ?? "bg-gray-100 text-gray-600"
            )}
          >
            {card.rarity}
          </span>
        )}
        {/* 지역 배지 */}
        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/55 text-white text-[10px] font-semibold">
          {card.region}
        </span>
        {/* 메타 채용 뱃지 (cardId 매칭 시에만) */}
        {card.adoption && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-toss-brand/90 text-white text-[10px] font-semibold">
            메타 채용 {card.adoption.adoptionRate}%
          </span>
        )}
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-toss-caption font-semibold text-toss-text-primary truncate leading-tight">
          {card.name}
        </p>
        {card.nameSub && (
          <p className="text-toss-micro text-toss-text-tertiary truncate">
            {card.nameSub}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

export default async function CardgameCardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; type?: string; rarity?: string; region?: string; sort?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  // 데이터 접근·뷰모델·정렬·dedupe 는 전부 서비스(getCardCatalog)가 담당 — page 는 얇은 셸.
  const { cards, adoptionActive } = await getCardCatalog({
    q: sp.q,
    type: sp.type,
    rarity: sp.rarity,
    region: sp.region,
    sort: sp.sort,
  });

  // "채용률순" 요청했지만 데이터 미준비 → 안내(발매일순 폴백).
  const adoptionRequestedButEmpty = sp.sort === "adoption" && !adoptionActive;

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary">카드 일람</h1>
        <p className="text-toss-body text-toss-text-tertiary mt-1">
          DB 카드 카탈로그 (최대 200장 표시)
        </p>
      </div>

      {/* 검색 + 필터 (클라이언트 wrapper) */}
      <CardgameCardsFilters
        initial={{ q: sp.q, type: sp.type, rarity: sp.rarity, region: sp.region, sort: sp.sort }}
      />

      {/* 결과 카운트 + 채용률 데이터 준비중 안내 */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-toss-caption text-toss-text-tertiary">{cards.length}장</p>
        {adoptionRequestedButEmpty && (
          <span className="text-toss-caption text-toss-text-quaternary">· 채용률 데이터 준비 중 (발매일순 표시)</span>
        )}
      </div>

      {/* 카드 그리드 */}
      {cards.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-toss-body text-toss-text-tertiary">검색 결과가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <CardGridItem key={card.id} card={card} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
