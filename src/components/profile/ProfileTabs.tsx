"use client";

import { useState } from "react";
import { CollectionTab } from "./CollectionTab";
import { BadgesTab } from "./BadgesTab";
import { RankingTab } from "./RankingTab";

type Tab = "collection" | "badges" | "ranking";

const TABS: { key: Tab; label: string }[] = [
  { key: "collection", label: "컬렉션" },
  { key: "badges",     label: "뱃지" },
  { key: "ranking",    label: "랭킹" },
];

export function ProfileTabs({ defaultTab = "collection" }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <section>
      <div className="flex items-center gap-1 border-b border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "text-white border-yellow-500"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "collection" && <CollectionTab />}
        {tab === "badges"     && <BadgesTab />}
        {tab === "ranking"    && <RankingTab />}
      </div>
    </section>
  );
}
