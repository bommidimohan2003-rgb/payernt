import { LucideIcon, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  subtext?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onClick?: () => void;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  subtext,
  loading = false,
  error = false,
  onRetry,
  onClick,
  className,
}: StatsCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]",
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 bg-[var(--admin-elevated)] rounded" />
          <div className="h-4 w-4 bg-[var(--admin-elevated)] rounded" />
        </div>
        <div className="h-7 w-28 bg-[var(--admin-elevated)] rounded mb-3" />
        <div className="h-3 w-20 bg-[var(--admin-elevated)] rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "p-5 rounded-xl bg-[var(--admin-card)] border border-destructive/30 flex flex-col justify-between",
          className
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--admin-text-secondary)]">
            {title}
          </span>
          <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
        </div>
        <p className="text-xs text-destructive my-2">Unable to load metric</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--admin-text)] hover:underline cursor-pointer pt-1"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] transition-colors duration-150 flex flex-col justify-between",
        onClick && "hover:border-[var(--admin-text-muted)] cursor-pointer",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--admin-text-secondary)]">
          {title}
        </span>
        {Icon && (
          <Icon className="h-4 w-4 text-[var(--admin-text-muted)] shrink-0" strokeWidth={1.5} />
        )}
      </div>

      <div className="my-1">
        <div className="text-2xl font-medium tracking-tight text-[var(--admin-text)] tabular-nums">
          {value}
        </div>
      </div>

      {(change !== undefined || subtext) && (
        <div className="flex items-center justify-between gap-2 pt-3 mt-1 border-t border-[var(--admin-border)] text-xs">
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 font-medium tabular-nums",
                trend === "up"
                  ? "text-[var(--admin-success)]"
                  : trend === "down"
                  ? "text-[var(--admin-error)]"
                  : "text-[var(--admin-text-muted)]"
              )}
            >
              {trend === "up" && <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {trend === "down" && <TrendingDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
              <span>{change}</span>
            </div>
          )}
          {subtext && (
            <span className="text-[var(--admin-text-muted)] truncate">{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
}
