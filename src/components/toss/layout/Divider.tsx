import * as React from "react";
import { cn } from "@/lib/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  thickness?: 1 | 2;
  spacing?: number;
}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  (
    {
      className,
      orientation = "horizontal",
      thickness = 1,
      spacing,
      style,
      ...props
    },
    ref
  ) => {
    const marginStyle: React.CSSProperties = spacing
      ? orientation === "horizontal"
        ? { marginTop: spacing, marginBottom: spacing, ...style }
        : { marginLeft: spacing, marginRight: spacing, ...style }
      : style ?? {};

    return (
      <hr
        ref={ref}
        aria-orientation={orientation}
        className={cn(
          "border-0 bg-toss-divider shrink-0",
          orientation === "horizontal"
            ? cn("w-full", thickness === 1 ? "h-px" : "h-0.5")
            : cn("h-full", thickness === 1 ? "w-px" : "w-0.5"),
          className
        )}
        style={marginStyle}
        {...props}
      />
    );
  }
);
Divider.displayName = "Divider";

export { Divider };
