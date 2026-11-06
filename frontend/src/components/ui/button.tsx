import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, AlertCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative overflow-hidden isolate inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
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
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
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
      animationStatus: controlledStatus,
      isSuccess,
      isError,
      successDuration = 2000,
      disableDualFill = false,
      successText,
      errorText,
      onAnimationComplete,
      children,
      disabled,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [internalStatus, setInternalStatus] = React.useState<DualFillStatus>("idle");
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const status = controlledStatus || internalStatus;

    // React to loading transitions
    const prevLoadingRef = React.useRef(loading);
    React.useEffect(() => {
      if (disableDualFill || asChild) return;

      if (prevLoadingRef.current !== loading) {
        if (loading) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setInternalStatus("processing");
        } else if (prevLoadingRef.current && !loading) {
          if (isError) {
            setInternalStatus("error");
            timeoutRef.current = setTimeout(() => {
              setInternalStatus("idle");
              onAnimationComplete?.("error");
            }, successDuration);
          } else {
            setInternalStatus("success");
            timeoutRef.current = setTimeout(() => {
              setInternalStatus("idle");
              onAnimationComplete?.("success");
            }, successDuration);
          }
        }
        prevLoadingRef.current = loading;
      }
    }, [loading, isError, successDuration, disableDualFill, asChild, onAnimationComplete]);

    // React to explicit isSuccess / isError flags
    React.useEffect(() => {
      if (disableDualFill || asChild) return;

      if (isSuccess && status !== "success") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setInternalStatus("success");
        timeoutRef.current = setTimeout(() => {
          setInternalStatus("idle");
          onAnimationComplete?.("success");
        }, successDuration);
      } else if (isError && status !== "error") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setInternalStatus("error");
        timeoutRef.current = setTimeout(() => {
          setInternalStatus("idle");
          onAnimationComplete?.("error");
        }, successDuration);
      }
    }, [isSuccess, isError, status, successDuration, disableDualFill, asChild, onAnimationComplete]);

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (status === "processing" || loading) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (disableDualFill || asChild) {
        onClick?.(e);
        return;
      }

      if (onClick) {
        try {
          const result = onClick(e);
          if (result && typeof (result as any).then === "function") {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setInternalStatus("processing");
            try {
              await result;
              setInternalStatus("success");
              timeoutRef.current = setTimeout(() => {
                setInternalStatus("idle");
                onAnimationComplete?.("success");
              }, successDuration);
            } catch (asyncErr) {
              setInternalStatus("error");
              timeoutRef.current = setTimeout(() => {
                setInternalStatus("idle");
                onAnimationComplete?.("error");
              }, successDuration);
              throw asyncErr;
            }
          }
        } catch (syncErr) {
          setInternalStatus("error");
          timeoutRef.current = setTimeout(() => {
            setInternalStatus("idle");
            onAnimationComplete?.("error");
          }, successDuration);
          throw syncErr;
        }
      }
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

    const isProcessing = status === "processing" || loading;
    const isSuccessState = status === "success";
    const isErrorState = status === "error";
    const isAnimated = isProcessing || isSuccessState || isErrorState;

    return (
      <button
        className={cn(
          buttonVariants({ variant, size, className }),
          isSuccessState && "text-white font-bold",
          isErrorState && "text-white font-bold",
        )}
        ref={ref}
        disabled={disabled || isProcessing}
        onClick={handleClick}
        data-react-managed-button="true"
        data-dual-state={status}
        aria-busy={isProcessing}
        {...props}
      >
        {!disableDualFill && (
          <>
            {/* 1. LEFT PANEL */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-0 transition-all duration-450 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                !isAnimated && "w-0 opacity-0",
                isProcessing && "w-1/2 opacity-100",
                isSuccessState && "w-1/2 opacity-100",
                isErrorState && "w-1/2 opacity-100",
              )}
              style={{
                backgroundColor: isErrorState ? "#FF7F7F" : "#8FAF7E",
              }}
            />

            {/* 2. RIGHT PANEL */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 z-0 transition-all duration-450 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                !isAnimated && "w-0 opacity-0",
                isProcessing && "w-1/2 opacity-100",
                isSuccessState && "w-1/2 opacity-100",
                isErrorState && "w-1/2 opacity-100",
              )}
              style={{
                backgroundColor: isErrorState ? "#FF7F7F" : "#8FAF7E",
              }}
            />

            {isProcessing && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 bg-white/15 animate-pulse"
              />
            )}
          </>
        )}

        <span className="relative z-10 flex items-center justify-center gap-2 text-inherit transition-colors duration-200">
          {isSuccessState ? (
            <Check
              className="h-4 w-4 shrink-0 animate-in zoom-in-75 duration-200 text-white"
              strokeWidth={3}
            />
          ) : isErrorState ? (
            <AlertCircle
              className="h-4 w-4 shrink-0 animate-in zoom-in-75 duration-200 text-white"
              strokeWidth={2.5}
            />
          ) : isProcessing ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" />
          ) : null}

          <span>
            {isSuccessState && successText
              ? successText
              : isErrorState && errorText
              ? errorText
              : children}
          </span>
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
