import { cn } from "@/lib/utils";

// 공용 카드 썸네일 — cardgame/cards 의 CardGridItem 패턴 추출 (docs/cardgame-ui-plan.md §2-I3).
// aspect 63/88(실물 카드 비율), null → placeholder, count 뱃지 옵션. 훅 없음 — 서버/클라이언트 겸용.

export function CardThumb({
  src,
  alt,
  count,
  className,
}: {
  src: string | null;
  alt: string;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[63/88] rounded-lg overflow-hidden bg-toss-bg-muted", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-1">
          <span className="text-toss-micro text-toss-text-quaternary text-center leading-tight break-keep">{alt}</span>
        </div>
      )}
      {count != null && count > 0 && (
        <span className="absolute bottom-1 right-1 min-w-5 h-5 px-1 rounded-md bg-black/70 text-white text-[11px] font-bold inline-flex items-center justify-center tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}
