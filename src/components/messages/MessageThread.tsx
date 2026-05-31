"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  MapPin,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { Avatar, Button, Modal, TextField } from "@/components/toss";
import { cn } from "@/lib/utils";
import {
  sendMessageAction,
  proposeAppointmentAction,
  leaveReviewAction,
} from "@/lib/actions/messaging";
import type { CardRef, Conversation } from "./MessageInbox";

export type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  read: boolean;
  cardRef?: CardRef;
  appointment?: {
    date: string;
    time: string;
    place: string;
  };
  review?: {
    rating: number;
    manner: "good" | "bad";
    comment: string;
  };
};

function CardRefBanner({ card }: { card: CardRef }) {
  return (
    <div className="flex items-center gap-3 mx-auto max-w-xs bg-toss-bg-base border border-toss-brand-weak rounded-toss-lg p-3 mb-6 shadow-toss-hairline">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {card.imageUrl ? (
        <img
          src={card.imageUrl}
          alt={card.cardName}
          className="w-10 h-14 object-cover rounded-toss-md shrink-0"
        />
      ) : (
        <div className="w-10 h-14 rounded-toss-md shrink-0 bg-toss-bg-muted" />
      )}
      <div className="min-w-0">
        <p className="text-toss-micro text-toss-brand font-semibold mb-0.5">{card.setName}</p>
        <p className="text-toss-label font-bold text-toss-text-primary leading-snug truncate">
          {card.cardName}
        </p>
        <p className="text-toss-micro text-toss-text-tertiary mt-0.5">
          카드 구매 문의로 시작된 대화
        </p>
      </div>
    </div>
  );
}

function CardReplyAttachment({ card, isMe }: { card: CardRef; isMe: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-toss-md mb-1 max-w-[260px] border",
        isMe
          ? "bg-toss-brand-weak border-toss-brand/30 ml-auto"
          : "bg-toss-bg-subtle border-toss-divider"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {card.imageUrl ? (
        <img
          src={card.imageUrl}
          alt={card.cardName}
          className="w-7 h-10 object-cover rounded-toss-sm shrink-0"
        />
      ) : (
        <div className="w-7 h-10 rounded-toss-sm shrink-0 bg-toss-bg-muted" />
      )}
      <div className="min-w-0">
        <p className="text-toss-micro font-semibold text-toss-brand">{card.setName}</p>
        <p className="text-toss-caption font-bold truncate text-toss-text-primary">
          {card.cardName}
        </p>
      </div>
    </div>
  );
}

function AppointmentCard({
  apt,
  isMe,
}: {
  apt: NonNullable<Message["appointment"]>;
  isMe: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-toss-lg border px-4 py-3 mb-1 max-w-[280px] bg-toss-bg-base",
        isMe ? "ml-auto" : "",
        "border-toss-brand/30"
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Calendar className="w-3.5 h-3.5 text-toss-brand" strokeWidth={2.4} />
        <span className="text-toss-micro font-bold text-toss-brand">거래 약속</span>
      </div>
      <p className="text-toss-label text-toss-text-primary font-semibold toss-numeric">
        {apt.date} · {apt.time}
      </p>
      <p className="text-toss-caption text-toss-text-secondary mt-0.5 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {apt.place}
      </p>
      <p className="text-toss-micro text-toss-text-tertiary mt-2">
        예약이 잡혔어요. 약속을 지켜주세요.
      </p>
    </div>
  );
}

function ReviewCard({ rev, isMe }: { rev: NonNullable<Message["review"]>; isMe: boolean }) {
  return (
    <div
      className={cn(
        "rounded-toss-lg border px-4 py-3 mb-1 max-w-[280px] bg-toss-bg-base",
        isMe ? "ml-auto" : "",
        "border-toss-positive/30"
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-toss-positive" strokeWidth={2.4} />
        <span className="text-toss-micro font-bold text-toss-positive">거래 완료 후기</span>
      </div>
      <div className="flex items-center gap-1 mb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-3.5 h-3.5",
              i < rev.rating
                ? "fill-toss-warning text-toss-warning"
                : "text-toss-text-quaternary"
            )}
            strokeWidth={1.5}
          />
        ))}
        <span className="text-toss-micro text-toss-text-tertiary ml-1 toss-numeric">
          {rev.rating}/5
        </span>
      </div>
      <p className="text-toss-caption text-toss-text-primary flex items-center gap-1">
        {rev.manner === "good" ? (
          <>
            <ThumbsUp className="w-3 h-3 text-toss-positive" /> 매너 좋음
          </>
        ) : (
          <>
            <ThumbsDown className="w-3 h-3 text-toss-negative" /> 아쉬워요
          </>
        )}
      </p>
      {rev.comment && (
        <p className="text-toss-caption text-toss-text-secondary mt-2 leading-relaxed">
          &ldquo;{rev.comment}&rdquo;
        </p>
      )}
    </div>
  );
}

function Bubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const isSpecial = msg.appointment || msg.review;
  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div className="max-w-[72%] space-y-0.5">
        {msg.cardRef && <CardReplyAttachment card={msg.cardRef} isMe={isMe} />}
        {msg.appointment && <AppointmentCard apt={msg.appointment} isMe={isMe} />}
        {msg.review && <ReviewCard rev={msg.review} isMe={isMe} />}
        {msg.content && (
          <div
            className={cn(
              "px-3.5 py-2.5 rounded-toss-lg text-toss-body leading-relaxed",
              isMe
                ? "bg-toss-brand text-white rounded-br-sm"
                : "bg-toss-bg-subtle text-toss-text-primary rounded-bl-sm"
            )}
          >
            {msg.content}
          </div>
        )}
        <p
          className={cn(
            "text-toss-micro text-toss-text-quaternary toss-numeric",
            isMe ? "text-right" : "text-left"
          )}
        >
          {msg.createdAt}
          {isMe && !isSpecial && (
            <span className="ml-1">{msg.read ? "읽음" : "•"}</span>
          )}
        </p>
      </div>
    </div>
  );
}

function AppointmentModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (apt: NonNullable<Message["appointment"]>) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");

  function submit() {
    if (!date || !time || !place.trim()) return;
    onSubmit({ date, time, place: place.trim() });
    setDate("");
    setTime("");
    setPlace("");
  }

  return (
    <Modal.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Modal.Portal>
        <Modal.Overlay />
        <Modal.Content className="max-w-sm">
          <Modal.Header>
            <Modal.Title className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-toss-brand" />
              거래 약속 잡기
            </Modal.Title>
          </Modal.Header>
          <div className="p-5 space-y-3">
            <TextField
              type="date"
              label="날짜"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextField
              type="time"
              label="시간"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <TextField
              label="장소"
              required
              placeholder="예) 강남역 11번 출구"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
            <p className="text-toss-micro text-toss-text-tertiary pt-1">
              약속을 보내면 거래글이 자동으로{" "}
              <span className="text-toss-brand font-semibold">예약중</span> 으로 변경됩니다.
            </p>
          </div>
          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button onClick={submit} disabled={!date || !time || !place.trim()}>
              약속 보내기
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}

function ReviewModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (rev: NonNullable<Message["review"]>) => void;
}) {
  const [rating, setRating] = useState(5);
  const [manner, setManner] = useState<"good" | "bad">("good");
  const [comment, setComment] = useState("");

  function submit() {
    onSubmit({ rating, manner, comment: comment.trim() });
    setRating(5);
    setManner("good");
    setComment("");
  }

  return (
    <Modal.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Modal.Portal>
        <Modal.Overlay />
        <Modal.Content className="max-w-sm">
          <Modal.Header>
            <Modal.Title className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-toss-positive" />
              거래 완료 후기
            </Modal.Title>
          </Modal.Header>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-toss-caption text-toss-text-secondary font-semibold block mb-2">
                별점
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n}점`}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "w-7 h-7",
                        n <= rating
                          ? "fill-toss-warning text-toss-warning"
                          : "text-toss-text-quaternary"
                      )}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
                <span className="text-toss-caption text-toss-text-tertiary ml-1 toss-numeric">
                  {rating}/5
                </span>
              </div>
            </div>

            <div>
              <label className="text-toss-caption text-toss-text-secondary font-semibold block mb-2">
                거래 매너
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManner("good")}
                  className={cn(
                    "flex-1 py-2 rounded-toss-md text-toss-caption font-bold transition-colors flex items-center justify-center gap-1.5 border",
                    manner === "good"
                      ? "bg-toss-positive-weak text-toss-positive border-toss-positive/40"
                      : "bg-toss-bg-subtle text-toss-text-tertiary border-toss-divider"
                  )}
                >
                  <ThumbsUp className="w-4 h-4" />
                  매너 좋음
                </button>
                <button
                  type="button"
                  onClick={() => setManner("bad")}
                  className={cn(
                    "flex-1 py-2 rounded-toss-md text-toss-caption font-bold transition-colors flex items-center justify-center gap-1.5 border",
                    manner === "bad"
                      ? "bg-toss-negative-weak text-toss-negative border-toss-negative/40"
                      : "bg-toss-bg-subtle text-toss-text-tertiary border-toss-divider"
                  )}
                >
                  <ThumbsDown className="w-4 h-4" />
                  아쉬워요
                </button>
              </div>
            </div>

            <div>
              <label className="text-toss-caption text-toss-text-secondary font-semibold block mb-2">
                한줄 후기 (선택)
              </label>
              <textarea
                rows={3}
                placeholder="거래는 어떠셨나요?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 rounded-toss-md bg-toss-input-bg border border-toss-border text-toss-body text-toss-text-primary placeholder:text-toss-text-quaternary focus:outline-none focus:border-toss-brand transition-colors resize-none"
              />
            </div>

            <p className="text-toss-micro text-toss-text-tertiary">
              후기를 등록하면 거래글이 자동으로{" "}
              <span className="text-toss-positive font-semibold">판매완료</span> 로 변경됩니다.
            </p>
          </div>
          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button onClick={submit}>후기 등록</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-toss-divider" />
      <span className="text-toss-micro text-toss-text-tertiary shrink-0">{label}</span>
      <div className="flex-1 h-px bg-toss-divider" />
    </div>
  );
}

export function MessageThread({
  conversation,
  messages,
  myUserId,
  prefilledCardRef,
}: {
  conversation: Conversation;
  messages: Message[];
  myUserId: string;
  prefilledCardRef?: CardRef;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [attachedCard, setAttachedCard] = useState<CardRef | undefined>(prefilledCardRef);
  const [aptOpen, setAptOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conversationId = conversation.id;

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  }

  function sendAppointment(apt: NonNullable<Message["appointment"]>) {
    setAptOpen(false);
    startTransition(async () => {
      const res = await proposeAppointmentAction({
        conversationId,
        date: apt.date,
        time: apt.time,
        place: apt.place,
      });
      if (res.ok) {
        showToast("거래 약속을 보냈어요");
        router.refresh();
      } else {
        showToast(res.error ?? "약속 전송에 실패했어요");
      }
    });
  }

  function sendReview(rev: NonNullable<Message["review"]>) {
    setReviewOpen(false);
    startTransition(async () => {
      const res = await leaveReviewAction({
        conversationId,
        rating: rev.rating,
        manner: rev.manner,
        comment: rev.comment,
      });
      if (res.ok) {
        showToast("거래 완료 후기를 등록했어요");
        router.refresh();
      } else {
        showToast(res.error ?? "후기 등록에 실패했어요");
      }
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (prefilledCardRef) inputRef.current?.focus();
  }, [prefilledCardRef]);

  function send() {
    const text = input.trim();
    if (!text && !attachedCard) return;
    const card = attachedCard;
    setInput("");
    setAttachedCard(undefined);
    inputRef.current?.focus();
    startTransition(async () => {
      const res = await sendMessageAction({
        conversationId,
        content: text,
        attachedCardId: card?.cardId ?? null,
      });
      if (res.ok) {
        router.refresh();
      } else {
        setInput(text);
        if (card) setAttachedCard(card);
        showToast(res.error ?? "전송에 실패했어요");
      }
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const { partner } = conversation;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-toss-bg-base">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-toss-divider bg-toss-bg-base/90 backdrop-blur shrink-0">
        <Link
          href={`/${locale}/messages`}
          aria-label="뒤로"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-bg-subtle text-toss-text-secondary hover:text-toss-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Avatar name={partner.initial} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-toss-label font-semibold text-toss-text-primary truncate">
            {partner.displayName}
          </p>
          <p className="text-toss-micro text-toss-text-tertiary">@{partner.username}</p>
        </div>
        <Link
          href={`/${locale}/profile/${partner.username}`}
          className="text-toss-caption text-toss-text-tertiary hover:text-toss-brand transition-colors shrink-0"
        >
          프로필
        </Link>
      </div>

      {/* 메세지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-toss-bg-subtle">
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
      <div className="shrink-0 border-t border-toss-divider px-4 py-2 bg-toss-bg-base flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAptOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-toss-md bg-toss-brand-weak hover:bg-toss-brand/15 text-toss-brand text-toss-caption font-semibold transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" strokeWidth={2.4} />
          거래 약속
        </button>
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-toss-md bg-toss-positive-weak hover:bg-toss-positive/15 text-toss-positive text-toss-caption font-semibold transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.4} />
          거래 완료
        </button>
      </div>

      {/* 모달 */}
      <AppointmentModal open={aptOpen} onClose={() => setAptOpen(false)} onSubmit={sendAppointment} />
      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} onSubmit={sendReview} />

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-toss-lg bg-toss-text-primary text-white shadow-toss-lg text-toss-caption font-medium z-[80]">
          {toast}
        </div>
      )}

      {/* 입력창 */}
      <div className="shrink-0 border-t border-toss-divider px-4 py-3 bg-toss-bg-base">
        {/* 첨부 카드 미리보기 */}
        {attachedCard && (
          <div className="flex items-center gap-2.5 mb-2 px-2.5 py-2 rounded-toss-md bg-toss-brand-weak border border-toss-brand/30">
            <span className="text-toss-micro text-toss-brand font-semibold shrink-0">답장 카드</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachedCard.imageUrl}
              alt={attachedCard.cardName}
              className="w-8 h-11 object-cover rounded-toss-sm shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-toss-micro text-toss-text-tertiary truncate">
                {attachedCard.setName}
              </p>
              <p className="text-toss-caption font-bold text-toss-text-primary truncate">
                {attachedCard.cardName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttachedCard(undefined)}
              aria-label="첨부 제거"
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-toss-text-tertiary hover:text-toss-text-primary hover:bg-toss-bg-subtle transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="메세지를 입력하세요 (Enter로 전송)"
            rows={1}
            className="flex-1 resize-none rounded-toss-lg bg-toss-input-bg border border-toss-border px-4 py-2.5 text-toss-body text-toss-text-primary placeholder:text-toss-text-quaternary focus:outline-none focus:border-toss-brand transition-colors leading-relaxed max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={pending || (!input.trim() && !attachedCard)}
            aria-label="전송"
            className="shrink-0 w-10 h-10 rounded-toss-lg bg-toss-brand hover:bg-toss-brand/90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-white"
          >
            <Send className="w-4 h-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
