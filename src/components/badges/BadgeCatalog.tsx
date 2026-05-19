"use client";

import { useState, useMemo } from "react";

export type Tier = "SILVER" | "GOLD" | "DIAMOND";
export type BadgeCategory = "collection" | "ranking" | "cert" | "season";

export interface TierLevel {
  tier: Tier;
  label: string;
  threshold: number;
  holders: number;
}

export interface Badge {
  id: string;
  name: string;
  desc: string;
  category: BadgeCategory;
  emoji: string;
  unit: string;
  tiers: TierLevel[];
  earnedTier: Tier | null;
  currentValue: number;
  earnedAt?: string;
  rankMode?: boolean;
}

// ── Visual config per tier ────────────────────────────────────────────────

const TIER_CFG: Record<Tier, {
  icon: string; label: string;
  border: string; glow: string;
  chip: string; bar: string;
  dotActive: string; emojiBg: string;
}> = {
  SILVER: {
    icon: "🥈", label: "실버",
    border: "border-gray-400/40 ring-1 ring-gray-400/25",
    glow: "shadow-md shadow-gray-300/15",
    chip: "bg-gray-700/80 text-gray-200",
    bar: "from-gray-400 to-gray-300",
    dotActive: "bg-gray-600/40 ring-1 ring-gray-400 text-gray-300",
    emojiBg: "from-gray-700/50 to-gray-800/50",
  },
  GOLD: {
    icon: "🥇", label: "골드",
    border: "border-yellow-500/50 ring-1 ring-yellow-400/30",
    glow: "badge-gold",
    chip: "bg-yellow-900/70 text-yellow-300",
    bar: "from-yellow-500 to-amber-400",
    dotActive: "bg-yellow-600/30 ring-1 ring-yellow-400 text-yellow-300",
    emojiBg: "from-yellow-800/40 to-amber-900/40",
  },
  DIAMOND: {
    icon: "💎", label: "다이아",
    border: "border-cyan-400/50 ring-1 ring-cyan-400/30",
    glow: "badge-diamond",
    chip: "bg-cyan-900/70 text-cyan-300",
    bar: "from-cyan-500 to-blue-400",
    dotActive: "bg-cyan-700/30 ring-1 ring-cyan-400 text-cyan-300",
    emojiBg: "from-cyan-900/40 to-blue-900/40",
  },
};

const TIER_ORDER: Tier[] = ["SILVER", "GOLD", "DIAMOND"];

