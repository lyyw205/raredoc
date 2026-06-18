import { cn } from "@/lib/utils";

/**
 * 메타 사용률 주간 델타(%포인트) 뱃지 — **단일출처**.
 * 방향은 `direction` 명시 시 그 값(상승/하락 리스트 분리용), 없으면 delta 부호로 판정.
 * (toss `DeltaBadge` 는 가격% 전용이라 "%p" 단위를 못 그려 별도 유지.)
 */
export function MetaDeltaPill({
  delta,
  direction,
  className,
}: {
  delta: number;
  direction?: "up" | "down";
  className?: string;
}) {
  const up = direction ? direction === "up" : delta > 0;
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded",
        up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600",
        className,
      )}
    >
      {up ? "▲" : "▼"}
      {Math.abs(delta)}%p
    </span>
  );
}
