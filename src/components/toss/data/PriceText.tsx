import * as React from "react";
import { cn } from "@/lib/utils";
import { directionFromDelta, formatKRW } from "../_utils";

const sizeMap = {
  sm: "text-toss-caption",
  md: "text-toss-body",
  lg: "text-toss-title-2",
  xl: "text-toss-title-1",
} as const;

export interface PriceTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  currency?: "KRW" | "USD" | "none";
  delta?: number;
  size?: "sm" | "md" | "lg" | "xl";
  strong?: boolean;
  colored?: boolean;
  fractionDigits?: number;
}

const PriceText = React.forwardRef<HTMLSpanElement, PriceTextProps>(
  (
    {
      value,
      currency = "KRW",
      delta,
      size = "md",
      strong = false,
      colored = false,
      fractionDigits = 0,
      className,
      ...props
    },
    ref
  ) => {
    const dir = directionFromDelta(delta);
    const colorClass =
      colored && delta != null
        ? dir === "up"
          ? "text-toss-positive"
          : dir === "down"
          ? "text-toss-negative"
          : "text-toss-text-primary"
        : "text-toss-text-primary";

    let formatted: string;
    if (currency === "KRW") {
      formatted =
        fractionDigits === 0
          ? `${formatKRW(value)}원`
          : `${value.toLocaleString("ko-KR", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}원`;
    } else if (currency === "USD") {
      formatted = `$${value.toLocaleString("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
    } else {
      formatted = value.toLocaleString("ko-KR", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
    }

    return (
      <span
        ref={ref}
        className={cn(
          "toss-numeric",
          sizeMap[size],
          strong ? "font-bold" : "font-semibold",
          colorClass,
          className
        )}
        {...props}
      >
        {formatted}
      </span>
    );
  }
);
PriceText.displayName = "PriceText";

export { PriceText };
