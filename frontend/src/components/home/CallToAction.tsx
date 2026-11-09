import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Crown, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function CallToAction() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="cta"
      ref={ref}
      className="relative py-24 px-4 sm:px-6 overflow-hidden bg-white dark:bg-[#1E1E1E] text-foreground dark:text-white"
    >
      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center overflow-hidden border border-border bg-card shadow-sm space-y-5 sm:space-y-6"
        >
          {/* Headline */}
          <h2 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground font-display leading-tight max-w-3xl mx-auto">
            Experience Unrivaled Tech Access Without Compromise
          </h2>

          {/* Subtitle */}
          <p className="text-muted-foreground text-xs sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
            Reserve certified cinema gear, drones, and workstation laptops, or monetize your idle hardware on paYent.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
            <Link
              to="/categories"
              className="w-full sm:w-auto justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-sm flex items-center gap-2 bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              <span>Reserve Flagship Kit</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              to="/browse"
              className="w-full sm:w-auto justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-sm border border-border bg-secondary/80 hover:bg-secondary text-foreground transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Explore All Gear</span>
            </Link>
          </div>

          {/* Security Banner */}
          <div className="pt-5 sm:pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-6 text-xs text-muted-foreground font-medium">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-foreground/80" aria-hidden="true" />{" "}
              Razorpay Escrow Protection
            </span>
            <span className="inline-flex items-center gap-1.5 text-center">
              <Crown className="h-4 w-4 text-foreground/80 shrink-0" aria-hidden="true" />{" "}
              ₹5L Insurance Backed (Terms &amp; Conditions Apply)
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
