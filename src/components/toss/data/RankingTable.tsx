import * as React from "react";
import { cn } from "@/lib/utils";

/* Root */
export interface RankingTableRootProps extends React.HTMLAttributes<HTMLDivElement> {}

const Root = React.forwardRef<HTMLDivElement, RankingTableRootProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} role="table" className={cn("w-full", className)} {...props}>
      {children}
    </div>
  )
);
Root.displayName = "RankingTable.Root";

/* Head */
export interface RankingTableHeadProps extends React.HTMLAttributes<HTMLDivElement> {}

const Head = React.forwardRef<HTMLDivElement, RankingTableHeadProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} role="rowgroup" className={cn("", className)} {...props}>
      {children}
    </div>
  )
);
Head.displayName = "RankingTable.Head";

/* Header (cell in head row) */
export interface RankingTableHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center" | "right";
}

const Header = React.forwardRef<HTMLDivElement, RankingTableHeaderProps>(
  ({ className, align = "left", children, ...props }, ref) => (
    <div
      ref={ref}
      role="columnheader"
      className={cn(
        "flex-1 flex items-center h-11 text-toss-body font-bold text-toss-text-tertiary",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        "first:pl-4 last:pr-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Header.displayName = "RankingTable.Header";

/* Body */
export interface RankingTableBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const Body = React.forwardRef<HTMLDivElement, RankingTableBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} role="rowgroup" className={cn("", className)} {...props}>
      {children}
    </div>
  )
);
Body.displayName = "RankingTable.Body";

/* Row */
export interface RankingTableRowProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  href?: string;
}

const Row = React.forwardRef<HTMLDivElement, RankingTableRowProps>(
  ({ className, interactive = false, href, onClick, children, ...props }, ref) => {
    const inner = (
      <div
        ref={ref}
        role="row"
        tabIndex={interactive ? 0 : undefined}
        onClick={onClick}
        className={cn(
          "flex items-center h-12 rounded-toss-md overflow-hidden",
          "odd:bg-toss-bg-base even:bg-toss-bg-subtle",
          interactive && "cursor-pointer group transition-colors hover:!bg-toss-bg-muted",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );

    if (href) {
      return (
        <a href={href} className="block no-underline">
          {inner}
        </a>
      );
    }

    return inner;
  }
);
Row.displayName = "RankingTable.Row";

/* Cell */
export interface RankingTableCellProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center" | "right";
  numeric?: boolean;
}

const Cell = React.forwardRef<HTMLDivElement, RankingTableCellProps>(
  ({ className, align = "left", numeric = false, children, ...props }, ref) => (
    <div
      ref={ref}
      role="cell"
      className={cn(
        "flex-1 flex items-center h-full text-toss-body font-medium text-toss-text-primary",
        "first:pl-4 last:pr-4 px-2",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        numeric && "toss-numeric font-semibold justify-end",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Cell.displayName = "RankingTable.Cell";

/* Head row wrapper */
export interface RankingTableHeadRowProps extends React.HTMLAttributes<HTMLDivElement> {}

const HeadRow = React.forwardRef<HTMLDivElement, RankingTableHeadRowProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="row"
      className={cn("flex items-center px-2", className)}
      {...props}
    >
      {children}
    </div>
  )
);
HeadRow.displayName = "RankingTable.HeadRow";

export const RankingTable = { Root, Head, HeadRow, Header, Body, Row, Cell };
