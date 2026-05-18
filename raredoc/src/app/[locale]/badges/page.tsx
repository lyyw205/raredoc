import type { Metadata } from "next";
import { BadgeCatalog, type Badge } from "@/components/badges/BadgeCatalog";

export const metadata: Metadata = {
  title: "뱃지 도감",
  description: "실버 → 골드 → 다이아 등급으로 수집 실력을 증명하세요",
};

const BADGES: Badge[] = [
  // ── 수집 ──────────────────────────────────────────────────────────────
  {
    id: "card_register", name: "카드 등록", desc: "컬렉션에 카드를 등록해 보세요",
    category: "collection", emoji: "🃏", unit: "장",
    earnedTier: "DIAMOND", currentValue: 1203, earnedAt: "2026.04.02",
    tiers: [
      { tier: "SILVER",  label: "카드 1장 등록",     threshold: 1,    holders: 2841 },
      { tier: "GOLD",    label: "카드 100장 등록",   threshold: 100,  holders: 1203 },
      { tier: "DIAMOND", label: "카드 1000장 등록",  threshold: 1000, holders: 87   },
    ],
  },
  {
    id: "sar_hunter", name: "SAR 헌터", desc: "SAR 등급 카드를 집중 수집하는 수집가",
    category: "collection", emoji: "⭐", unit: "장",
    earnedTier: "SILVER", currentValue: 8, earnedAt: "2025.11.03",
    tiers: [
      { tier: "SILVER",  label: "SAR 5장 보유",   threshold: 5,   holders: 962 },
      { tier: "GOLD",    label: "SAR 20장 보유",  threshold: 20,  holders: 312 },
      { tier: "DIAMOND", label: "SAR 100장 보유", threshold: 100, holders: 43  },
    ],
  },
  {
    id: "holo_collector", name: "홀로 컬렉터", desc: "반짝이는 홀로포일 카드를 모으는 수집가",
    category: "collection", emoji: "✨", unit: "장",
    earnedTier: "SILVER", currentValue: 87, earnedAt: "2026.01.15",
    tiers: [
      { tier: "SILVER",  label: "홀로포일 20장 보유",  threshold: 20,  holders: 1204 },
      { tier: "GOLD",    label: "홀로포일 100장 보유", threshold: 100, holders: 347  },
      { tier: "DIAMOND", label: "홀로포일 500장 보유", threshold: 500, holders: 29   },
    ],
  },
  {
    id: "ur_hunter", name: "UR 헌터", desc: "희귀한 UR 등급 카드를 집중 수집",
    category: "collection", emoji: "💎", unit: "장",
    earnedTier: null, currentValue: 0,
    tiers: [
      { tier: "SILVER",  label: "UR 1장 보유",  threshold: 1,  holders: 721 },
      { tier: "GOLD",    label: "UR 5장 보유",  threshold: 5,  holders: 198 },
      { tier: "DIAMOND", label: "UR 20장 보유", threshold: 20, holders: 34  },
    ],
  },
  {
    id: "set_complete", name: "세트 완성", desc: "카드 세트를 완전히 수집한 완벽주의자",
    category: "collection", emoji: "📚", unit: "세트",
    earnedTier: null, currentValue: 0,
    tiers: [
      { tier: "SILVER",  label: "1세트 완성",  threshold: 1,  holders: 892 },
      { tier: "GOLD",    label: "3세트 완성",  threshold: 3,  holders: 231 },
      { tier: "DIAMOND", label: "10세트 완성", threshold: 10, holders: 3   },
    ],
  },
  {
    id: "collection_value", name: "컬렉션 가치", desc: "컬렉션 추정 가치 달성",
    category: "collection", emoji: "💰", unit: "만원",
    earnedTier: "SILVER", currentValue: 320, earnedAt: "2026.02.14",
    tiers: [
      { tier: "SILVER",  label: "가치 100만원 이상",   threshold: 100,  holders: 1123 },
      { tier: "GOLD",    label: "가치 1,000만원 이상", threshold: 1000, holders: 234  },
      { tier: "DIAMOND", label: "가치 1억원 이상",     threshold: 10000,holders: 12   },
    ],
  },

  // ── 랭킹 ──────────────────────────────────────────────────────────────
  {
    id: "ranker", name: "랭커", desc: "컬렉션 가치 랭킹 상위권 진입",
    category: "ranking", emoji: "🏆", unit: "위",
    earnedTier: "GOLD", currentValue: 87, earnedAt: "2025.12.01", rankMode: true,
    tiers: [
      { tier: "SILVER",  label: "Top 1000 진입", threshold: 1000, holders: 1000 },
      { tier: "GOLD",    label: "Top 100 진입",  threshold: 100,  holders: 100  },
      { tier: "DIAMOND", label: "Top 10 진입",   threshold: 10,   holders: 10   },
    ],
  },
  {
    id: "monthly_king", name: "수집왕", desc: "월간 카드 등록 수 1위를 달성한 최강 수집가",
    category: "ranking", emoji: "👑", unit: "회",
    earnedTier: null, currentValue: 0,
    tiers: [
      { tier: "SILVER",  label: "월간 1위 1회",  threshold: 1,  holders: 36 },
      { tier: "GOLD",    label: "월간 1위 5회",  threshold: 5,  holders: 8  },
      { tier: "DIAMOND", label: "월간 1위 12회", threshold: 12, holders: 1  },
    ],
  },
  {
    id: "season_mvp", name: "시즌 MVP", desc: "시즌 종합 랭킹 최상위권 달성",
    category: "ranking", emoji: "🎯", unit: "위",
    earnedTier: null, currentValue: 0, rankMode: true,
    tiers: [
      { tier: "SILVER",  label: "시즌 Top 10 진입", threshold: 10, holders: 30 },
      { tier: "GOLD",    label: "시즌 Top 3 진입",  threshold: 3,  holders: 9  },
      { tier: "DIAMOND", label: "시즌 1위 달성",    threshold: 1,  holders: 2  },
    ],
  },

  // ── 인증 ──────────────────────────────────────────────────────────────
  {
    id: "certifier", name: "인증자", desc: "카드 인증 경험이 있는 검증된 수집가",
    category: "cert", emoji: "✅", unit: "장",
    earnedTier: "GOLD", currentValue: 12, earnedAt: "2026.02.10",
    tiers: [
      { tier: "SILVER",  label: "카드 1장 인증",  threshold: 1,  holders: 1203 },
      { tier: "GOLD",    label: "카드 10장 인증", threshold: 10, holders: 421  },
      { tier: "DIAMOND", label: "카드 50장 인증", threshold: 50, holders: 68   },
    ],
  },
  {
    id: "psa_collector", name: "PSA 수집가", desc: "PSA 감정 카드를 전문적으로 수집",
    category: "cert", emoji: "🔐", unit: "장",
    earnedTier: "SILVER", currentValue: 6, earnedAt: "2025.09.22",
    tiers: [
      { tier: "SILVER",  label: "PSA 감정 1장 보유",  threshold: 1,  holders: 892 },
      { tier: "GOLD",    label: "PSA 감정 10장 보유", threshold: 10, holders: 234 },
      { tier: "DIAMOND", label: "PSA 감정 50장 보유", threshold: 50, holders: 31  },
    ],
  },
  {
    id: "bgs_master", name: "BGS 마스터", desc: "BGS 감정 카드를 전문적으로 수집",
    category: "cert", emoji: "🛡️", unit: "장",
    earnedTier: null, currentValue: 0,
    tiers: [
      { tier: "SILVER",  label: "BGS 감정 1장 보유",  threshold: 1,  holders: 312 },
      { tier: "GOLD",    label: "BGS 감정 5장 보유",  threshold: 5,  holders: 87  },
      { tier: "DIAMOND", label: "BGS 감정 20장 보유", threshold: 20, holders: 14  },
    ],
  },

  // ── 시즌 ──────────────────────────────────────────────────────────────
  {
    id: "early_bird", name: "얼리버드", desc: "서비스 오픈 초기 100명 이내 가입한 선구자",
    category: "season", emoji: "🐦", unit: "명",
    earnedTier: "SILVER", currentValue: 1, earnedAt: "2025.09.01",
    tiers: [{ tier: "SILVER", label: "오픈 베타 100명 이내 가입", threshold: 1, holders: 100 }],
  },
  {
    id: "season1_complete", name: "시즌 1 완주", desc: "시즌 1 기간 동안 활발하게 활동 완료",
    category: "season", emoji: "🎖️", unit: "회",
    earnedTier: "SILVER", currentValue: 1, earnedAt: "2026.03.31",
    tiers: [{ tier: "SILVER", label: "시즌 1 종료 전 카드 10장 등록", threshold: 1, holders: 892 }],
  },
  {
    id: "season2_open", name: "시즌 2 참가", desc: "시즌 2 오픈 기념 한정 뱃지",
    category: "season", emoji: "🌱", unit: "회",
    earnedTier: null, currentValue: 0,
    tiers: [{ tier: "SILVER", label: "시즌 2 기간 내 가입", threshold: 1, holders: 0 }],
  },
];

export default function BadgesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">뱃지 도감</h1>
        <p className="text-sm text-gray-500 mt-1">실버 → 골드 → 다이아 등급으로 수집 실력을 증명하세요</p>
      </div>
      <BadgeCatalog badges={BADGES} />
    </div>
  );
}
