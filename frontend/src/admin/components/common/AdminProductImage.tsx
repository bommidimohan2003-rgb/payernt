import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

export function AdminProductImage({
  src,
  alt,
  className = "w-10 h-10 rounded-lg",
  iconClassName = "h-4 w-4",
}: AdminProductImageProps) {
  const [error, setError] = useState(false);

  const isInvalid = !src || src.trim() === "" || src === "null" || src === "undefined" || error;

  if (isInvalid) {
    return (
      <div
        className={cn(
          "bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-muted)] select-none shrink-0",
          className
        )}
        title="Image unavailable"
      >
        <Package className={cn("opacity-50", iconClassName)} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={cn("object-cover border border-[var(--admin-border)] bg-[var(--admin-elevated)] shrink-0", className)}
      loading="lazy"
      decoding="async"
    />
  );
}