const CATS = [
  { key: "all" as const,        label: "전체", emoji: "🏅" },
  { key: "collection" as const, label: "수집", emoji: "🃏" },
  { key: "ranking" as const,    label: "랭킹", emoji: "🏆" },
  { key: "cert" as const,       label: "인증", emoji: "✅" },
  { key: "season" as const,     label: "시즌", emoji: "🎖️" },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function getNextTier(badge: Badge): TierLevel | null {
  if (!badge.earnedTier) return badge.tiers[0] ?? null;
  const idx = badge.tiers.findIndex((t) => t.tier === badge.earnedTier);
  return badge.tiers[idx + 1] ?? null;
}

function getProgress(badge: Badge): { pct: number; current: number; next: number } | null {
  if (badge.rankMode) return null;
  const next = getNextTier(badge);
  if (!next) return null;
  const prev = badge.earnedTier ? badge.tiers.find((t) => t.tier === badge.earnedTier) : null;
  const from = prev?.threshold ?? 0;
  const pct = Math.max(0, Math.min(100, Math.round(((badge.currentValue - from) / (next.threshold - from)) * 100)));
  return { pct, current: badge.currentValue, next: next.threshold };
}

// ── Diamond sparkles ──────────────────────────────────────────────────────

function Sparkles() {
  return (
    <>
      <span className="absolute top-2 right-6 text-[9px] text-cyan-300 animate-pulse select-none" style={{ animationDelay: "0s" }}>✦</span>
      <span className="absolute top-5 right-2 text-[11px] text-blue-300 animate-pulse select-none" style={{ animationDelay: "0.6s" }}>✦</span>
      <span className="absolute top-1 right-14 text-[7px] text-purple-300 animate-pulse select-none" style={{ animationDelay: "1.2s" }}>✦</span>
      <span className="absolute bottom-10 right-3 text-[9px] text-cyan-400 animate-pulse select-none" style={{ animationDelay: "1.8s" }}>✦</span>
      <span className="absolute top-3 left-3 text-[7px] text-blue-400 animate-pulse select-none" style={{ animationDelay: "2.4s" }}>✦</span>
    </>
  );
}

// ── Badge card ────────────────────────────────────────────────────────────

function BadgeCard({ badge }: { badge: Badge }) {
  const { earnedTier } = badge;
  const cfg = earnedTier ? TIER_CFG[earnedTier] : null;
  const nextTier = getNextTier(badge);
  const progress = getProgress(badge);
  const isMaxed = earnedTier === "DIAMOND";
  const isUnearned = earnedTier === null;

  return (
    <div className={`relative rounded-2xl border p-4 flex flex-col gap-2.5 transition-all overflow-hidden ${
      isUnearned
        ? "bg-gray-900/50 border-gray-800/40 opacity-50"
        : `bg-gray-900 ${cfg!.border} ${cfg!.glow}`
    }`}>
      {earnedTier === "DIAMOND" && <Sparkles />}

      {/* Tier chip + MAX */}
      <div className="flex items-center justify-between min-h-[20px]">
        {earnedTier ? (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg!.chip}`}>
            {cfg!.icon} {cfg!.label}
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-600">
            🔒 미획득
          </span>
        )}
        {isMaxed && (
          <span className="text-[10px] font-black text-cyan-400 tracking-wider animate-pulse">MAX ✦</span>
        )}
      </div>

      {/* Emoji container */}
      <div className="flex justify-center py-0.5">
        <div className={`w-[72px] h-[72px] rounded-2xl flex items-center justify-center bg-gradient-to-br ${
          cfg ? cfg.emojiBg : "from-gray-800/40 to-gray-900/40"
        }`}>
          <span className={`select-none ${
            earnedTier === "DIAMOND" ? "text-5xl" : "text-4xl"
          } ${isUnearned ? "grayscale opacity-40" : ""}`}>
            {badge.emoji}
          </span>
        </div>
      </div>

      {/* Name + desc */}
      <div className="text-center">
        <p className={`text-sm font-bold leading-tight ${earnedTier ? "text-white" : "text-gray-600"}`}>
          {badge.name}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{badge.desc}</p>
      </div>

      {/* Tier progression dots */}
      <div className="flex items-center justify-center gap-1.5">
        {badge.tiers.map((t) => {
          const lit = earnedTier !== null && TIER_ORDER.indexOf(earnedTier) >= TIER_ORDER.indexOf(t.tier);
          return (
            <div
              key={t.tier}
              title={`${TIER_CFG[t.tier].label}: ${t.label}`}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] transition-all ${
                lit ? TIER_CFG[t.tier].dotActive : "bg-gray-800 text-gray-700"
              }`}
            >
              {lit ? TIER_CFG[t.tier].icon : "○"}
            </div>
          );
        })}
      </div>

      {/* Progress bar (count-based badges) */}
      {progress && (
        <div>
          <div className="flex justify-between text-[10px] text-gray-600 mb-1">
            <span>{badge.currentValue.toLocaleString()}{badge.unit}</span>
            <span>→ {progress.next.toLocaleString()}{badge.unit}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${nextTier ? TIER_CFG[nextTier.tier].bar : ""} transition-all`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Rank mode next hint */}
      {badge.rankMode && nextTier && !isMaxed && (
        <p className="text-[11px] text-gray-600 text-center">
          현재 {badge.currentValue}위 → {TIER_CFG[nextTier.tier].label}: {nextTier.threshold}위 이내
        </p>
      )}

      {/* Unearned: show first requirement */}
      {isUnearned && badge.tiers[0] && (
        <p className="text-[11px] text-gray-600 text-center">
          🔒 {badge.tiers[0].label}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-gray-800/60">
        {isUnearned ? (
          <p className="text-[11px] text-gray-700">{badge.tiers[0].holders.toLocaleString()}명 보유</p>
        ) : (
          <p className="text-[11px] text-gray-600">
            {badge.tiers.find((t) => t.tier === earnedTier)?.holders.toLocaleString()}명 달성
            {badge.earnedAt && ` · ${badge.earnedAt}`}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main catalog component ────────────────────────────────────────────────

type CatKey = "all" | BadgeCategory;

export function BadgeCatalog({ badges }: { badges: Badge[] }) {
  const [activeCat, setActiveCat] = useState<CatKey>("all");
  const [viewMode, setViewMode] = useState<"all" | "earned">("all");

  const filtered = useMemo(() => {
    let list = activeCat === "all" ? badges : badges.filter((b) => b.category === activeCat);
    if (viewMode === "earned") list = list.filter((b) => b.earnedTier !== null);
    return list;
  }, [badges, activeCat, viewMode]);

  const earnedCount  = badges.filter((b) => b.earnedTier !== null).length;
  const silverCount  = badges.filter((b) => b.earnedTier === "SILVER").length;
  const goldCount    = badges.filter((b) => b.earnedTier === "GOLD").length;
  const diamondCount = badges.filter((b) => b.earnedTier === "DIAMOND").length;

  return (
    <>
      <style>{`
        @keyframes gold-pulse {
          0%,100% { box-shadow: 0 0 10px 2px rgba(234,179,8,.22); }
          50%      { box-shadow: 0 0 22px 6px rgba(234,179,8,.38); }
        }
        @keyframes diamond-sparkle {
          0%,100% { box-shadow: 0 0 14px 3px rgba(34,211,238,.32); }
          33%     { box-shadow: 0 0 26px 8px rgba(139,92,246,.38); }
          66%     { box-shadow: 0 0 26px 8px rgba(59,130,246,.38); }
        }
        .badge-gold    { animation: gold-pulse 2.5s ease-in-out infinite; }
        .badge-diamond { animation: diamond-sparkle 3s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      {/* ── Status card ─────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-gray-900 border border-gray-800 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">보유 뱃지</p>
            <p className="text-2xl font-black text-white">
              {earnedCount}
              <span className="text-sm text-gray-500 font-normal"> / {badges.length}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-base font-black text-gray-300">🥈 {silverCount}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">실버</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-yellow-400">🥇 {goldCount}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">골드</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-cyan-400">💎 {diamondCount}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">다이아</p>
            </div>
          </div>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gray-400 via-yellow-400 to-cyan-400 rounded-full transition-all"
            style={{ width: `${(earnedCount / badges.length) * 100}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-600 mt-1.5">
          달성률 {Math.round((earnedCount / badges.length) * 100)}%
        </p>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {CATS.map(({ key, label, emoji }) => {
            const total  = key === "all" ? badges.length : badges.filter((b) => b.category === key).length;
            const earned = key === "all" ? earnedCount  : badges.filter((b) => b.category === key && b.earnedTier).length;
            return (
              <button
                key={key}
                onClick={() => setActiveCat(key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCat === key
                    ? "bg-gray-700 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
                <span className={`text-[10px] ${activeCat === key ? "text-gray-400" : "text-gray-600"}`}>
                  {earned}/{total}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 bg-gray-800/60 rounded-xl p-1 shrink-0">
          {(["all", "earned"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === m ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {m === "all" ? "전체 뱃지" : "획득한 것만"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-3xl mb-2">🔒</p>
          <p className="text-sm">획득한 뱃지가 없어요</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <BadgeCard key={b.id} badge={b} />
          ))}
        </div>
      )}
    </>
  );
}
