"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--toss-focus-ring)] disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-toss-brand text-white rounded-toss-pill hover:bg-toss-brand-hover active:bg-toss-brand-pressed",
        secondary:
          "bg-toss-input-bg text-toss-text-primary rounded-toss-md hover:bg-toss-hover active:bg-toss-pressed",
        ghost:
          "bg-transparent text-toss-text-primary rounded-toss-md hover:bg-toss-hover active:bg-toss-pressed",
        danger:
          "bg-toss-positive text-white rounded-toss-pill hover:opacity-90 active:opacity-80",
        outline:
          "bg-transparent border border-toss-border-strong text-toss-text-primary rounded-toss-pill hover:bg-toss-hover active:bg-toss-pressed",
      },
      size: {
        sm: "h-7 text-toss-caption px-2.5",
        md: "h-8 text-toss-label px-3",
        lg: "h-11 text-toss-label px-5",
        xl: "h-14 text-toss-title-2 px-6 rounded-toss-lg",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      asChild,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const classes = cn(buttonVariants({ variant, size, fullWidth, className }));

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
        {
          className: cn(
            classes,
            (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>)
              .props.className
          ),
          ...props,
        }
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            {children}
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
