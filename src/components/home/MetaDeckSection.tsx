import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRecommendedDecks, type ArchetypeSummary, type ResolvedCard } from "@/lib/services/cardgame";
import { cn } from "@/lib/utils";
import { TypeIcon } from "@/components/pokemon/TypeIcon";

// ── 색상 상수 ─────────────────────────────────────────────────────────────────
// lolchess.gg /meta 의 덱 컴프 행(.css-3q0xzn) 구조·간격을 채용하되 토스 라이트 테마로.
// 3단 세로 스택: ① 덱 이름+티어 ② 주요 특성(타입 아이콘 28px) ③ 주요 카드(포트레잇 36px).

const TIER_BADGE: Record<string, string> = {
  S: "bg-red-500 text-white",
  A: "bg-orange-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-gray-400 text-white",
};

// 포켓몬 타입 아이콘 (풀·불·물 …) — DexCatalog 의 타입 메타와 동일 컨벤션.
const TYPE_ICON: Record<string, { emoji: string; label: string; chip: string; ring: string }> = {
  grass:     { emoji: "🌿", label: "풀",     chip: "bg-green-100 text-green-700",  ring: "ring-green-400" },
  fire:      { emoji: "🔥", label: "불꽃",   chip: "bg-red-100 text-red-700",      ring: "ring-red-400" },
  water:     { emoji: "💧", label: "물",     chip: "bg-sky-100 text-sky-700",      ring: "ring-sky-400" },
  lightning: { emoji: "⚡", label: "번개",   chip: "bg-yellow-100 text-yellow-700", ring: "ring-yellow-400" },
  psychic:   { emoji: "🔮", label: "에스퍼", chip: "bg-purple-100 text-purple-700", ring: "ring-purple-400" },
  fighting:  { emoji: "👊", label: "격투",   chip: "bg-orange-100 text-orange-700", ring: "ring-orange-400" },
  darkness:  { emoji: "🌑", label: "악",     chip: "bg-gray-700 text-gray-100",    ring: "ring-gray-700" },
  metal:     { emoji: "⚙️", label: "강철",   chip: "bg-slate-200 text-slate-700",  ring: "ring-slate-400" },
  dragon:    { emoji: "🐉", label: "드래곤", chip: "bg-indigo-100 text-indigo-700", ring: "ring-indigo-400" },
  colorless: { emoji: "⭐", label: "무색",   chip: "bg-gray-100 text-gray-600",    ring: "ring-gray-300" },
  fairy:     { emoji: "🌸", label: "페어리", chip: "bg-pink-100 text-pink-700",    ring: "ring-pink-400" },
};

// ── 덱 행(row) ────────────────────────────────────────────────────────────────

function MetaDeckRow({
  deck,
  cards,
  locale,
}: {
  deck: ArchetypeSummary;
  cards: Record<string, ResolvedCard>;
  locale: string;
}) {
  const heroCards = deck.heroCardIds.map((id) => cards[id]).filter(Boolean);
  const countById = Object.fromEntries(deck.cardList.map((c) => [c.cardId, c.count]));
  // 주요 특성 = 덱에 등장하는 카드 타입(중복 제거).
  const types = Array.from(new Set(heroCards.map((c) => c.type)));

  return (
    <Link
      href={`/${locale}/cardgame/decks/${deck.id}`}
      className="group grid grid-cols-[9rem_8rem_1fr_auto] items-center gap-4 rounded-toss-lg border border-toss-divider bg-toss-bg-base px-4 py-5 hover:border-toss-brand hover:bg-toss-hover transition-all"
    >
      {/* 1컬럼: 덱 이름 (줄바꿈) + HOT */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-toss-md text-toss-caption font-extrabold shrink-0", TIER_BADGE[deck.tier])}>
            {deck.tier}
          </span>
          <h3 className="text-toss-label font-bold text-toss-text-primary leading-tight group-hover:text-toss-brand transition-colors">
            {deck.nameKo}
          </h3>
        </div>
        {deck.tier === "S" && (
          <span className="inline-flex items-center gap-0.5 text-toss-micro font-bold text-toss-positive">
            🔥 HOT
          </span>
        )}
      </div>

      {/* 2컬럼: 특성 (타입 아이콘 28px) */}
      <div className="flex flex-wrap items-center gap-1">
        {types.map((t) => (
          <TypeIcon key={t} type={t} size={28} />
        ))}
      </div>

      {/* 3컬럼: 카드 리스트 (포트레잇 52px) */}
      <div className="flex flex-wrap gap-1.5 min-w-0">
        {heroCards.map((card) => (
          <div key={card.id} className="flex flex-col items-center w-[52px]">
            <div className={cn("relative w-[52px] h-[52px] rounded-toss-sm overflow-hidden bg-toss-bg-muted ring-2", TYPE_ICON[card.type]?.ring ?? "ring-gray-300")}>
              {card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.imageUrl} alt={card.nameKo} className="w-full h-full object-cover object-top" />
              ) : null}
              {countById[card.id] ? (
                <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-bold leading-none px-1 py-0.5 rounded-tl">
                  ×{countById[card.id]}
                </span>
              ) : null}
            </div>
            <span className="mt-1 w-full text-center text-[10px] leading-tight text-toss-text-tertiary truncate">
              {card.nameKo}
            </span>
          </div>
        ))}
      </div>

      {/* 4컬럼: 화살표 */}
      <ChevronRight className="shrink-0 w-5 h-5 text-toss-text-quaternary group-hover:text-toss-brand transition-colors" />
    </Link>
  );
}

// ── 섹션 ──────────────────────────────────────────────────────────────────────

// 추천 순서는 서비스가 티어순(S → A → B → C)으로 정렬해 상위 4개를 반환한다.
export async function MetaDeckSection({ locale }: { locale: string }) {
  const { decks, cards } = await getRecommendedDecks(4);

  return (
    <section>
      {/* 카드 밖 헤더 */}
      <div className="mb-3">
        <h2 className="text-toss-title font-bold text-toss-text-primary">추천 메타</h2>
        <p className="text-toss-caption text-toss-text-quaternary mt-1">
          v17.3 시즌 17 환경 · 지금 강한 덱 추천
        </p>
      </div>

      <div className="space-y-3">
        {decks.map((deck) => (
          <MetaDeckRow key={deck.id} deck={deck} cards={cards} locale={locale} />
        ))}
      </div>
    </section>
  );
}
