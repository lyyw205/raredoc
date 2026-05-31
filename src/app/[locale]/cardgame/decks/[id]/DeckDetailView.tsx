"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardDivider,
  Tag,
  EmptyState,
  DataRow,
  Tab,
} from "@/components/toss";
import { cn } from "@/lib/utils";
import type { ArchetypeWithCards, ResolvedCard } from "@/lib/services/cardgame";
import { ArrowLeft, Copy, ExternalLink, CheckCircle2 } from "lucide-react";

// ── 색상 상수 ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  S: "bg-red-100 text-red-700 border border-red-200",
  A: "bg-orange-100 text-orange-700 border border-orange-200",
  B: "bg-blue-100 text-blue-700 border border-blue-200",
  C: "bg-gray-100 text-gray-600 border border-gray-200",
};

const ROLE_COLORS: Record<string, { bg: string; label: string }> = {
  "✓": { bg: "bg-green-100 text-green-700", label: "✓ 채용" },
  "⚠": { bg: "bg-yellow-100 text-yellow-700", label: "⚠ 가변" },
  "✗": { bg: "bg-gray-100 text-gray-500", label: "✗ 불채용" },
};

const TYPE_BG: Record<string, string> = {
  grass:     "bg-green-100 text-green-700",
  fire:      "bg-red-100 text-red-700",
  water:     "bg-blue-100 text-blue-700",
  lightning: "bg-yellow-100 text-yellow-700",
  psychic:   "bg-purple-100 text-purple-700",
  fighting:  "bg-orange-100 text-orange-700",
  darkness:  "bg-gray-800 text-gray-100",
  metal:     "bg-slate-200 text-slate-700",
  dragon:    "bg-indigo-100 text-indigo-700",
  colorless: "bg-gray-100 text-gray-600",
  fairy:     "bg-pink-100 text-pink-700",
};

// 우승 사례 / 카운터 덱 (서버에서 사전 환산)
export type WinnerTournament = {
  id: string;
  nameKo: string;
  date: string;
  region: string;
  format: string;
  players: number;
};
export type CounterArchetype = { id: string; nameKo: string; tier: string };

// ── 덱 코드 mock ──────────────────────────────────────────────────────────────

function mockDeckCode(archetypeId: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  // deterministic pseudo-random based on id
  for (let i = 0; i < 24; i++) {
    const idx = (archetypeId.charCodeAt(i % archetypeId.length) + i * 7) % chars.length;
    code += chars[idx];
    if (i === 7 || i === 15) code += "-";
  }
  return code.slice(0, 26);
}

// ── 덱 총가 mock ──────────────────────────────────────────────────────────────

function mockDeckPrice(usageRate: number): number {
  return Math.round((usageRate * 3800 + 50000) / 100) * 100;
}

// ── 페이지 뷰 ──────────────────────────────────────────────────────────────────

