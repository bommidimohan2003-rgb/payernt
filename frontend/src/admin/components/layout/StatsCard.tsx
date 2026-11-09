import { LucideIcon, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
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
      <div className={cn("p-5 rounded-2xl bg-card border border-border/80 shadow-xs", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 bg-muted rounded"></div>
          <div className="h-8 w-8 bg-muted rounded-xl"></div>
        </div>
        <div className="h-7 w-32 bg-muted rounded mb-2"></div>
        <div className="h-3 w-20 bg-muted rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-5 rounded-2xl bg-card border border-destructive/30 shadow-xs flex flex-col justify-between", className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div className="my-2">
          <p className="text-xs font-medium text-destructive">Unable to load metric</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer pt-1"
          >
            <RefreshCw className="h-3 w-3" /> Retry
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
        "p-5 rounded-2xl bg-card border border-border/80 hover:border-border transition-colors shadow-xs flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-foreground border border-border/60 shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="my-1">
        <div className="text-2xl font-black tracking-tight text-foreground font-mono">{value}</div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[11px]">
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 font-semibold",
              trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : trend === "down"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            <span>{change}</span>
          </div>
        )}
        {subtext && <span className="text-muted-foreground truncate">{subtext}</span>}
      </div>
    </div>
  );
}
