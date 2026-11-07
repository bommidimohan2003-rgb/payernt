import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  useState,
  useRef,
  useEffect,
} from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type DualFillStatus = "idle" | "processing" | "success" | "error";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  /** Primary symbol/icon displayed first before button name */
  icon?: ReactNode;
  rightIcon?: ReactNode;
  /** Force a specific animation status */
  animationStatus?: DualFillStatus;
  /** Flag to indicate operation completed successfully */
  isSuccess?: boolean;
  /** Flag to indicate operation failed */
  isError?: boolean;
  /** Duration in ms to hold success/error state before resetting (default: 2000) */
  successDuration?: number;
  /** Disable the dual-side fill animation if needed */
  disableDualFill?: boolean;
  /** Custom text to display during success state */
  successText?: ReactNode;
  /** Custom text to display during error state */
  errorText?: ReactNode;
  /** Callback fired when the 2s completion animation finishes */
  onAnimationComplete?: (status: "success" | "error") => void;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#161616] text-[#FFFFFF] hover:bg-[#292929] active:bg-[#0B0B0B] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] dark:hover:bg-[#FFFDF7] dark:active:bg-[#DDD9D0] border border-transparent shadow-sm",
  secondary:
    "bg-[#FFFFFF] text-[#171717] border border-[#D6D6D6] hover:bg-[#F3F3F3] active:bg-[#EAEAEA] dark:bg-transparent dark:text-[#E8E4DA] dark:border-[rgba(242,240,234,0.35)] dark:hover:bg-[rgba(242,240,234,0.10)] dark:active:bg-[rgba(242,240,234,0.16)]",
  ghost:
    "bg-transparent text-[#333333] hover:bg-[#F4F4F4] active:bg-[#EAEAEA] dark:bg-transparent dark:text-[#CFC9BD] dark:hover:bg-[rgba(242,240,234,0.07)] dark:hover:text-[#F2F0EA] dark:active:bg-[rgba(242,240,234,0.12)]",
  outline:
    "bg-transparent text-[#171717] border border-[#D6D6D6] hover:bg-[#F3F3F3] active:bg-[#EAEAEA] dark:bg-transparent dark:text-[#DDD8CD] dark:border-[#6F6A60] dark:hover:bg-[#F0ECE3] dark:hover:text-[#111111] dark:active:bg-[#DDD9D0]",
  destructive:
    "bg-[#FF1744] text-[#FFFFFF] hover:bg-[#D50000] active:bg-[#B71C1C] border border-transparent shadow-sm",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-9 sm:h-9.5 px-3.5 text-xs sm:text-sm rounded-xl",
  lg: "h-10 sm:h-11 px-5 text-xs sm:text-sm rounded-xl",
  icon: "h-8 w-8 rounded-full grid place-items-center p-0",
};

