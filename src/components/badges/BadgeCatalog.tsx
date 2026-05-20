"use client";

import { useState, useMemo } from "react";
import { Award, Lock, CheckCircle2 } from "lucide-react";
import { Card, Tag, ToggleGroup, SegmentedControl } from "@/components/toss";
import { cn } from "@/lib/utils";

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

const TIER_LABEL: Record<Tier, string> = {
  SILVER: "실버",
  GOLD: "골드",
  DIAMOND: "다이아",
};

const TIER_ORDER: Tier[] = ["SILVER", "GOLD", "DIAMOND"];

const CATS: { key: "all" | BadgeCategory; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "collection", label: "수집" },
  { key: "ranking", label: "랭킹" },
  { key: "cert", label: "인증" },
  { key: "season", label: "시즌" },
];

const CAT_LABEL: Record<BadgeCategory, string> = {
  collection: "수집",
  ranking: "랭킹",
  cert: "인증",
  season: "시즌",
};

const TIER_STARS: Record<Tier, number> = { SILVER: 1, GOLD: 2, DIAMOND: 3 };

// SVG 그라데이션 강도 — 단일 brand 톤, 티어가 올라갈수록 진해짐
const TIER_FILL: Record<Tier, { from: string; to: string; ring: string }> = {
  SILVER:  { from: "#A9C8FF", to: "#5C97FF", ring: "#3182F6" }, // brand light
  GOLD:    { from: "#5C97FF", to: "#1E64DA", ring: "#1E64DA" }, // brand mid
  DIAMOND: { from: "#1E64DA", to: "#0B3FA0", ring: "#0B3FA0" }, // brand deep
};

function initials(name: string): string {
  // 한글 이름의 첫 1~2 음절
  const trimmed = name.replace(/\s+/g, "");
  return trimmed.slice(0, 2);
}

