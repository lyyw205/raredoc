import { prisma } from "@/lib/prisma";
import { USD_KRW } from "@/lib/trades/shared";

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — 게이미피케이션 집계/조회 서비스
//
// computeUserBadges  : 유저 통계 → 각 뱃지 currentValue/earnedTier 산출 후 UserBadge upsert
// rebuildRankings    : 전 유저 가치 집계 → RankingSnapshot upsert + rankMode 뱃지 + User.tier 갱신
// 조회               : getBadgesForUser / getRankings / getTopCollectors / getUserRank / getCurrentSeason
// ─────────────────────────────────────────────────────────────────────────────

// 시세 계수 (collection.ts 와 동일 기준)
const CONDITION_COEFFICIENT: Record<string, number> = {
  미개봉: 1.15, "1착": 1.1, NM: 1.0, VNDS: 0.95, LP: 0.85, MP: 0.65, HP: 0.45, DS: 0.3, D: 0.3,
};

function conditionCoefficient(grade: string): number {
  return CONDITION_COEFFICIENT[grade] ?? 1.0;
}

function pickPriceUsd(p: {
  normal: number | null; holofoil: number | null; reverseHolo: number | null; firstEdition: number | null;
}): number | null {
  return p.holofoil ?? p.normal ?? p.reverseHolo ?? p.firstEdition ?? null;
}

// ── rarity 분류 헬퍼 ──────────────────────────────────────────────────────────

/** SAR(Special Illustration Rare) 여부. */
function isSar(rarity: string | null): boolean {
  return rarity === "Special Illustration Rare";
}

/** UR 급(Ultra/Hyper/Secret/Rainbow) 여부. */
function isUr(rarity: string | null): boolean {
  if (!rarity) return false;
  return /(Ultra Rare|Hyper Rare|Rare Secret|Rare Rainbow|Rare Ultra)/i.test(rarity);
}

/** 홀로포일 계열 여부 (Holo/Illustration/Ultra/Shiny 등 반짝이는 카드). */
function isHolo(rarity: string | null): boolean {
  if (!rarity) return false;
  return /(Holo|Illustration|Ultra|Hyper|Secret|Rainbow|Shiny|Rare\b)/i.test(rarity)
    && rarity !== "Common" && rarity !== "Uncommon";
}

// ── 유저 1인 집계 단위 ────────────────────────────────────────────────────────

interface UserAgg {
  userId: string;
  cards: number;          // 보유 카드 수
  sar: number;            // SAR 보유 수
  ur: number;             // UR 보유 수
  holo: number;           // 홀로 보유 수
  completedSets: number;  // 완성 세트 수
  totalKrw: number;       // 추정 총액 (KRW)
  certified: number;      // 인증(approved) 수
  monthlyAdded: number;   // 이달 등록 수
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 한 유저의 전체 통계 집계 (뱃지/랭킹 공통). */
async function aggregateUser(userId: string): Promise<UserAgg> {
  const items = await prisma.collectionItem.findMany({
    where: { userId },
    select: {
      grade: true,
      estimatedKrw: true,
      certified: true,
      createdAt: true,
      certification: { select: { status: true } },
      locale: {
        select: {
          setId: true,
          prices: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: { normal: true, holofoil: true, reverseHolo: true, firstEdition: true },
          },
        },
      },
      logicalCard: {
        select: {
          rarity: { select: { code: true, nameKo: true, nameEn: true } },
        },
      },
    },
  });

  const monthStart = startOfMonth();
  let sar = 0, ur = 0, holo = 0, totalKrw = 0, certified = 0, monthlyAdded = 0;
  const ownedBySet = new Map<string, number>();

  for (const it of items) {
    const rarity = it.logicalCard.rarity?.code ?? null;
    if (isSar(rarity)) sar++;
    if (isUr(rarity)) ur++;
    if (isHolo(rarity)) holo++;

    // 추정가
    let krw = it.estimatedKrw;
    if (krw == null) {
      const latest = it.locale.prices[0];
      const usd = latest ? pickPriceUsd(latest) : null;
      if (usd != null && Number.isFinite(usd)) {
        krw = Math.round(usd * USD_KRW * conditionCoefficient(it.grade));
      }
    }
    totalKrw += krw ?? 0;

    if (it.certification?.status === "approved" || it.certified) certified++;
    if (it.createdAt >= monthStart) monthlyAdded++;

    ownedBySet.set(it.locale.setId, (ownedBySet.get(it.locale.setId) ?? 0) + 1);
  }

