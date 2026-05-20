import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Root ────────────────────────────────────────────────────── */
export interface SidebarRootProps extends React.HTMLAttributes<HTMLElement> {
  position?: "left" | "right";
  width?: number;
  sticky?: boolean;
}

const SidebarRoot = React.forwardRef<HTMLElement, SidebarRootProps>(
  (
    { className, position = "right", width = 344, sticky = true, style, ...props },
    ref
  ) => (
    <aside
      ref={ref}
      className={cn(
        "bg-toss-bg-base overflow-y-auto",
        sticky
          ? "sticky top-[52px] h-[calc(100dvh-52px)]"
          : "h-full",
        position === "right"
          ? "border-l border-toss-border"
          : "border-r border-toss-border",
        className
      )}
      style={{ width: `${width}px`, ...style }}
      {...props}
    />
  )
);
SidebarRoot.displayName = "Sidebar.Root";

/* ── Header ──────────────────────────────────────────────────── */
export interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "sticky top-0 bg-toss-bg-base flex items-center justify-between p-4 border-b border-toss-divider z-10",
        className
      )}
      {...props}
    />
  )
);
SidebarHeader.displayName = "Sidebar.Header";

/* ── Title ───────────────────────────────────────────────────── */
export interface SidebarTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const SidebarTitle = React.forwardRef<HTMLHeadingElement, SidebarTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-toss-title-2 font-bold text-toss-text-primary", className)}
      {...props}
    />
  )
);
SidebarTitle.displayName = "Sidebar.Title";

/* ── Section ─────────────────────────────────────────────────── */
export interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarSection = React.forwardRef<HTMLDivElement, SidebarSectionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-4 flex flex-col gap-3", className)}
      {...props}
    />
  )
);
SidebarSection.displayName = "Sidebar.Section";

/* ── SectionTitle ────────────────────────────────────────────── */
export interface SidebarSectionTitleProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const SidebarSectionTitle = React.forwardRef<
  HTMLParagraphElement,
  SidebarSectionTitleProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-toss-label font-bold text-toss-text-primary mb-2",
      className
    )}
    {...props}
  />
));
SidebarSectionTitle.displayName = "Sidebar.SectionTitle";

/* ── SectionDescription ──────────────────────────────────────── */
export interface SidebarSectionDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const SidebarSectionDescription = React.forwardRef<
  HTMLParagraphElement,
  SidebarSectionDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-toss-caption text-toss-text-tertiary", className)}
    {...props}
  />
));
SidebarSectionDescription.displayName = "Sidebar.SectionDescription";

/* ── Compound export ─────────────────────────────────────────── */
export const Sidebar = Object.assign(SidebarRoot, {
  Root: SidebarRoot,
  Header: SidebarHeader,
  Title: SidebarTitle,
  Section: SidebarSection,
  SectionTitle: SidebarSectionTitle,
  SectionDescription: SidebarSectionDescription,
});
