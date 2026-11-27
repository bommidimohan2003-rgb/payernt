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
  description = "No records match the current view",
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-elevated)]/30",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] mb-4",
          iconClassName
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[var(--admin-text-secondary)] max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 bg-[var(--admin-text)] text-[var(--admin-bg)] hover:opacity-90 text-xs px-4 h-9 rounded-lg font-medium transition-opacity cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