  // 완성 세트 수 (보유수 >= Set.cardCount)
  let completedSets = 0;
  if (ownedBySet.size > 0) {
    const sets = await prisma.set.findMany({
      where: { id: { in: [...ownedBySet.keys()] } },
      select: { id: true, cardCount: true },
    });
    for (const s of sets) {
      if (s.cardCount > 0 && (ownedBySet.get(s.id) ?? 0) >= s.cardCount) completedSets++;
    }
  }

  return { userId, cards: items.length, sar, ur, holo, completedSets, totalKrw, certified, monthlyAdded };
}

// ── 뱃지 currentValue 매핑 ────────────────────────────────────────────────────

/** 비-rankMode 뱃지의 currentValue 산출. rankMode/시즌계열은 별도 처리. */
function badgeValue(badgeId: string, agg: UserAgg): number | null {
  switch (badgeId) {
    case "card_register": return agg.cards;
    case "sar_hunter": return agg.sar;
    case "holo_collector": return agg.holo;
    case "ur_hunter": return agg.ur;
    case "set_complete": return agg.completedSets;
    case "collection_value": return Math.floor(agg.totalKrw / 10000); // 만원 단위
    case "certifier": return agg.certified;
    // PSA/BGS 는 별도 감정 데이터가 없어 인증 수를 근사치로 사용
    case "psa_collector": return agg.certified;
    case "bgs_master": return 0;
    // 시즌계열: 시즌1 완주 = 이달/시즌 등록 10장 이상이면 1, 얼리버드/시즌2 는 가입 시점 기반(아래 처리)
    case "season1_complete": return agg.cards >= 10 ? 1 : 0;
    default: return null; // ranker/monthly_king/season_mvp(rankMode), early_bird, season2_open
  }
}

const TIER_ORDER = ["SILVER", "GOLD", "DIAMOND"] as const;
type TierName = (typeof TIER_ORDER)[number];

type TierRow = { tier: string; threshold: number };

/** threshold 비교로 최고 달성 티어 결정. rankMode 면 value(=순위) <= threshold. */
function resolveTier(value: number, tiers: TierRow[], rankMode: boolean): TierName | null {
  const sorted = [...tiers].sort((a, b) =>
    TIER_ORDER.indexOf(a.tier as TierName) - TIER_ORDER.indexOf(b.tier as TierName)
  );
  let earned: TierName | null = null;
  for (const t of sorted) {
    const ok = rankMode ? value > 0 && value <= t.threshold : value >= t.threshold;
    if (ok) earned = t.tier as TierName;
  }
  return earned;
}

// ─────────────────────────────────────────────────────────────────────────────
// computeUserBadges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 한 유저의 비-rankMode 뱃지(수집/인증/가치/시즌) currentValue·earnedTier 산출 후 UserBadge upsert.
 * rankMode 뱃지(ranker/monthly_king/season_mvp)는 rebuildRankings 에서 순위 기반으로 갱신한다.
 * @param precomputed 이미 집계한 UserAgg (rebuild 시 재사용). 없으면 내부에서 집계.
 */
export async function computeUserBadges(userId: string, precomputed?: UserAgg): Promise<void> {
  const agg = precomputed ?? (await aggregateUser(userId));

  const badges = await prisma.badge.findMany({
    where: { rankMode: false },
    select: { id: true, category: true, tiers: { select: { tier: true, threshold: true } } },
  });

  // 얼리버드: 가입순 100위 이내면 달성 (현재 유저 수가 적어 사실상 전원 달성)
  const earlierCount = await prisma.user.count({
    where: { createdAt: { lt: (await userCreatedAt(userId)) ?? new Date() } },
  });
  const isEarlyBird = earlierCount < 100;

  for (const b of badges) {
    let value: number;
    if (b.id === "early_bird") value = isEarlyBird ? 1 : 0;
    else if (b.id === "season2_open") value = 0; // 시즌2 미오픈
    else value = badgeValue(b.id, agg) ?? 0;

    const earnedTier = resolveTier(value, b.tiers, false);
    await upsertUserBadge(userId, b.id, value, earnedTier);
  }
}

async function userCreatedAt(userId: string): Promise<Date | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  return u?.createdAt ?? null;
}

async function upsertUserBadge(userId: string, badgeId: string, currentValue: number, earnedTier: TierName | null): Promise<void> {
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId } },
    select: { earnedAt: true, earnedTier: true },
  });
  // 최초 달성 시각 보존
  const earnedAt = earnedTier ? existing?.earnedAt ?? new Date() : null;

  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId } },
    create: { userId, badgeId, currentValue, earnedTier, earnedAt },
    update: { currentValue, earnedTier, earnedAt },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// rebuildRankings
