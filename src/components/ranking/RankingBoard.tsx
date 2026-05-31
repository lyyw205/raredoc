"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import {
  Avatar,
  Card,
  RankingTable,
  SegmentedControl,
  Tag,
} from "@/components/toss";

type RankType = "value" | "certified" | "badges" | "monthly";

interface RankUser {
  rank: number;
  username: string;
  displayName: string;
  avatarInitial: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "LEGEND";
  change: number; // 순위 변동 (+올랐으면 양수)
  value: number;       // 컬렉션 가치 KRW
  certified: number;   // 인증 수
  badges: number;      // 뱃지 수
  monthly: number;     // 이달 등록 카드
  isMe?: boolean;
}

const TIER_CONFIG = {
  BRONZE:  { label: "브론즈", ring: "ring-toss-brand", text: "text-toss-brand" },
  SILVER:  { label: "실버",   ring: "ring-toss-brand", text: "text-toss-brand" },
  GOLD:    { label: "골드",   ring: "ring-toss-brand", text: "text-toss-brand" },
  DIAMOND: { label: "다이아", ring: "ring-toss-brand", text: "text-toss-brand" },
  LEGEND:  { label: "레전드", ring: "ring-toss-brand", text: "text-toss-brand" },
};

const TABS: { key: RankType; label: string; unit: string; format: (v: number) => string }[] = [
  { key: "value",     label: "컬렉션 가치",    unit: "KRW", format: (v) => `₩${v.toLocaleString("ko-KR")}` },
  { key: "certified", label: "인증 수",        unit: "건",  format: (v) => `${v}건` },
  { key: "badges",    label: "뱃지 수",        unit: "개",  format: (v) => `${v}개` },
  { key: "monthly",   label: "이달의 활동",    unit: "장",  format: (v) => `${v}장` },
];

function ChangeChip({ change }: { change: number }) {
  if (change === 0) return <span className="text-toss-caption text-toss-text-quaternary">—</span>;
  if (change > 0)
    return <span className="text-toss-caption text-toss-positive font-medium">▲{change}</span>;
  return <span className="text-toss-caption text-toss-negative font-medium">▼{Math.abs(change)}</span>;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className="text-toss-subtitle font-bold text-toss-brand toss-numeric w-6 text-center">
        {rank}
      </span>
    );
  }
  return (
    <span className="text-toss-label font-medium text-toss-text-tertiary toss-numeric w-6 text-center">
      {rank}
    </span>
  );
}

