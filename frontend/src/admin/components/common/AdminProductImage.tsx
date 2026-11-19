import { useState } from "react";
import { Package, ImageOff } from "lucide-react";
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

  // If no source is provided, or if image fails to load, render clean neutral placeholder
  const isInvalid = !src || src.trim() === "" || src === "null" || src === "undefined" || error;

  if (isInvalid) {
    return (
      <div
        className={cn(
          "bg-secondary/80 border border-border/80 flex flex-col items-center justify-center text-muted-foreground select-none shrink-0",
          className
        )}
        title="Image unavailable"
      >
        <Package className={cn("opacity-40", iconClassName)} />
        <span className="text-[8px] font-mono text-muted-foreground/60 mt-0.5 hidden group-hover:inline">N/A</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={cn("object-cover border border-border/60 bg-secondary/40 shrink-0", className)}
      loading="lazy"
      decoding="async"
    />
  );
}
