"use client";

import { RankingBoard } from "@/components/ranking/RankingBoard";
import type { RankUserView } from "@/lib/services/gamification";

export function RankingTab({
  rankings,
  viewerId,
}: {
  rankings: RankUserView[];
  viewerId: string | null;
}) {
  const users = rankings.map((u) => ({
    rank: u.rank,
    username: u.username,
    displayName: u.displayName,
    avatarInitial: u.avatarInitial,
    tier: u.tier,
    change: u.change,
    value: u.value,
    certified: u.certified,
    badges: u.badges,
    monthly: u.monthly,
    isMe: viewerId != null && u.userId === viewerId,
  }));

  return (
    <div>
      <div className="mb-4">
        <p className="text-toss-caption text-toss-text-tertiary">매일 00시 업데이트</p>
      </div>
      {users.length === 0 ? (
        <p className="text-toss-body text-toss-text-tertiary py-8 text-center">랭킹 데이터가 아직 없어요</p>
      ) : (
        <RankingBoard users={users} />
      )}
    </div>
  );
}