function Podium({ users, tab }: { users: RankUser[]; tab: typeof TABS[number] }) {
  const top3 = users.slice(0, 3);
  const [second, first, third] = [top3[1], top3[0], top3[2]];

  const card = (user: RankUser, height: string, isFirst?: boolean) => {
    const tier = TIER_CONFIG[user.tier];
    return (
      <div className={`flex flex-col items-center gap-2 ${height}`}>
        <div className={`${isFirst ? "ring-4" : "ring-2"} ${tier.ring} rounded-full`}>
          <Avatar name={user.avatarInitial} size={isFirst ? "lg" : "md"} />
        </div>
        <div className="text-center">
          <p className="text-toss-label font-semibold text-toss-text-primary">{user.displayName}</p>
          <p className={`text-toss-caption font-semibold ${tier.text}`}>{tier.label}</p>
          <p className="text-toss-label font-bold text-toss-text-primary toss-numeric mt-1">{tab.format(user[tab.key])}</p>
        </div>
        <div className={`w-full rounded-t-toss-md flex items-center justify-center py-2 font-bold text-toss-label toss-numeric ${
          user.rank === 1 ? "bg-toss-brand text-white" :
          user.rank === 2 ? "bg-toss-brand-weak text-toss-brand" :
                            "bg-toss-bg-subtle text-toss-text-secondary"
        }`}>
          {user.rank}위
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-end justify-center gap-4 mb-8">
      {second && card(second, "mb-0")}
      {first  && card(first,  "mb-4", true)}
      {third  && card(third,  "mb-0")}
    </div>
  );
}

export function RankingBoard({ users }: { users: RankUser[] }) {
  const [activeTab, setActiveTab] = useState<RankType>("value");
  const locale = useLocale();

  const tab = TABS.find((t) => t.key === activeTab)!;

  // 현재 탭 기준으로 정렬 (상위 10 + 내 순위)
  const top10 = [...users]
    .sort((a, b) => b[activeTab] - a[activeTab])
    .slice(0, 10)
    .map((u, i) => ({ ...u, rank: i + 1 }));

  const me = users.find((u) => u.isMe);

  return (
    <div>
      {/* 탭 */}
      <SegmentedControl
        options={TABS.map((t) => ({ value: t.key, label: t.label }))}
        value={activeTab}
        onChange={(v) => setActiveTab(v as RankType)}
        size="md"
        variant="filled"
        className="mb-8 w-fit"
      />

      {/* 포디엄 */}
      <Podium users={top10} tab={tab} />

      {/* 리더보드 테이블 */}
      <Card className="overflow-hidden !p-0">
        <RankingTable.Root>
          <RankingTable.Head>
            <RankingTable.HeadRow>
              <RankingTable.Header align="center">순위</RankingTable.Header>
              <RankingTable.Header>컬렉터</RankingTable.Header>
              <RankingTable.Header align="right">변동</RankingTable.Header>
              <RankingTable.Header align="right">{tab.unit}</RankingTable.Header>
            </RankingTable.HeadRow>
          </RankingTable.Head>
          <RankingTable.Body>
            {top10.map((user) => (
              <RankingTable.Row
                key={user.username}
                interactive
                href={`/${locale}/profile/${user.username}`}
                className={user.isMe ? "bg-toss-brand-weak hover:bg-toss-brand-weak" : ""}
              >
                <RankingTable.Cell align="center">
                  <RankBadge rank={user.rank} />
                </RankingTable.Cell>
                <RankingTable.Cell>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="ring-2 ring-toss-brand rounded-full shrink-0">
                      <Avatar name={user.avatarInitial} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-toss-label font-semibold text-toss-text-primary truncate block">
                        {user.displayName}
                        {user.isMe && (
                          <Tag color="brand" shape="soft" className="ml-1.5">나</Tag>
                        )}
                      </span>
                      <span className="text-toss-caption text-toss-text-tertiary">@{user.username}</span>
                    </div>
                  </div>
                </RankingTable.Cell>
                <RankingTable.Cell align="right">
                  <ChangeChip change={user.change} />
                </RankingTable.Cell>
                <RankingTable.Cell align="right" numeric>
                  <span className="text-toss-label font-semibold text-toss-text-primary">{tab.format(user[tab.key])}</span>
                </RankingTable.Cell>
              </RankingTable.Row>
            ))}
          </RankingTable.Body>
        </RankingTable.Root>
      </Card>

      {/* 내 순위 (top10 밖일 경우) */}
      {me && !top10.find((u) => u.isMe) && (
        <Card className="mt-3 overflow-hidden ring-2 ring-toss-brand/30 !p-0">
          <div className="border-b border-toss-divider px-4 py-2 text-toss-caption text-toss-brand font-semibold bg-toss-brand-weak">
            내 순위
          </div>
          <RankingTable.Root>
            <RankingTable.Body>
              <RankingTable.Row
                interactive
                href={`/${locale}/profile/${me.username}`}
              >
                <RankingTable.Cell align="center">
                  <span className="text-toss-label font-bold text-toss-brand tabular-nums">#{me.rank}</span>
                </RankingTable.Cell>
                <RankingTable.Cell>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="ring-2 ring-toss-brand rounded-full shrink-0">
                      <Avatar name={me.avatarInitial} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-toss-label font-semibold text-toss-text-primary truncate block">
                        {me.displayName}
                        <Tag color="brand" shape="soft" className="ml-1.5">나</Tag>
                      </span>
                      <span className="text-toss-caption text-toss-text-tertiary">@{me.username}</span>
                    </div>
                  </div>
                </RankingTable.Cell>
                <RankingTable.Cell align="right">
                  <ChangeChip change={me.change} />
                </RankingTable.Cell>
                <RankingTable.Cell align="right" numeric>
                  <span className="text-toss-label font-semibold text-toss-text-primary">{tab.format(me[tab.key])}</span>
                </RankingTable.Cell>
              </RankingTable.Row>
            </RankingTable.Body>
          </RankingTable.Root>
        </Card>
      )}
    </div>
  );
}
