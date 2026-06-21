"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "right" | "left" | "bottom";
  width?: number;
  /** bottom 시트의 최대 높이(기본 85vh). 콘텐츠가 적으면 그만큼만 차지. */
  maxHeight?: number | string;
  children: React.ReactNode;
}

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  side: "right" | "left" | "bottom";
  width: number;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) throw new Error("Sheet compound components must be used inside Sheet.Root");
  return ctx;
}

// ── Root ──────────────────────────────────────────────────────────────────────

function SheetRoot({
  open,
  onOpenChange,
  side = "right",
  width = 400,
  maxHeight,
  children,
}: SheetRootProps) {
  const isBottom = side === "bottom";
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Body scroll lock
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  return (
    <SheetContext.Provider value={{ open, setOpen: onOpenChange, side, width }}>
      {createPortal(
        <>
          {/* Overlay */}
          <div
            aria-hidden="true"
            onClick={() => onOpenChange(false)}
            className={cn(
              "fixed inset-0 z-[60] bg-toss-bg-overlay transition-opacity duration-300",
              open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-hidden={!open}
            tabIndex={-1}
            style={isBottom ? { maxHeight: maxHeight ?? "85vh" } : { width }}
            className={cn(
              "fixed z-[60] flex flex-col bg-toss-bg-base shadow-toss-lg",
              "transition-transform duration-300 ease-in-out",
              // bottom = 하단 풀폭 시트(위로 슬라이드), right/left = 사이드 드로어
              isBottom && "inset-x-0 bottom-0 rounded-t-2xl",
              isBottom && (open ? "translate-y-0" : "translate-y-full"),
              !isBottom && "top-0 bottom-0",
              !isBottom && (side === "right" ? "right-0" : "left-0"),
              !isBottom && (open ? "translate-x-0" : side === "right" ? "translate-x-full" : "-translate-x-full"),
            )}
          >
            {children}
          </div>
        </>,
        document.body
      )}
    </SheetContext.Provider>
  );
}
SheetRoot.displayName = "Sheet.Root";

// ── Header ────────────────────────────────────────────────────────────────────

const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "sticky top-0 flex items-center justify-between px-6 py-4",
        "bg-toss-bg-base border-b border-toss-divider shrink-0",
        className
      )}
      {...props}
    />
  )
);
SheetHeader.displayName = "Sheet.Header";

// ── Title ─────────────────────────────────────────────────────────────────────

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-toss-title-2 font-bold text-toss-text-primary", className)}
      {...props}
    />
  )
);
SheetTitle.displayName = "Sheet.Title";

// ── Content ───────────────────────────────────────────────────────────────────

const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto px-6 py-4", className)}
      {...props}
    />
  )
);
SheetContent.displayName = "Sheet.Content";

// ── Close ─────────────────────────────────────────────────────────────────────

const SheetClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    const { setOpen } = useSheetContext();
    return (
      <button
        ref={ref}
        type="button"
        aria-label="닫기"
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-toss-sm",
          "text-toss-text-tertiary hover:bg-toss-hover active:bg-toss-pressed transition-colors",
          className
        )}
        onClick={() => setOpen(false)}
        {...props}
      >
        <X size={16} />
      </button>
    );
  }
);
SheetClose.displayName = "Sheet.Close";

// ── Footer ────────────────────────────────────────────────────────────────────

const SheetFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "shrink-0 flex items-center justify-end gap-2 px-6 py-4",
        "border-t border-toss-divider",
        className
      )}
      {...props}
    />
  )
);
SheetFooter.displayName = "Sheet.Footer";

// ── Namespace export ──────────────────────────────────────────────────────────

export const Sheet = {
  Root: SheetRoot,
  Header: SheetHeader,
  Title: SheetTitle,
  Content: SheetContent,
  Close: SheetClose,
  Footer: SheetFooter,
};
