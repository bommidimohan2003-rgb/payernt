import React from "react";
import { Search, CalendarCheck, ShieldCheck } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      num: "01",
      name: "Discover",
      caption: "Create an account and choose verified gear near you",
      icon: Search,
    },
    {
      num: "02",
      name: "Book",
      caption: "Select rental dates and complete escrow-protected payment",
      icon: CalendarCheck,
    },
    {
      num: "03",
      name: "Enjoy and return",
      caption: "Receive your equipment, use it, and return on schedule",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="w-full py-2.5 sm:py-3.5 bg-white dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-2 sm:mb-2.5">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
            How paYent Works
          </h2>
          <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400">
            Three verified steps with escrow protection and doorstep delivery
          </p>
        </div>

        {/* Desktop: Compact horizontal 3-step row */}
        <div className="hidden md:grid md:grid-cols-3 gap-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 px-3 py-2 text-left"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-900 bg-white text-neutral-950 dark:border-white dark:bg-[#1E1E1E] dark:text-white shadow-xs">
                  <Icon className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 tabular-nums shrink-0">
                      Step {s.num}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                    <h3 className="text-xs sm:text-sm font-semibold text-neutral-950 dark:text-white truncate">
                      {s.name}
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 leading-tight">
                    {s.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: Compact vertical 3-step rows */}
        <div className="flex md:hidden flex-col gap-1.5">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 px-2.5 py-1.5"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-900 bg-white text-neutral-950 dark:border-white dark:bg-[#1E1E1E] dark:text-white shadow-xs">
                  <Icon className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 tabular-nums shrink-0">
                      Step {s.num}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                    <h3 className="text-xs font-semibold text-neutral-950 dark:text-white">
                      {s.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-tight">
                    {s.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
