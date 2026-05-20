import * as React from "react";
import { cn } from "@/lib/utils";

export interface DataRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  interactive?: boolean;
  divider?: boolean;
  compact?: boolean;
}

const DataRow = React.forwardRef<HTMLDivElement, DataRowProps>(
  (
    {
      label,
      value,
      delta,
      leftIcon,
      rightIcon,
      interactive = false,
      divider = false,
      compact = false,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={onClick}
        className={cn(
          "flex items-center justify-between gap-2",
          compact ? "h-10 px-3" : "h-12 px-4",
          interactive &&
            "cursor-pointer hover:bg-toss-hover active:bg-toss-pressed transition-colors",
          divider && "border-b border-toss-divider",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2 min-w-0">
          {leftIcon && (
            <span className="shrink-0 text-toss-text-tertiary">{leftIcon}</span>
          )}
          <span className="text-toss-label font-medium text-toss-text-secondary truncate">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-toss-body font-semibold text-toss-text-primary toss-numeric">
            {value}
          </span>
          {delta && <span>{delta}</span>}
          {rightIcon && (
            <span className="text-toss-text-tertiary">{rightIcon}</span>
          )}
        </div>
      </div>
    );
  }
);
DataRow.displayName = "DataRow";

export { DataRow };
