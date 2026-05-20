"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const sizeMap = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-[72px] h-[72px] text-xl",
} as const;

const statusMap = {
  online: "bg-green-500",
  offline: "bg-toss-text-quaternary",
  busy: "bg-toss-positive",
  none: "",
} as const;

const fallbackColors = [
  "bg-toss-brand-weak text-toss-brand",
  "bg-toss-positive-weak text-toss-positive",
  "bg-toss-negative-weak text-toss-negative",
  "bg-yellow-100 text-yellow-700",
  "bg-emerald-100 text-emerald-700",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // Korean: single char
  if (/[ㄱ-힝]/.test(trimmed[0])) return trimmed[0];
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: keyof typeof sizeMap;
  shape?: "circle" | "rounded";
  status?: keyof typeof statusMap;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name = "",
      size = "md",
      shape = "circle",
      status = "none",
      className,
      ...props
    },
    ref
  ) => {
    const [imgError, setImgError] = React.useState(false);

    const initials = getInitials(name);
    const colorClass = fallbackColors[hashName(name) % fallbackColors.length];
    const shapeClass = shape === "circle" ? "rounded-full" : "rounded-toss-md";

    return (
      <div
        ref={ref}
        className={cn("relative inline-flex shrink-0", className)}
        {...props}
      >
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden font-semibold",
            sizeMap[size],
            shapeClass,
            (!src || imgError) && colorClass
          )}
        >
          {src && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span aria-label={name}>{initials}</span>
          )}
        </div>
        {status !== "none" && (
          <span
            className={cn(
              "absolute bottom-0 right-0 block rounded-full ring-2 ring-white",
              size === "xs" || size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5",
              statusMap[status]
            )}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
