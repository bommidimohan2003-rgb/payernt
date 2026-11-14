import React, { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionBoxProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** The text or element positioned directly on the top border with a cut-out */
  title?: ReactNode;
  /** Optional icon rendered immediately before the title */
  icon?: ReactNode;
  /** Optional badge rendered immediately after the title */
  badge?: ReactNode;
  /** Optional action button or link positioned on the top-right border */
  action?: ReactNode;
  /** Background color class for the cutout masking behind the title/action. Defaults to 'bg-card dark:bg-[#1E1E1E]' */
  cutoutBgClass?: string;
  /** Additional styling for the title text element */
  titleClassName?: string;
  /** Border & corner styling preset */
  variant?: "default" | "subtle" | "elevated" | "destructive" | "transparent";
}

/**
 * SectionBox implements the Payent reference box design:
 * - Rounded rectangular outline (`rounded-2xl`)
 * - Section heading positioned directly on the top border
 * - Small background border interruption behind the heading text
 * - No separate rectangular colored container box behind the heading
 * - Supports both Light Mode and Dark Mode (#1E1E1E)
 */
export const SectionBox = forwardRef<HTMLDivElement, SectionBoxProps>(
  (
    {
      title,
      icon,
      badge,
      action,
      cutoutBgClass = "bg-card dark:bg-[#1E1E1E]",
      titleClassName,
      variant = "default",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const variantStyles = {
      default: "border-border/80 dark:border-neutral-700/80 bg-card dark:bg-[#1E1E1E]",
      subtle: "border-border/60 dark:border-neutral-800 bg-card/60 dark:bg-[#1E1E1E]/60",
      elevated: "border-border/80 dark:border-neutral-700/80 bg-card dark:bg-[#1E1E1E] shadow-sm",
      destructive: "border-destructive/40 bg-destructive/5 dark:bg-destructive/10",
      transparent: "border-border/80 dark:border-neutral-700/80 bg-transparent",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "group relative rounded-2xl border transition-all text-left",
          variantStyles[variant],
          title ? "pt-5 sm:pt-6 p-4 sm:p-5" : "p-4 sm:p-5",
          className,
        )}
        {...props}
      >
        {title && (
          <div
            className={cn(
              "absolute -top-2.5 sm:-top-3 left-3.5 sm:left-4 px-2 flex items-center gap-1.5 z-10 pointer-events-none select-none",
              cutoutBgClass,
            )}
          >
            {icon && (
              <span className="shrink-0 text-muted-foreground flex items-center">
                {icon}
              </span>
            )}
            <span
              className={cn(
                "text-xs sm:text-[13px] font-bold tracking-tight text-foreground transition-colors",
                titleClassName,
              )}
            >
              {title}
            </span>
            {badge && (
              <span className="ml-1 inline-flex pointer-events-auto">
                {badge}
              </span>
            )}
          </div>
        )}

        {action && (
          <div
            className={cn(
              "absolute -top-2.5 sm:-top-3 right-3 sm:right-4 px-1.5 z-10 pointer-events-auto",
              cutoutBgClass,
            )}
          >
            {action}
          </div>
        )}

        {children}
      </div>
    );
  },
);

SectionBox.displayName = "SectionBox";
