"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextField, type TextFieldProps } from "./TextField";

export interface SearchFieldProps
  extends Omit<TextFieldProps, "leftIcon" | "clearable" | "rightIcon"> {
  onSearch?: (value: string) => void;
  shortcut?: string;
}

const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ onSearch, shortcut, placeholder = "검색", onKeyDown, ...props }, ref) => {
    const ariaLabel = props["aria-label"] ?? placeholder;
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        onSearch((e.target as HTMLInputElement).value);
      }
      onKeyDown?.(e);
    };

    const shortcutEl = shortcut ? (
      <kbd
        className={cn(
          "inline-flex items-center rounded px-1.5 py-0.5",
          "bg-toss-input-bg text-toss-text-quaternary text-toss-micro font-mono",
          "border border-toss-border"
        )}
      >
        {shortcut}
      </kbd>
    ) : undefined;

    return (
      <TextField
        ref={ref}
        placeholder={placeholder}
        aria-label={ariaLabel}
        clearable
        leftIcon={<Search className="h-4 w-4 text-toss-icon" />}
        rightIcon={shortcutEl}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);
SearchField.displayName = "SearchField";

export { SearchField };
