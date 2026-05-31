/**
 * 뱃지 정의 + 시즌 시드 (멱등).
 *
 * 실행: npm run seed:badges
 *
 * - Badge(id/name/category/emoji/unit/rankMode) + BadgeTier(SILVER/GOLD/DIAMOND, threshold, label) upsert.
 * - 기존 mock 뱃지 정의(src/components/profile/BadgesTab.tsx)를 그대로 이식.
 * - holders 는 집계 결과(rebuild)에서 갱신되므로 여기선 초기화하지 않음(생성 시 0).
 * - Season 시드(시즌1: 2026-01-01 ~ 2026-06-30 active).
 *
 * 멱등: badge.upsert + tier 는 (badgeId+tier) 조합으로 findFirst 후 update/create.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type TierDef = { tier: "SILVER" | "GOLD" | "DIAMOND"; threshold: number; label: string };
type BadgeDef = {
  id: string;
  name: string;
  category: "collection" | "cert" | "ranking" | "season";
  emoji: string;
  unit: string;
  rankMode?: boolean;
  tiers: TierDef[];
};

// mock(BadgesTab.tsx)의 13~15종 정의를 그대로 이식. desc/earnedTier/currentValue/earnedAt 은 런타임 산출.
const BADGES: BadgeDef[] = [
  // ── 수집 ──────────────────────────────────────────────────────────
  {
    id: "card_register", name: "카드 등록", category: "collection", emoji: "🃏", unit: "장",
    tiers: [
      { tier: "SILVER", threshold: 1, label: "카드 1장 등록" },
      { tier: "GOLD", threshold: 100, label: "카드 100장 등록" },
      { tier: "DIAMOND", threshold: 1000, label: "카드 1000장 등록" },
    ],
  },
  {
    id: "sar_hunter", name: "SAR 헌터", category: "collection", emoji: "⭐", unit: "장",
    tiers: [
      { tier: "SILVER", threshold: 5, label: "SAR 5장 보유" },
      { tier: "GOLD", threshold: 20, label: "SAR 20장 보유" },
      { tier: "DIAMOND", threshold: 100, label: "SAR 100장 보유" },
    ],
  },
  {
    id: "holo_collector", name: "홀로 컬렉터", category: "collection", emoji: "✨", unit: "장",
    tiers: [
      { tier: "SILVER", threshold: 20, label: "홀로포일 20장 보유" },
      { tier: "GOLD", threshold: 100, label: "홀로포일 100장 보유" },
      { tier: "DIAMOND", threshold: 500, label: "홀로포일 500장 보유" },
    ],
  },
  {
    id: "ur_hunter", name: "UR 헌터", category: "collection", emoji: "💎", unit: "장",
    tiers: [
      { tier: "SILVER", threshold: 1, label: "UR 1장 보유" },
      { tier: "GOLD", threshold: 5, label: "UR 5장 보유" },
      { tier: "DIAMOND", threshold: 20, label: "UR 20장 보유" },
    ],
  },
  {
    id: "set_complete", name: "세트 완성", category: "collection", emoji: "📚", unit: "세트",
    tiers: [
      { tier: "SILVER", threshold: 1, label: "1세트 완성" },
      { tier: "GOLD", threshold: 3, label: "3세트 완성" },
      { tier: "DIAMOND", threshold: 10, label: "10세트 완성" },
    ],
  },
  {
    id: "collection_value", name: "컬렉션 가치", category: "collection", emoji: "💰", unit: "만원",
    tiers: [
      { tier: "SILVER", threshold: 100, label: "가치 100만원 이상" },
      { tier: "GOLD", threshold: 1000, label: "가치 1,000만원 이상" },
      { tier: "DIAMOND", threshold: 10000, label: "가치 1억원 이상" },
    ],
  },

  // ── 랭킹 ──────────────────────────────────────────────────────────
  {
    id: "ranker", name: "랭커", category: "ranking", emoji: "🏆", unit: "위", rankMode: true,
    tiers: [
      { tier: "SILVER", threshold: 1000, label: "Top 1000 진입" },
      { tier: "GOLD", threshold: 100, label: "Top 100 진입" },
      { tier: "DIAMOND", threshold: 10, label: "Top 10 진입" },
    ],
  },
  {
    id: "monthly_king", name: "수집왕", category: "ranking", emoji: "👑", unit: "회",
    tiers: [
      { tier: "SILVER", threshold: 1, label: "월간 1위 1회" },
      { tier: "GOLD", threshold: 5, label: "월간 1위 5회" },
      { tier: "DIAMOND", threshold: 12, label: "월간 1위 12회" },
    ],
  },
  {
    id: "season_mvp", name: "시즌 MVP", category: "ranking", emoji: "🎯", unit: "위", rankMode: true,
    tiers: [
      { tier: "SILVER", threshold: 10, label: "시즌 Top 10 진입" },
      { tier: "GOLD", threshold: 3, label: "시즌 Top 3 진입" },
      { tier: "DIAMOND", threshold: 1, label: "시즌 1위 달성" },
    ],
  },

  // ── 인증 ──────────────────────────────────────────────────────────
  {
    id: "certifier", name: "인증자", category: "cert", emoji: "✅", unit: "장",
    tiers: [
      { tier: "SILVER", threshold: 1, label: "카드 1장 인증" },
      { tier: "GOLD", threshold: 10, label: "카드 10장 인증" },
      { tier: "DIAMOND", threshold: 50, label: "카드 50장 인증" },
    ],
  },
  {
    id: "psa_collector", name: "PSA 수집가", category: "cert", emoji: "🔐", unit: "장",
    tiers: [
      { tier: "SILVER", threshold: 1, label: "PSA 감정 1장 보유" },
      { tier: "GOLD", threshold: 10, label: "PSA 감정 10장 보유" },
      { tier: "DIAMOND", threshold: 50, label: "PSA 감정 50장 보유" },
    ],
  },
  {
    id: "bgs_master", name: "BGS 마스터", category: "cert", emoji: "🛡️", unit: "장",
    tiers: [
      { tier: "SILVER", threshold: 1, label: "BGS 감정 1장 보유" },
      { tier: "GOLD", threshold: 5, label: "BGS 감정 5장 보유" },
      { tier: "DIAMOND", threshold: 20, label: "BGS 감정 20장 보유" },
    ],
  },

  // ── 시즌 ──────────────────────────────────────────────────────────
  {
    id: "early_bird", name: "얼리버드", category: "season", emoji: "🐦", unit: "명",
    tiers: [{ tier: "SILVER", threshold: 1, label: "오픈 베타 100명 이내 가입" }],
  },
  {
    id: "season1_complete", name: "시즌 1 완주", category: "season", emoji: "🎖️", unit: "회",
    tiers: [{ tier: "SILVER", threshold: 1, label: "시즌 1 종료 전 카드 10장 등록" }],
  },
  {
    id: "season2_open", name: "시즌 2 참가", category: "season", emoji: "🌱", unit: "회",
    tiers: [{ tier: "SILVER", threshold: 1, label: "시즌 2 기간 내 가입" }],
  },
];

const SEASONS = [
  { id: 1, name: "시즌 1", startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2026-06-30T23:59:59Z"), active: true },
  { id: 2, name: "시즌 2", startsAt: new Date("2026-07-01T00:00:00Z"), endsAt: new Date("2026-12-31T23:59:59Z"), active: false },
];

async function main() {
  let badgeCount = 0;
  let tierCount = 0;

  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { id: b.id },
      create: { id: b.id, name: b.name, category: b.category, emoji: b.emoji, unit: b.unit, rankMode: b.rankMode ?? false },
      update: { name: b.name, category: b.category, emoji: b.emoji, unit: b.unit, rankMode: b.rankMode ?? false },
    });
    badgeCount++;

    for (const t of b.tiers) {
      const existing = await prisma.badgeTier.findFirst({ where: { badgeId: b.id, tier: t.tier } });
      if (existing) {
        await prisma.badgeTier.update({
          where: { id: existing.id },
          data: { threshold: t.threshold, label: t.label },
        });
      } else {
        await prisma.badgeTier.create({
          data: { badgeId: b.id, tier: t.tier, threshold: t.threshold, label: t.label },
        });
      }
      tierCount++;
    }
  }

  let seasonCount = 0;
  for (const s of SEASONS) {
    await prisma.season.upsert({
      where: { id: s.id },
      create: s,
      update: { name: s.name, startsAt: s.startsAt, endsAt: s.endsAt, active: s.active },
    });
    seasonCount++;
  }

  console.log(`[seed-badges] 뱃지 ${badgeCount}종 · 티어 ${tierCount}개 · 시즌 ${seasonCount}개 시드 완료.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
