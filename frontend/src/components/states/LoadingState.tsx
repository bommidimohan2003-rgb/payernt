import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  type?: "grid" | "list" | "table" | "details" | "stats" | "spinner";
  count?: number;
  message?: string;
  className?: string;
}

export function LoadingState({
  type = "grid",
  count = 6,
  message,
  className,
}: LoadingStateProps) {
  if (type === "spinner") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 gap-3",
          className,
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {message && (
          <p className="text-xs font-semibold text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (type === "stats") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
          className,
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-border/40 bg-card/40 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-muted/60 rounded" />
              <div className="h-8 w-8 bg-muted/60 rounded-xl" />
            </div>
            <div className="h-6 w-32 bg-muted/80 rounded" />
            <div className="h-2.5 w-16 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-border/40 bg-card/40 flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-xl bg-muted/70 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-muted/80 rounded" />
              <div className="h-3 w-1/2 bg-muted/50 rounded" />
            </div>
            <div className="h-8 w-20 bg-muted/60 rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/40 bg-card/40 overflow-hidden",
          className,
        )}
      >
        <div className="h-12 bg-muted/50 border-b border-border/40 px-6 flex items-center gap-6">
          <div className="h-4 w-28 bg-muted/80 rounded" />
          <div className="h-4 w-24 bg-muted/70 rounded" />
          <div className="h-4 w-20 bg-muted/60 rounded" />
          <div className="h-4 w-16 bg-muted/50 rounded ml-auto" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-border/30 px-6 flex items-center gap-6"
          >
            <div className="h-9 w-9 rounded-full bg-muted/70 shrink-0" />
            <div className="h-4 w-36 bg-muted/70 rounded" />
            <div className="h-4 w-24 bg-muted/50 rounded" />
            <div className="h-4 w-16 bg-muted/50 rounded ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "details") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 lg:grid-cols-12 gap-8",
          className,
        )}
      >
        <div className="lg:col-span-7 space-y-4">
          <div className="h-96 rounded-3xl bg-muted/70 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/50" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="h-8 w-3/4 bg-muted/80 rounded-lg" />
          <div className="h-6 w-1/4 bg-muted/60 rounded-md" />
          <div className="h-24 bg-muted/40 rounded-2xl p-4" />
          <div className="h-12 bg-muted/70 rounded-xl" />
        </div>
      </div>
    );
  }

  // Default: Grid of product/item cards
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden space-y-3 p-3"
        >
          <div className="h-44 rounded-xl bg-muted/70 w-full" />
          <div className="space-y-2 p-1">
            <div className="h-4 w-3/4 bg-muted/80 rounded" />
            <div className="h-3 w-1/2 bg-muted/50 rounded" />
          </div>
          <div className="pt-2 flex items-center justify-between p-1">
            <div className="h-5 w-20 bg-muted/70 rounded" />
            <div className="h-8 w-24 bg-muted/60 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
