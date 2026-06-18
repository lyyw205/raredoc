import { cn } from "@/lib/utils";

/**
 * 카드게임 메타 티어 색 팔레트(S~C) — **단일출처**.
 * (투자 tier-list 의 `lib/constants` TIER_COLORS 와는 별개 도메인 — 혼동 주의.)
 */
export const META_TIER_COLORS: Record<string, string> = {
  S: "bg-red-100 text-red-700 border border-red-200",
  A: "bg-orange-100 text-orange-700 border border-orange-200",
  B: "bg-blue-100 text-blue-700 border border-blue-200",
  C: "bg-gray-100 text-gray-600 border border-gray-200",
};

const SIZE: Record<"sm" | "md", string> = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
};

/** 메타 티어 뱃지(S/A/B/C). 메타·덱목록·덱상세가 공유. */
export function TierBadge({
  tier,
  size = "md",
  className,
}: {
  tier: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-toss-md font-bold shrink-0",
        SIZE[size],
        META_TIER_COLORS[tier],
        className,
      )}
    >
      {tier}
    </span>
  );
}
