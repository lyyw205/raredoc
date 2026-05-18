import Link from "next/link";
import type { Metadata } from "next";
import { CardHeroSlider } from "@/components/home/CardHeroSlider";

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
  { rank: 1, username: "raymond_tcg",  displayName: "레이먼드",  avatarInitial: "레", tier: "LEGEND",  valueKrw: 12450000, badge: "👑" },
  { rank: 2, username: "chaeyeon",     displayName: "채연",      avatarInitial: "채", tier: "DIAMOND", valueKrw:  9870000, badge: "🥈" },
  { rank: 3, username: "minjun_",      displayName: "민준",      avatarInitial: "민", tier: "DIAMOND", valueKrw:  8320000, badge: "🥉" },
];

const TIER_RING: Record<string, string> = {
  LEGEND: "ring-purple-400", DIAMOND: "ring-cyan-400", GOLD: "ring-yellow-500",
  SILVER: "ring-slate-400",  BRONZE: "ring-amber-700",
};

const CATEGORY_COLOR: Record<string, string> = {
  정보:    "bg-blue-900/50 text-blue-400",
  질문:    "bg-gray-800 text-gray-400",
  자랑:    "bg-yellow-900/50 text-yellow-400",
  거래후기: "bg-green-900/50 text-green-400",
};

const SORTED_CARDS = [...RECENT_CARDS].sort((a, b) => b.valueKrw - a.valueKrw);

// ── 컴포넌트 ──────────────────────────────────────────────────────────────

function TopicRow({ topic, locale }: { topic: typeof HOT_TOPICS[number]; locale: string }) {
  return (
    <Link
      href={`/${locale}/community`}
      className="flex items-start gap-3 py-3 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 -mx-3 px-3 rounded-lg transition-colors group"
    >
      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${CATEGORY_COLOR[topic.category] ?? "bg-gray-800 text-gray-400"}`}>
        {topic.category}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 group-hover:text-white transition-colors leading-snug line-clamp-1">
          {topic.hot && <span className="text-red-400 mr-1 text-xs font-bold">🔥</span>}
          {topic.title}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          댓글 {topic.replies} · 조회 {topic.views.toLocaleString()} · {topic.ago}
        </p>
      </div>
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* ── 히어로 헤더 ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">오늘의 컬렉션</h1>
          <p className="text-sm text-gray-500 mt-0.5">컬렉터들이 지금 등록하고 있는 카드</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          1,247명 온라인
        </span>
      </div>

      {/* ── 카드 히어로 슬라이더 (전체 너비) ─────────────────────────── */}
      <CardHeroSlider cards={SORTED_CARDS} locale={locale} />

      {/* ── 하단 그리드: 커뮤니티 + 사이드바 ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 커뮤니티 핫 토픽 */}
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-white">커뮤니티 핫 토픽</h2>
              <Link href={`/${locale}/community`} className="text-xs text-gray-500 hover:text-white transition-colors">
                전체보기 →
              </Link>
            </div>
            <p className="text-xs text-gray-600 mb-4">지금 가장 많이 읽히는 글</p>
            <div>
              {HOT_TOPICS.map((topic) => (
                <TopicRow key={topic.id} topic={topic} locale={locale} />
              ))}
            </div>
          </div>
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">

          {/* 이달의 TOP 3 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">이달의 TOP 3</h2>
              <Link href={`/${locale}/ranking`} className="text-xs text-gray-500 hover:text-white transition-colors">
                전체 랭킹 →
              </Link>
            </div>
            <div className="space-y-3">
              {TOP_COLLECTORS.map((col) => (
                <Link
                  key={col.username}
                  href={`/${locale}/profile/${col.username}`}
                  className="flex items-center gap-3 hover:bg-gray-800/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
                >
                  <span className="text-base w-5 text-center shrink-0">{col.badge}</span>
                  <div className={`w-8 h-8 rounded-full bg-gray-700 ring-2 ${TIER_RING[col.tier]} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                    {col.avatarInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate transition-colors">
                      {col.displayName}
                    </p>
                    <p className="text-xs text-yellow-400">₩{(col.valueKrw / 10000).toFixed(0)}만</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* TCG 바로가기 */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-3">TCG 정보</h2>
            <div className="space-y-1">
              {[
                { label: "카드 도감",      emoji: "📖", href: `/dex` },
                { label: "확장팩 목록",    emoji: "📦", href: `/expansions` },
                { label: "투자 티어리스트", emoji: "📊", href: `/tier-list` },
                { label: "뱃지 도감",      emoji: "🏅", href: `/badges` },
                { label: "전체 랭킹",      emoji: "🏆", href: `/ranking` },
              ].map(({ label, emoji, href }) => (
                <Link
                  key={label}
                  href={`/${locale}${href}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 시즌 현황 */}
          <div className="rounded-xl bg-gradient-to-b from-yellow-950/40 to-gray-900 border border-yellow-800/30 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🎖️</span>
              <h2 className="text-sm font-semibold text-white">시즌 1 진행 중</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              시즌 1은 2026년 6월 30일에 종료됩니다.<br />
              지금 참여하면 얼리버드 뱃지를 획득할 수 있어요.
            </p>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1">
              <div className="h-full w-[62%] bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full" />
            </div>
            <p className="text-[11px] text-gray-600">종료까지 43일</p>
          </div>

        </div>
      </div>
    </div>
  );
}
