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
      className="relative py-24 px-4 sm:px-6 overflow-hidden bg-white dark:bg-[#070A10] text-foreground dark:text-white border-t border-border dark:border-white/10"
    >
      {/* Background Ambient Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-primary/10 via-purple-500/10 to-amber-500/10 dark:from-primary/20 dark:via-purple-500/20 dark:to-amber-500/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center overflow-hidden border border-border dark:border-white/20 bg-card dark:bg-gradient-to-br dark:from-white/10 dark:via-white/5 dark:to-white/0 backdrop-blur-3xl shadow-xl dark:shadow-2xl dark:shadow-black space-y-5 sm:space-y-6"
        >
          {/* Headline */}
          <h2 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground dark:text-white font-display leading-tight max-w-3xl mx-auto">
            Experience Unrivaled Tech Access{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-primary to-purple-600 dark:from-amber-200 dark:via-primary dark:to-purple-400">
              Without Compromise.
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-muted-foreground dark:text-neutral-300 text-xs sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            Join India's premiere peer-to-peer tech rental ecosystem. Reserve
            certified cinema gear, drones, and workstation laptops — or monetize
            your idle hardware today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
            <Link
              to="/categories"
              className="w-full sm:w-auto justify-center btn-gradient px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-extrabold text-sm flex items-center gap-2.5 group cursor-pointer shadow-xl shadow-primary/30 hover:scale-105 transition-all"
            >
              <Zap className="h-4 w-4 fill-current text-white" />
              <span>Reserve Flagship Kit</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              to="/browse"
              className="w-full sm:w-auto justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-extrabold text-sm border border-border dark:border-white/20 bg-secondary/80 dark:bg-white/5 hover:bg-secondary dark:hover:bg-white/10 text-foreground dark:text-white transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl"
            >
              <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span>Explore All Gear</span>
            </Link>
          </div>

          {/* Security Banner */}
          <div className="pt-5 sm:pt-6 border-t border-border dark:border-white/10 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-6 text-[11px] sm:text-xs text-muted-foreground dark:text-neutral-400 font-bold">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />{" "}
              Razorpay Escrow Protection
            </span>
            <span className="inline-flex items-center gap-1.5 text-center">
              <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />{" "}
              ₹5L Insurance Backed (Terms & Conditions Apply)
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
