import { cn } from "@/lib/utils";
import { BRAND_CONFIG } from "@/config/branding";

interface LogoIconProps {
  className?: string;
  variant?: "light" | "dark";
  showDetails?: boolean;
  showTagline?: boolean;
  iconOnly?: boolean;
}

export function LogoIcon({
  className,
  showDetails = true,
  showTagline = false,
  iconOnly = false,
}: LogoIconProps) {
  if (iconOnly) {
    return (
      <span className={cn("font-sans font-semibold text-xl text-neutral-950 dark:text-white select-none", className)}>
        {BRAND_CONFIG.name}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 select-none group", className)}>
      {showDetails && (
        <div className="flex flex-col text-left justify-center">
          <span className="font-sans font-semibold text-xl text-neutral-950 dark:text-white leading-none">
            {BRAND_CONFIG.name}
          </span>
          {showTagline && (
            <span className="text-xs font-sans font-medium text-neutral-600 dark:text-neutral-400 mt-1 leading-none">
              {BRAND_CONFIG.shortTagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

