"use client";

import Link from "next/link";
import { Eye, Heart, MapPin, Pin } from "lucide-react";
import { Card, Tag } from "@/components/toss";
import { cn } from "@/lib/utils";
import type { Post } from "./CommunityBoard";
import {
  DEAL_METHOD_LABEL,
  TRADE_STATUS_STYLE,
  coverImage,
} from "./tradeMeta";

/**
 * 번개장터식 거래 상품 카드.
 * 정사각 대표 이미지(♡ 오버레이 · 비활성 상태배지) → 가격(굵게) → 제목(1줄) → 위치·시간 / 찜·조회.
 */
export function TradeCard({ post, locale }: { post: Post; locale: string }) {
  const status = post.tradeStatus ?? "active";
  const isCompleted = status === "completed";
  const inactive = status !== "active";
  const cover = coverImage(post);

  return (
    <Link href={`/${locale}/community/${post.id}`} className="block">
      <Card
        variant="interactive"
        padding="sm"
        className="flex flex-col gap-2 h-full"
      >
        {/* 정사각 대표 이미지 */}
        <div className="relative aspect-square w-full overflow-hidden rounded-toss-md bg-toss-bg-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              className={cn(
                "h-full w-full object-cover transition-transform duration-200",
                inactive && "opacity-50"
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-toss-text-quaternary">
              <span className="text-toss-caption">이미지 없음</span>
            </div>
          )}

          {/* 핀 (상단 좌측) */}
          {post.pinned && (
            <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-toss-bg-base/80 backdrop-blur">
              <Pin size={12} className="text-toss-warning" />
            </div>
          )}

          {/* 찜 (상단 우측) — 표시 전용 */}
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-toss-bg-base/80 backdrop-blur">
            <Heart size={14} className="text-toss-icon" />
          </div>

          {/* 비활성 상태 오버레이 (예약중/거래완료) */}
          {inactive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-toss-pill bg-toss-bg-base px-3 py-1 text-toss-caption font-bold text-toss-text-primary">
                {TRADE_STATUS_STYLE[status]?.label ?? status}
              </span>
            </div>
          )}
        </div>

        {/* 가격 (굵게, 제목보다 위) */}
        <p
          className={cn(
            "toss-numeric text-toss-title-2 font-bold",
            isCompleted ? "text-toss-text-tertiary line-through" : "text-toss-text-primary"
          )}
        >
          {post.priceKrw != null ? `${post.priceKrw.toLocaleString("ko-KR")}원` : "가격 제안"}
        </p>

        {/* 제목 (회색, 1줄) */}
        <div className="flex items-center gap-1">
          {post.category === "삽니다" && (
            <Tag color="brand" shape="soft" className="shrink-0">구함</Tag>
          )}
          {post.certified && (
            <Tag color="positive" shape="soft" className="shrink-0">PSA</Tag>
          )}
          <p className="truncate text-toss-label text-toss-text-secondary">{post.title}</p>
        </div>

        {/* 메타: 위치 · 시간 */}
        <div className="flex items-center gap-1 text-toss-caption text-toss-text-tertiary">
          {post.location && (
            <span className="flex items-center gap-0.5 truncate">
              <MapPin size={11} className="shrink-0" />
              {post.location}
            </span>
          )}
          {post.location && post.dealMethod && <span>·</span>}
          {post.dealMethod && <span className="truncate">{DEAL_METHOD_LABEL[post.dealMethod]}</span>}
          <span className="ml-auto shrink-0">{post.ago}</span>
        </div>

        {/* 미니 통계 */}
        <div className="flex items-center gap-3 text-toss-micro text-toss-text-quaternary toss-numeric">
          <span className="flex items-center gap-0.5"><Heart size={12} />{post.likes}</span>
          <span className="flex items-center gap-0.5"><Eye size={12} />{post.views.toLocaleString()}</span>
        </div>
      </Card>
    </Link>
  );
}
