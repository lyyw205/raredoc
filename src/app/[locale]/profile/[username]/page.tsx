import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HighlightGallery } from "@/components/profile/HighlightGallery";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

// ─── 목업 데이터 (추후 DB로 교체) ───────────────────────────────────────────

const MOCK_PROFILES = {
  yujin: {
    username: "yujin",
    displayName: "유진",
    avatarInitial: "유",
    tier: "GOLD" as const,
    joinDate: "2025.09",
    bio: "포켓몬 카드 5년차 수집가. SV 시리즈 위주 수집 중. 151 완성 도전 중.",
    stats: { cards: 247, certified: 12, badges: 8, rank: 43 },
    highlights: [
      { id: "h1", name: "피카츄 ex SAR",   set: "포켓몬 151",          grade: "NM", certified: true,  imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png", valueKrw: 280000, isLocked: false },
      { id: "h2", name: "뮤 ex SAR",       set: "포켓몬 151",          grade: "NM", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png", valueKrw: 165000, isLocked: true  },
      { id: "h3", name: "리자몽 ex SAR",   set: "파라다이스 드래고나", grade: "LP", certified: true,  imageUrl: "https://images.pokemontcg.io/sv4pt5/191_hires.png", valueKrw: 420000, isLocked: false },
    ],
    badges: [
      { id: "first_card", name: "첫 카드 등록", desc: "첫 번째 카드를 등록했습니다", type: "collection", emoji: "🃏", earned: true, earnedAt: "2025.09.15" },
      { id: "first_cert", name: "첫 인증", desc: "첫 번째 카드 인증을 완료했습니다", type: "cert", emoji: "✅", earned: true, earnedAt: "2025.09.22" },
      { id: "sar_hunter", name: "SAR 헌터", desc: "SAR 등급 카드 5장 보유", type: "collection", emoji: "⭐", earned: true, earnedAt: "2025.11.03" },
      { id: "early_bird", name: "얼리버드", desc: "서비스 오픈 초기 가입자", type: "season", emoji: "🐦", earned: true, earnedAt: "2025.09.01" },
      { id: "top100", name: "Top 100", desc: "컬렉션 가치 랭킹 100위 이내", type: "ranking", emoji: "🏆", earned: true, earnedAt: "2025.12.01" },
      { id: "holo_50", name: "홀로 컬렉터", desc: "홀로포일 카드 50장 보유", type: "collection", emoji: "✨", earned: true, earnedAt: "2026.01.15" },
      { id: "season1", name: "시즌 1 완주", desc: "시즌 1 활동을 완료했습니다", type: "season", emoji: "🎖️", earned: true, earnedAt: "2026.03.31" },
      { id: "cert_master", name: "인증 마스터", desc: "인증된 카드 10장 이상 보유", type: "cert", emoji: "🔐", earned: true, earnedAt: "2026.02.10" },
      { id: "complete_151", name: "151 완성", desc: "포켓몬 151 세트 완성", type: "collection", emoji: "📚", earned: false },
      { id: "top10", name: "Top 10", desc: "컬렉션 가치 랭킹 10위 이내", type: "ranking", emoji: "👑", earned: false },
      { id: "ur_hunter", name: "UR 헌터", desc: "UR 등급 카드 3장 보유", type: "collection", emoji: "💎", earned: false },
      { id: "monthly_king", name: "이달의 수집왕", desc: "월간 등록 카드 수 1위", type: "ranking", emoji: "🥇", earned: false },
    ],
    collections: [
      { setId: "sv3pt5", name: "포켓몬 151", total: 165, owned: 143 },
      { setId: "sv4pt5", name: "파라다이스 드래고나", total: 191, owned: 67 },
      { setId: "sv8", name: "초승달의 섬", total: 193, owned: 12 },
    ],
  },
  chaeyeon: {
    username: "chaeyeon",
    displayName: "채연",
    avatarInitial: "채",
    tier: "DIAMOND" as const,
    joinDate: "2025.10",
    bio: "PSA 감정 전문 수집가. 리자몽 SAR 풀셋 목표 중. 직거래 환영.",
    stats: { cards: 183, certified: 21, badges: 11, rank: 12 },
    highlights: [
      { id: "h1", name: "리자몽 ex SAR",   set: "파라다이스 드래고나", grade: "NM", certified: true,  imageUrl: "https://images.pokemontcg.io/sv4pt5/191_hires.png", valueKrw: 420000, isLocked: true  },
      { id: "h2", name: "가이오가 ex SAR", set: "파라다이스 드래고나", grade: "NM", certified: true,  imageUrl: "https://images.pokemontcg.io/sv4pt5/187_hires.png", valueKrw: 310000, isLocked: false },
      { id: "h3", name: "피카츄 ex SAR",   set: "포켓몬 151",          grade: "NM", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png", valueKrw: 270000, isLocked: false },
    ],
    badges: [
      { id: "certifier",    name: "인증자",      desc: "카드 인증 10장 이상", type: "cert",       emoji: "✅", earned: true,  earnedAt: "2025.11.10" },
      { id: "psa",          name: "PSA 수집가",  desc: "PSA 감정 보유",       type: "cert",       emoji: "🔐", earned: true,  earnedAt: "2025.10.22" },
      { id: "sar_hunter",   name: "SAR 헌터",    desc: "SAR 5장 보유",        type: "collection", emoji: "⭐", earned: true,  earnedAt: "2025.12.01" },
      { id: "ranker",       name: "Top 100",     desc: "랭킹 100위 이내",     type: "ranking",    emoji: "🏆", earned: true,  earnedAt: "2026.01.05" },
      { id: "early_bird",   name: "얼리버드",    desc: "오픈 초기 가입자",    type: "season",     emoji: "🐦", earned: false },
    ],
    collections: [
      { setId: "sv4pt5", name: "파라다이스 드래고나", total: 191, owned: 134 },
      { setId: "sv3pt5", name: "포켓몬 151",          total: 165, owned: 49  },
    ],
  },
  nari_collect: {
    username: "nari_collect",
    displayName: "나리",
    avatarInitial: "나",
    tier: "SILVER" as const,
    joinDate: "2025.11",
    bio: "151 세트 SAR 풀셋 완성! 이제 드래고나 공략 중. 합리적인 가격에 직거래 가능.",
    stats: { cards: 312, certified: 6, badges: 7, rank: 87 },
    highlights: [
      { id: "h1", name: "이상해꽃 ex SAR", set: "포켓몬 151", grade: "NM", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/198_hires.png", valueKrw: 92000,  isLocked: false },
      { id: "h2", name: "피카츄 ex SAR",   set: "포켓몬 151", grade: "NM", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/215_hires.png", valueKrw: 265000, isLocked: false },
      { id: "h3", name: "뮤 ex SAR",       set: "포켓몬 151", grade: "LP", certified: false, imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png", valueKrw: 145000, isLocked: true  },
    ],
    badges: [
      { id: "card_register", name: "카드 등록",  desc: "카드 100장 등록", type: "collection", emoji: "🃏", earned: true,  earnedAt: "2026.01.20" },
      { id: "set_complete",  name: "세트 완성",  desc: "1세트 완성",      type: "collection", emoji: "📚", earned: true,  earnedAt: "2026.03.15" },
      { id: "sar_hunter",    name: "SAR 헌터",   desc: "SAR 5장 보유",   type: "collection", emoji: "⭐", earned: true,  earnedAt: "2025.12.20" },
    ],
    collections: [
      { setId: "sv3pt5", name: "포켓몬 151",          total: 165, owned: 165 },
      { setId: "sv4pt5", name: "파라다이스 드래고나", total: 191, owned: 58  },
    ],
  },
};

const TIER_CONFIG = {
  BRONZE: { label: "브론즈 컬렉터", ring: "ring-amber-700", accent: "text-amber-500", bg: "from-amber-950/60 to-gray-950" },
  SILVER: { label: "실버 컬렉터", ring: "ring-slate-400", accent: "text-slate-400", bg: "from-slate-800/40 to-gray-950" },
  GOLD: { label: "골드 컬렉터", ring: "ring-yellow-500", accent: "text-yellow-400", bg: "from-yellow-950/50 to-gray-950" },
  DIAMOND: { label: "다이아 컬렉터", ring: "ring-cyan-400", accent: "text-cyan-400", bg: "from-cyan-950/50 to-gray-950" },
  LEGEND: { label: "레전드 컬렉터", ring: "ring-purple-400", accent: "text-purple-400", bg: "from-purple-950/50 to-gray-950" },
};

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── 페이지 ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = MOCK_PROFILES[username as keyof typeof MOCK_PROFILES];
  if (!user) return {};
  return {
    title: `${user.displayName}의 컬렉션`,
    description: user.bio,
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; locale: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { username, locale } = await params;
  const sp = (await searchParams) ?? {};
  const defaultTab: "collection" | "badges" | "ranking" =
    sp.tab === "badges" || sp.tab === "ranking" ? sp.tab : "collection";
  const user = MOCK_PROFILES[username as keyof typeof MOCK_PROFILES];
  if (!user) notFound();

  const MY_USERNAME = "yujin";                    // 추후 auth로 교체
  const isOwnProfile = username === MY_USERNAME;

  const tier = TIER_CONFIG[user.tier];
  const totalValue = user.highlights.reduce((acc, h) => acc + h.valueKrw, 0);
  const HIGHLIGHT_SLOTS = 5;
  const emptySlots = HIGHLIGHT_SLOTS - user.highlights.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

      {/* ── 프로필 히어로 ── */}
      <div className={`rounded-2xl bg-gradient-to-b ${tier.bg} border border-gray-800 p-6`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

          {/* 아바타 */}
          <div className={`shrink-0 w-20 h-20 rounded-full bg-gray-700 ring-4 ${tier.ring} flex items-center justify-center text-3xl font-bold text-white`}>
            {user.avatarInitial}
          </div>

          {/* 이름 + 소개 */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">{user.displayName}</h1>
              <span className="text-sm text-gray-500">@{user.username}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tier.accent} border-current bg-current/10`}>
                {tier.label}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-1">{user.bio}</p>
            <p className="text-xs text-gray-600">가입 {user.joinDate}</p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 shrink-0">
            <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">
              팔로우
            </button>
            <a
              href={`/${locale}/messages/c2`}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              메세지
            </a>
            <button className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition-colors">
              공유
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="mt-6 pt-5 border-t border-gray-800 flex gap-8 justify-center sm:justify-start">
          <StatItem value={user.stats.cards.toLocaleString()} label="보유 카드" />
          <div className="w-px bg-gray-800" />
          <StatItem value={user.stats.certified} label="인증 완료" />
          <div className="w-px bg-gray-800" />
          <StatItem value={user.stats.badges} label="획득 뱃지" />
          <div className="w-px bg-gray-800" />
          <StatItem value={`#${user.stats.rank}`} label="랭킹" />
        </div>
      </div>

      {/* ── 하이라이트 갤러리 ── */}
      <HighlightGallery
        items={user.highlights}
        totalSlots={HIGHLIGHT_SLOTS}
        totalValue={totalValue}
        isOwnProfile={isOwnProfile}
      />

      {/* ── 탭: 컬렉션 / 뱃지 / 랭킹 ── */}
      <ProfileTabs defaultTab={defaultTab} />

    </div>
  );
}
