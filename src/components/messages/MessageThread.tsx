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
  appointment?: {         // 거래 약속 카드
    date: string;
    time: string;
    place: string;
  };
  review?: {              // 거래 완료 후기 카드
    rating: number;       // 1~5
    manner: "good" | "bad";
    comment: string;
  };
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

function CardReplyAttachment({ card, isMe }: { card: CardRef; isMe: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-xl mb-1 max-w-[260px] ${
        isMe ? "bg-yellow-400/30 border border-yellow-500/40 ml-auto" : "bg-gray-800/80 border border-gray-700"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.imageUrl} alt={card.cardName} className="w-7 h-10 object-cover rounded shrink-0" />
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold ${isMe ? "text-yellow-100/80" : "text-yellow-500/80"}`}>
          {card.setName}
        </p>
        <p className={`text-xs font-bold truncate ${isMe ? "text-yellow-50" : "text-white"}`}>
          {card.cardName}
        </p>
      </div>
    </div>
  );
}

function AppointmentCard({ apt, isMe }: { apt: NonNullable<Message["appointment"]>; isMe: boolean }) {
  return (
    <div className={`rounded-xl border px-3.5 py-3 mb-1 ${
      isMe ? "bg-blue-500/15 border-blue-500/40 ml-auto" : "bg-blue-900/30 border-blue-500/30"
    } max-w-[280px]`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-base leading-none">📅</span>
        <span className="text-[11px] font-bold text-blue-300">거래 약속</span>
      </div>
      <p className="text-sm text-white font-semibold">{apt.date} · {apt.time}</p>
      <p className="text-xs text-gray-300 mt-0.5">📍 {apt.place}</p>
      <p className="text-[10px] text-gray-500 mt-1.5">예약이 잡혔어요. 약속을 지켜주세요.</p>
    </div>
  );
}

function ReviewCard({ rev, isMe }: { rev: NonNullable<Message["review"]>; isMe: boolean }) {
  return (
    <div className={`rounded-xl border px-3.5 py-3 mb-1 ${
      isMe ? "bg-green-500/15 border-green-500/40 ml-auto" : "bg-green-900/30 border-green-500/30"
    } max-w-[280px]`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-base leading-none">✅</span>
        <span className="text-[11px] font-bold text-green-300">거래 완료 후기</span>
      </div>
      <div className="flex items-center gap-1 mb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < rev.rating ? "text-yellow-400" : "text-gray-700"}>★</span>
        ))}
        <span className="text-[10px] text-gray-500 ml-1">{rev.rating}/5</span>
      </div>
      <p className="text-xs text-white">{rev.manner === "good" ? "👍 매너 좋음" : "👎 아쉬워요"}</p>
      {rev.comment && <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">"{rev.comment}"</p>}
    </div>
  );
}

function Bubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const isSpecial = msg.appointment || msg.review;
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[72%] space-y-0.5">
        {msg.cardRef && <CardReplyAttachment card={msg.cardRef} isMe={isMe} />}
        {msg.appointment && <AppointmentCard apt={msg.appointment} isMe={isMe} />}
        {msg.review && <ReviewCard rev={msg.review} isMe={isMe} />}
        {msg.content && (
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isMe
                ? "bg-yellow-500 text-black rounded-br-sm"
                : "bg-gray-800 text-gray-100 rounded-bl-sm"
            }`}
          >
            {msg.content}
          </div>
        )}
        <p className={`text-[10px] text-gray-600 ${isMe ? "text-right" : "text-left"}`}>
          {msg.createdAt}{isMe && !isSpecial && <span className="ml-1">{msg.read ? "읽음" : "•"}</span>}
        </p>
      </div>
    </div>
  );
}

// ── 약속 잡기 모달 ────────────────────────────────────────────────────────────

function AppointmentModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (apt: NonNullable<Message["appointment"]>) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");

  function submit() {
    if (!date || !time || !place.trim()) return;
    onSubmit({ date, time, place: place.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white">📅 거래 약속 잡기</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 font-semibold block mb-1">날짜 *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-gray-500" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-semibold block mb-1">시간 *</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-gray-500" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-semibold block mb-1">장소 *</label>
            <input type="text" placeholder="예) 강남역 11번 출구" value={place} onChange={(e) => setPlace(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          </div>
          <p className="text-[10px] text-gray-600 pt-1">약속을 보내면 거래글이 자동으로 <span className="text-blue-400 font-semibold">예약중</span> 으로 변경됩니다.</p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500">취소</button>
          <button onClick={submit} disabled={!date || !time || !place.trim()}
            className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-white">약속 보내기</button>
        </div>
      </div>
    </div>
  );
}

// ── 거래 완료 후기 모달 ───────────────────────────────────────────────────────

function ReviewModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (rev: NonNullable<Message["review"]>) => void;
}) {
  const [rating, setRating] = useState(5);
  const [manner, setManner] = useState<"good" | "bad">("good");
  const [comment, setComment] = useState("");

  function submit() {
    onSubmit({ rating, manner, comment: comment.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white">✅ 거래 완료 후기</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 font-semibold block mb-1.5">별점</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="text-2xl leading-none transition-transform hover:scale-110">
                  <span className={n <= rating ? "text-yellow-400" : "text-gray-700"}>★</span>
                </button>
              ))}
              <span className="text-xs text-gray-500 ml-1">{rating}/5</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-semibold block mb-1.5">거래 매너</label>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setManner("good")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${manner === "good" ? "bg-green-500/20 text-green-300 border border-green-500/40" : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
                👍 매너 좋음
              </button>
              <button type="button" onClick={() => setManner("bad")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${manner === "bad" ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
                👎 아쉬워요
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-semibold block mb-1.5">한줄 후기 (선택)</label>
            <textarea rows={3} placeholder="거래는 어떠셨나요?" value={comment} onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none" />
          </div>
          <p className="text-[10px] text-gray-600">후기를 등록하면 거래글이 자동으로 <span className="text-green-400 font-semibold">판매완료</span> 로 변경됩니다.</p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500">취소</button>
          <button onClick={submit} className="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-sm font-bold text-black">후기 등록</button>
        </div>
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
  prefilledCardRef,
}: {
  conversation: Conversation;
  messages: Message[];
  myUserId: string;
  prefilledCardRef?: CardRef;
}) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [attachedCard, setAttachedCard] = useState<CardRef | undefined>(prefilledCardRef);
  const [aptOpen, setAptOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  }

  function sendAppointment(apt: NonNullable<Message["appointment"]>) {
    setMessages((prev) => [...prev, {
      id: `m-${Date.now()}`,
      senderId: myUserId,
      content: "",
      createdAt: "방금",
      read: false,
      appointment: apt,
    }]);
    setAptOpen(false);
    showToast("거래글이 예약중으로 변경되었습니다");
  }

  function sendReview(rev: NonNullable<Message["review"]>) {
    setMessages((prev) => [...prev, {
      id: `m-${Date.now()}`,
      senderId: myUserId,
      content: "",
      createdAt: "방금",
      read: false,
      review: rev,
    }]);
    setReviewOpen(false);
    showToast("거래글이 판매완료로 변경되었습니다");
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (prefilledCardRef) inputRef.current?.focus();
  }, [prefilledCardRef]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      senderId: myUserId,
      content: text,
      createdAt: "방금",
      read: false,
      cardRef: attachedCard,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setAttachedCard(undefined);
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

      {/* 거래 액션 바 */}
      <div className="shrink-0 border-t border-gray-800 px-4 py-2 bg-gray-950 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAptOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
        >
          <span>📅</span> 거래 약속 잡기
        </button>
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-300 text-xs font-semibold transition-colors"
        >
          <span>✅</span> 거래 완료
        </button>
      </div>

      {/* 모달 */}
      {aptOpen && <AppointmentModal onClose={() => setAptOpen(false)} onSubmit={sendAppointment} />}
      {reviewOpen && <ReviewModal onClose={() => setReviewOpen(false)} onSubmit={sendReview} />}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 shadow-2xl text-sm text-white z-50">
          {toast}
        </div>
      )}

      {/* 입력창 */}
      <div className="shrink-0 border-t border-gray-800 px-4 py-3 bg-gray-950">
        {/* 첨부 카드 미리보기 (인스타 스토리 답장식) */}
        {attachedCard && (
          <div className="flex items-center gap-2.5 mb-2 px-2.5 py-2 rounded-xl bg-gray-800/80 border border-yellow-500/30">
            <span className="text-[10px] text-yellow-500/80 font-semibold shrink-0">↪ 답장 카드</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachedCard.imageUrl} alt={attachedCard.cardName} className="w-8 h-11 object-cover rounded shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 truncate">{attachedCard.setName}</p>
              <p className="text-xs font-bold text-white truncate">{attachedCard.cardName}</p>
            </div>
            <button
              type="button"
              onClick={() => setAttachedCard(undefined)}
              aria-label="첨부 제거"
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
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
    </div>
  );
}
