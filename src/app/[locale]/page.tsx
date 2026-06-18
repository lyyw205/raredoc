import Link from "next/link";
import type { Metadata } from "next";
import { HomeHero } from "@/components/home/HomeHero";
import { CardStageCarousel } from "@/components/home/CardStageCarousel";
import { MetaDeckSection } from "@/components/home/MetaDeckSection";
import { getRecentFeed } from "@/lib/services/collection";
import { getTopCollectors, getCurrentSeason } from "@/lib/services/gamification";
import { getHotTopics, relativeKo, type HotTopic } from "@/lib/services/community";
import {
  Avatar,
  Card,
  CardContent,
  CardDivider,
  CardHeader,
  CardTitle,
  Container,
  DeltaBadge,
  Tag,
} from "@/components/toss";

export const metadata: Metadata = {
  title: "Raredoc — 수집품 갤러리 & TCG 정보",
  description: "컬렉터들의 수집품 기록과 커뮤니티",
};

// ── 메타 (TOP_COLLECTORS/시즌/핫토픽 모두 실데이터) ──────

const RANK_MEDAL = ["👑", "🥈", "🥉"];

// 모든 티어가 동일한 brand ring (단일 톤). 등급 구분은 이모지 + displayName 으로.
const CATEGORY_TAG_COLOR: Record<string, "negative" | "neutral" | "warning" | "success"> = {
  정보:    "negative",
  질문:    "neutral",
  자랑:    "warning",
  거래후기: "success",
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────────

function TopicRow({ topic, locale }: { topic: HotTopic; locale: string }) {
  return (
    <Link
      href={`/${locale}/community/${topic.id}`}
      className="block py-3 border-b border-toss-divider last:border-0 hover:bg-toss-hover -mx-3 px-3 rounded-toss-md transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Tag color={CATEGORY_TAG_COLOR[topic.category] ?? "neutral"} shape="soft" className="shrink-0">
          {topic.category}
        </Tag>
        <p className="text-toss-label text-toss-text-secondary group-hover:text-toss-text-primary transition-colors leading-snug line-clamp-1 min-w-0">
          {topic.hot && <span className="text-toss-positive mr-1 text-toss-caption font-bold">🔥</span>}
          {topic.title}
        </p>
      </div>
      <p className="text-toss-caption text-toss-text-quaternary mt-1">
        댓글 {topic.replies} · 조회 {topic.views.toLocaleString()} · {topic.ago}
      </p>
    </Link>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 최근 등록 피드 (실데이터). 캐러셀은 가치 높은순. 비어있으면 섹션 미표시.
  const [feed, topCollectors, season, hotTopics] = await Promise.all([
    getRecentFeed(20).catch(() => []),
    getTopCollectors(3).catch(() => []),
    getCurrentSeason().catch(() => null),
    getHotTopics(6).catch(() => [] as HotTopic[]),
  ]);
  const recentCards = feed
    .map((item) => ({
      uid: item.id,
      id: item.cardId,
      name: item.name,
      set: item.setName,
      number: item.number,
      grade: item.grade,
      certified: item.certified,
      valueKrw: item.estimatedKrw,
      imageUrl: item.imageLarge ?? item.imageSmall ?? "",
      region: item.region,
      collector: item.collectorDisplayName ?? item.collectorUsername ?? "익명",
      collectorInitial: item.collectorInitial,
      addedAt: relativeKo(item.createdAt),
    }))
    .sort((a, b) => b.valueKrw - a.valueKrw);

  return (
    <>
      {/* ── 히어로 섹션 (풀 너비, 검색창) ────────────────────────────────── */}
      <HomeHero locale={locale} />

      <Container size="xl" padding="md" className="py-8 space-y-6">

      {/* ── 카드 캐러셀 (전체 너비) ─────────────────────────── */}
      {recentCards.length > 0 && (
        <CardStageCarousel cards={recentCards} locale={locale} />
      )}

      {/* ── 하단 그리드: (커뮤니티 핫 토픽 + 추천 메타) + 사이드바 ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 좌측 2컬럼: 추천 메타 */}
        <div className="lg:col-span-2">
          <MetaDeckSection locale={locale} />
        </div>

        {/* 우측 사이드바: 커뮤니티 핫 토픽 → 이달의 TOP3 → … */}
        <div className="space-y-4">

          {/* 커뮤니티 핫 토픽 (헤더는 카드 밖) */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <div>
                <h2 className="text-toss-title font-bold text-toss-text-primary">커뮤니티 핫 토픽</h2>
                <p className="text-toss-caption text-toss-text-quaternary mt-1">지금 가장 많이 읽히는 글</p>
              </div>
              <Link
                href={`/${locale}/cardgame/community`}
                className="text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary transition-colors"
              >
                전체보기 →
              </Link>
            </div>
            <Card padding="md">
              <CardContent>
                {hotTopics.length > 0 ? (
                  hotTopics.map((topic) => (
                    <TopicRow key={topic.id} topic={topic} locale={locale} />
                  ))
                ) : (
                  <p className="py-6 text-center text-toss-caption text-toss-text-quaternary">
                    아직 인기 글이 없어요
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* 이달의 TOP 3 */}
          {topCollectors.length > 0 && (
          <Card padding="md">
            <CardHeader>
              <CardTitle className="text-toss-subtitle">이달의 TOP 3</CardTitle>
            </CardHeader>
            <CardDivider className="my-3" />
            <CardContent className="space-y-1">
              {topCollectors.map((collector) => (
                <Link
                  key={collector.username}
                  href={`/${locale}/profile/${collector.username}`}
                  className="flex items-center gap-3 hover:bg-toss-hover -mx-2 px-2 py-2 rounded-toss-md transition-colors group"
                >
                  <span className="text-base w-5 text-center shrink-0">{RANK_MEDAL[collector.rank - 1] ?? `${collector.rank}`}</span>
                  <div className="ring-2 ring-toss-brand rounded-full shrink-0">
                    <Avatar name={collector.avatarInitial} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-toss-label font-semibold text-toss-text-primary group-hover:text-toss-text-primary truncate transition-colors">
                      {collector.displayName}
                    </p>
                    <p className="text-toss-caption text-toss-text-quaternary truncate">
                      {collector.cardCount}장 보유
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <p className="text-toss-label font-semibold text-toss-text-primary toss-numeric">
                      ₩{(collector.valueKrw / 10000).toFixed(0)}만
                    </p>
                    {collector.monthlyAdded > 0 && (
                      <DeltaBadge delta={collector.monthlyAdded} showPercent={false} decimals={0} mode="text" size="sm" />
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
          )}

          {/* TCG 바로가기 */}
          <Card padding="md">
            <CardTitle className="text-toss-subtitle mb-3">TCG 정보</CardTitle>
            <div className="space-y-1">
              {[
                { label: "카드 도감",       emoji: "📖", href: `/dex` },
                { label: "최근 등록 카드",  emoji: "🆕", href: `/recent` },
                { label: "투자 티어리스트", emoji: "📊", href: `/tier-list` },
                { label: "뱃지 도감",       emoji: "🏅", href: topCollectors[0] ? `/profile/${topCollectors[0].username}?tab=badges` : `/profile` },
              ].map(({ label, emoji, href }) => (
                <Link
                  key={label}
                  href={`/${locale}${href}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-toss-md hover:bg-toss-hover text-toss-label text-toss-text-secondary hover:text-toss-text-primary transition-colors"
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* 시즌 현황 */}
          {season && (
          <div className="rounded-toss-lg bg-gradient-to-b from-toss-warning-weak to-toss-bg-base border border-toss-warning-weak p-5 shadow-toss-hairline">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🎖️</span>
              <h2 className="text-toss-subtitle font-semibold text-toss-text-primary">{season.name} 진행 중</h2>
            </div>
            <p className="text-toss-caption text-toss-text-tertiary mb-3 leading-relaxed">
              {season.name}은 {season.endsAt.getFullYear()}년 {season.endsAt.getMonth() + 1}월 {season.endsAt.getDate()}일에 종료됩니다.<br />
              지금 참여하면 얼리버드 뱃지를 획득할 수 있어요.
            </p>
            <div className="h-1.5 bg-toss-bg-muted rounded-full overflow-hidden mb-1">
              <div className="h-full bg-toss-warning rounded-full" style={{ width: `${season.progressPct}%` }} />
            </div>
            <p className="text-toss-micro text-toss-text-quaternary mb-3">종료까지 {season.daysLeft}일</p>
            <Link
              href={topCollectors[0] ? `/${locale}/profile/${topCollectors[0].username}?tab=badges` : `/${locale}/profile`}
              className="block w-full text-center text-toss-caption font-semibold text-toss-warning border border-toss-warning-weak rounded-toss-md py-1.5 hover:bg-toss-warning-weak transition-colors"
            >
              뱃지 받으러 가기 →
            </Link>
          </div>
          )}

        </div>
      </div>
      </Container>
    </>
  );
}
