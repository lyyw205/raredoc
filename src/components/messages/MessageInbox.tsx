"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { MessageSquare } from "lucide-react";
import { Avatar, Card, Tag, ToggleGroup } from "@/components/toss";
import { cn } from "@/lib/utils";

export type CardRef = {
  cardId: string;
  cardName: string;
  imageUrl: string;
  setName: string;
};

export type Conversation = {
  id: string;
  partner: {
    username: string;
    displayName: string;
    initial: string;
  };
  lastMessage: string;
  lastAt: string;
  unread: number;
  sourceType?: "card_inquiry" | "community_post" | "direct";
  cardRef?: CardRef;
};

function ConvRow({ conv }: { conv: Conversation }) {
  const locale = useLocale();
  return (
    <Link
      href={`/${locale}/messages/${conv.id}`}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-toss-bg-subtle transition-colors border-b border-toss-divider last:border-0"
    >
      {/* 아바타 */}
      <div className="relative shrink-0">
        <Avatar name={conv.partner.initial} size="md" />
        {conv.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-toss-negative text-toss-tiny font-bold text-white flex items-center justify-center toss-numeric">
            {conv.unread > 9 ? "9+" : conv.unread}
          </span>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-toss-label font-semibold text-toss-text-primary truncate">
              {conv.partner.displayName}
            </span>
            {conv.sourceType === "card_inquiry" && (
              <Tag color="warning" shape="soft" className="text-toss-tiny font-bold shrink-0">
                카드 문의
              </Tag>
            )}
            {conv.sourceType === "community_post" && (
              <Tag color="positive" shape="soft" className="text-toss-tiny font-bold shrink-0">
                직거래 문의
              </Tag>
            )}
          </div>
          <span className="text-toss-caption text-toss-text-tertiary shrink-0">{conv.lastAt}</span>
        </div>

        {/* 카드 미리보기 */}
        {conv.cardRef && (
          <div className="flex items-center gap-1.5 mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {conv.cardRef.imageUrl ? (
              <img
                src={conv.cardRef.imageUrl}
                alt=""
                className="w-5 h-7 object-cover rounded-toss-sm shrink-0"
              />
            ) : (
              <div className="w-5 h-7 rounded-toss-sm shrink-0 bg-toss-bg-muted" />
            )}
            <span className="text-toss-caption text-toss-brand font-medium truncate">
              {conv.cardRef.cardName}
            </span>
          </div>
        )}

        <p
          className={cn(
            "text-toss-caption truncate",
            conv.unread > 0
              ? "text-toss-text-primary font-medium"
              : "text-toss-text-tertiary"
          )}
        >
          {conv.lastMessage}
        </p>
      </div>
    </Link>
  );
}

type FilterKey = "all" | "unread" | "inquiry";

export function MessageInbox({ conversations }: { conversations: Conversation[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = conversations.filter((c) => {
    if (filter === "unread") return c.unread > 0;
    if (filter === "inquiry")
      return c.sourceType === "card_inquiry" || c.sourceType === "community_post";
    return true;
  });

  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);
  const inquiryCount = conversations.filter(
    (c) => c.sourceType === "card_inquiry" || c.sourceType === "community_post"
  ).length;

  return (
    <div className="max-w-xl mx-auto">
      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="text-toss-title-2 font-bold text-toss-text-primary">메세지</h1>
        {totalUnread > 0 && (
          <p className="text-toss-caption text-toss-text-tertiary mt-1 toss-numeric">
            읽지 않은 메세지 {totalUnread}개
          </p>
        )}
      </div>

      {/* 필터 탭 */}
      <ToggleGroup
        options={[
          { value: "all", label: `전체 ${conversations.length}` },
          { value: "unread", label: `안읽음 ${totalUnread}` },
          { value: "inquiry", label: `문의 ${inquiryCount}` },
        ]}
        value={filter}
        onChange={(v) => setFilter(v as FilterKey)}
        size="sm"
        className="mb-4"
      />

      {/* 대화 목록 */}
      <Card padding="sm" className="!p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare
              className="w-8 h-8 text-toss-text-quaternary mx-auto mb-3"
              strokeWidth={2}
            />
            <p className="text-toss-body text-toss-text-tertiary">메세지가 없어요</p>
          </div>
        ) : (
          filtered.map((c) => <ConvRow key={c.id} conv={c} />)
        )}
      </Card>
    </div>
  );
}
