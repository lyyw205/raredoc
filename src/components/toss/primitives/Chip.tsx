"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1 font-semibold rounded-toss-pill transition-colors select-none",
  {
    variants: {
      variant: {
        filter: "border border-toss-border bg-transparent text-toss-text-secondary",
        tag: "bg-toss-input-bg text-toss-text-primary border border-transparent",
      },
      size: {
        sm: "h-6 text-toss-micro px-2.5",
        md: "h-7 text-toss-caption px-3",
      },
      color: {
        neutral: "",
        brand: "bg-toss-brand-weak text-toss-brand border-transparent",
        positive: "bg-toss-positive-weak text-toss-positive border-transparent",
        negative: "bg-toss-negative-weak text-toss-negative border-transparent",
      },
      selected: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "filter",
        selected: true,
        className: "bg-toss-brand-weak text-toss-brand border-transparent",
      },
    ],
    defaultVariants: {
      variant: "filter",
      size: "md",
      color: "neutral",
      selected: false,
    },
  }
);

export interface ChipProps
  extends Omit<React.ComponentProps<"button">, "color">,
    VariantProps<typeof chipVariants> {
  selected?: boolean;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  as?: "button" | "span";
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      variant,
      size,
      color,
      selected,
      onRemove,
      leftIcon,
      as,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const isInteractive = as === "button" || !!onClick || !!onRemove;
    const Tag = isInteractive ? "button" : "span";

    return (
      <Tag
        ref={isInteractive ? (ref as React.Ref<HTMLButtonElement>) : undefined}
        className={cn(
          chipVariants({ variant, size, color, selected, className }),
          isInteractive && "cursor-pointer hover:opacity-80 active:opacity-60"
        )}
        onClick={onClick}
        {...(isInteractive ? props : {})}
      >
        {leftIcon}
        {children}
        {onRemove && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }
            }}
            className="ml-0.5 inline-flex items-center justify-center rounded-full hover:opacity-70 cursor-pointer"
          >
            <X size={14} />
          </span>
        )}
      </Tag>
    );
  }
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
