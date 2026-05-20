"use client";

import { useState } from "react";
import { ToggleGroup } from "@/components/toss";

type BadgeType = "all" | "collection" | "ranking" | "cert" | "season";

interface Badge {
  id: string;
  name: string;
  desc: string;
  type: string;
  emoji: string;
  earned: boolean;
  earnedAt?: string;
}

const TAB_LABELS: { key: BadgeType; label: string }[] = [
  { key: "all",        label: "전체" },
  { key: "collection", label: "수집" },
  { key: "ranking",    label: "랭킹" },
  { key: "cert",       label: "인증" },
  { key: "season",     label: "시즌" },
];

export function BadgeTabs({ badges }: { badges: Badge[] }) {
  const [active, setActive] = useState<BadgeType>("all");

  const filtered =
    active === "all" ? badges : badges.filter((b) => b.type === active);
  const earned = filtered.filter((b) => b.earned);
  const locked = filtered.filter((b) => !b.earned);

  return (
    <div>
      {/* 탭 */}
      <ToggleGroup
        options={TAB_LABELS.map(({ key, label }) => ({ value: key, label }))}
        value={active}
        onChange={(v) => setActive(v as BadgeType)}
        size="sm"
        className="mb-5"
      />

      {/* 획득한 뱃지 */}
      {earned.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {earned.map((badge) => (
            <div
              key={badge.id}
              className="flex items-start gap-3 p-3 rounded-toss-lg bg-toss-bg-subtle border border-toss-border"
            >
              <span className="text-2xl shrink-0">{badge.emoji}</span>
              <div className="min-w-0">
                <p className="text-toss-label font-semibold text-toss-text-primary leading-tight">{badge.name}</p>
                <p className="text-toss-caption text-toss-text-secondary mt-0.5 leading-tight">{badge.desc}</p>
                {badge.earnedAt && (
                  <p className="text-toss-micro text-toss-text-quaternary mt-1">{badge.earnedAt}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 잠긴 뱃지 */}
      {locked.length > 0 && (
        <>
          <p className="text-toss-caption text-toss-text-quaternary mb-3 font-medium tracking-wide uppercase">
            미획득
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {locked.map((badge) => (
              <div
                key={badge.id}
                className="flex items-start gap-3 p-3 rounded-toss-lg bg-toss-bg-base border border-toss-border opacity-50"
              >
                <span className="text-2xl shrink-0 grayscale">{badge.emoji}</span>
                <div className="min-w-0">
                  <p className="text-toss-label font-semibold text-toss-text-tertiary leading-tight">{badge.name}</p>
                  <p className="text-toss-caption text-toss-text-quaternary mt-0.5 leading-tight">{badge.desc}</p>
                  <p className="text-toss-micro text-toss-text-quaternary mt-1">🔒 미획득</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <p className="text-toss-body text-toss-text-quaternary py-8 text-center">해당 뱃지 없음</p>
      )}
    </div>
  );
}
