import Link from "next/link";
import type { Metadata } from "next";
import { CardStageCarousel } from "@/components/home/CardStageCarousel";
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

// ── 목업 데이터 (추후 DB로 교체) ─────────────────────────────────────────

const RECENT_CARDS = [
  { id: "r1", name: "피카츄 ex SAR",    set: "포켓몬 151",         number: "215", grade: "NM", certified: true,  valueKrw: 280000, imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png", collector: "raymond_tcg",  collectorInitial: "레", addedAt: "3분 전" },
  { id: "r2", name: "리자몽 ex SAR",    set: "파라다이스 드래고나", number: "191", grade: "LP", certified: true,  valueKrw: 420000, imageUrl: "https://images.pokemontcg.io/sv4pt5/191_hires.png", collector: "chaeyeon",     collectorInitial: "채", addedAt: "11분 전" },
  { id: "r3", name: "뮤 ex SAR",        set: "포켓몬 151",         number: "205", grade: "NM", certified: false, valueKrw: 165000, imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png", collector: "minjun_",      collectorInitial: "민", addedAt: "28분 전" },
  { id: "r4", name: "이상해꽃 ex SAR",  set: "포켓몬 151",         number: "198", grade: "NM", certified: false, valueKrw:  92000, imageUrl: "https://images.pokemontcg.io/sv3pt5/198_hires.png", collector: "sora_cards",   collectorInitial: "소", addedAt: "44분 전" },
  { id: "r5", name: "거북왕 ex SAR",    set: "포켓몬 151",         number: "202", grade: "NM", certified: false, valueKrw:  88000, imageUrl: "https://images.pokemontcg.io/sv3pt5/202_hires.png", collector: "jihun99",      collectorInitial: "지", addedAt: "1시간 전" },
  { id: "r6", name: "뮤츠 ex SAR",      set: "포켓몬 151",         number: "207", grade: "LP", certified: true,  valueKrw: 310000, imageUrl: "https://images.pokemontcg.io/sv3pt5/207_hires.png", collector: "nari_collect", collectorInitial: "나", addedAt: "2시간 전" },
];

const HOT_TOPICS = [
  { id: "t1", category: "정보",     title: "151 SAR 피카츄 최근 시세 폭등 이유 분석",           replies: 47, views: 1203, hot: true,  ago: "1시간 전" },
  { id: "t2", category: "질문",     title: "번개장터에서 산 카드 컨디션 판정 어떻게 하나요?",    replies: 23, views:  541, hot: false, ago: "3시간 전" },
  { id: "t3", category: "자랑",     title: "드디어 151 세트 SAR 풀셋 완성했습니다 🎉",           replies: 89, views: 2140, hot: true,  ago: "5시간 전" },
  { id: "t4", category: "정보",     title: "파라다이스 드래고나 발매 1개월 시세 정리",           replies: 31, views:  876, hot: false, ago: "8시간 전" },
  { id: "t5", category: "거래후기", title: "레어독 통해서 첫 거래 완료했어요 후기 공유",         replies: 12, views:  334, hot: false, ago: "어제" },
  { id: "t6", category: "질문",     title: "PSA 9 vs 10 차이가 가격에 얼마나 영향 주나요",       replies: 56, views: 1087, hot: false, ago: "어제" },
];

const TOP_COLLECTORS = [
  { rank: 1, username: "raymond_tcg",  displayName: "레이먼드",  avatarInitial: "레", tier: "LEGEND",  valueKrw: 12450000, monthlyChangePct: +12.3, cardCount: 247, badge: "👑" },
  { rank: 2, username: "chaeyeon",     displayName: "채연",      avatarInitial: "채", tier: "DIAMOND", valueKrw:  9870000, monthlyChangePct:  +8.7, cardCount: 198, badge: "🥈" },
  { rank: 3, username: "minjun_",      displayName: "민준",      avatarInitial: "민", tier: "DIAMOND", valueKrw:  8320000, monthlyChangePct:  -3.2, cardCount: 162, badge: "🥉" },
];

// 모든 티어가 동일한 brand ring (단일 톤). 등급 구분은 이모지 + displayName 으로.
const CATEGORY_TAG_COLOR: Record<string, "negative" | "neutral" | "warning" | "success"> = {
  정보:    "negative",
  질문:    "neutral",
  자랑:    "warning",
  거래후기: "success",
};

const SORTED_CARDS = [...RECENT_CARDS].sort((a, b) => b.valueKrw - a.valueKrw);

// ── 컴포넌트 ──────────────────────────────────────────────────────────────

function TopicRow({ topic, locale }: { topic: typeof HOT_TOPICS[number]; locale: string }) {
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

  return (
    <Container size="xl" padding="md" className="py-8 space-y-6">

      {/* ── 히어로 헤더 ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-toss-title-1 font-bold text-toss-text-primary">오늘의 컬렉션</h1>
          <p className="text-toss-label text-toss-text-tertiary mt-0.5">컬렉터들이 지금 등록하고 있는 카드</p>
        </div>
        <span className="flex items-center gap-1.5 text-toss-caption text-toss-text-tertiary">
          <span className="w-1.5 h-1.5 rounded-full bg-toss-success animate-pulse" />
          1,247명 온라인
        </span>
      </div>

      {/* ── 카드 캐러셀 (전체 너비) ─────────────────────────── */}
      <CardStageCarousel cards={SORTED_CARDS} locale={locale} />

      {/* ── 하단 그리드: 커뮤니티 + 사이드바 ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 커뮤니티 핫 토픽 */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <CardHeader>
              <div>
                <CardTitle className="text-toss-subtitle">커뮤니티 핫 토픽</CardTitle>
                <p className="text-toss-caption text-toss-text-quaternary mt-1">지금 가장 많이 읽히는 글</p>
              </div>
              <Link
                href={`/${locale}/community`}
                className="text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary transition-colors"
              >
                전체보기 →
              </Link>
            </CardHeader>
            <CardDivider className="my-3" />
            <CardContent>
              {HOT_TOPICS.map((topic) => (
                <TopicRow key={topic.id} topic={topic} locale={locale} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">

          {/* 이달의 TOP 3 */}
          <Card padding="md">
            <CardHeader>
              <CardTitle className="text-toss-subtitle">이달의 TOP 3</CardTitle>
              <Link
                href={`/${locale}/profile/yujin?tab=ranking`}
                className="text-toss-caption text-toss-text-tertiary hover:text-toss-text-primary transition-colors"
              >
                전체 랭킹 →
              </Link>
            </CardHeader>
            <CardDivider className="my-3" />
            <CardContent className="space-y-1">
              {TOP_COLLECTORS.map((col) => (
                <Link
                  key={col.username}
                  href={`/${locale}/profile/${col.username}`}
                  className="flex items-center gap-3 hover:bg-toss-hover -mx-2 px-2 py-2 rounded-toss-md transition-colors group"
                >
                  <span className="text-base w-5 text-center shrink-0">{col.badge}</span>
                  <div className="ring-2 ring-toss-brand rounded-full shrink-0">
                    <Avatar name={col.avatarInitial} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-toss-label font-semibold text-toss-text-primary group-hover:text-toss-text-primary truncate transition-colors">
                      {col.displayName}
                    </p>
                    <p className="text-toss-caption text-toss-text-quaternary truncate">
                      {col.cardCount}장 보유
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <p className="text-toss-label font-semibold text-toss-text-primary toss-numeric">
                      ₩{(col.valueKrw / 10000).toFixed(0)}만
                    </p>
                    <DeltaBadge percent={col.monthlyChangePct} mode="text" size="sm" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* TCG 바로가기 */}
          <Card padding="md">
            <CardTitle className="text-toss-subtitle mb-3">TCG 정보</CardTitle>
            <div className="space-y-1">
              {[
                { label: "카드 도감",       emoji: "📖", href: `/dex` },
                { label: "최근 등록 카드",  emoji: "🆕", href: `/recent` },
                { label: "투자 티어리스트", emoji: "📊", href: `/tier-list` },
                { label: "뱃지 도감",       emoji: "🏅", href: `/profile/yujin?tab=badges` },
                { label: "전체 랭킹",       emoji: "🏆", href: `/profile/yujin?tab=ranking` },
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
          <div className="rounded-toss-lg bg-gradient-to-b from-toss-warning-weak to-toss-bg-base border border-toss-warning-weak p-5 shadow-toss-hairline">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🎖️</span>
              <h2 className="text-toss-subtitle font-semibold text-toss-text-primary">시즌 1 진행 중</h2>
            </div>
            <p className="text-toss-caption text-toss-text-tertiary mb-3 leading-relaxed">
              시즌 1은 2026년 6월 30일에 종료됩니다.<br />
              지금 참여하면 얼리버드 뱃지를 획득할 수 있어요.
            </p>
            <div className="h-1.5 bg-toss-bg-muted rounded-full overflow-hidden mb-1">
              <div className="h-full w-[62%] bg-toss-warning rounded-full" />
            </div>
            <p className="text-toss-micro text-toss-text-quaternary mb-3">종료까지 43일</p>
            <Link
              href={`/${locale}/profile/yujin?tab=badges`}
              className="block w-full text-center text-toss-caption font-semibold text-toss-warning border border-toss-warning-weak rounded-toss-md py-1.5 hover:bg-toss-warning-weak transition-colors"
            >
              뱃지 받으러 가기 →
            </Link>
          </div>

        </div>
      </div>
    </Container>
  );
}
