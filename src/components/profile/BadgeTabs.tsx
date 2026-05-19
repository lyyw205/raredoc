"use client";

import { useState } from "react";

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
  { key: "all", label: "전체" },
  { key: "collection", label: "수집" },
  { key: "ranking", label: "랭킹" },
  { key: "cert", label: "인증" },
  { key: "season", label: "시즌" },
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
      <div className="flex gap-1 mb-5">
        {TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active === key
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 획득한 뱃지 */}
      {earned.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {earned.map((badge) => (
            <div
              key={badge.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700"
            >
              <span className="text-2xl shrink-0">{badge.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{badge.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{badge.desc}</p>
                {badge.earnedAt && (
                  <p className="text-[11px] text-gray-600 mt-1">{badge.earnedAt}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 잠긴 뱃지 */}
      {locked.length > 0 && (
        <>
          <p className="text-xs text-gray-600 mb-3 font-medium tracking-wide uppercase">
            미획득
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {locked.map((badge) => (
              <div
                key={badge.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 opacity-50"
              >
                <span className="text-2xl shrink-0 grayscale">{badge.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-500 leading-tight">{badge.name}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-tight">{badge.desc}</p>
                  <p className="text-[11px] text-gray-700 mt-1">🔒 미획득</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-600 py-8 text-center">해당 뱃지 없음</p>
      )}
    </div>
  );
}
