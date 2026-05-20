import * as React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs?: React.ReactNode;
  actions?: React.ReactNode;
  draggable?: boolean;
}

const PanelHeader = React.forwardRef<HTMLDivElement, PanelHeaderProps>(
  ({ className, tabs, actions, draggable, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between border-b border-toss-divider px-2 h-10 bg-toss-bg-base shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1 min-w-0">
        {draggable && (
          <GripVertical
            size={16}
            className="text-toss-icon shrink-0 cursor-grab active:cursor-grabbing"
          />
        )}
        {tabs ?? children}
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0 ml-2">{actions}</div>
      )}
    </div>
  )
);
PanelHeader.displayName = "PanelHeader";

export { PanelHeader };
