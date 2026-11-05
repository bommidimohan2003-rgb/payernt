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
  fallback = "/",
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
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: fallback as any });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 shadow-xs hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95 shrink-0 select-none",
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
