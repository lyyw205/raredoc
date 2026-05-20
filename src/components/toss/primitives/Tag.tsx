import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center justify-center font-bold rounded-toss-xs px-1.5 h-5 text-[11px] leading-none",
  {
    variants: {
      color: {
        brand:    "",
        positive: "",
        negative: "",
        warning:  "",
        success:  "",
        neutral:  "",
      },
      shape: {
        solid: "",
        soft:  "",
      },
    },
    compoundVariants: [
      // solid — colored fill + white text
      { color: "brand",    shape: "solid", className: "bg-toss-brand    text-white" },
      { color: "positive", shape: "solid", className: "bg-toss-positive text-white" },
      { color: "negative", shape: "solid", className: "bg-toss-negative text-white" },
      { color: "warning",  shape: "solid", className: "bg-toss-warning  text-white" },
      { color: "success",  shape: "solid", className: "bg-toss-success  text-white" },
      { color: "neutral",  shape: "solid", className: "bg-toss-text-tertiary text-white" },
      // soft — weak fill + semantic text
      { color: "brand",    shape: "soft", className: "bg-toss-brand-weak    text-toss-brand" },
      { color: "positive", shape: "soft", className: "bg-toss-positive-weak text-toss-positive" },
      { color: "negative", shape: "soft", className: "bg-toss-negative-weak text-toss-negative" },
      { color: "warning",  shape: "soft", className: "bg-toss-warning-weak  text-toss-warning" },
      { color: "success",  shape: "soft", className: "bg-toss-success-weak  text-toss-success" },
      { color: "neutral",  shape: "soft", className: "bg-toss-input-bg      text-toss-text-secondary" },
    ],
    defaultVariants: {
      color: "neutral",
      shape: "soft",
    },
  }
);

export interface TagProps extends Omit<React.ComponentProps<"span">, "color"> {
  color?: "brand" | "positive" | "negative" | "warning" | "success" | "neutral";
  shape?: "solid" | "soft";
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, color, shape, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(tagVariants({ color, shape, className }))}
      {...props}
    />
  )
);
Tag.displayName = "Tag";

export { Tag, tagVariants };
