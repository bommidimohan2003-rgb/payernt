import { Link } from "@tanstack/react-router";
import { ArrowRight, Users, ShieldCheck, Wallet } from "lucide-react";

export function CreatorCommunity() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#1E1E1E] py-12 sm:py-16 text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#071017] shadow-2xl">
          {/* Background Cinematic Photo & Overlays */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=75"
              srcSet="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=480&q=70 480w, https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=75 800w, https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80 1200w"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
              alt="Creators community filming"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-right sm:object-center filter brightness-60 contrast-110"
            />
            {/* Dark gradient from left to allow readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#05090D] via-[#05090D]/90 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05090D] via-transparent to-transparent opacity-80" />
          </div>

          {/* Content Layout */}
          <div className="relative z-10 p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-white leading-tight">
                More Than Rentals. <br />
                <span className="text-white">A Community For Creators.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#A8B1BA] leading-relaxed max-w-lg">
                paYent is built for creators, by creators. Access high-quality gear,
                share resources, and be part of a growing creative community.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/browse"
                  className="bg-[#F2F0EA] hover:bg-white text-[#161616] px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Explore Gear</span>
                  <ArrowRight className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                </Link>

                <Link
                  to="/about"
                  className="px-5 py-3 rounded-xl border border-white/20 hover:border-white/40 bg-[#0D151D]/80 hover:bg-[#111B24] text-white text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Learn More</span>
                  <ArrowRight className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Middle Stats Badges */}
            <div className="lg:col-span-3 space-y-4 text-left border-l border-white/10 lg:pl-8">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <Wallet className="h-4 w-4 stroke-[1.75] text-white" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-white tabular-nums">₹50K+</div>
                  <div className="text-xs text-[#A8B1BA]">Earnings for top lenders</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 stroke-[1.75] text-white" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-white tabular-nums">2K+</div>
                  <div className="text-xs text-[#A8B1BA]">Active gear owners</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 stroke-[1.75] text-white" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-white tabular-nums">100%</div>
                  <div className="text-xs text-[#A8B1BA]">Secure payments</div>
                </div>
              </div>
            </div>

            {/* Right Side Clean Modern Accent Badge */}
            <div className="hidden lg:flex lg:col-span-2 items-center justify-end select-none pointer-events-none">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-right space-y-1">
                <div className="text-xs font-medium text-neutral-300">Verified Network</div>
                <div className="text-base font-semibold text-white leading-tight">
                  Rent & Create With Confidence
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
