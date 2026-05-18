"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

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
  BRONZE:  { label: "브론즈", ring: "ring-amber-700",  text: "text-amber-500"  },
  SILVER:  { label: "실버",   ring: "ring-slate-400",  text: "text-slate-400"  },
  GOLD:    { label: "골드",   ring: "ring-yellow-500", text: "text-yellow-400" },
  DIAMOND: { label: "다이아", ring: "ring-cyan-400",   text: "text-cyan-400"   },
  LEGEND:  { label: "레전드", ring: "ring-purple-400", text: "text-purple-400" },
};

const TABS: { key: RankType; label: string; unit: string; format: (v: number) => string }[] = [
  { key: "value",     label: "컬렉션 가치",    unit: "KRW", format: (v) => `₩${v.toLocaleString("ko-KR")}` },
  { key: "certified", label: "인증 수",        unit: "건",  format: (v) => `${v}건` },
  { key: "badges",    label: "뱃지 수",        unit: "개",  format: (v) => `${v}개` },
  { key: "monthly",   label: "이달의 활동",    unit: "장",  format: (v) => `${v}장` },
];

const MOCK_USERS: RankUser[] = [
  { rank:  1, username: "raymond_tcg",  displayName: "레이먼드",  avatarInitial: "레", tier: "LEGEND",  change: 0,  value: 12450000, certified: 45, badges: 23, monthly: 87 },
  { rank:  2, username: "chaeyeon",     displayName: "채연",      avatarInitial: "채", tier: "DIAMOND", change: 1,  value:  9870000, certified: 38, badges: 19, monthly: 63 },
  { rank:  3, username: "minjun_",      displayName: "민준",      avatarInitial: "민", tier: "DIAMOND", change: -1, value:  8320000, certified: 31, badges: 17, monthly: 54 },
  { rank:  4, username: "sora_cards",   displayName: "소라",      avatarInitial: "소", tier: "GOLD",    change: 2,  value:  6180000, certified: 27, badges: 15, monthly: 41 },
  { rank:  5, username: "jihun99",      displayName: "지훈",      avatarInitial: "지", tier: "GOLD",    change: -1, value:  5420000, certified: 22, badges: 14, monthly: 38 },
  { rank:  6, username: "nari_collect", displayName: "나리",      avatarInitial: "나", tier: "GOLD",    change: 0,  value:  4750000, certified: 20, badges: 13, monthly: 35 },
  { rank:  7, username: "taeyang_k",    displayName: "태양",      avatarInitial: "태", tier: "GOLD",    change: 3,  value:  3980000, certified: 18, badges: 12, monthly: 44 },
  { rank:  8, username: "hyunwoo_r",    displayName: "현우",      avatarInitial: "현", tier: "SILVER",  change: -2, value:  3210000, certified: 15, badges: 11, monthly: 29 },
  { rank:  9, username: "jieun_tcg",    displayName: "지은",      avatarInitial: "지", tier: "SILVER",  change: 1,  value:  2870000, certified: 13, badges: 10, monthly: 27 },
  { rank: 10, username: "wonjae",       displayName: "원재",      avatarInitial: "원", tier: "SILVER",  change: -1, value:  2340000, certified: 11, badges:  9, monthly: 23 },
  { rank: 43, username: "yujin",        displayName: "유진",      avatarInitial: "유", tier: "GOLD",    change: 2,  value:   865000, certified: 12, badges:  8, monthly: 14, isMe: true },
];

