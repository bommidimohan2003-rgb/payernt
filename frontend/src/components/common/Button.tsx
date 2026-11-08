import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
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
  /** Legacy animation props preserved for full API compatibility */
  animationStatus?: DualFillStatus;
  isSuccess?: boolean;
  isError?: boolean;
  successDuration?: number;
  disableDualFill?: boolean;
  successText?: ReactNode;
  errorText?: ReactNode;
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
 * Universal Button Component
 *
 * Fast, responsive, accessible button with instant interaction feedback:
 * - Immediate click handling without artificial delays or sliding overlays
 * - Preserved brand monochrome palette with crisp hover, active, and focus-visible states
 * - Symbol on the left, button label on the right
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
      animationStatus: _animationStatus,
      isSuccess,
      isError,
      successDuration: _successDuration,
      disableDualFill: _disableDualFill,
      successText,
      errorText,
      onAnimationComplete: _onAnimationComplete,
      ...rest
    },
    ref,
  ) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    const displayText =
      isSuccess && successText
        ? successText
        : isError && errorText
        ? errorText
        : children;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-busy={loading}
        className={cn(
          "relative inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 select-none [&_svg]:order-first",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
          variants[variant],
          sizes[size],
          className,
        )}
        {...rest}
      >
        <span className="relative flex items-center justify-center gap-1.5 text-inherit transition-colors duration-150 [&_svg]:order-first">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            icon || leftIcon || rightIcon || null
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
