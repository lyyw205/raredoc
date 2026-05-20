"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ComponentProps<"button">, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md";
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    { checked, onCheckedChange, size = "md", indeterminate, disabled, className, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-toss-xs transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--toss-focus-ring)]",
          "disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
          size === "sm" ? "h-[18px] w-[18px]" : "h-6 w-6",
          checked || indeterminate
            ? "bg-toss-brand border-0"
            : "border-[1.5px] border-toss-border-strong bg-transparent",
          className
        )}
        {...props}
      >
        {(checked || indeterminate) && (
          <Check
            className={cn(
              "text-white stroke-[3]",
              size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
            )}
          />
        )}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
