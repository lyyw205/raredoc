import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HighlightGallery, type HighlightItem } from "@/components/profile/HighlightGallery";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { Container, Card, Avatar, Button, Tag } from "@/components/toss";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getHighlights,
  getUserStats,
  getUserSetCatalog,
  getUserCollection,
} from "@/lib/services/collection";
import { getBadgesForUser } from "@/lib/services/gamification";

const TIER_CONFIG = {
  BRONZE: { label: "브론즈 컬렉터" },
  SILVER: { label: "실버 컬렉터" },
  GOLD: { label: "골드 컬렉터" },
  DIAMOND: { label: "다이아 컬렉터" },
  LEGEND: { label: "레전드 컬렉터" },
} as const;

function tierLabel(tier: string | null): string {
  return (TIER_CONFIG as Record<string, { label: string }>)[tier ?? "BRONZE"]?.label
    ?? TIER_CONFIG.BRONZE.label;
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">{value}</p>
      <p className="text-toss-caption text-toss-text-tertiary mt-0.5">{label}</p>
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
  const user = await prisma.user.findUnique({
    where: { username },
    select: { displayName: true, name: true, bio: true },
  });
  if (!user) return {};
  const name = user.displayName ?? user.name ?? username;
  return { title: `${name}의 컬렉션`, description: user.bio ?? undefined };
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
  const defaultTab: "collection" | "badges" =
    sp.tab === "badges" ? "badges" : "collection";

  const userSelect = {
    id: true,
    username: true,
    displayName: true,
    name: true,
    avatarInitial: true,
    bio: true,
    tier: true,
    createdAt: true,
  } as const;

  // username 으로 조회, 없으면 id 로 재조회 (username 미설정 유저 대응)
  let profileUser = await prisma.user.findUnique({
    where: { username },
    select: userSelect,
  });
  if (!profileUser) {
    profileUser = await prisma.user.findUnique({
      where: { id: username },
      select: userSelect,
    });
  }
  if (!profileUser) notFound();

  const viewer = await getCurrentUser();
  const isOwnProfile = viewer?.id === profileUser.id;

  const [stats, highlightItems, collectionSets, collection, badges] = await Promise.all([
    getUserStats(profileUser.id),
    getHighlights(profileUser.id),
    getUserSetCatalog(profileUser.id),
    getUserCollection(profileUser.id),
    getBadgesForUser(profileUser.id),
  ]);

  const displayName = profileUser.displayName ?? profileUser.name ?? username;
  const avatarInitial = profileUser.avatarInitial ?? displayName.charAt(0);
  const joinDate = `${profileUser.createdAt.getFullYear()}.${String(profileUser.createdAt.getMonth() + 1).padStart(2, "0")}`;

  const highlights: HighlightItem[] = highlightItems.map((h) => ({
    id: h.id,
    name: h.name,
    set: h.setName,
    grade: h.grade,
    certified: h.certified,
    imageUrl: h.imageLarge ?? h.imageSmall ?? "",
    valueKrw: h.estimatedKrw,
    isLocked: !h.forSale,
  }));

  const totalValue = highlights.reduce((acc, h) => acc + h.valueKrw, 0);
  const HIGHLIGHT_SLOTS = 5;

  // 하이라이트에 아직 없는 보유 카드 (소유자 본인의 "내 컬렉션에서 추가" 용)
  const myCollection = isOwnProfile
    ? collection
        .filter((c) => c.highlightSlot == null)
        .map((c) => ({
          id: c.id,
          name: c.name,
          set: c.setName,
          grade: c.grade,
          certified: c.certified,
          imageUrl: c.imageLarge ?? c.imageSmall ?? "",
          valueKrw: c.estimatedKrw,
        }))
    : [];

  return (
    <Container size="xl" padding="md" className="py-8 space-y-8">

      {/* ── 프로필 히어로 ── */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

          {/* 아바타 */}
          <div className="ring-4 ring-toss-brand rounded-full shrink-0">
            <Avatar name={avatarInitial} size="xl" />
          </div>

          {/* 이름 + 소개 */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-toss-title-1 font-bold text-toss-text-primary">{displayName}</h1>
              <span className="text-toss-label text-toss-text-tertiary">@{profileUser.username ?? username}</span>
              <Tag color="brand" shape="soft">{tierLabel(profileUser.tier)}</Tag>
            </div>
            {profileUser.bio && (
              <p className="text-toss-body text-toss-text-secondary mt-1">{profileUser.bio}</p>
            )}
            <p className="text-toss-caption text-toss-text-quaternary mt-1">가입 {joinDate}</p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="md">팔로우</Button>
            <Button variant="primary" size="md" asChild>
              <a href={`/${locale}/messages/c2`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                메세지
              </a>
            </Button>
            <Button variant="outline" size="md">공유</Button>
          </div>
        </div>

        {/* 통계 */}
        <div className="mt-6 pt-5 border-t border-toss-divider flex gap-8 justify-center sm:justify-start">
          <StatItem value={stats.cards.toLocaleString()} label="보유 카드" />
          <div className="w-px bg-toss-divider" />
          <StatItem value={stats.certified} label="인증 완료" />
          <div className="w-px bg-toss-divider" />
          <StatItem value={`₩${(stats.totalKrw / 10000).toFixed(0)}만`} label="추정 총액" />
        </div>
      </Card>

      {/* ── 하이라이트 갤러리 ── */}
      <HighlightGallery
        items={highlights}
        totalSlots={HIGHLIGHT_SLOTS}
        totalValue={totalValue}
        isOwnProfile={isOwnProfile}
        myCollection={myCollection}
      />

      {/* ── 탭: 컬렉션 / 뱃지 ── */}
      <ProfileTabs
        defaultTab={defaultTab}
        sets={collectionSets}
        isOwnProfile={isOwnProfile}
        badges={badges}
      />

    </Container>
  );
}
