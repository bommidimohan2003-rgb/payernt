import React from "react";
import {
  BadgePercent,
  Layers,
  ShieldCheck,
  Truck,
  Receipt,
  CalendarCheck,
  UserCheck,
  Headphones,
} from "lucide-react";

export function WhyChoose() {
  const benefits = [
    {
      title: "Affordable Rentals",
      desc: "High-value gear at flexible daily & weekly rates",
      icon: BadgePercent,
    },
    {
      title: "Wide Equipment Range",
      desc: "Cameras, drones, laptops, bikes, audio & tools",
      icon: Layers,
    },
    {
      title: "Escrow-Protected Orders",
      desc: "Funds held safely until verified handover & return",
      icon: ShieldCheck,
    },
    {
      title: "Delivery or Pickup",
      desc: "Doorstep delivery or direct local owner handoff",
      icon: Truck,
    },
    {
      title: "Transparent Pricing",
      desc: "Clear daily rates & deposits with zero hidden fees",
      icon: Receipt,
    },
    {
      title: "Flexible Booking",
      desc: "Book single shoots, trips, or multi-week runs",
      icon: CalendarCheck,
    },
    {
      title: "Verified Owners & Renters",
      desc: "Identity-checked members on every rental",
      icon: UserCheck,
    },
    {
      title: "Dedicated Support",
      desc: "Responsive help for updates, extensions & returns",
      icon: Headphones,
    },
  ];

  return (
    <section className="w-full py-2.5 sm:py-3.5 bg-neutral-50/50 dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-2 sm:mb-2.5">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
            Why Choose paYent
          </h2>
          <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400">
            Cost-effective access to high-value equipment on demand
          </p>
        </div>

        {/* 4x2 compact grid on desktop/tablet, 2x4 compact grid on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="flex flex-col p-2 sm:p-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-xs"
              >
                <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                  <div className="h-6 w-6 shrink-0 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
                    <Icon className="h-3 w-3 stroke-[1.75]" aria-hidden="true" />
                  </div>
                  <h3 className="text-[11px] sm:text-xs font-semibold text-neutral-950 dark:text-white leading-tight">
                    {b.title}
                  </h3>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-tight">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default WhyChoose;
