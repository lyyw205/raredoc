"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ComponentProps<"button">, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md";
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, size = "md", disabled, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-toss-pill transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--toss-focus-ring)]",
          "disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
          size === "sm" ? "h-[22px] w-9" : "h-7 w-11",
          checked ? "bg-toss-brand" : "bg-toss-border-strong",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block rounded-full bg-white shadow-toss-xs transition-transform",
            size === "sm" ? "h-[18px] w-[18px]" : "h-6 w-6",
            size === "sm"
              ? checked ? "translate-x-[14px]" : "translate-x-0.5"
              : checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
