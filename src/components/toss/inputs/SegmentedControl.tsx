"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const itemVariants = cva(
  "relative flex-1 flex items-center justify-center cursor-pointer select-none transition-colors font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        filled: "rounded-toss-md",
        underline: "",
      },
      size: {
        sm: "h-7 px-3 text-toss-caption",
        md: "h-9 px-4 text-toss-label",
      },
      selected: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "filled",
        selected: true,
        className: "bg-toss-bg-base shadow-toss-xs text-toss-text-primary",
      },
      {
        variant: "filled",
        selected: false,
        className: "text-toss-text-tertiary hover:bg-toss-hover",
      },
      {
        variant: "underline",
        selected: true,
        className: "text-toss-text-primary",
      },
      {
        variant: "underline",
        selected: false,
        className: "text-toss-text-tertiary hover:text-toss-text-secondary",
      },
    ],
    defaultVariants: {
      variant: "filled",
      size: "md",
      selected: false,
    },
  }
);

export interface SegmentedControlOption {
  value: string;
  label: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  variant?: "filled" | "underline";
  className?: string;
}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ options, value, onChange, size = "md", variant = "filled", className }, ref) => {
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn(
          "flex",
          variant === "filled" && "bg-toss-input-bg rounded-toss-md p-0.5 gap-0.5",
          variant === "underline" && "border-b border-toss-divider",
          className
        )}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={cn(itemVariants({ variant, size, selected }))}
            >
              {opt.label}
              {variant === "underline" && selected && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-toss-text-primary" />
              )}
            </button>
          );
        })}
      </div>
    );
  }
);
SegmentedControl.displayName = "SegmentedControl";

export { SegmentedControl };
