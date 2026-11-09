import React from "react";
import { Inbox, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  iconClassName?: string;
}

export function EmptyState({
  title = "No items found",
  description = "There are no records available to show right now.",
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 backdrop-blur-sm transition-all",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center h-14 w-14 rounded-2xl bg-secondary/80 text-muted-foreground mb-4 shadow-sm",
          iconClassName,
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base md:text-lg font-bold text-foreground mb-1 tracking-tight">
        {title}
      </h3>
      <p className="text-xs md:text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs md:text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
