"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover compound components must be used inside Popover.Root");
  return ctx;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export interface PopoverRootProps {
  children: React.ReactNode;
}

function PopoverRoot({ children }: PopoverRootProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  );
}
PopoverRoot.displayName = "Popover.Root";

// ── Trigger ───────────────────────────────────────────────────────────────────

export interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

function PopoverTrigger({ asChild, children }: PopoverTriggerProps) {
  const { open, setOpen, triggerRef } = usePopoverContext();
  const handleClick = () => setOpen(!open);

  if (asChild && React.isValidElement(children)) {
    type ChildEl = React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }>;
    const child = children as ChildEl;
    return React.cloneElement(child, {
      ref: triggerRef as React.Ref<HTMLElement>,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        child.props.onClick?.(e);
        handleClick();
      },
    });
  }

  return (
    <button
      type="button"
      ref={triggerRef as React.Ref<HTMLButtonElement>}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
PopoverTrigger.displayName = "Popover.Trigger";

// ── Content ───────────────────────────────────────────────────────────────────

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, side = "bottom", align = "start", children, ...props }, ref) => {
    const { open, setOpen, triggerRef } = usePopoverContext();
    const [pos, setPos] = React.useState({ top: 0, left: 0 });
    const [mounted, setMounted] = React.useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);

    const setRef = React.useCallback(
      (el: HTMLDivElement | null) => {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref]
    );

    React.useEffect(() => { setMounted(true); }, []);

    // Calculate position
    React.useEffect(() => {
      if (!open || !triggerRef.current || !contentRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const cw = contentRef.current.offsetWidth;
      const ch = contentRef.current.offsetHeight;
      const gap = 6;
      let top = 0;
      let left = 0;

      if (side === "bottom") {
        top = rect.bottom + window.scrollY + gap;
      } else if (side === "top") {
        top = rect.top + window.scrollY - ch - gap;
      } else if (side === "left") {
        top = rect.top + window.scrollY + rect.height / 2 - ch / 2;
        left = rect.left + window.scrollX - cw - gap;
        setPos({ top, left });
        return;
      } else {
        top = rect.top + window.scrollY + rect.height / 2 - ch / 2;
        left = rect.right + window.scrollX + gap;
        setPos({ top, left });
        return;
      }

      if (align === "start") {
        left = rect.left + window.scrollX;
      } else if (align === "end") {
        left = rect.right + window.scrollX - cw;
      } else {
        left = rect.left + window.scrollX + rect.width / 2 - cw / 2;
      }

      setPos({ top, left });
    }, [open, side, align, triggerRef]);

    // Outside click + ESC
    React.useEffect(() => {
      if (!open) return;

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      const handleClick = (e: MouseEvent) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(e.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };

      document.addEventListener("keydown", handleKey);
      document.addEventListener("mousedown", handleClick);
      return () => {
        document.removeEventListener("keydown", handleKey);
        document.removeEventListener("mousedown", handleClick);
      };
    }, [open, setOpen, triggerRef]);

    if (!mounted || !open) return null;

    return createPortal(
      <div
        ref={setRef}
        style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
        className={cn(
          "bg-toss-bg-base rounded-toss-md shadow-toss-md border border-toss-border min-w-[220px]",
          "animate-in fade-in-0 zoom-in-95 duration-150",
          className
        )}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);
PopoverContent.displayName = "Popover.Content";

// ── Namespace export ──────────────────────────────────────────────────────────

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
};
