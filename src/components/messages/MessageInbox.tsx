"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

// ── 타입 ──────────────────────────────────────────────────────────────────────

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

// ── 서브컴포넌트 ──────────────────────────────────────────────────────────────

function ConvRow({ conv }: { conv: Conversation }) {
  const locale = useLocale();
  return (
    <Link
      href={`/${locale}/messages/${conv.id}`}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-800/50 transition-colors border-b border-gray-800/60 last:border-0"
    >
      {/* 아바타 */}
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
          {conv.partner.initial}
        </div>
        {conv.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
            {conv.unread > 9 ? "9+" : conv.unread}
          </span>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white truncate">{conv.partner.displayName}</span>
            {conv.sourceType === "card_inquiry" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 shrink-0">
                카드 문의
              </span>
            )}
            {conv.sourceType === "community_post" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">
                직거래 문의
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-600 shrink-0 ml-2">{conv.lastAt}</span>
        </div>

        {/* 카드 문의인 경우 카드 미리보기 */}
        {conv.cardRef && (
          <div className="flex items-center gap-1.5 mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={conv.cardRef.imageUrl} alt="" className="w-5 h-7 object-cover rounded" />
            <span className="text-[11px] text-yellow-500/80 font-medium truncate">{conv.cardRef.cardName}</span>
          </div>
        )}

        <p className={`text-xs truncate ${conv.unread > 0 ? "text-gray-200 font-medium" : "text-gray-500"}`}>
          {conv.lastMessage}
        </p>
      </div>
    </Link>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

type FilterKey = "all" | "unread" | "inquiry";

export function MessageInbox({ conversations }: { conversations: Conversation[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = conversations.filter((c) => {
    if (filter === "unread")  return c.unread > 0;
    if (filter === "inquiry") return c.sourceType === "card_inquiry" || c.sourceType === "community_post";
    return true;
  });

  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);

  return (
    <div className="max-w-xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">메세지</h1>
          {totalUnread > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">읽지 않은 메세지 {totalUnread}개</p>
          )}
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-900 p-1 rounded-xl border border-gray-800 w-fit">
        {([
          ["all",     "전체"],
          ["unread",  "안읽음"],
          ["inquiry", "문의"],
        ] as [FilterKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === key ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
            {key === "unread" && totalUnread > 0 && (
              <span className="ml-1.5 text-[10px] font-bold text-red-400">{totalUnread}</span>
            )}
          </button>
        ))}
      </div>

      {/* 대화 목록 */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-3xl mb-3">💬</p>
            <p className="text-sm">메세지가 없어요</p>
          </div>
        ) : (
          filtered.map((c) => <ConvRow key={c.id} conv={c} />)
        )}
      </div>
    </div>
  );
}
