"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TickerItem {
  label: string;
  value: string | number;
  delta?: number;
  percent?: number;
  href?: string;
}

export interface TickerBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TickerItem[];
  speed?: number;
  pauseOnHover?: boolean;
  sticky?: React.ReactNode;
}

const TickerBar = React.forwardRef<HTMLDivElement, TickerBarProps>(
  (
    {
      className,
      items,
      speed = 30,
      pauseOnHover = true,
      sticky,
      ...props
    },
    ref
  ) => {
    const [paused, setPaused] = React.useState(false);

    const duration = `${(items.length * speed) / 3}s`;

    const renderItem = (item: TickerItem, key: React.Key) => {
      const isPositive = item.delta !== undefined ? item.delta > 0 : undefined;
      const isNegative = item.delta !== undefined ? item.delta < 0 : undefined;

      const inner = (
        <span
          key={key}
          className="inline-flex items-baseline gap-1 px-4 shrink-0 whitespace-nowrap"
        >
          <span className="text-toss-caption text-toss-text-secondary">
            {item.label}
          </span>
          <span
            className={cn(
              "text-toss-caption font-medium toss-numeric",
              isPositive && "text-toss-positive",
              isNegative && "text-toss-negative",
              !isPositive && !isNegative && "text-toss-text-primary"
            )}
          >
            {item.value}
          </span>
          {item.percent !== undefined && (
            <span
              className={cn(
                "text-toss-caption toss-numeric",
                isPositive && "text-toss-positive",
                isNegative && "text-toss-negative",
                !isPositive && !isNegative && "text-toss-text-tertiary"
              )}
            >
              {isPositive ? "+" : ""}
              {item.percent.toFixed(2)}%
            </span>
          )}
        </span>
      );

      if (item.href) {
        return (
          <Link key={key} href={item.href} className="inline-flex">
            {inner}
          </Link>
        );
      }
      return inner;
    };

    // Duplicate items for seamless loop
    const doubled = [...items, ...items];

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center h-11 border-t border-toss-divider bg-toss-bg-base overflow-hidden",
          className
        )}
        {...props}
      >
        {sticky && (
          <div className="shrink-0 px-3 text-toss-caption text-toss-text-tertiary border-r border-toss-divider h-full flex items-center bg-toss-bg-base z-10">
            {sticky}
          </div>
        )}
        <div
          className="flex-1 overflow-hidden relative"
          onMouseEnter={() => pauseOnHover && setPaused(true)}
          onMouseLeave={() => pauseOnHover && setPaused(false)}
        >
          <div
            className="flex w-max"
            style={{
              animation: `ticker-scroll ${duration} linear infinite`,
              animationPlayState: paused ? "paused" : "running",
            }}
          >
            {doubled.map((item, i) => renderItem(item, i))}
          </div>
        </div>

        <style>{`
          @keyframes ticker-scroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    );
  }
);
TickerBar.displayName = "TickerBar";

export { TickerBar };
