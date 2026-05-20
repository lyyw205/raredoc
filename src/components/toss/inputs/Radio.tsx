"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioProps
  extends Omit<React.ComponentProps<"button">, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md";
}

const Radio = React.forwardRef<HTMLButtonElement, RadioProps>(
  ({ checked, onCheckedChange, size = "md", disabled, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--toss-focus-ring)]",
          "disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          checked
            ? "border-[5px] border-toss-brand bg-white"
            : "border-2 border-toss-border-strong bg-transparent",
          className
        )}
        {...props}
      />
    );
  }
);
Radio.displayName = "Radio";

export { Radio };
