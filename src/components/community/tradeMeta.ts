// 거래글(팝니다/삽니다) 공유 메타 — 목록(CommunityBoard)·카드(TradeCard)·상세(PostDetail) 공통.

import type { Post } from "./CommunityBoard";

export const DEAL_METHOD_LABEL: Record<string, string> = {
  direct: "직거래",
  delivery: "택배",
  both: "직거래·택배",
};

export const TRADE_STATUS_STYLE: Record<string, { label: string }> = {
  active: { label: "판매중" },
  reserved: { label: "예약중" },
  completed: { label: "거래완료" },
  hidden: { label: "숨김" },
  deleted: { label: "삭제됨" },
};

// ── 카테고리 Tag 색 (toss Tag color 토큰) ──────────────────────────────────
const CAT_TAG_COLOR: Record<string, "brand" | "warning" | "positive" | "neutral"> = {
  공지: "warning",
  팝니다: "positive",
  삽니다: "brand",
};

export function catColor(cat: string): "brand" | "warning" | "positive" | "neutral" {
  return CAT_TAG_COLOR[cat] ?? "neutral";
}

// TRADE_STATUS → toss Tag color
export function tradeStatusColor(status: string): "brand" | "warning" | "neutral" {
  if (status === "active") return "brand";
  if (status === "reserved") return "warning";
  return "neutral";
}

/** 거래 카테고리(팝니다/삽니다) — actions zod enum 과 결합, 값 변경 금지. */
export const TRADE_CATS = new Set(["팝니다", "삽니다"]);

export function isTradeCategory(category: string): boolean {
  return TRADE_CATS.has(category);
}

/** 거래글 대표 이미지: images[0] 우선, 없으면 단일 imageUrl. */
export function coverImage(post: Pick<Post, "images" | "imageUrl">): string | undefined {
  return post.images?.[0] ?? post.imageUrl;
}
