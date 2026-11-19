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
      <path
        d="M173.70 361.71V154.12H227.65V176.43C 235.11 167.06 241.95 160.71 248.18 157.40 256.08 152.95 265.88 150.72 276.08 150.72 296.19 150.72 311.74 158.41 322.74 173.80 333.73 189.19 339.23 208.21 339.23 230.87 339.23 255.88 333.24 274.98 321.25 288.15 309.26 301.31 294.11 307.90 275.79 307.90 266.92 307.90 258.83 306.39 251.51 303.37 244.19 300.35 237.66 295.86 231.90 289.92V361.71H173.70M231.47 229.81C 231.47 241.68 233.98 250.48 238.98 256.23 243.98 261.98 250.31 264.85 257.95 264.85 264.66 264.85 270.27 262.10 274.80 256.59 279.33 251.07 281.60 241.72 281.60 228.53 281.60 216.38 279.24 207.45 274.52 201.75 269.80 196.05 264.04 193.20 257.25 193.20 249.88 193.20 243.75 196.07 238.84 201.82 233.93 207.57 231.47 216.90 231.47 229.81Z"
        fill="#FFFFFF"
      />
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
