import { BadgeCatalog, type Badge } from "@/components/badges/BadgeCatalog";
import type { BadgeView } from "@/lib/services/gamification";

export function BadgesTab({ badges }: { badges: BadgeView[] }) {
  const mapped: Badge[] = badges.map((b) => ({
    id: b.id,
    name: b.name,
    desc: b.desc,
    category: b.category,
    emoji: b.emoji,
    unit: b.unit,
    tiers: b.tiers,
    earnedTier: b.earnedTier,
    currentValue: b.currentValue,
    earnedAt: b.earnedAt,
    rankMode: b.rankMode,
  }));

  return (
    <div>
      <p className="text-toss-caption text-toss-text-tertiary mb-4">
        실버 · 골드 · 다이아 등급으로 수집 실력을 증명하세요
      </p>
      <BadgeCatalog badges={mapped} />
    </div>
  );
}
