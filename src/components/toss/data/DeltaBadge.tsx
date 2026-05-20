import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { directionFromDelta, formatPercent } from "../_utils";

export interface DeltaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  delta?: number;
  percent?: number;
  mode?: "text" | "pill";
  size?: "sm" | "md";
  showSign?: boolean;
  showPercent?: boolean;
  showIcon?: boolean;
  decimals?: number;
}

const DeltaBadge = React.forwardRef<HTMLSpanElement, DeltaBadgeProps>(
  (
    {
      delta,
      percent,
      mode = "text",
      size = "md",
      showSign = true,
      showPercent = true,
      showIcon = false,
      decimals = 2,
      className,
      ...props
    },
    ref
  ) => {
    const dir = directionFromDelta(percent ?? delta);

    const colorClass =
      dir === "up"
        ? "text-toss-positive"
        : dir === "down"
        ? "text-toss-negative"
        : "text-toss-text-tertiary";

    const parts: string[] = [];
    if (delta != null && !showPercent) {
      const sign = showSign && delta > 0 ? "+" : "";
      parts.push(`${sign}${delta.toFixed(decimals)}`);
    }
    if (percent != null && showPercent) {
      const sign = showSign && percent > 0 ? "+" : "";
      parts.push(`${sign}${formatPercent(percent, decimals)}`);
    } else if (delta != null && showPercent && percent == null) {
      const sign = showSign && delta > 0 ? "+" : "";
      parts.push(`${sign}${delta.toFixed(decimals)}`);
    }

    const label = parts.join(" ");

    const Icon =
      showIcon && dir !== "flat"
        ? dir === "up"
          ? TrendingUp
          : TrendingDown
        : null;

    if (mode === "pill") {
      const bgClass =
        dir === "up"
          ? "bg-toss-positive-weak"
          : dir === "down"
          ? "bg-toss-negative-weak"
          : "bg-toss-bg-muted";

      return (
        <span
          ref={ref}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-toss-pill px-2 h-5 font-semibold text-toss-micro toss-numeric",
            bgClass,
            colorClass,
            className
          )}
          {...props}
        >
          {Icon && <Icon size={10} />}
          {label}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-0.5 toss-numeric font-semibold",
          size === "sm" ? "text-toss-caption" : "text-toss-label",
          colorClass,
          className
        )}
        {...props}
      >
        {Icon && <Icon size={12} />}
        {label}
      </span>
    );
  }
);
DeltaBadge.displayName = "DeltaBadge";

export { DeltaBadge };
