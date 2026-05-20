import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center text-center px-10 py-10 gap-3",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="text-toss-text-quaternary [&>svg]:w-12 [&>svg]:h-12">
          {icon}
        </div>
      )}
      <p className="text-toss-title-2 font-bold text-toss-text-primary">{title}</p>
      {description && (
        <p className="text-toss-body text-toss-text-tertiary">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
