"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleGroupOption {
  value: string;
  label: React.ReactNode;
}

export interface ToggleGroupProps {
  options: ToggleGroupOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ options, value, onChange, size = "md", className }, ref) => {
    return (
      <div ref={ref} role="group" className={cn("flex items-center gap-1", className)}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-toss-md text-toss-label font-semibold transition-colors select-none px-3",
                size === "sm" ? "h-7" : "h-8",
                selected
                  ? "bg-toss-input-bg text-toss-text-primary"
                  : "bg-transparent text-toss-text-tertiary hover:bg-toss-hover"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }
);
ToggleGroup.displayName = "ToggleGroup";

export { ToggleGroup };
