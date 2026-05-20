"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const textFieldWrapperVariants = cva(
  "relative flex items-center bg-toss-input-bg rounded-toss-md transition-shadow",
  {
    variants: {
      size: {
        sm: "h-8",
        md: "h-10",
        lg: "h-12",
      },
      error: {
        true: "ring-1 ring-inset ring-toss-positive",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      error: false,
    },
  }
);

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof textFieldWrapperVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      className,
      size,
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      clearable,
      onClear,
      value,
      defaultValue,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      defaultValue ?? ""
    );
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const hasValue = String(currentValue ?? "").length > 0;
    const hasError = !!errorText;
    const inputId = id ?? React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      if (!isControlled) setInternalValue("");
      onClear?.();
      if (onChange) {
        const nativeInput = (ref as React.RefObject<HTMLInputElement>)?.current;
        if (nativeInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          nativeInputValueSetter?.call(nativeInput, "");
          nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    };

    const showClear = clearable && hasValue;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-toss-caption font-medium text-toss-text-secondary"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            textFieldWrapperVariants({ size, error: hasError }),
            "focus-within:ring-2 focus-within:ring-inset focus-within:ring-toss-brand/40",
            hasError && "focus-within:ring-toss-positive"
          )}
        >
          {leftIcon && (
            <span className="pl-3 flex items-center shrink-0">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            value={isControlled ? value : internalValue}
            onChange={handleChange}
            className={cn(
              "flex-1 min-w-0 bg-transparent text-toss-label text-toss-text-primary outline-none placeholder:text-toss-text-quaternary",
              leftIcon ? "pl-2" : "pl-3",
              showClear || rightIcon ? "pr-2" : "pr-3",
              className
            )}
            {...props}
          />
          {showClear && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                handleClear();
              }}
              className="pr-3 flex items-center shrink-0 text-toss-icon hover:opacity-70"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!showClear && rightIcon && (
            <span className="pr-3 flex items-center shrink-0">{rightIcon}</span>
          )}
        </div>
        {(errorText || helperText) && (
          <p
            className={cn(
              "text-toss-caption",
              hasError ? "text-toss-positive" : "text-toss-text-tertiary"
            )}
          >
            {hasError ? errorText : helperText}
          </p>
        )}
      </div>
    );
  }
);
TextField.displayName = "TextField";

export { TextField };