function BadgeArtwork({ badge, size = 64 }: { badge: Badge; size?: number }) {
  const { earnedTier } = badge;
  const id = `bg-${badge.id}`;
  const fill = earnedTier ? TIER_FILL[earnedTier] : null;
  const stars = earnedTier ? TIER_STARS[earnedTier] : 0;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
          {fill ? (
            <>
              <stop offset="0%" stopColor={fill.from} />
              <stop offset="100%" stopColor={fill.to} />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#E5E8EB" />
              <stop offset="100%" stopColor="#C9CDD2" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Shield shape */}
      <path
        d="M32 4 L56 12 L56 30 C56 44 46 54 32 60 C18 54 8 44 8 30 L8 12 Z"
        fill={`url(#${id}-grad)`}
        stroke={fill?.ring ?? "#C9CDD2"}
        strokeWidth="1.5"
      />
      {/* Shine overlay */}
      <path
        d="M32 4 L56 12 L56 30 C56 44 46 54 32 60 C18 54 8 44 8 30 L8 12 Z"
        fill={`url(#${id}-shine)`}
      />

      {/* Inner ring */}
      <path
        d="M32 10 L50 16 L50 30 C50 41 42 49 32 54 C22 49 14 41 14 30 L14 16 Z"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.4"
        strokeWidth="1"
      />

      {/* Korean initials */}
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Pretendard Variable, Pretendard, sans-serif"
        fontWeight="800"
        fontSize={initials(badge.name).length > 1 ? "16" : "20"}
        fill={earnedTier ? "#FFFFFF" : "#8B95A1"}
      >
        {initials(badge.name)}
      </text>

      {/* Tier stars */}
      {stars > 0 && (
        <g transform={`translate(${32 - (stars - 1) * 4}, 44)`}>
          {Array.from({ length: stars }).map((_, i) => (
            <circle
              key={i}
              cx={i * 8}
              cy={0}
              r={1.6}
              fill="#FFFFFF"
              opacity={0.95}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

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
  const pct = Math.max(
    0,
    Math.min(100, Math.round(((badge.currentValue - from) / (next.threshold - from)) * 100))
  );
  return { pct, current: badge.currentValue, next: next.threshold };
}

function BadgeCard({ badge }: { badge: Badge }) {
  const { earnedTier } = badge;
  const isUnearned = earnedTier === null;
  const isMaxed = earnedTier === "DIAMOND";
  const nextTier = getNextTier(badge);
  const progress = getProgress(badge);

  return (
    <Card
      className={cn(
        "!p-4 flex flex-col gap-3 transition-all",
        isUnearned && "opacity-70"
      )}
    >
      {/* Tier chip + MAX */}
      <div className="flex items-center justify-between min-h-[22px]">
        {earnedTier ? (
          <Tag color="brand" shape="soft" className="text-toss-micro font-bold">
            {TIER_LABEL[earnedTier]}
          </Tag>
        ) : (
          <Tag color="neutral" shape="soft" className="text-toss-micro font-medium">
            {CAT_LABEL[badge.category]}
          </Tag>
        )}
        {isMaxed && (
          <span className="text-toss-micro font-bold text-toss-brand tracking-wider">MAX</span>
        )}
      </div>

      {/* Badge artwork */}
      <div className="flex justify-center py-1">
        <BadgeArtwork badge={badge} size={72} />
      </div>

      {/* Name + desc */}
      <div className="text-center">
        <p
          className={cn(
            "text-toss-label font-bold leading-tight",
            isUnearned ? "text-toss-text-tertiary" : "text-toss-text-primary"
          )}
        >
          {badge.name}
        </p>
        <p className="text-toss-caption text-toss-text-tertiary mt-1 leading-snug line-clamp-2">
          {badge.desc}
        </p>
      </div>

      {/* Tier progression dots */}
      <div className="flex items-center justify-center gap-2">
        {badge.tiers.map((t) => {
          const lit =
            earnedTier !== null && TIER_ORDER.indexOf(earnedTier) >= TIER_ORDER.indexOf(t.tier);
          return (
            <div
              key={t.tier}
              title={`${TIER_LABEL[t.tier]}: ${t.label}`}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                lit ? "bg-toss-brand text-white" : "bg-toss-bg-subtle text-toss-text-quaternary"
              )}
            >
              {lit ? (
                <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-toss-text-quaternary" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar (count-based badges) */}
      {progress && (
        <div>
          <div className="flex justify-between text-toss-micro text-toss-text-tertiary mb-1 toss-numeric">
            <span>
              {badge.currentValue.toLocaleString()}
              {badge.unit}
            </span>
            <span>
              {progress.next.toLocaleString()}
              {badge.unit}
            </span>
          </div>
          <div className="h-1.5 bg-toss-bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-toss-brand rounded-full transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Rank mode hint */}
      {badge.rankMode && nextTier && !isMaxed && (
        <p className="text-toss-caption text-toss-text-tertiary text-center">
          현재 <span className="font-semibold text-toss-text-secondary toss-numeric">{badge.currentValue}위</span> · 다음{" "}
          <span className="font-semibold text-toss-text-secondary toss-numeric">{nextTier.threshold}위 이내</span>
        </p>
      )}

      {/* Unearned hint */}
      {isUnearned && badge.tiers[0] && (
        <p className="text-toss-caption text-toss-text-tertiary text-center flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          {badge.tiers[0].label}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-toss-divider">
        {isUnearned ? (
          <p className="text-toss-micro text-toss-text-quaternary toss-numeric">
            {badge.tiers[0].holders.toLocaleString()}명 보유
          </p>
        ) : (
          <p className="text-toss-micro text-toss-text-tertiary toss-numeric">
            {badge.tiers.find((t) => t.tier === earnedTier)?.holders.toLocaleString()}명 달성
            {badge.earnedAt && ` · ${badge.earnedAt}`}
          </p>
        )}
      </div>
    </Card>
  );
}

export function BadgeCatalog({ badges }: { badges: Badge[] }) {
  const [activeCat, setActiveCat] = useState<"all" | BadgeCategory>("all");
  const [viewMode, setViewMode] = useState<"all" | "earned">("all");

  const filtered = useMemo(() => {
    let list = activeCat === "all" ? badges : badges.filter((b) => b.category === activeCat);
    if (viewMode === "earned") list = list.filter((b) => b.earnedTier !== null);
    return list;
  }, [badges, activeCat, viewMode]);

  const earnedCount = badges.filter((b) => b.earnedTier !== null).length;
  const silverCount = badges.filter((b) => b.earnedTier === "SILVER").length;
  const goldCount = badges.filter((b) => b.earnedTier === "GOLD").length;
  const diamondCount = badges.filter((b) => b.earnedTier === "DIAMOND").length;

  const catOptions = CATS.map(({ key, label }) => {
    const total = key === "all" ? badges.length : badges.filter((b) => b.category === key).length;
    const earned =
      key === "all" ? earnedCount : badges.filter((b) => b.category === key && b.earnedTier).length;
    return { value: key, label: `${label} ${earned}/${total}` };
  });

  return (
    <div>
      {/* Status card */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <p className="text-toss-caption text-toss-text-tertiary mb-1">보유 뱃지</p>
            <p className="text-toss-title-1 font-bold text-toss-text-primary toss-numeric">
              {earnedCount}
              <span className="text-toss-label text-toss-text-tertiary font-normal">
                {" "}
                / {badges.length}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <TierStat label={TIER_LABEL.SILVER} count={silverCount} />
            <TierStat label={TIER_LABEL.GOLD} count={goldCount} />
            <TierStat label={TIER_LABEL.DIAMOND} count={diamondCount} />
          </div>
        </div>
        <div className="h-2 bg-toss-bg-subtle rounded-full overflow-hidden">
          <div
            className="h-full bg-toss-brand rounded-full transition-all"
            style={{ width: `${(earnedCount / badges.length) * 100}%` }}
          />
        </div>
        <p className="text-toss-caption text-toss-text-tertiary mt-2 toss-numeric">
          달성률 {Math.round((earnedCount / badges.length) * 100)}%
        </p>
      </Card>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <ToggleGroup
          options={catOptions}
          value={activeCat}
          onChange={(v) => setActiveCat(v as "all" | BadgeCategory)}
          size="sm"
        />
        <SegmentedControl
          options={[
            { value: "all", label: "전체 뱃지" },
            { value: "earned", label: "획득" },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as "all" | "earned")}
          size="sm"
          variant="filled"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Award className="w-8 h-8 text-toss-text-quaternary mx-auto mb-2" strokeWidth={2} />
          <p className="text-toss-body text-toss-text-tertiary">획득한 뱃지가 없어요</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <BadgeCard key={b.id} badge={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function TierStat({ label, count }: { label: string; count: number }) {
  return (
    <div className="text-center">
      <p className="text-toss-subtitle font-bold text-toss-text-primary toss-numeric">{count}</p>
      <p className="text-toss-micro text-toss-text-tertiary mt-0.5">{label}</p>
    </div>
  );
}
