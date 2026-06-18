"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Tab, EmptyState } from "@/components/toss";
import { cn } from "@/lib/utils";
import type { RecommendedDeck, ReprCard, WinnerDeck } from "@/lib/services/cardgame";
import { deckLabel } from "@/lib/cardgame/archetype-ko";
import { Users, ExternalLink, ArrowRight } from "lucide-react";
import { CardThumb } from "@/components/cardgame/CardThumb";
import { DeckCodeButton } from "../tournaments/[id]/DeckCodeButton";
import { formatKrwShort } from "@/lib/format/krw";

// 대회 격 뱃지 라벨 (tournaments LEVEL_LABELS 와 동일 기준 — 최근 1위 덱 탭).
const LEVEL_LABELS: Record<string, string> = {
  online: "온라인",
  league: "코리안리그",
  city: "시티리그",
  cl: "챔피언스리그",
  regional: "리저널",
  ic: "인터내셔널",
  worlds: "월즈",
  special: "스페셜",
};

/** 견적(KRW) → "6.5만" 표기. null = 견적 전. */
function formatCost(krw: number | null): string {
  return formatKrwShort(krw, { suffix: "만", emptyDash: true });
}

// ── 추천 메타 탭 — 덱별 히어로 배너(배경=메인카드 일러스트 + 우측 하단 주요 카드) ──────

// 우측 하단 미니 카드 1장 — 풀카드 썸네일 + 한글 카드명, 연결 시 카드 상세 링크.
function ReprMiniCard({ card, locale }: { card: ReprCard; locale: string }) {
  const inner = (
    <>
      <CardThumb src={card.image} alt={card.name} className="w-full rounded-sm shadow-lg ring-1 ring-black/30" />
      <p
        className="mt-0.5 w-full truncate text-center text-[9px] leading-tight text-white/90"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
      >
        {card.name}
      </p>
    </>
  );
  const width = "w-9 sm:w-10 lg:w-11 shrink-0";
  return card.regionCardId ? (
    <Link
      href={`/${locale}/cards/${card.regionCardId}`}
      title={card.name}
      className={cn("block transition-transform hover:-translate-y-1", width)}
    >
      {inner}
    </Link>
  ) : (
    <div className={width} title={card.name}>
      {inner}
    </div>
  );
}

