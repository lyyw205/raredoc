"use client";

import { useState } from "react";
import { Tab } from "@/components/toss";
import { CollectionTab } from "./CollectionTab";
import { BadgesTab } from "./BadgesTab";
import { RankingTab } from "./RankingTab";

type TabKey = "collection" | "badges" | "ranking";

const TABS: { key: TabKey; label: string }[] = [
  { key: "collection", label: "컬렉션" },
  { key: "badges",     label: "뱃지" },
  { key: "ranking",    label: "랭킹" },
];

export function ProfileTabs({ defaultTab = "collection" }: { defaultTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(defaultTab);

  return (
    <section>
      <Tab.Root value={tab} onChange={(v) => setTab(v as TabKey)}>
        <Tab.List>
          {TABS.map((t) => (
            <Tab.Trigger key={t.key} value={t.key}>
              {t.label}
            </Tab.Trigger>
          ))}
        </Tab.List>

        <div className="mt-6">
          <Tab.Panel value="collection">
            <CollectionTab />
          </Tab.Panel>
          <Tab.Panel value="badges">
            <BadgesTab />
          </Tab.Panel>
          <Tab.Panel value="ranking">
            <RankingTab />
          </Tab.Panel>
        </div>
      </Tab.Root>
    </section>
  );
}