// ─────────────────────────────────────────────────────────────────────────────

/** 가치/순위 → User.tier 파생. */
function deriveTier(rank: number, totalKrw: number): string {
  if (rank === 1) return "LEGEND";
  if (totalKrw >= 1000 * 10000) return "DIAMOND"; // 1,000만+
  if (totalKrw >= 300 * 10000) return "GOLD";
  if (totalKrw >= 50 * 10000) return "SILVER";
  return "BRONZE";
}

/**
 * 전 유저 통계 집계 → 가치순 정렬 → RankingSnapshot upsert(userId+date 유니크).
 * 동시에 각 유저 비-rankMode 뱃지 갱신 + rankMode 뱃지(ranker/season_mvp) 순위 기반 갱신 + User.tier 파생.
 */
export async function rebuildRankings(date?: Date): Promise<{ users: number; snapshots: number }> {
  const day = date ?? new Date();
  const snapshotDate = new Date(day.getFullYear(), day.getMonth(), day.getDate()); // 00:00

  const users = await prisma.user.findMany({ select: { id: true } });
  const aggs: UserAgg[] = [];
  for (const u of users) {
    aggs.push(await aggregateUser(u.id));
  }

  // 가치순 정렬 → rank 부여
  const ranked = [...aggs].sort((a, b) => b.totalKrw - a.totalKrw);
  const total = ranked.length;

  // 각 유저 뱃지 카운트(비-rankMode 산출 후 합산용) — 먼저 비-rankMode 뱃지 갱신
  for (const agg of aggs) {
    await computeUserBadges(agg.userId, agg);
  }

  let snapshots = 0;
  for (const [i, agg] of ranked.entries()) {
    const rank = i + 1;

    const badgeCount = await prisma.userBadge.count({
      where: { userId: agg.userId, earnedTier: { not: null } },
    });

    await prisma.rankingSnapshot.upsert({
      where: { userId_date: { userId: agg.userId, date: snapshotDate } },
      create: {
        userId: agg.userId, date: snapshotDate, rank,
        totalKrw: agg.totalKrw, certifiedCount: agg.certified, badgeCount, monthlyAdded: agg.monthlyAdded,
      },
      update: {
        rank, totalKrw: agg.totalKrw, certifiedCount: agg.certified, badgeCount, monthlyAdded: agg.monthlyAdded,
      },
    });
    snapshots++;

    // rankMode 뱃지: ranker(가치 순위), season_mvp(시즌 종합=가치 순위 근사)
    await updateRankBadge(agg.userId, "ranker", rank);
    await updateRankBadge(agg.userId, "season_mvp", rank);

    // User.tier 파생 갱신
    const tier = deriveTier(rank, agg.totalKrw);
    await prisma.user.update({ where: { id: agg.userId }, data: { tier } });
  }

  // monthly_king: 이달 등록수 1위에게 월간 1위 1회 부여(누적은 단순화: 1)
  if (ranked.length > 0) {
    const topMonthly = [...aggs].sort((a, b) => b.monthlyAdded - a.monthlyAdded)[0];
    if (topMonthly && topMonthly.monthlyAdded > 0) {
      const tiers = await prisma.badgeTier.findMany({ where: { badgeId: "monthly_king" }, select: { tier: true, threshold: true } });
      const earned = resolveTier(1, tiers, false);
      await upsertUserBadge(topMonthly.userId, "monthly_king", 1, earned);
    }
  }

  // holders 갱신 (각 BadgeTier 의 달성자 수)
  await refreshBadgeHolders();

  return { users: total, snapshots };
}

async function updateRankBadge(userId: string, badgeId: string, rank: number): Promise<void> {
  const tiers = await prisma.badgeTier.findMany({ where: { badgeId }, select: { tier: true, threshold: true } });
  if (tiers.length === 0) return;
  const earned = resolveTier(rank, tiers, true);
  await upsertUserBadge(userId, badgeId, rank, earned as TierName | null);
}

