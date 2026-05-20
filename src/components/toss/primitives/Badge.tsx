import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const dotVariants = cva("rounded-full size-1.5 shrink-0", {
  variants: {
    color: {
      brand:    "bg-toss-brand",
      positive: "bg-toss-positive",
      negative: "bg-toss-negative",
      warning:  "bg-toss-warning",
      success:  "bg-toss-success",
      neutral:  "bg-toss-text-tertiary",
    },
  },
  defaultVariants: { color: "neutral" },
});

const countVariants = cva(
  "inline-flex items-center justify-center rounded-toss-pill min-w-4 h-4 px-1 text-[11px] font-bold leading-none text-white",
  {
    variants: {
      color: {
        brand:    "bg-toss-brand",
        positive: "bg-toss-positive",
        negative: "bg-toss-negative",
        warning:  "bg-toss-warning",
        success:  "bg-toss-success",
        neutral:  "bg-toss-text-tertiary",
      },
    },
    defaultVariants: { color: "positive" },
  }
);

export interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: "dot" | "count";
  count?: number;
  max?: number;
  color?: "brand" | "positive" | "negative" | "warning" | "success" | "neutral";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "count", count, max = 99, color, ...props }, ref) => {
    if (variant === "dot") {
      return (
        <span
          ref={ref}
          className={cn(dotVariants({ color }), className)}
          {...props}
        />
      );
    }

    const display =
      count == null ? null : count > max ? `${max}+` : String(count);

    if (display == null) return null;

    return (
      <span
        ref={ref}
        className={cn(countVariants({ color }), className)}
        {...props}
      >
        {display}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
