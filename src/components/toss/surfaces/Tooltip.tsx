"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delay?: number;
  // single element — ref and event handlers injected via cloneElement
  children: React.ReactElement;
}

interface Position {
  top: number;
  left: number;
}

function getPosition(
  rect: DOMRect,
  tooltipEl: HTMLDivElement,
  side: TooltipProps["side"],
  align: TooltipProps["align"]
): Position {
  const gap = 8;
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;

  let top = 0;
  let left = 0;

  if (side === "top") {
    top = rect.top + window.scrollY - th - gap;
  } else if (side === "bottom") {
    top = rect.bottom + window.scrollY + gap;
  } else if (side === "left") {
    top = rect.top + window.scrollY + rect.height / 2 - th / 2;
    left = rect.left + window.scrollX - tw - gap;
    return { top, left };
  } else {
    top = rect.top + window.scrollY + rect.height / 2 - th / 2;
    left = rect.right + window.scrollX + gap;
    return { top, left };
  }

  if (align === "start") {
    left = rect.left + window.scrollX;
  } else if (align === "end") {
    left = rect.right + window.scrollX - tw;
  } else {
    left = rect.left + window.scrollX + rect.width / 2 - tw / 2;
  }

  return { top, left };
}

export function Tooltip({
  content,
  side = "top",
  align = "center",
  delay = 200,
  children,
}: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const [pos, setPos] = React.useState<Position>({ top: 0, left: 0 });
  const [mounted, setMounted] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => { setMounted(true); }, []);

  const show = React.useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  // Recalculate position when tooltip becomes visible
  React.useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos(getPosition(rect, tooltipRef.current, side, align));
  }, [visible, side, align]);

  type ChildEl = React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }>;
  const typedChild = children as ChildEl;
  const child = React.cloneElement(typedChild, {
    ref: triggerRef as React.Ref<HTMLElement>,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      typedChild.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      typedChild.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      typedChild.props.onFocus?.(e);
      show();
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      typedChild.props.onBlur?.(e);
      hide();
    },
  });

  return (
    <>
      {child}
      {mounted && visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
            className={cn(
              "bg-toss-bg-base shadow-toss-md border border-toss-border rounded-toss-sm",
              "px-3 py-2 text-toss-caption text-toss-text-primary",
              "pointer-events-none select-none"
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
