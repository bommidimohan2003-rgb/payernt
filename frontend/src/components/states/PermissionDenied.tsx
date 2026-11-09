import React from "react";
import { ShieldBan, ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface PermissionDeniedProps {
  title?: string;
  description?: string;
  requiredRole?: string;
  className?: string;
  onGoBack?: () => void;
}

export function PermissionDenied({
  title = "Access Restricted",
  description = "You do not have permission to view this section or perform this action. Administrator authorization is required.",
  requiredRole = "Administrator",
  className,
  onGoBack,
}: PermissionDeniedProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-16 text-center rounded-3xl border border-destructive/30 bg-card/60 backdrop-blur-md max-w-lg mx-auto my-8 shadow-xl",
        className,
      )}
    >
      <div className="relative mb-6">
        <div className="flex items-center justify-center h-20 w-20 rounded-3xl bg-destructive/10 text-destructive shadow-inner">
          <ShieldBan className="h-10 w-10" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border-2 border-border flex items-center justify-center text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
        </div>
      </div>

      <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-full bg-destructive/10 text-destructive border border-destructive/20 mb-3">
        Role Restriction
      </span>

      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 tracking-tight">
        {title}
      </h2>

      <p className="text-xs md:text-sm text-muted-foreground mb-6 leading-relaxed">
        {description}
      </p>

      <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/50 text-xs text-muted-foreground w-full mb-6 text-left space-y-1">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Access Requirement:</span>
        </div>
        <p className="pl-3.5">
          Must be logged in with a validated{" "}
          <strong className="text-foreground">{requiredRole}</strong> account.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs md:text-sm px-6 py-2.5 rounded-xl font-bold transition-all border border-border/50 w-full sm:w-auto active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Homepage</span>
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/login" })}
          className="bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs md:text-sm px-6 py-2.5 rounded-xl font-semibold transition-colors w-full sm:w-auto cursor-pointer"
        >
          Sign in with another account
        </button>
      </div>
    </div>
  );
}
