import * as React from "react";
import { cn } from "@/lib/utils";

const colorMap = {
  brand: "text-toss-brand",
  text: "text-toss-text-primary",
  white: "text-white",
  inherit: "",
} as const;

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  color?: keyof typeof colorMap;
  thickness?: number;
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ size = 16, color = "brand", thickness = 2, className, ...props }, ref) => {
    const r = (size - thickness) / 2;
    const circumference = 2 * Math.PI * r;

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        className={cn("animate-spin", colorMap[color], className)}
        aria-hidden="true"
        {...props}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={thickness}
          strokeOpacity={0.2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.75}
          strokeLinecap="round"
        />
      </svg>
    );
  }
);
Spinner.displayName = "Spinner";

export { Spinner };
