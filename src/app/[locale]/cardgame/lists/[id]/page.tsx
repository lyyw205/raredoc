import Link from "next/link";
import { ArrowLeft, ExternalLink, Users } from "lucide-react";
import { EmptyState } from "@/components/toss";
import { getStandingDecklist, type DecklistViewCard } from "@/lib/services/cardgame";
import { CardThumb } from "@/components/cardgame/CardThumb";
import { DeckCodeButton } from "../../tournaments/[id]/DeckCodeButton";

// 리스트 뷰어 — 입상 덱리스트 1건을 카드 이미지 그리드로 (docs/cardgame/cardgame-ui-plan.md §4-5, UI-1a).
// 진입: 덱 상세 입상 타임라인 · 대회 상세 [리스트 보기]. 💰합계는 견적 엔진(UI-1b) 후 추가.

function ordinal(n: number): string {
  return `${n}위`;
}

function Bucket({ title, cards, locale }: { title: string; cards: DecklistViewCard[]; locale: string }) {
  if (cards.length === 0) return null;
  const total = cards.reduce((a, c) => a + c.count, 0);
  return (
    <section className="mb-8">
      <h2 className="text-toss-title font-bold text-toss-text-primary mb-3">
        {title} <span className="text-toss-caption font-normal text-toss-text-tertiary">({total}장)</span>
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {cards.map((c, i) =>
          c.regionCardId ? (
            <Link key={`${c.name}-${i}`} href={`/${locale}/cards/${c.regionCardId}`} className="block hover:opacity-90 transition-opacity">
              <CardThumb src={c.image} alt={c.name} count={c.count} />
              <p className="mt-1 text-toss-micro text-toss-text-tertiary truncate text-center">{c.name}</p>
            </Link>
          ) : (
            <div key={`${c.name}-${i}`}>
              <CardThumb src={c.image} alt={c.name} count={c.count} />
              <p className="mt-1 text-toss-micro text-toss-text-quaternary truncate text-center">{c.name}</p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

export default async function DecklistViewerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const data = await getStandingDecklist(id);

  if (!data) {
    return (
      <div>
        <Link
          href={`/${locale}/cardgame/tournaments`}
          className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary mb-6"
        >
          <ArrowLeft size={14} />
          대회 목록으로
        </Link>
        <EmptyState title="덱리스트를 찾을 수 없습니다" description="잘못된 링크이거나 덱리스트가 제출되지 않은 입상 기록입니다." />
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/${locale}/cardgame/tournaments/${data.tournament.id}`}
        className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary mb-6"
      >
        <ArrowLeft size={14} />
        {data.tournament.nameKo}
      </Link>

      {/* 컨텍스트 헤더 — 대회 컨텍스트 보존 원칙 (벤치마크 A급 패턴 8) */}
      <div className="mb-6">
        <h1 className="text-toss-display font-bold text-toss-text-primary">
          {ordinal(data.placing)} · {data.playerName}
        </h1>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          {data.deckKey ? (
            <Link href={`/${locale}/cardgame/decks/${data.deckKey}`} className="text-toss-label font-semibold text-toss-brand hover:underline">
              {data.deckNameKo}
            </Link>
          ) : (
            data.deckNameKo && <span className="text-toss-label text-toss-text-secondary">{data.deckNameKo}</span>
          )}
          <span className="text-toss-caption text-toss-text-tertiary">{data.tournament.date}</span>
          <span className="flex items-center gap-1 text-toss-caption text-toss-text-tertiary">
            <Users size={12} />
            {data.tournament.players}명
          </span>
          {data.deckCode && <DeckCodeButton code={data.deckCode} />}
          {data.tournament.externalUrl && (
            <a
              href={data.tournament.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-toss-micro text-toss-text-tertiary hover:text-toss-brand transition-colors"
            >
              <ExternalLink size={11} />
              출처
            </a>
          )}
        </div>
      </div>

      <Bucket title="포켓몬" cards={data.buckets.pokemon} locale={locale} />
      <Bucket title="트레이너스" cards={data.buckets.trainer} locale={locale} />
      <Bucket title="에너지" cards={data.buckets.energy} locale={locale} />

      <p className="text-toss-micro text-toss-text-quaternary mt-2">
        총 {data.totalCards}장
        {data.unresolved > 0 && ` · 이미지 미연결 ${data.unresolved}장 (카드명 표시)`} · 덱 분류는 대회
        데이터 출처의 자동 분류 기준입니다.
      </p>
    </div>
  );
}
