import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface AuthGearShowcaseProps {
  title?: string;
  subtitle?: string;
  className?: string;
  badgeLabel?: string;
}

export function AuthGearShowcase({
  title = "Welcome to Payent",
  subtitle = "Find what you need and rent it with ease.",
  className,
  badgeLabel = "Payent",
}: AuthGearShowcaseProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-xl mx-auto flex flex-col justify-start text-left select-none overflow-visible pt-0 pb-2",
        className,
      )}
    >
      {/* Main Branding Section: Floating Camera at top + [p] Payent Badge + Headline + Subtitle */}
      <div className="relative pt-0 pb-1 z-10">
        {/* Smooth Hand-drawn Camera Sketch positioned directly above the branding */}
        <div className="w-24 sm:w-36 lg:w-44 ml-6 sm:ml-16 lg:ml-20 mb-1 pointer-events-none select-none transition-transform duration-300 hover:scale-105">
          <img
            src="/illustrations/auth/camera-light.webp"
            srcSet="/illustrations/auth/camera-light.webp 1x, /illustrations/auth/camera-light@2x.webp 2x"
            alt="Hand-drawn Camera Rental Illustration"
            className="w-full h-auto object-contain dark:hidden"
            loading="eager"
            decoding="async"
          />
          <img
            src="/illustrations/auth/camera-dark.webp"
            srcSet="/illustrations/auth/camera-dark.webp 1x, /illustrations/auth/camera-dark@2x.webp 2x"
            alt="Hand-drawn Camera Rental Illustration"
            className="w-full h-auto object-contain hidden dark:block drop-shadow-[0_2px_14px_rgba(255,255,255,0.08)]"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Exact [p] Payent Badge: Black bg, white 'p', square with round corners */}
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 mb-2 group cursor-pointer focus:outline-none w-fit"
          aria-label="Payent Brand"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[10px] bg-black text-white shadow-sm ring-1 ring-black/10 dark:ring-white/20 transition-transform group-hover:scale-105 shrink-0">
            <span className="font-display font-black text-xl sm:text-2xl leading-none select-none lowercase">
              p
            </span>
          </div>
          <span className="font-display font-black tracking-tight text-2xl sm:text-3xl text-foreground leading-none">
            {badgeLabel}
          </span>
        </Link>

        {/* Headline */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl lg:text-[44px] font-black text-foreground tracking-tight font-display leading-[1.12]">
            {title}
          </h1>
          <p className="text-[12px] sm:text-[13px] text-neutral-500 dark:text-neutral-400 font-normal leading-normal max-w-md pt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Bottom Gear Section: Smooth Laptop at bottom-left, Smooth Tripod at bottom-right */}
      <div className="relative flex items-end justify-between gap-3 sm:gap-4 pt-3 sm:pt-6 z-10">
        {/* Laptop Illustration */}
        <div className="w-32 sm:w-48 lg:w-56 pointer-events-none select-none -ml-1 sm:-ml-3 transition-transform duration-300 hover:scale-105 shrink-0">
          <img
            src="/illustrations/auth/laptop-light.webp"
            srcSet="/illustrations/auth/laptop-light.webp 1x, /illustrations/auth/laptop-light@2x.webp 2x"
            alt="Hand-drawn Laptop Rental Illustration"
            className="w-full h-auto object-contain dark:hidden"
            loading="eager"
            decoding="async"
          />
          <img
            src="/illustrations/auth/laptop-dark.webp"
            srcSet="/illustrations/auth/laptop-dark.webp 1x, /illustrations/auth/laptop-dark@2x.webp 2x"
            alt="Hand-drawn Laptop Rental Illustration"
            className="w-full h-auto object-contain hidden dark:block drop-shadow-[0_2px_14px_rgba(255,255,255,0.08)]"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Tripod Illustration */}
        <div className="w-24 sm:w-34 lg:w-40 pointer-events-none select-none -mr-1 sm:mr-0 transition-transform duration-300 hover:scale-105 shrink-0">
          <img
            src="/illustrations/auth/tripod-light.webp"
            srcSet="/illustrations/auth/tripod-light.webp 1x, /illustrations/auth/tripod-light@2x.webp 2x"
            alt="Hand-drawn Tripod Rental Illustration"
            className="w-full h-auto object-contain dark:hidden"
            loading="eager"
            decoding="async"
          />
          <img
            src="/illustrations/auth/tripod-dark.webp"
            srcSet="/illustrations/auth/tripod-dark.webp 1x, /illustrations/auth/tripod-dark@2x.webp 2x"
            alt="Hand-drawn Tripod Rental Illustration"
            className="w-full h-auto object-contain hidden dark:block drop-shadow-[0_2px_14px_rgba(255,255,255,0.08)]"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
