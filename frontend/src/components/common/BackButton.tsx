import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface BackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export function BackButton({
  fallback = "/payent",
  label = "Back",
  className,
  onClick,
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }
    const hasInternalHistory =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      (window.history.state?.idx > 0 ||
        (Boolean(document.referrer) && document.referrer.includes(window.location.host)));

    if (hasInternalHistory) {
      window.history.back();
    } else {
      navigate({ to: fallback as any });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      id="page-back-button"
      data-testid="back-button"
      className={cn(
        "group inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-white dark:bg-[#1E1E1E] border border-neutral-200/90 dark:border-white/10 shadow-xs hover:border-neutral-400 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95 shrink-0 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white",
        className
      )}
      aria-label="Go back to previous page"
    >
      <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:-translate-x-1 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white" />
      <span>{label}</span>
    </button>
  );
}

export default BackButton;
