import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  rail?: React.ReactNode;
  footer?: React.ReactNode;
}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ className, header, sidebar, rail, footer, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("min-h-screen flex flex-col", className)}
      {...props}
    >
      {header}
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0">{children}</main>
        {sidebar}
      </div>
      {rail}
      {footer}
    </div>
  )
);
PageLayout.displayName = "PageLayout";

export { PageLayout };
