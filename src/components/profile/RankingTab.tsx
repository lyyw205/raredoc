import { RankingBoard } from "@/components/ranking/RankingBoard";

const MOCK_USERS = [
  { rank:  1, username: "raymond_tcg",  displayName: "레이먼드",  avatarInitial: "레", tier: "LEGEND"  as const, change:  0, value: 12450000, certified: 45, badges: 23, monthly: 87 },
  { rank:  2, username: "chaeyeon",     displayName: "채연",      avatarInitial: "채", tier: "DIAMOND" as const, change:  1, value:  9870000, certified: 38, badges: 19, monthly: 63 },
  { rank:  3, username: "minjun_",      displayName: "민준",      avatarInitial: "민", tier: "DIAMOND" as const, change: -1, value:  8320000, certified: 31, badges: 17, monthly: 54 },
  { rank:  4, username: "sora_cards",   displayName: "소라",      avatarInitial: "소", tier: "GOLD"    as const, change:  2, value:  6180000, certified: 27, badges: 15, monthly: 41 },
  { rank:  5, username: "jihun99",      displayName: "지훈",      avatarInitial: "지", tier: "GOLD"    as const, change: -1, value:  5420000, certified: 22, badges: 14, monthly: 38 },
  { rank:  6, username: "nari_collect", displayName: "나리",      avatarInitial: "나", tier: "GOLD"    as const, change:  0, value:  4750000, certified: 20, badges: 13, monthly: 35 },
  { rank:  7, username: "taeyang_k",    displayName: "태양",      avatarInitial: "태", tier: "GOLD"    as const, change:  3, value:  3980000, certified: 18, badges: 12, monthly: 44 },
  { rank:  8, username: "hyunwoo_r",    displayName: "현우",      avatarInitial: "현", tier: "SILVER"  as const, change: -2, value:  3210000, certified: 15, badges: 11, monthly: 29 },
  { rank:  9, username: "jieun_tcg",    displayName: "지은",      avatarInitial: "지", tier: "SILVER"  as const, change:  1, value:  2870000, certified: 13, badges: 10, monthly: 27 },
  { rank: 10, username: "wonjae",       displayName: "원재",      avatarInitial: "원", tier: "SILVER"  as const, change: -1, value:  2340000, certified: 11, badges:  9, monthly: 23 },
  { rank: 43, username: "yujin",        displayName: "유진",      avatarInitial: "유", tier: "GOLD"    as const, change:  2, value:   865000, certified: 12, badges:  8, monthly: 14, isMe: true },
];

export function RankingTab() {
  return (
    <div>
      <div className="mb-4">
        <p className="text-toss-caption text-toss-text-tertiary">2026년 5월 기준 · 매일 00시 업데이트</p>
      </div>
      <RankingBoard users={MOCK_USERS} />
    </div>
  );
}
