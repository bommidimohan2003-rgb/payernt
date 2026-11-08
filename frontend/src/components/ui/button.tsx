import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:order-first select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 sm:h-8.5 px-3.5 py-1.5 text-xs sm:text-sm",
        sm: "h-7.5 px-2.5 text-xs rounded-md",
        lg: "h-9.5 sm:h-10 px-5 text-xs sm:text-sm rounded-md",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type DualFillStatus = "idle" | "processing" | "success" | "error";

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Primary symbol/icon displayed first before button name */
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  animationStatus?: DualFillStatus;
  isSuccess?: boolean;
  isError?: boolean;
  successDuration?: number;
  disableDualFill?: boolean;
  successText?: React.ReactNode;
  errorText?: React.ReactNode;
  onAnimationComplete?: (status: "success" | "error") => void;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      icon,
      leftIcon,
      animationStatus: _animationStatus,
      isSuccess,
      isError,
      successDuration: _successDuration,
      disableDualFill: _disableDualFill,
      successText,
      errorText,
      onAnimationComplete: _onAnimationComplete,
      children,
      disabled,
      onClick,
      ...props
    },
    ref,
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    const displayText =
      isSuccess && successText
        ? successText
        : isError && errorText
        ? errorText
        : children;

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-busy={loading}
        {...props}
      >
        <span className="relative flex items-center justify-center gap-1.5 text-inherit transition-colors duration-150 [&_svg]:order-first">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            icon || leftIcon || null
          )}
          <span className="inline-flex items-center gap-1.5 [&_svg]:order-first">
            {displayText}
          </span>
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
