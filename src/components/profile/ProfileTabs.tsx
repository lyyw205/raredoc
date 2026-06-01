"use client";

import { useState } from "react";
import { Tab } from "@/components/toss";
import { CollectionTab, type CollectionSet } from "./CollectionTab";
import { BadgesTab } from "./BadgesTab";
import type { BadgeView } from "@/lib/services/gamification";

type TabKey = "collection" | "badges";

const TABS: { key: TabKey; label: string }[] = [
  { key: "collection", label: "컬렉션" },
  { key: "badges",     label: "뱃지" },
];

export function ProfileTabs({
  defaultTab = "collection",
  sets = [],
  isOwnProfile = false,
  badges = [],
}: {
  defaultTab?: TabKey;
  sets?: CollectionSet[];
  isOwnProfile?: boolean;
  badges?: BadgeView[];
}) {
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
            <CollectionTab sets={sets} isOwnProfile={isOwnProfile} />
          </Tab.Panel>
          <Tab.Panel value="badges">
            <BadgesTab badges={badges} />
          </Tab.Panel>
        </div>
      </Tab.Root>
    </section>
  );
}
