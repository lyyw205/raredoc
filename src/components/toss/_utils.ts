export { cn } from "@/lib/utils";

export type Direction = "up" | "down" | "flat";

export function directionFromDelta(delta: number | null | undefined): Direction {
  if (delta == null || Number.isNaN(delta)) return "flat";
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

const KRW_FORMATTER = new Intl.NumberFormat("ko-KR");
export function formatKRW(value: number): string {
  return KRW_FORMATTER.format(Math.round(value));
}

export function formatPercent(value: number, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatSignedNumber(value: number): string {
  if (value > 0) return `+${KRW_FORMATTER.format(value)}`;
  return KRW_FORMATTER.format(value);
}
