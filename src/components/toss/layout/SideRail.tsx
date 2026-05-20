import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── Root ────────────────────────────────────────────────────── */
export interface SideRailRootProps extends React.HTMLAttributes<HTMLElement> {
  position?: "left" | "right";
}

const SideRailRoot = React.forwardRef<HTMLElement, SideRailRootProps>(
  ({ className, position = "right", ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(
        "fixed top-[52px] bottom-0 w-[60px] bg-toss-bg-base z-30 flex flex-col items-center py-3 gap-2",
        position === "right"
          ? "right-0 border-l border-toss-border"
          : "left-0 border-r border-toss-border",
        className
      )}
      {...props}
    />
  )
);
SideRailRoot.displayName = "SideRail.Root";

/* ── Item ────────────────────────────────────────────────────── */
export interface SideRailItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  href?: string;
  badge?: React.ReactNode;
}

const SideRailItem = React.forwardRef<HTMLDivElement, SideRailItemProps>(
  ({ className, icon, label, active, href, badge, ...props }, ref) => {
    const classes = cn(
      "flex flex-col items-center gap-1 py-2 px-1 rounded-toss-md w-12 cursor-pointer transition-colors relative",
      active ? "bg-toss-pressed" : "hover:bg-toss-hover",
      className
    );

    const content = (
      <>
        <span
          className={cn(
            "h-6 w-6 flex items-center justify-center",
            active ? "text-toss-text-primary" : "text-toss-icon"
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            "text-toss-tiny leading-none text-center",
            active ? "text-toss-text-primary" : "text-toss-text-tertiary"
          )}
        >
          {label}
        </span>
        {badge && (
          <span className="absolute top-1 right-1">{badge}</span>
        )}
      </>
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          {content}
        </Link>
      );
    }

    return (
      <div ref={ref} className={classes} {...props}>
        {content}
      </div>
    );
  }
);
SideRailItem.displayName = "SideRail.Item";

/* ── Divider ─────────────────────────────────────────────────── */
const SideRailDivider = () => (
  <div className="w-8 h-px bg-toss-divider my-2 shrink-0" />
);
SideRailDivider.displayName = "SideRail.Divider";

/* ── Compound export ─────────────────────────────────────────── */
export const SideRail = Object.assign(SideRailRoot, {
  Root: SideRailRoot,
  Item: SideRailItem,
  Divider: SideRailDivider,
});
