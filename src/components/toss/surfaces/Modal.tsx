"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ModalContext = React.createContext<ModalContextValue | null>(null);

function useModalContext() {
  const ctx = React.useContext(ModalContext);
  if (!ctx) throw new Error("Modal compound components must be used inside Modal.Root");
  return ctx;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export interface ModalRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function ModalRoot({ open: controlledOpen, onOpenChange, defaultOpen = false, children }: ModalRootProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <ModalContext.Provider value={{ open, setOpen }}>
      {children}
    </ModalContext.Provider>
  );
}
ModalRoot.displayName = "Modal.Root";

// ── Trigger ───────────────────────────────────────────────────────────────────

export interface ModalTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

function ModalTrigger({ asChild, children }: ModalTriggerProps) {
  const { setOpen } = useModalContext();
  const handleClick = () => setOpen(true);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
      {
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props.onClick?.(e);
          handleClick();
        },
      }
    );
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}
ModalTrigger.displayName = "Modal.Trigger";

// ── Portal ────────────────────────────────────────────────────────────────────

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
ModalPortal.displayName = "Modal.Portal";

// ── Overlay ───────────────────────────────────────────────────────────────────

export interface ModalOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalOverlay = React.forwardRef<HTMLDivElement, ModalOverlayProps>(
  ({ className, ...props }, ref) => {
    const { open, setOpen } = useModalContext();
    if (!open) return null;
    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-[70] bg-toss-bg-overlay",
          "animate-in fade-in-0 duration-200",
          className
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
        {...props}
      />
    );
  }
);
ModalOverlay.displayName = "Modal.Overlay";

// ── Content ───────────────────────────────────────────────────────────────────

export interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: string;
}

const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, maxWidth = "max-w-md", children, ...props }, ref) => {
    const { open, setOpen } = useModalContext();
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Merge refs
    const setRef = React.useCallback(
      (el: HTMLDivElement | null) => {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref]
    );

    // ESC to close
    React.useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }, [open, setOpen]);

    // Body scroll lock
    React.useEffect(() => {
      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
      return () => { document.body.style.overflow = ""; };
    }, [open]);

    // Auto-focus first focusable
    React.useEffect(() => {
      if (!open || !contentRef.current) return;
      const focusable = contentRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, [open]);

    if (!open) return null;

    return (
      <ModalPortal>
        <ModalOverlay />
        <div
          ref={setRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2",
            "w-full bg-toss-bg-base rounded-toss-xl shadow-toss-lg p-6",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            maxWidth,
            className
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
        </div>
      </ModalPortal>
    );
  }
);
ModalContent.displayName = "Modal.Content";

// ── Header ────────────────────────────────────────────────────────────────────

const ModalHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-start justify-between mb-4", className)}
      {...props}
    />
  )
);
ModalHeader.displayName = "Modal.Header";

// ── Title ─────────────────────────────────────────────────────────────────────

const ModalTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-toss-title-1 font-bold text-toss-text-primary", className)}
      {...props}
    />
  )
);
ModalTitle.displayName = "Modal.Title";

// ── Description ───────────────────────────────────────────────────────────────

const ModalDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-toss-body text-toss-text-secondary mt-1", className)}
      {...props}
    />
  )
);
ModalDescription.displayName = "Modal.Description";

// ── Close ─────────────────────────────────────────────────────────────────────

const ModalClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    const { setOpen } = useModalContext();
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
ModalClose.displayName = "Modal.Close";

// ── Footer ────────────────────────────────────────────────────────────────────

const ModalFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex justify-end gap-2 mt-6", className)}
      {...props}
    />
  )
);
ModalFooter.displayName = "Modal.Footer";

// ── Namespace export ──────────────────────────────────────────────────────────

export const Modal = {
  Root: ModalRoot,
  Trigger: ModalTrigger,
  Portal: ModalPortal,
  Overlay: ModalOverlay,
  Content: ModalContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Description: ModalDescription,
  Close: ModalClose,
  Footer: ModalFooter,
};