/**
 * Universal Button with Global Dual-Side Fill Animation
 *
 * Click behavior:
 * - Left & Right panels simultaneously advance towards the center
 * - Processing: #8FAF7E (Sage Green)
 * - Success: Complete #8FAF7E fill + Checkmark icon for 2000ms
 * - Failure: Complete #FF7F7F fill + Alert icon for 2000ms
 * - Automatically awaits async `onClick` promises and reacts to `loading`/`isSuccess`/`isError`
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      icon,
      rightIcon,
      children,
      disabled,
      onClick,
      animationStatus: controlledStatus,
      isSuccess,
      isError,
      successDuration = 2000,
      disableDualFill = false,
      successText,
      errorText,
      onAnimationComplete,
      ...rest
    },
    ref,
  ) {
    const [internalStatus, setInternalStatus] = useState<DualFillStatus>("idle");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const loadingStartTimeRef = useRef<number>(0);

    // Active status is either controlled or internal
    const status = controlledStatus || internalStatus;

    // React to loading state transitions
    const prevLoadingRef = useRef(loading);
    useEffect(() => {
      if (disableDualFill) return;

      if (prevLoadingRef.current !== loading) {
        if (loading) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          loadingStartTimeRef.current = Date.now();
          setInternalStatus("processing");
        } else if (prevLoadingRef.current && !loading) {
          if (isError) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setInternalStatus("error");
            timeoutRef.current = setTimeout(() => {
              setInternalStatus("idle");
              onAnimationComplete?.("error");
            }, 2000 + successDuration);
          } else {
            const elapsed = Date.now() - loadingStartTimeRef.current;
            const remainingTo2s = Math.max(0, 2000 - elapsed);

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              setInternalStatus("success");
              timeoutRef.current = setTimeout(() => {
                setInternalStatus("idle");
                onAnimationComplete?.("success");
              }, successDuration);
            }, remainingTo2s);
          }
        }
        prevLoadingRef.current = loading;
      }
    }, [loading, isError, successDuration, disableDualFill, onAnimationComplete]);

    // React to explicit isSuccess / isError flags
    useEffect(() => {
      if (disableDualFill) return;

      if (isSuccess && status !== "success") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setInternalStatus("success");
        timeoutRef.current = setTimeout(() => {
          setInternalStatus("idle");
          onAnimationComplete?.("success");
        }, 2000 + successDuration);
      } else if (isError && status !== "error") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setInternalStatus("error");
        timeoutRef.current = setTimeout(() => {
          setInternalStatus("idle");
          onAnimationComplete?.("error");
        }, 2000 + successDuration);
      }
    }, [isSuccess, isError, status, successDuration, disableDualFill, onAnimationComplete]);

    // Clean up timeout
    useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent duplicate clicks while processing or loading
      if (status === "processing" || loading) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (disableDualFill) {
        onClick?.(e);
        return;
      }

      if (onClick) {
        try {
          const result = onClick(e);
          // If onClick returns a Promise (async action)
          if (result && typeof (result as any).then === "function") {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setInternalStatus("processing");
            const startTime = Date.now();
            try {
              const res = await result;
              const elapsed = Date.now() - startTime;
              const remainingTo2s = Math.max(0, 2000 - elapsed);
              if (remainingTo2s > 0) {
                await new Promise((resolve) => setTimeout(resolve, remainingTo2s));
              }
              setInternalStatus("success");
              timeoutRef.current = setTimeout(() => {
                setInternalStatus("idle");
                onAnimationComplete?.("success");
              }, successDuration);
              return res;
            } catch (asyncErr) {
              setInternalStatus("error");
              timeoutRef.current = setTimeout(() => {
                setInternalStatus("idle");
                onAnimationComplete?.("error");
              }, 2000 + successDuration);
            }
          }
        } catch (syncErr) {
          setInternalStatus("error");
          timeoutRef.current = setTimeout(() => {
            setInternalStatus("idle");
            onAnimationComplete?.("error");
          }, 2000 + successDuration);
        }
      }
    };

    const isProcessing = status === "processing" || loading;
    const isSuccessState = status === "success";
    const isErrorState = status === "error";
    const isAnimated = isProcessing || isSuccessState || isErrorState;

    return (
      <button
        ref={ref}
        disabled={disabled || isProcessing}
        onClick={handleClick}
        data-react-managed-button="true"
        data-dual-state={status}
        aria-busy={isProcessing}
        className={cn(
          "relative overflow-hidden isolate inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 select-none [&_svg]:order-first",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
          // Apply custom text color when animated
          isSuccessState && "text-white font-bold",
          isErrorState && "text-white font-bold",
          variants[variant],
          sizes[size],
          className,
        )}
        {...rest}
      >
        {/* ========================================================================= */}
        {/* DUAL-SIDE FILL ANIMATION PANELS (LEFT & RIGHT MOVING TOWARDS CENTER)      */}
        {/* ========================================================================= */}
        {!disableDualFill && (
          <>
            {/* 1. LEFT PANEL - Starts from left edge (left: 0), fills towards center */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-0 will-change-[width,opacity] motion-reduce:transition-none",
                !isAnimated && "w-0 opacity-0",
                isProcessing && "w-1/2 opacity-100",
                isSuccessState && "w-1/2 opacity-100",
                isErrorState && "w-1/2 opacity-100",
              )}
              style={{
                backgroundColor: isErrorState ? "#FF7F7F" : "#8FAF7E",
                transition: "width 2000ms cubic-bezier(0.22, 1, 0.36, 1), background-color 300ms ease, opacity 200ms ease",
              }}
            />

            {/* 2. RIGHT PANEL - Starts from right edge (right: 0), fills towards center */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 z-0 will-change-[width,opacity] motion-reduce:transition-none",
                !isAnimated && "w-0 opacity-0",
                isProcessing && "w-1/2 opacity-100",
                isSuccessState && "w-1/2 opacity-100",
                isErrorState && "w-1/2 opacity-100",
              )}
              style={{
                backgroundColor: isErrorState ? "#FF7F7F" : "#8FAF7E",
                transition: "width 2000ms cubic-bezier(0.22, 1, 0.36, 1), background-color 300ms ease, opacity 200ms ease",
              }}
            />

            {/* Subtle soft pulse shimmer while processing */}
            {isProcessing && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 bg-white/15 animate-pulse"
              />
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* BUTTON CONTENT LAYER (SYMBOL ALWAYS ON THE LEFT, BUTTON NAME ON THE RIGHT) */}
        {/* ========================================================================= */}
        <span className="relative z-10 flex items-center justify-center gap-1.5 text-inherit transition-colors duration-200 [&_svg]:order-first">
          {isSuccessState ? (
            <Check
              className="h-3.5 w-3.5 shrink-0 animate-in zoom-in-75 duration-200 text-white"
              strokeWidth={3}
            />
          ) : isErrorState ? (
            <AlertCircle
              className="h-3.5 w-3.5 shrink-0 animate-in zoom-in-75 duration-200 text-white"
              strokeWidth={2.5}
            />
          ) : isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-white" />
          ) : (
            icon || leftIcon || rightIcon
          )}

          <span className="inline-flex items-center gap-1.5 [&_svg]:order-first">
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
