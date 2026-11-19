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
  const iconSvg = (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 select-none drop-shadow-xs"
      aria-hidden="true"
    >
      <rect width="512" height="512" rx="112" fill="#000000" />
      <text
        x="252"
        y="332"
        fontFamily="'Arial Black', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="290"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
      >
        p
      </text>
    </svg>
  );

  if (iconOnly) {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        {iconSvg}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 select-none group", className)}>
      {iconSvg}
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
