import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { searchCards } from "@/lib/api/pokemontcg";
import { prisma } from "@/lib/prisma";
import { OwnersList, type Owner } from "@/components/cards/OwnersList";

export const revalidate = 3600;

// ── 카드 조회 (DB-first + pokemontcg.io fallback) ────────────────────────────
async function getCard(cardId: string) {
  const dbCard = await prisma.card
    .findUnique({ where: { id: cardId }, include: { set: true } })
    .catch(() => null);

  if (dbCard) {
    return {
      id: dbCard.id,
      name: dbCard.name,
      nameKo: dbCard.nameKo,
      number: dbCard.number,
      rarity: dbCard.rarity,
      imageSmall: dbCard.imageSmall ?? "",
      imageLarge: dbCard.imageLarge ?? dbCard.imageSmall ?? "",
      setName: dbCard.set.name,
      setNameKo: dbCard.set.nameKo,
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

// ── 카드 id 기반 결정적 목업 보유자 생성 (실데이터 연동 전) ──────────────────
const MOCK_PROFILES = [
  { username: "chaeyeon",      displayName: "채연",     initial: "채", tier: "DIAMOND" as const },
  { username: "raymond_tcg",   displayName: "레이먼드", initial: "레", tier: "LEGEND"  as const },
  { username: "minjun_",       displayName: "민준",     initial: "민", tier: "DIAMOND" as const },
  { username: "sora_cards",    displayName: "소라",     initial: "소", tier: "GOLD"    as const },
  { username: "jihun99",       displayName: "지훈",     initial: "지", tier: "GOLD"    as const },
  { username: "nari_collect",  displayName: "나리",     initial: "나", tier: "GOLD"    as const },
  { username: "taeyang_k",     displayName: "태양",     initial: "태", tier: "GOLD"    as const },
  { username: "hyunwoo_r",     displayName: "현우",     initial: "현", tier: "SILVER"  as const },
  { username: "jieun_tcg",     displayName: "지은",     initial: "지", tier: "SILVER"  as const },
  { username: "wonjae",        displayName: "원재",     initial: "원", tier: "SILVER"  as const },
  { username: "boxseller_k",   displayName: "박상자",   initial: "박", tier: "GOLD"    as const },
  { username: "intl_collector",displayName: "국제",     initial: "국", tier: "SILVER"  as const },
  { username: "yura_psa",      displayName: "유라",     initial: "유", tier: "DIAMOND" as const },
  { username: "tcg_dad",       displayName: "TCG아빠",   initial: "T", tier: "BRONZE"  as const },
  { username: "kim_collector", displayName: "김컬렉터", initial: "김", tier: "GOLD"    as const },
];

const GRADES: Owner["grade"][]    = ["NM", "NM", "NM", "LP", "LP", "MP", "HP"];
const TIME_BUCKETS = ["방금 전", "5분 전", "30분 전", "1시간 전", "3시간 전", "어제", "2일 전", "1주 전", "2주 전", "1개월 전"];

function mockOwners(cardId: string): Owner[] {
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = ((hash << 5) - hash + cardId.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash);
  const total = 6 + (h % 9); // 6~14 명

  return MOCK_PROFILES.slice(0, total).map((p, i) => {
    const seed = h + i * 31;
    const hasPrice = (seed % 10) < 7;            // 70% 호가 있음
    const offerAvailable = (seed % 10) < 6;      // 60% DM 수신 허용
    const grade = GRADES[(seed >> 3) % GRADES.length];
    const basePrice = 180_000 + ((seed >> 1) % 200) * 1_000; // 18만 ~ 38만
    return {
      username: p.username,
      displayName: p.displayName,
      initial: p.initial,
      tier: p.tier,
      grade,
      certified: (seed >> 4) % 3 === 0,
      askingPrice: hasPrice ? Math.round(basePrice / 1000) * 1000 : null,
      offerAvailable,
      addedAt: TIME_BUCKETS[(seed >> 6) % TIME_BUCKETS.length],
    };
  });
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

  const owners = mockOwners(cardId);
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
        <img
          src={card.imageSmall}
          alt={card.name}
          className="w-16 rounded-lg shrink-0"
        />
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
        ※ DM 수신을 허용한 보유자에게만 구매 제안을 보낼 수 있습니다. 보유자가 컬렉션 등록 시 선택한 옵션입니다.
      </p>

      {/* 보유자 리스트 (필터/정렬) */}
      <OwnersList owners={owners} locale={locale} cardId={cardId} />
    </div>
  );
}