// 덱 1개 = 히어로 배너 (메타 통계·최근 1위 덱 공용). 배경 일러스트 + 좌측(eyebrow·제목·인라인링크·footer) + 우측 카드.
function DeckBanner({
  heroImage,
  eyebrow,
  title,
  titleLink,
  cards,
  footer,
  locale,
}: {
  heroImage: string | null;
  eyebrow: string | null;
  title: string;
  titleLink?: { href: string; label: string };
  cards: ReprCard[];
  footer: React.ReactNode;
  locale: string;
}) {
  return (
    <div className="relative flex min-h-[7rem] items-center overflow-hidden rounded-lg bg-slate-900 sm:min-h-[8rem]">
      {/* 배경: 메인 카드 일러스트 크롭(풀블리드) */}
      {heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImage}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 24%" }}
        />
      )}
      {/* 좌→우 어둡게 — 텍스트 가독성 */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />

      {/* 좌측: eyebrow + 제목(+인라인 링크) + footer */}
      <div className="relative z-10 flex max-w-[62%] flex-col px-5 py-3 sm:px-7">
        {eyebrow && (
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {eyebrow}
          </span>
        )}
        <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
          <h3 className="break-keep text-lg font-bold text-white drop-shadow-sm sm:text-xl">{title}</h3>
          {titleLink && (
            <Link
              href={titleLink.href}
              className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-white/70 transition-colors hover:text-white"
            >
              {titleLink.label}
              <ArrowRight size={11} />
            </Link>
          )}
        </div>
        {footer}
      </div>

      {/* 우측 하단: 주요 카드 6~8장 */}
      {cards.length > 0 && (
        <div className="absolute bottom-2.5 right-3.5 z-10 hidden items-end gap-1.5 sm:flex">
          {cards.map((c, i) => (
            <ReprMiniCard key={`${c.name}-${i}`} card={c} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메타 통계 탭 — 히어로 배너 + footer 지표(사용률·승률·우승확률·표본수) ──────

// 지표 1세트 = 개별 반투명 흰 카드. 지표명(상) + 수치(하) 세로 스택.
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[3.25rem] flex-col items-center gap-1.5 rounded-md bg-white/10 px-2 py-2 ring-1 ring-white/20 backdrop-blur-sm">
      <span className="text-[10px] leading-none text-white/60">{label}</span>
      <b className="text-[13px] font-bold leading-none tabular-nums text-white">{value}</b>
    </div>
  );
}

// 메타 통계 footer — 4개 카드(지표+수치) 가로 배열. 우승확률 = 우승(1위) 횟수 / 표본수.
function DeckStats({ deck }: { deck: RecommendedDeck }) {
  const champRate = deck.sampleSize > 0 ? (deck.winCount / deck.sampleSize) * 100 : 0;
  return (
    <div className="mt-2 flex w-fit flex-wrap gap-2.5">
      <StatTile label="사용률" value={`${deck.usageRate.toFixed(1)}%`} />
      <StatTile label="승률" value={`${deck.winRate.toFixed(0)}%`} />
      <StatTile label="우승확률" value={`${champRate.toFixed(1)}%`} />
      <StatTile label="표본" value={deck.sampleSize.toLocaleString()} />
    </div>
  );
}

function StatsTab({ decks, locale }: { decks: RecommendedDeck[]; locale: string }) {
  // 사용률 높은 순 정렬.
  const sorted = useMemo(() => [...decks].sort((a, b) => b.usageRate - a.usageRate), [decks]);

  if (sorted.length === 0) {
    return <EmptyState title="통계 데이터가 없습니다" description="대회 데이터가 누적되면 표시됩니다." />;
  }
  return (
    <div className="space-y-4">
      {sorted.map((d) => (
        <DeckBanner
          key={d.id}
          locale={locale}
          heroImage={d.heroImage}
          eyebrow={d.nameEn ?? d.id}
          title={deckLabel(d, d.id)}
          titleLink={{ href: `/${locale}/cardgame/decks/${d.id}`, label: "자세히보기" }}
          cards={d.cards}
          footer={<DeckStats deck={d} />}
        />
      ))}
      <p className="text-toss-micro text-toss-text-quaternary text-center pt-2">
        Limitless TCG 공식 대회 데이터 집계 · 우승확률 = 우승 횟수 ÷ 표본수 · 사용률 높은 순
      </p>
    </div>
  );
}

// ── 최근 1위 덱 탭 — 메타 통계와 동일 배너, footer 만 우승 정보(대회·참가자·견적·덱코드·리스트·출처) ──

// 최근 1위 덱 footer — 2행. 1행=대회 격 뱃지+대회명(+출처), 2행=날짜·참가자·우승자·견적(+리스트/덱코드).
function WinnerInfo({ w, locale }: { w: WinnerDeck; locale: string }) {
  const hasRange = w.deckCostPremium != null && w.deckCostPremium !== w.deckCostBudget;
  const dot = <span className="text-white/40">·</span>;
  return (
    <div className="mt-2 flex flex-col gap-1.5 text-[11px] text-white/85 drop-shadow-sm">
      {/* 1행: 대회 격 + 대회명 + 출처 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {w.tournament.level && LEVEL_LABELS[w.tournament.level] && (
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {LEVEL_LABELS[w.tournament.level]}
          </span>
        )}
        <Link
          href={`/${locale}/cardgame/tournaments/${w.tournament.id}`}
          className="font-medium text-white transition-colors hover:underline"
        >
          {w.tournament.nameKo}
        </Link>
        {w.tournament.externalUrl && (
          <a
            href={w.tournament.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-white/60 transition-colors hover:text-white"
          >
            출처
            <ExternalLink size={10} />
          </a>
        )}
      </div>
      {/* 2행: 날짜 · 참가자 · 견적 + 리스트/덱코드 (우승자명은 eyebrow 에 표기) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{w.tournament.date}</span>
        {dot}
        <span className="inline-flex items-center gap-0.5">
          <Users size={11} />
          {w.tournament.players}명
        </span>
        {w.deckCostBudget != null && (
          <>
            {dot}
            <span>
              견적{" "}
              <b className="font-semibold tabular-nums text-white">
                {formatCost(w.deckCostBudget)}
                {hasRange ? ` ~ ${formatCost(w.deckCostPremium)}` : ""}
              </b>
            </span>
          </>
        )}
        {w.deckCode && <DeckCodeButton code={w.deckCode} />}
      </div>
    </div>
  );
}

function WinnersTab({ winners, locale }: { winners: WinnerDeck[]; locale: string }) {
  if (winners.length === 0) {
    return (
      <EmptyState
        title="최근 우승 덱이 없습니다"
        description="덱리스트가 제출된 우승 기록이 누적되면 표시됩니다."
      />
    );
  }
  return (
    <div className="space-y-4">
      {winners.map((w) => (
        <DeckBanner
          key={w.standingId}
          locale={locale}
          heroImage={w.heroImage}
          eyebrow={w.playerName}
          title={w.deckNameKo ?? "미분류 덱"}
          titleLink={{ href: `/${locale}/cardgame/lists/${w.standingId}`, label: "자세히보기" }}
          cards={w.cards}
          footer={<WinnerInfo w={w} locale={locale} />}
        />
      ))}
      <p className="text-toss-micro text-toss-text-quaternary text-center pt-2">
        최근 정본 대회 1위 입상 덱 · 우측 카드는 대표 카드(실제 제출 덱리스트와 다를 수 있음)
      </p>
    </div>
  );
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

type TabKey = "stats" | "winners";

const TABS: { value: TabKey; label: string }[] = [
  { value: "stats",       label: "메타 통계" },
  { value: "winners",     label: "최근 1위 덱" },
];

export function DecksPageView({
  locale,
  recommended,
  winners,
}: {
  locale: string;
  recommended: RecommendedDeck[];
  winners: WinnerDeck[];
}) {
  const [tab, setTab] = useState<TabKey>("stats");

  return (
    <div>
      {/* 탭 */}
      <Tab.Root value={tab} onChange={(v) => setTab(v as TabKey)}>
        <Tab.List className="mb-6">
          {TABS.map((t) => (
            <Tab.Trigger key={t.value} value={t.value}>
              {t.label}
            </Tab.Trigger>
          ))}
        </Tab.List>

        <Tab.Panel value="stats">
          <StatsTab decks={recommended} locale={locale} />
        </Tab.Panel>
        <Tab.Panel value="winners">
          <WinnersTab winners={winners} locale={locale} />
        </Tab.Panel>
      </Tab.Root>
    </div>
  );
}