function ChangeChip({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-gray-600">—</span>;
  if (change > 0)
    return <span className="text-xs text-green-500 font-medium">▲{change}</span>;
  return <span className="text-xs text-red-500 font-medium">▼{Math.abs(change)}</span>;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-bold text-gray-400 w-6 text-center tabular-nums">#{rank}</span>;
}

function Podium({ users, tab }: { users: RankUser[]; tab: typeof TABS[number] }) {
  const top3 = users.slice(0, 3);
  const [second, first, third] = [top3[1], top3[0], top3[2]];

  const card = (user: RankUser, height: string, crown?: boolean) => {
    const tier = TIER_CONFIG[user.tier];
    return (
      <div className={`flex flex-col items-center gap-2 ${height}`}>
        {crown && <span className="text-2xl">👑</span>}
        <div className={`w-14 h-14 rounded-full bg-gray-700 ring-4 ${tier.ring} flex items-center justify-center text-xl font-bold text-white`}>
          {user.avatarInitial}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{user.displayName}</p>
          <p className={`text-xs font-medium ${tier.text}`}>{tier.label}</p>
          <p className="text-sm font-bold text-yellow-400 mt-1">{tab.format(user[tab.key])}</p>
        </div>
        <div className={`w-full rounded-t-lg flex items-center justify-center py-2 font-bold text-white text-lg ${
          user.rank === 1 ? "bg-yellow-500/20 border-t-2 border-yellow-500" :
          user.rank === 2 ? "bg-slate-500/20 border-t-2 border-slate-400" :
                            "bg-amber-800/20 border-t-2 border-amber-700"
        }`}>
          {user.rank === 1 ? "1st" : user.rank === 2 ? "2nd" : "3rd"}
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
      <div className="flex gap-1 mb-8 bg-gray-900 p-1 rounded-xl border border-gray-800 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 포디엄 */}
      <Podium users={top10} tab={tab} />

      {/* 리더보드 테이블 */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_80px_80px] gap-4 px-4 py-2.5 bg-gray-900 text-xs text-gray-500 font-medium border-b border-gray-800">
          <div className="text-center">순위</div>
          <div>컬렉터</div>
          <div className="text-right">변동</div>
          <div className="text-right">{tab.unit}</div>
        </div>

        {top10.map((user) => {
          const tier = TIER_CONFIG[user.tier];
          return (
            <Link
              key={user.username}
              href={`/${locale}/profile/${user.username}`}
              className={`grid grid-cols-[48px_1fr_80px_80px] gap-4 px-4 py-3.5 items-center border-b border-gray-800/60 last:border-0 transition-colors ${
                user.isMe
                  ? "bg-yellow-500/5 hover:bg-yellow-500/10"
                  : "hover:bg-gray-800/40"
              }`}
            >
              <div className="flex justify-center">
                <RankBadge rank={user.rank} />
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 shrink-0 rounded-full bg-gray-700 ring-2 ${tier.ring} flex items-center justify-center text-xs font-bold text-white`}>
                  {user.avatarInitial}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white truncate block">
                    {user.displayName}
                    {user.isMe && (
                      <span className="ml-1.5 text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">나</span>
                    )}
                  </span>
                  <span className={`text-xs ${tier.text}`}>@{user.username}</span>
                </div>
              </div>
              <div className="text-right">
                <ChangeChip change={user.change} />
              </div>
              <div className="text-right text-sm font-semibold text-white tabular-nums">
                {tab.format(user[tab.key])}
              </div>
            </Link>
          );
        })}
      </div>

      {/* 내 순위 (top10 밖일 경우) */}
      {me && !top10.find((u) => u.isMe) && (
        <div className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 overflow-hidden">
          <div className="px-4 py-2 text-xs text-yellow-600 border-b border-yellow-500/20">내 순위</div>
          <Link
            href={`/${locale}/profile/${me.username}`}
            className="grid grid-cols-[48px_1fr_80px_80px] gap-4 px-4 py-3.5 items-center hover:bg-yellow-500/10 transition-colors"
          >
            <div className="flex justify-center">
              <span className="text-sm font-bold text-yellow-400 tabular-nums">#{me.rank}</span>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 shrink-0 rounded-full bg-gray-700 ring-2 ${TIER_CONFIG[me.tier].ring} flex items-center justify-center text-xs font-bold text-white`}>
                {me.avatarInitial}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-white">
                  {me.displayName}
                  <span className="ml-1.5 text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">나</span>
                </span>
                <span className={`text-xs block ${TIER_CONFIG[me.tier].text}`}>@{me.username}</span>
              </div>
            </div>
            <div className="text-right">
              <ChangeChip change={me.change} />
            </div>
            <div className="text-right text-sm font-semibold text-white tabular-nums">
              {tab.format(me[tab.key])}
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
