import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { directionFromDelta, formatKRW, formatPercent } from "../_utils";

export interface StockListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  logoUrl?: string;
  logoFallback?: React.ReactNode;
  name: string;
  price: number;
  currency?: "KRW" | "USD" | "none";
  delta?: number;
  percent?: number;
  rank?: number;
  favorited?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  href?: string;
}

const StockListItem = React.forwardRef<HTMLDivElement, StockListItemProps>(
  (
    {
      logoUrl,
      logoFallback,
      name,
      price,
      currency = "KRW",
      delta,
      percent,
      rank,
      favorited = false,
      onFavoriteToggle,
      href,
      className,
      onClick,
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

    const formattedPrice =
      currency === "KRW"
        ? `${formatKRW(price)}원`
        : currency === "USD"
        ? `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : price.toLocaleString();

    const deltaStr =
      percent != null
        ? `${percent > 0 ? "+" : ""}${formatPercent(percent)}`
        : delta != null
        ? `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`
        : null;

    const inner = (
      <div
        ref={ref}
        role={href || onClick ? "button" : undefined}
        tabIndex={href || onClick ? 0 : undefined}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-4 py-2 h-14 hover:bg-toss-hover transition-colors rounded-toss-md cursor-pointer",
          className
        )}
        {...props}
      >
        {/* Logo / Rank */}
        <div className="relative shrink-0">
          {rank != null && (
            <span className="absolute -top-1 -left-1 text-toss-micro font-bold text-toss-text-tertiary toss-numeric">
              {rank}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-toss-bg-subtle flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
            ) : logoFallback ? (
              <span className="text-toss-caption text-toss-text-tertiary">{logoFallback}</span>
            ) : (
              <span className="text-toss-caption font-bold text-toss-text-secondary">
                {name.slice(0, 1)}
              </span>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-toss-label font-semibold text-toss-text-primary truncate">{name}</p>
        </div>

        {/* Price + delta */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-toss-label font-semibold text-toss-text-primary toss-numeric">
            {formattedPrice}
          </span>
          {deltaStr && (
            <span className={cn("text-toss-caption font-semibold toss-numeric", colorClass)}>
              {deltaStr}
            </span>
          )}
        </div>

        {/* Heart */}
        {onFavoriteToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(e);
            }}
            className="shrink-0 p-1 -mr-1 text-toss-text-quaternary hover:text-toss-positive transition-colors"
            aria-label={favorited ? "관심 종목 해제" : "관심 종목 추가"}
          >
            <Heart
              size={20}
              className={cn(favorited ? "fill-toss-positive text-toss-positive" : "")}
            />
          </button>
        )}
      </div>
    );

    if (href) {
      return (
        <a href={href} className="block no-underline">
          {inner}
        </a>
      );
    }

    return inner;
  }
);
StockListItem.displayName = "StockListItem";

export { StockListItem };
