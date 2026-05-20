import * as React from "react";
import { cn } from "@/lib/utils";

const roundedMap = {
  xs: "rounded-toss-xs",
  sm: "rounded-toss-sm",
  md: "rounded-toss-md",
  lg: "rounded-toss-lg",
  pill: "rounded-toss-pill",
  circle: "rounded-full",
} as const;

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: keyof typeof roundedMap;
}

const SkeletonBase = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, rounded = "sm", className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "animate-pulse bg-toss-bg-muted shrink-0",
        roundedMap[rounded],
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
);
SkeletonBase.displayName = "Skeleton";

const SkeletonText = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, "height">>(
  ({ width = "60%", className, ...props }, ref) => (
    <SkeletonBase
      ref={ref}
      height={16}
      width={width}
      rounded="sm"
      className={className}
      {...props}
    />
  )
);
SkeletonText.displayName = "Skeleton.Text";

const SkeletonAvatar = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, "width" | "height">>(
  ({ className, ...props }, ref) => (
    <SkeletonBase
      ref={ref}
      width={40}
      height={40}
      rounded="circle"
      className={className}
      {...props}
    />
  )
);
SkeletonAvatar.displayName = "Skeleton.Avatar";

const SkeletonCard = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, "width" | "height">>(
  ({ className, ...props }, ref) => (
    <SkeletonBase
      ref={ref}
      width="100%"
      height={120}
      rounded="lg"
      className={className}
      {...props}
    />
  )
);
SkeletonCard.displayName = "Skeleton.Card";

export const Skeleton = Object.assign(SkeletonBase, {
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
});
