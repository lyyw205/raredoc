import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getCardAdoption, type CardAdoption } from "@/lib/services/cardgame";
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

const REGION_ORDER: Record<string, number> = { KR: 0, JP: 1, EN: 2 };

// ── 카탈로그 카드 타입 (DB → 그리드 표시용) ──────────────────────────────────

type CatalogCard = {
  id: string;             // = CardLocale.id (URL용)
  logicalCardId: string;  // dedupe용
  name: string;           // locale 이름 (KR 우선)
  nameSub: string | null; // 보조 이름 (다른 로케일)
  imageUrl: string;
  rarity: string | null;  // rarity.code
  region: string;
  type: string | null;    // logicalCard.types[0]
  hp: number | null;
  /** 메타 채용 지표 (logicalCardId 매칭 시에만). 없으면 null → 뱃지 미표시. */
  adoption: CardAdoption | null;
};

// ── 데이터 로딩 ───────────────────────────────────────────────────────────────

async function loadCards(params: {
  q?: string;
  type?: string;
  rarity?: string;
  region?: string;
  sort?: string;
  adoptionMap: Map<string, CardAdoption>;
}): Promise<{ cards: CatalogCard[]; adoptionActive: boolean }> {
  const where: Prisma.CardLocaleWhereInput = {};
  if (params.region && params.region !== "all") where.region = params.region;

  const lcWhere: Prisma.LogicalCardWhereInput = {};
  if (params.type && params.type !== "all") lcWhere.types = { has: params.type };
  if (params.rarity && params.rarity !== "all")
    lcWhere.rarity = { code: params.rarity };

  if (Object.keys(lcWhere).length > 0) {
    where.logicalCard = lcWhere;
  }

  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { logicalCard: { illustrator: { contains: q, mode: "insensitive" } } },
    ];
  }

  // DB 조회 — 메타 조인. 정렬은 후처리(set.releaseDate, locale.numberInt).
  const rows = await prisma.cardLocale.findMany({
    where,
    include: {
      logicalCard: {
        include: { rarity: { select: { code: true } } },
      },
      set: { select: { releaseDate: true } },
    },
    take: 600, // dedupe 전 여유 — LogicalCard 단위로 200 확보 위함.
  });

  // dedupe: 같은 LogicalCard 의 여러 locale → KR > JP > EN 우선 1개.
  const byLogical = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const cur = byLogical.get(r.logicalCardId);
    if (!cur) {
      byLogical.set(r.logicalCardId, r);
      continue;
    }
    const a = REGION_ORDER[r.region] ?? 9;
    const b = REGION_ORDER[cur.region] ?? 9;
    if (a < b) byLogical.set(r.logicalCardId, r);
  }

  const deduped = [...byLogical.values()];

  // 같은 logicalCard 다른 locale 의 이름을 nameSub 로
  const allByLogical = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = allByLogical.get(r.logicalCardId) ?? [];
    arr.push(r);
    allByLogical.set(r.logicalCardId, arr);
  }

  // 채용률 정렬은 데이터(채용 지표 맵)가 있을 때만 활성. 없으면(=현재) 발매일순 폴백.
  const adoptionActive = params.sort === "adoption" && params.adoptionMap.size > 0;

  if (adoptionActive) {
    // 채용률순: usageScore 내림차순. 채용 지표 있는 카드 먼저, 동률/미보유는 발매일순.
    deduped.sort((a, b) => {
      const sa = params.adoptionMap.get(a.logicalCardId)?.usageScore ?? -1;
      const sb = params.adoptionMap.get(b.logicalCardId)?.usageScore ?? -1;
      if (sa !== sb) return sb - sa;
      const da = a.set?.releaseDate?.getTime?.() ?? 0;
      const db = b.set?.releaseDate?.getTime?.() ?? 0;
      return db - da;
    });
  } else {
    // 발매일순 (기본): set.releaseDate desc, numberInt asc
    deduped.sort((a, b) => {
      const da = a.set?.releaseDate?.getTime?.() ?? 0;
      const db = b.set?.releaseDate?.getTime?.() ?? 0;
      if (da !== db) return db - da;
      return (a.numberInt ?? 0) - (b.numberInt ?? 0);
    });
  }

  const top = deduped.slice(0, 200);

  const cards = top.map((r) => {
    const others = allByLogical.get(r.logicalCardId) ?? [];
    const sub = others.find((o) => o.id !== r.id);
    const nameKo = r.logicalCard.nameKo;
    return {
      id: r.id,
      logicalCardId: r.logicalCardId,
      name: nameKo ?? r.name,
      nameSub: nameKo ? r.name : (sub?.name ?? null),
      imageUrl: r.imageSmall ?? r.imageLarge ?? "",
      rarity: r.logicalCard.rarity?.code ?? null,
      region: r.region,
      type: r.logicalCard.types[0] ?? null,
      hp: r.logicalCard.hp,
      adoption: params.adoptionMap.get(r.logicalCardId) ?? null,
    };
  });

  return { cards, adoptionActive };
}

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
        {/* 메타 채용 뱃지 (logicalCardId 매칭 시에만) */}
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

  // 카드 채용 지표 맵 (현재 logicalCardId 미매칭 → 빈 Map). A단계 후 자동 채워짐.
  const adoptionMap = await getCardAdoption();

  const { cards, adoptionActive } = await loadCards({
    q: sp.q,
    type: sp.type,
    rarity: sp.rarity,
    region: sp.region,
    sort: sp.sort,
    adoptionMap,
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
