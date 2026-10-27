import React, { useState, useEffect } from "react";
import { User, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProfilePhotoProps {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
  shape?: "circle" | "rounded" | "square";
  className?: string;
  imageClassName?: string;
  editable?: boolean;
  onEdit?: () => void;
  status?: "active" | "pending" | "verified" | null;
  statusTitle?: string;
  fallbackIcon?: React.ReactNode;
}

/**
 * Validates whether an image URL represents a genuine user-uploaded profile photo
 * rather than a generated avatar, initials graphic, or stock placeholder.
 */
export function isRealProfilePhoto(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  if (!clean) return false;

  // Filter out generated avatar services
  if (
    clean.includes("ui-avatars.com") ||
    clean.includes("dicebear") ||
    clean.includes("pravatar") ||
    clean.includes("robohash") ||
    clean.includes("api.multiavatar.com") ||
    clean.includes("avatar.iran.liara.run")
  ) {
    return false;
  }

  // Filter out stock placeholder photos previously used as fake avatars
  if (
    clean.includes("photo-1534528741775") ||
    clean.includes("photo-1535713875002")
  ) {
    return false;
  }

  // Valid if it's a data URI or valid HTTP/HTTPS URL
  return clean.startsWith("data:image/") || clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/");
}

const SIZE_MAP: Record<string, { container: string; icon: string }> = {
  xs: { container: "h-6 w-6 text-xs", icon: "h-3.5 w-3.5" },
  sm: { container: "h-8 w-8 text-sm", icon: "h-4 w-4" },
  md: { container: "h-10 w-10 text-base", icon: "h-5 w-5" },
  lg: { container: "h-12 w-12 text-lg", icon: "h-6 w-6" },
  xl: { container: "h-16 w-16 text-xl", icon: "h-8 w-8" },
  "2xl": { container: "h-28 w-28 sm:h-32 sm:w-32 text-2xl", icon: "h-12 w-12" },
};

const SHAPE_MAP = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
  square: "rounded-lg",
};

export function ProfilePhoto({
  src,
  alt = "User profile photo",
  size = "md",
  shape = "circle",
  className,
  imageClassName,
  editable = false,
  onEdit,
  status = null,
  statusTitle,
  fallbackIcon,
}: ProfilePhotoProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if the src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const hasPhoto = isRealProfilePhoto(src) && !imgError;
  const sizeConfig = typeof size === "string" ? SIZE_MAP[size] || SIZE_MAP.md : null;
  const shapeClass = SHAPE_MAP[shape] || SHAPE_MAP.circle;

  const customStyle: React.CSSProperties =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px` }
      : {};

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden border border-border/80 bg-secondary/80 text-muted-foreground transition-all",
        sizeConfig?.container,
        shapeClass,
        editable && "cursor-pointer group hover:ring-2 hover:ring-primary/40",
        className
      )}
      style={customStyle}
      onClick={editable && onEdit ? onEdit : undefined}
      role="img"
      aria-label={alt}
    >
      {hasPhoto ? (
        <img
          src={src!}
          alt={alt}
          onError={() => setImgError(true)}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300",
            editable && "group-hover:scale-105",
            imageClassName
          )}
          loading="lazy"
          decoding="async"
        />
      ) : (
        /* Neutral silhouette placeholder - NO initials, NO fake generated portraits */
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-secondary/90 text-muted-foreground",
            shapeClass
          )}
          title={alt}
        >
          {fallbackIcon || (
            <User
              className={cn(
                sizeConfig?.icon || "h-1/2 w-1/2",
                "text-muted-foreground/80 shrink-0"
              )}
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {/* Editable Hover Overlay */}
      {editable && (
        <div
          className={cn(
            "absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            shapeClass
          )}
          title="Change profile photo"
        >
          <Camera className="h-4 w-4 drop-shadow" />
        </div>
      )}

      {/* Status Dot */}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background shadow-xs",
            size === "xs" || size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5",
            status === "active" || status === "verified"
              ? "bg-emerald-500"
              : status === "pending"
              ? "bg-amber-500"
              : "bg-muted-foreground"
          )}
          title={statusTitle || (status === "active" ? "Active" : "Pending")}
        />
      )}
    </div>
  );
}

export default ProfilePhoto;
