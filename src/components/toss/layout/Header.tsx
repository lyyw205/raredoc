"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── Root ────────────────────────────────────────────────────── */
export interface HeaderRootProps extends React.HTMLAttributes<HTMLElement> {
  sticky?: boolean;
  bordered?: boolean;
}

const HeaderRoot = React.forwardRef<HTMLElement, HeaderRootProps>(
  ({ className, sticky = true, bordered = true, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        "z-40 h-[52px] bg-toss-bg-base",
        sticky && "sticky top-0",
        bordered && "shadow-[inset_0_-1px_0_var(--toss-border)]",
        className
      )}
      {...props}
    />
  )
);
HeaderRoot.displayName = "Header.Root";

/* ── Logo ────────────────────────────────────────────────────── */
export interface HeaderLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string;
}

const HeaderLogo = React.forwardRef<HTMLDivElement, HeaderLogoProps>(
  ({ className, href, children, ...props }, ref) => {
    const inner = (
      <div
        ref={ref}
        className={cn(
          "font-bold text-toss-title-2 text-toss-text-primary flex items-center h-full shrink-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );

    if (href) {
      return (
        <Link href={href} className="flex items-center h-full">
          {inner}
        </Link>
      );
    }
    return inner;
  }
);
HeaderLogo.displayName = "Header.Logo";

/* ── Nav ─────────────────────────────────────────────────────── */
export interface HeaderNavProps extends React.HTMLAttributes<HTMLElement> {}

const HeaderNav = React.forwardRef<HTMLElement, HeaderNavProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn("flex items-center gap-6 h-full", className)}
      {...props}
    />
  )
);
HeaderNav.displayName = "Header.Nav";

/* ── NavItem ─────────────────────────────────────────────────── */
export interface HeaderNavItemProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
  href?: string;
}

const HeaderNavItem = React.forwardRef<HTMLSpanElement, HeaderNavItemProps>(
  ({ className, active, href, children, ...props }, ref) => {
    const classes = cn(
      "text-toss-label font-medium px-2 h-[52px] flex items-center transition-colors cursor-pointer select-none",
      active
        ? "text-toss-text-primary font-semibold"
        : "text-toss-text-secondary hover:text-toss-text-primary",
      className
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);
HeaderNavItem.displayName = "Header.NavItem";

/* ── Actions ─────────────────────────────────────────────────── */
export interface HeaderActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

const HeaderActions = React.forwardRef<HTMLDivElement, HeaderActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 ml-auto h-full", className)}
      {...props}
    />
  )
);
HeaderActions.displayName = "Header.Actions";

/* ── Inner layout wrapper (px-4 flex row) ────────────────────── */
export interface HeaderInnerProps extends React.HTMLAttributes<HTMLDivElement> {}

const HeaderInner = React.forwardRef<HTMLDivElement, HeaderInnerProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center h-full px-4 gap-4", className)}
      {...props}
    />
  )
);
HeaderInner.displayName = "Header.Inner";

/* ── Compound export ─────────────────────────────────────────── */
export const Header = Object.assign(HeaderRoot, {
  Root: HeaderRoot,
  Inner: HeaderInner,
  Logo: HeaderLogo,
  Nav: HeaderNav,
  NavItem: HeaderNavItem,
  Actions: HeaderActions,
});