export function DeckDetailView({
  locale,
  archetype,
  winnerTournaments,
  counterArchetypes,
}: {
  locale: string;
  archetype: ArchetypeWithCards;
  winnerTournaments: WinnerTournament[];
  counterArchetypes: CounterArchetype[];
}) {
  const cards = archetype.cards;
  const cardOf = (id: string): ResolvedCard | undefined => cards[id];

  const [activeVariant, setActiveVariant] = useState<string>("standard");
  const [copied, setCopied] = useState(false);

  const deckCode = mockDeckCode(archetype.id);
  const deckPrice = mockDeckPrice(archetype.usageRate);

  // 변형판 탭 목록 (표준형 + variants)
  const variantTabs = [
    { id: "standard", nameKo: "표준형" },
    ...archetype.variants,
  ];

  // 카드 리스트 — 카테고리별 분류 (pokemon / trainer / energy)
  const categorized = {
    포켓몬: archetype.cardList.filter((cl) => {
      const card = cardOf(cl.cardId);
      return card && card.hp > 0;
    }),
    트레이너: archetype.cardList.filter((cl) => {
      const card = cardOf(cl.cardId);
      return card && card.hp === 0 && !cl.cardId.includes("energy") && !cl.cardId.includes("에너지");
    }),
    에너지: archetype.cardList.filter((cl) => {
      const card = cardOf(cl.cardId);
      return card && cl.cardId.includes("energy");
    }),
  };

  // 에너지가 별도로 없는 경우, 마지막 카드를 에너지로 이동
  if (categorized["에너지"].length === 0 && archetype.cardList.length > 0) {
    const last = archetype.cardList[archetype.cardList.length - 1];
    const card = cardOf(last.cardId);
    if (card) {
      categorized["에너지"].push({ cardId: last.cardId, count: 4, role: "✓" });
    }
  }

  // 총 카드 수 계산
  const totalCount = archetype.cardList.reduce((sum, cl) => sum + cl.count, 0);
  // mock: 60장 맞추기 위한 에너지 수
  const energyFill = Math.max(0, 60 - totalCount);
  const displayTotal = totalCount + energyFill;

  const handleCopy = () => {
    navigator.clipboard.writeText(deckCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href={`/${locale}/cardgame/decks`}
        className="inline-flex items-center gap-1 text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary mb-6"
      >
        <ArrowLeft size={14} />
        덱 목록으로
      </Link>

      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <h1 className="text-toss-display font-bold text-toss-text-primary">
            {archetype.nameKo}
          </h1>
          <span
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-toss-md text-sm font-bold shrink-0",
              TIER_COLORS[archetype.tier]
            )}
          >
            {archetype.tier}
          </span>
        </div>

        <div className="flex items-center gap-6 flex-wrap mb-4">
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">사용률</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.usageRate}%</p>
          </div>
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">우승 횟수</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.winCount}회</p>
          </div>
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">평균 등수</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.avgRank.toFixed(1)}위</p>
          </div>
          <div>
            <p className="text-toss-micro text-toss-text-tertiary">레귤레이션</p>
            <p className="text-toss-label font-semibold text-toss-text-primary">{archetype.regulation}</p>
          </div>
        </div>

        <p className="text-toss-body text-toss-text-secondary">{archetype.description}</p>

        {/* 변형판 탭 */}
        {variantTabs.length > 1 && (
          <div className="mt-4">
            <Tab.Root value={activeVariant} onChange={setActiveVariant}>
              <Tab.List>
                {variantTabs.map((v) => (
                  <Tab.Trigger key={v.id} value={v.id}>
                    {v.nameKo}
                  </Tab.Trigger>
                ))}
              </Tab.List>
            </Tab.Root>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* 섹션 1: 덱 리스트 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-toss-title font-bold text-toss-text-primary">덱 리스트</h2>
            <span
              className={cn(
                "text-toss-caption font-semibold px-2.5 py-1 rounded-full",
                displayTotal === 60
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              )}
            >
              {displayTotal}/60장 {displayTotal === 60 ? "✓" : "⚠"}
            </span>
          </div>

          <div className="space-y-4">
            {(Object.entries(categorized) as [string, typeof archetype.cardList][]).map(
              ([category, entries]) => {
                if (entries.length === 0) return null;
                const catTotal = entries.reduce((sum, cl) => sum + cl.count, 0);
                return (
                  <Card key={category} variant="default" padding="md">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-toss-label font-semibold text-toss-text-primary">
                        {category}
                      </p>
                      <span className="text-toss-caption text-toss-text-tertiary">{catTotal}장</span>
                    </div>
                    <div className="space-y-2">
                      {entries.map((entry) => {
                        const card = cardOf(entry.cardId);
                        if (!card) return null;
                        const roleInfo = ROLE_COLORS[entry.role ?? "✓"];
                        return (
                          <Link
                            key={entry.cardId}
                            href={`/${locale}/cardgame/cards/${entry.cardId}`}
                            className="flex items-center gap-3 p-2 rounded-toss-md hover:bg-toss-hover transition-colors group"
                          >
                            <div className="w-8 h-[46px] rounded overflow-hidden bg-toss-bg-muted shrink-0">
                              {card.imageUrl ? (
                                <img
                                  src={card.imageUrl}
                                  alt={card.nameKo}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-toss-caption font-semibold text-toss-text-primary truncate group-hover:text-toss-brand transition-colors">
                                {card.nameKo}
                              </p>
                              <p className="text-toss-micro text-toss-text-tertiary">
                                {card.setNameKo}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {roleInfo && (
                                <span
                                  className={cn(
                                    "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                    roleInfo.bg
                                  )}
                                >
                                  {roleInfo.label}
                                </span>
                              )}
                              <span className="text-toss-caption font-bold text-toss-text-primary w-8 text-right">
                                ×{entry.count}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </Card>
                );
              }
            )}

            {/* 에너지 보충 행 */}
            {energyFill > 0 && (
              <Card variant="default" padding="md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-toss-label font-semibold text-toss-text-primary">에너지</p>
                  <span className="text-toss-caption text-toss-text-tertiary">{energyFill}장</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-toss-md bg-toss-bg-muted">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", TYPE_BG[cardOf(archetype.heroCardIds[0])?.type ?? "colorless"])}>
                    E
                  </div>
                  <p className="text-toss-caption text-toss-text-secondary flex-1">
                    기본 에너지 (타입 맞춤)
                  </p>
                  <span className="text-toss-caption font-bold text-toss-text-primary">×{energyFill}</span>
                </div>
              </Card>
            )}
          </div>
        </section>

        {/* 섹션 2: 플레이 가이드 */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">플레이 가이드</h2>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Card variant="default" padding="md">
              <p className="text-toss-label font-semibold text-green-700 mb-2">강점</p>
              <div className="flex flex-wrap gap-1.5">
                {archetype.strengths.map((s) => (
                  <Tag key={s} color="positive" shape="soft">{s}</Tag>
                ))}
              </div>
            </Card>
            <Card variant="default" padding="md">
              <p className="text-toss-label font-semibold text-red-600 mb-2">약점</p>
              <div className="flex flex-wrap gap-1.5">
                {archetype.weaknesses.map((w) => (
                  <Tag key={w} color="negative" shape="soft">{w}</Tag>
                ))}
              </div>
            </Card>
          </div>

          {counterArchetypes.length > 0 && (
            <Card variant="default" padding="md" className="mb-4">
              <p className="text-toss-label font-semibold text-toss-text-primary mb-2">카운터 덱</p>
              <div className="flex flex-wrap gap-2">
                {counterArchetypes.map((counter) => (
                  <Link key={counter.id} href={`/${locale}/cardgame/decks/${counter.id}`}>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-toss-md bg-toss-bg-muted hover:bg-toss-hover text-toss-caption text-toss-text-primary border border-toss-divider transition-colors">
                      {counter.nameKo}
                      <span className={cn("text-[10px] font-bold ml-1 px-1 rounded", TIER_COLORS[counter.tier])}>
                        {counter.tier}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {[
              {
                phase: "초반 (1~2턴)",
                text: `멀리건 후 핵심 포켓몬을 빠르게 세팅. ${archetype.heroCardIds[0] ? cardOf(archetype.heroCardIds[0])?.nameKo : "메인 포켓몬"}을 배치하고 에너지 가속 카드로 즉시 공격 준비. 마니아·박사의 연구로 패를 채워 핵심 카드를 서치.`,
              },
              {
                phase: "중반 (3~5턴)",
                text: `안정적인 에너지 누적 후 주기술로 상대를 압박. 벤치에 다음 공격자를 세워두고 프라이즈 레이스를 유리하게 이끌어야 함. 상대 덱에 따라 ${archetype.strengths[0] ?? "핵심 전략"}를 최대한 활용.`,
              },
              {
                phase: "후반 (6턴~)",
                text: `프라이즈 2~3장 남은 시점에서 마무리 공세. ${archetype.weaknesses[0] ?? "약점 카드"}에 주의하며 필요시 변형 플레이. 상대 사이드가 0이 되기 전에 마지막 포켓몬 처리 계획 수립.`,
              },
            ].map(({ phase, text }) => (
              <Card key={phase} variant="default" padding="md">
                <p className="text-toss-label font-semibold text-toss-brand mb-1">{phase}</p>
                <p className="text-toss-body text-toss-text-secondary">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* 섹션 3: 우승 사례 */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">우승 사례</h2>
          {winnerTournaments.length === 0 ? (
            <EmptyState title="우승 기록이 없습니다" description="아직 이 덱의 대회 우승 기록이 없습니다." />
          ) : (
            <div className="space-y-2">
              {winnerTournaments.map((t) => (
                <Card key={t.id} variant="default" padding="md">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-toss-label font-semibold text-toss-text-primary">
                          {t.nameKo}
                        </p>
                        <span className="text-toss-micro px-1.5 py-0.5 rounded bg-toss-bg-muted text-toss-text-tertiary">
                          {t.region}
                        </span>
                        <span className="text-toss-micro px-1.5 py-0.5 rounded bg-toss-bg-muted text-toss-text-tertiary">
                          {t.format}
                        </span>
                      </div>
                      <p className="text-toss-caption text-toss-text-tertiary">
                        {t.date} · 참가 {t.players}명
                      </p>
                    </div>
                    <a
                      href={`https://twitter.com/search?q=${encodeURIComponent(t.nameKo)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-toss-caption text-toss-brand hover:underline"
                    >
                      <ExternalLink size={12} />
                      X 트윗 →
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 섹션 4: 가격 / 시세 */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">가격 / 시세</h2>
          <Card variant="default" padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-toss-caption text-toss-text-tertiary mb-0.5">덱 총 구성 예상가 (목업)</p>
                <p className="text-toss-display font-bold text-toss-brand">
                  {deckPrice.toLocaleString("ko-KR")}원
                </p>
              </div>
              <Link
                href={`/${locale}/tier-list`}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-toss-md bg-toss-bg-muted text-toss-label text-toss-text-primary hover:bg-toss-hover transition-colors border border-toss-divider"
              >
                시세 페이지 →
              </Link>
            </div>
            <CardDivider />
            <div className="mt-3 space-y-1">
              {archetype.heroCardIds.slice(0, 4).map((cardId, i) => {
                const card = cardOf(cardId);
                if (!card) return null;
                const mockPrice = Math.round((archetype.usageRate * 800 + i * 3000 + 5000) / 100) * 100;
                return (
                  <DataRow
                    key={cardId}
                    label={card.nameKo}
                    value={`${mockPrice.toLocaleString("ko-KR")}원`}
                  />
                );
              })}
            </div>
          </Card>
        </section>

        {/* 섹션 5: 덱코드 / 공유 */}
        <section>
          <h2 className="text-toss-title font-bold text-toss-text-primary mb-4">덱코드 / 공유</h2>
          <Card variant="default" padding="md">
            <p className="text-toss-caption text-toss-text-tertiary mb-2">
              공식 덱빌더 호환 덱코드 (mock)
            </p>
            <div className="flex items-center gap-3 p-3 bg-toss-bg-muted rounded-toss-md font-mono text-toss-label text-toss-text-primary mb-4">
              <span className="flex-1 break-all">{deckCode}</span>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-toss-md bg-toss-brand text-white text-toss-caption font-semibold hover:opacity-90 transition-opacity"
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={13} />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    복사
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://www.pokemon-card.com/deck/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-toss-md border border-toss-divider text-toss-label text-toss-text-primary hover:bg-toss-hover transition-colors"
              >
                <ExternalLink size={14} />
                공식 덱빌더에서 열기
              </a>
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-toss-md border border-toss-divider text-toss-label text-toss-text-tertiary cursor-not-allowed opacity-50"
              >
                PNG 내보내기 (준비 중)
              </button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
