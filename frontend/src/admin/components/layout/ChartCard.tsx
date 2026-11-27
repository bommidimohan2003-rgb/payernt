import React from "react";
import { Loader } from "./Loader";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  loading = false,
  action,
  children,
  className,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        "p-6 flex flex-col h-96 bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)] relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-[var(--admin-text)] flex items-center gap-2">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--admin-card)]/90 rounded-lg">
            <Loader message="Loading chart data" size="sm" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
