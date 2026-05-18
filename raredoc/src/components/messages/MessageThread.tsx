"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import type { CardRef, Conversation } from "./MessageInbox";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type Message = {
  id: string;
  senderId: string;       // "me" | username
  content: string;
  createdAt: string;
  read: boolean;
  cardRef?: CardRef;      // 첫 문의 메세지에만 첨부
};

// ── 서브컴포넌트 ──────────────────────────────────────────────────────────────

function CardRefBanner({ card }: { card: CardRef }) {
  return (
    <div className="flex items-center gap-3 mx-auto max-w-xs bg-gray-800 border border-yellow-500/30 rounded-xl p-3 mb-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.imageUrl} alt={card.cardName} className="w-10 h-14 object-cover rounded-lg shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-yellow-500/70 font-semibold mb-0.5">{card.setName}</p>
        <p className="text-sm font-bold text-white leading-snug truncate">{card.cardName}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">카드 구매 문의로 시작된 대화</p>
      </div>
    </div>
  );
}

function Bubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[72%] space-y-0.5">
        {msg.cardRef && !isMe && <CardRefBanner card={msg.cardRef} />}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isMe
              ? "bg-yellow-500 text-black rounded-br-sm"
              : "bg-gray-800 text-gray-100 rounded-bl-sm"
          }`}
        >
          {msg.content}
        </div>
        <p className={`text-[10px] text-gray-600 ${isMe ? "text-right" : "text-left"}`}>
          {msg.createdAt}{isMe && <span className="ml-1">{msg.read ? "읽음" : "•"}</span>}
        </p>
      </div>
    </div>
  );
}

// ── 날짜 구분선 ───────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-800" />
      <span className="text-[10px] text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function MessageThread({
  conversation,
  messages: initialMessages,
  myUserId,
}: {
  conversation: Conversation;
  messages: Message[];
  myUserId: string;
}) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      senderId: myUserId,
      content: text,
      createdAt: "방금",
      read: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    inputRef.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const { partner } = conversation;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur shrink-0">
        <Link
          href={`/${locale}/messages`}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          ←
        </Link>
        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {partner.initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{partner.displayName}</p>
          <p className="text-[11px] text-gray-500">@{partner.username}</p>
        </div>
        <Link
          href={`/${locale}/profile/${partner.username}`}
          className="text-xs text-gray-500 hover:text-white transition-colors shrink-0"
        >
          프로필 →
        </Link>
      </div>

      {/* 메세지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {conversation.cardRef && (
          <div className="flex justify-center">
            <CardRefBanner card={conversation.cardRef} />
          </div>
        )}
        <DateDivider label="오늘" />
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} isMe={msg.senderId === myUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="shrink-0 border-t border-gray-800 px-4 py-3 flex items-end gap-2 bg-gray-950">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="메세지를 입력하세요... (Enter로 전송)"
          rows={1}
          className="flex-1 resize-none rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors leading-relaxed max-h-32 overflow-y-auto"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
