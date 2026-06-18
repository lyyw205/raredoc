"use client";

import { useState } from "react";
import { Tab } from "@/components/toss";
import { CollectionTab } from "./CollectionTab";
import { BadgesTab } from "./BadgesTab";
import type { BadgeView } from "@/lib/services/gamification";
import type { CollectionTabData } from "@/lib/services/collection";

type TabKey = "collection" | "badges";

const TABS: { key: TabKey; label: string }[] = [
  { key: "collection", label: "컬렉션" },
  { key: "badges",     label: "뱃지" },
];

export function ProfileTabs({
  defaultTab = "collection",
  collection,
  profileUserId,
  isOwnProfile = false,
  badges = [],
}: {
  defaultTab?: TabKey;
  collection?: CollectionTabData;
  profileUserId: string;
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
            <CollectionTab
              key={profileUserId}
              sets={collection?.sets ?? []}
              packs={collection?.packs}
              ownedLogicalCardIds={collection?.ownedLogicalCardIds ?? []}
              profileUserId={profileUserId}
              isOwnProfile={isOwnProfile}
            />
          </Tab.Panel>
          <Tab.Panel value="badges">
            <BadgesTab badges={badges} />
          </Tab.Panel>
        </div>
      </Tab.Root>
    </section>
  );
}