/** 각 BadgeTier.holders = 해당 티어 이상을 달성한 유저 수. */
async function refreshBadgeHolders(): Promise<void> {
  const badges = await prisma.badge.findMany({ select: { id: true, tiers: { select: { id: true, tier: true } } } });
  for (const b of badges) {
    // 해당 뱃지를 earnedTier != null 로 보유한 유저들의 티어 분포
    const userBadges = await prisma.userBadge.findMany({
      where: { badgeId: b.id, earnedTier: { not: null } },
      select: { earnedTier: true },
    });
    for (const t of b.tiers) {
      const tierIdx = TIER_ORDER.indexOf(t.tier as TierName);
      const holders = userBadges.filter((ub) => {
        const ui = TIER_ORDER.indexOf(ub.earnedTier as TierName);
        return ui >= 0 && ui >= tierIdx;
      }).length;
      await prisma.badgeTier.update({ where: { id: t.id }, data: { holders } });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 조회 (UI 소비형)
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeTierName = TierName;

export interface BadgeView {
  id: string;
  name: string;
  desc: string;
  category: "collection" | "ranking" | "cert" | "season";
  emoji: string;
  unit: string;
  rankMode: boolean;
  tiers: { tier: TierName; label: string; threshold: number; holders: number }[];
  earnedTier: TierName | null;
  currentValue: number;
  earnedAt?: string;
}

// 뱃지 설명문 (mock 보존)
const BADGE_DESC: Record<string, string> = {
  card_register: "컬렉션에 카드를 등록해 보세요",
  sar_hunter: "SAR 등급 카드를 집중 수집하는 수집가",
  holo_collector: "반짝이는 홀로포일 카드를 모으는 수집가",
  ur_hunter: "희귀한 UR 등급 카드를 집중 수집",
  set_complete: "카드 세트를 완전히 수집한 완벽주의자",
  collection_value: "컬렉션 추정 가치 달성",
  ranker: "컬렉션 가치 랭킹 상위권 진입",
  monthly_king: "월간 카드 등록 수 1위를 달성한 최강 수집가",
  season_mvp: "시즌 종합 랭킹 최상위권 달성",
  certifier: "카드 인증 경험이 있는 검증된 수집가",
  psa_collector: "PSA 감정 카드를 전문적으로 수집",
  bgs_master: "BGS 감정 카드를 전문적으로 수집",
  early_bird: "서비스 오픈 초기 100명 이내 가입한 선구자",
  season1_complete: "시즌 1 기간 동안 활발하게 활동 완료",
  season2_open: "시즌 2 오픈 기념 한정 뱃지",
};

function formatEarnedAt(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 뱃지 정의 + 유저 진행도 머지. earnedTier/currentValue/holders 포함. */
export async function getBadgesForUser(userId: string): Promise<BadgeView[]> {
  const [badges, userBadges] = await Promise.all([
    prisma.badge.findMany({
      include: { tiers: true },
    }),
    prisma.userBadge.findMany({ where: { userId } }),
  ]);

  const ubMap = new Map(userBadges.map((ub) => [ub.badgeId, ub]));

  // 정의 순서 보존 (mock 순서)
  const ORDER = [
    "card_register", "sar_hunter", "holo_collector", "ur_hunter", "set_complete", "collection_value",
    "ranker", "monthly_king", "season_mvp",
    "certifier", "psa_collector", "bgs_master",
    "early_bird", "season1_complete", "season2_open",
  ];
  badges.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  return badges.map((b) => {
    const ub = ubMap.get(b.id);
    const tiers = [...b.tiers]
      .sort((x, y) => TIER_ORDER.indexOf(x.tier as TierName) - TIER_ORDER.indexOf(y.tier as TierName))
      .map((t) => ({ tier: t.tier as TierName, label: t.label, threshold: t.threshold, holders: t.holders }));
    return {
      id: b.id,
      name: b.name,
      desc: BADGE_DESC[b.id] ?? "",
      category: b.category as BadgeView["category"],
      emoji: b.emoji,
      unit: b.unit ?? "",
      rankMode: b.rankMode,
      tiers,
      earnedTier: (ub?.earnedTier as TierName | null) ?? null,
      currentValue: ub?.currentValue ?? 0,
      earnedAt: formatEarnedAt(ub?.earnedAt),
    };
  });
}

export type RankSort = "value" | "certified" | "badges" | "monthly";

export interface RankUserView {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarInitial: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "LEGEND";
  change: number;
  value: number;
  certified: number;
  badges: number;
  monthly: number;
  isMe?: boolean;
}

/** 최신 스냅샷 날짜 반환. 없으면 null. */
async function latestSnapshotDate(): Promise<Date | null> {
  const latest = await prisma.rankingSnapshot.findFirst({ orderBy: { date: "desc" }, select: { date: true } });
  return latest?.date ?? null;
}

const SORT_KEY: Record<RankSort, "totalKrw" | "certifiedCount" | "badgeCount" | "monthlyAdded"> = {
  value: "totalKrw", certified: "certifiedCount", badges: "badgeCount", monthly: "monthlyAdded",
};

/** 최신 스냅샷 기준 랭킹. sort 별 정렬. 빈 데이터면 []. */
export async function getRankings(opts?: { sort?: RankSort; limit?: number; viewerId?: string }): Promise<RankUserView[]> {
  const sort = opts?.sort ?? "value";
  const limit = opts?.limit ?? 100;
  const date = await latestSnapshotDate();
  if (!date) return [];

  const prevDate = await prisma.rankingSnapshot.findFirst({
    where: { date: { lt: date } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const snaps = await prisma.rankingSnapshot.findMany({
    where: { date },
    orderBy: { [SORT_KEY[sort]]: "desc" },
    take: limit,
  });

  // 변동(이전 스냅샷의 가치순 rank 대비)
  let prevRankMap = new Map<string, number>();
  if (prevDate) {
    const prev = await prisma.rankingSnapshot.findMany({ where: { date: prevDate.date }, select: { userId: true, rank: true } });
    prevRankMap = new Map(prev.map((p) => [p.userId, p.rank]));
  }

  const userIds = snaps.map((s) => s.userId);
  const userRows = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, displayName: true, name: true, avatarInitial: true, tier: true },
  });
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return snaps.map((s, i) => {
    const u = userMap.get(s.userId);
    const display = u?.displayName ?? u?.name ?? u?.username ?? "?";
    const rank = i + 1;
    const prevRank = prevRankMap.get(s.userId);
    const change = prevRank != null ? prevRank - rank : 0;
    return {
      rank,
      userId: s.userId,
      username: u?.username ?? s.userId,
      displayName: display,
      avatarInitial: u?.avatarInitial ?? display.charAt(0),
      tier: (u?.tier as RankUserView["tier"]) ?? "BRONZE",
      change,
      value: s.totalKrw,
      certified: s.certifiedCount,
      badges: s.badgeCount,
      monthly: s.monthlyAdded,
      isMe: opts?.viewerId ? s.userId === opts.viewerId : undefined,
    };
  });
}

export interface TopCollector {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarInitial: string;
  tier: string;
  valueKrw: number;
  cardCount: number;
  monthlyAdded: number;
}

/** 홈 "이달의 TOP N" — 최신 스냅샷 가치순 상위 n명. */
export async function getTopCollectors(n = 3): Promise<TopCollector[]> {
  const date = await latestSnapshotDate();
  if (!date) return [];
  const snaps = await prisma.rankingSnapshot.findMany({
    where: { date },
    orderBy: { totalKrw: "desc" },
    take: n,
  });
  const userIds = snaps.map((s) => s.userId);
  const [userRows, counts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true, name: true, avatarInitial: true, tier: true },
    }),
    prisma.collectionItem.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
  ]);
  const userMap = new Map(userRows.map((u) => [u.id, u]));
  const countMap = new Map(counts.map((c) => [c.userId, c._count._all]));

  return snaps.map((s, i) => {
    const u = userMap.get(s.userId);
    const display = u?.displayName ?? u?.name ?? u?.username ?? "?";
    return {
      rank: i + 1,
      userId: s.userId,
      username: u?.username ?? s.userId,
      displayName: display,
      avatarInitial: u?.avatarInitial ?? display.charAt(0),
      tier: u?.tier ?? "BRONZE",
      valueKrw: s.totalKrw,
      cardCount: countMap.get(s.userId) ?? 0,
      monthlyAdded: s.monthlyAdded,
    };
  });
}

