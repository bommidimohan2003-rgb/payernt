import { Loader2 } from "lucide-react";

interface LoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
}

export function Loader({
  message = "Loading",
  size = "md",
  fullPage = false,
}: LoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <Loader2 className={`animate-spin text-[var(--admin-text)] ${sizeClasses[size]}`} strokeWidth={1.5} />
      {message && (
        <p className="text-xs font-medium text-[var(--admin-text-secondary)]">
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--admin-bg)]/90">
        {content}
      </div>
    );
  }

  return content;
}