/** 유저의 현재(최신 스냅샷) 가치 순위. 없으면 null. */
export async function getUserRank(userId: string): Promise<number | null> {
  const date = await latestSnapshotDate();
  if (!date) return null;
  const snap = await prisma.rankingSnapshot.findUnique({
    where: { userId_date: { userId, date } },
    select: { rank: true },
  });
  return snap?.rank ?? null;
}

export interface SeasonView {
  id: number;
  name: string;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
  daysLeft: number;
  progressPct: number;
}

/** 현재 active 시즌(없으면 가장 최근 시작). */
export async function getCurrentSeason(): Promise<SeasonView | null> {
  const season =
    (await prisma.season.findFirst({ where: { active: true }, orderBy: { startsAt: "desc" } })) ??
    (await prisma.season.findFirst({ orderBy: { startsAt: "desc" } }));
  if (!season) return null;

  const now = Date.now();
  const total = season.endsAt.getTime() - season.startsAt.getTime();
  const elapsed = Math.max(0, Math.min(total, now - season.startsAt.getTime()));
  const progressPct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
  const daysLeft = Math.max(0, Math.ceil((season.endsAt.getTime() - now) / 86_400_000));

  return {
    id: season.id,
    name: season.name,
    startsAt: season.startsAt,
    endsAt: season.endsAt,
    active: season.active,
    daysLeft,
    progressPct,
  };
}
