import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const workflowSteps = [
  {
    id: 0,
    number: "01",
    tabTitle: "Search & Match",
    title: "Find & Verify Your Gear",
    description:
      "Search high-end cinema cameras, drones, and laptops available near you. Filter by immediate dates, verified host ratings, and pickup or delivery options.",
    highlights: ["Live availability lookup", "Verified gear inspections", "Host response in < 15 mins"],
    icon: Search,
  },
  {
    id: 1,
    number: "02",
    tabTitle: "Escrow Reserve",
    title: "Instant Zero-Risk Booking",
    description:
      "Choose your rental duration with flexible single-day or weekly terms. Payouts remain locked safely in escrow until you inspect and accept the gear.",
    highlights: ["100% Escrow deposit hold", "Free cancellation window", "Custom booking duration"],
    icon: Calendar,
  },
  {
    id: 2,
    number: "03",
    tabTitle: "Deliver & Shoot",
    title: "Doorstep Handover & Create",
    description:
      "Receive sealed Pelican case delivery right to your studio or doorstep. Create your vision with full insurance coverage, then enjoy effortless pickup return.",
    highlights: ["Same-day doorstep delivery", "Transit damage insurance", "1-tap return scheduling"],
    icon: Package,
  },
];

const tabContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.1,
    },
  },
};

const tabItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  // Auto-advance sequentially every 3 seconds unless user manually clicks a step
  useEffect(() => {
    if (isUserInteracted) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % workflowSteps.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [isUserInteracted]);

  const step = workflowSteps[activeStep];

  const handleSelectStep = (idx: number) => {
    setIsUserInteracted(true);
    setActiveStep(idx);
  };

  return (
    <section className="relative overflow-hidden bg-neutral-50/70 dark:bg-[#05090D] py-8 sm:py-10 text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header with grouped Learn More link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                How It Works
              </h2>
              <span className="inline-block w-6 h-[3px] bg-primary rounded-full" />
              <Link
                to="/about"
                className="ml-2 text-xs font-semibold text-neutral-600 dark:text-[#A8B1BA] hover:text-black dark:hover:text-white inline-flex items-center gap-1 transition-colors group"
              >
                <span>Learn More</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#A8B1BA]">
              Experience seamless, peer-to-peer creator gear rental in 3 effortless steps.
            </p>
          </div>
        </div>

        {/* 3 Step Interactive Tab Selectors */}
        <motion.div
          role="tablist"
          aria-label="How It Works Steps"
          variants={tabContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-5 sm:mb-6"
        >
          {workflowSteps.map((s, idx) => {
            const isActive = idx === activeStep;

            return (
              <motion.button
                key={s.id}
                id={`step-tab-${s.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`step-panel-${s.id}`}
                variants={tabItemVariants}
                type="button"
                onClick={() => handleSelectStep(idx)}
                className={`relative rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 text-left transition-all duration-300 border cursor-pointer flex items-center gap-2 sm:gap-3 overflow-hidden ${
                  isActive
                    ? "bg-white dark:bg-[#0B1522] border-primary/60 shadow-md ring-1 ring-primary/30"
                    : "bg-white/80 dark:bg-[#080E16]/70 border-neutral-200 dark:border-white/10 hover:border-neutral-400 dark:hover:border-white/25 opacity-75 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs sm:text-sm transition-colors ${
                    isActive
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                      : "bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300"
                  }`}
                >
                  {s.number}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block truncate">
                    Step {s.number}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-neutral-950 dark:text-white truncate">
                    {s.tabTitle}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Interactive Step Display Stage */}
        <div
          role="tabpanel"
          id={`step-panel-${step.id}`}
          aria-labelledby={`step-tab-${step.id}`}
          className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-[#081018] border border-neutral-200 dark:border-white/10 p-5 sm:p-6 md:p-7 shadow-sm dark:shadow-md overflow-hidden transition-colors duration-300"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
            >
              {/* Left Column (Details & Highlights aligned flush left) */}
              <div className="lg:col-span-6 text-left space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 dark:bg-primary/10 border border-primary/30 dark:border-primary/20 text-neutral-900 dark:text-white text-xs font-semibold"
                >
                  <Zap className="h-3 w-3 text-primary" />
                  <span>Step {step.number} — {step.tabTitle}</span>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-base sm:text-lg md:text-xl font-extrabold text-neutral-950 dark:text-white tracking-tight leading-snug"
                >
                  {step.title}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed"
                >
                  {step.description}
                </motion.p>

                {/* Key Bullet Checklist */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="pt-1 space-y-1.5"
                >
                  {step.highlights.map((h, hIdx) => (
                    <motion.div
                      key={h}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: 0.2 + hIdx * 0.06 }}
                      className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{h}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Right Column (High-Fidelity Preview Simulation with Entrance Animation) */}
              <div className="lg:col-span-6 flex justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                  className="w-full max-w-md rounded-xl bg-neutral-100/90 dark:bg-[#0C1622] border border-neutral-200 dark:border-white/15 p-4 sm:p-5 shadow-xs dark:shadow-inner"
                >

                  {activeStep === 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/10">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">Gear Explorer</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          180+ Active Hosts
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#070D14] border border-neutral-200/80 dark:border-white/10 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <Search className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                          <div>
                            <div className="text-xs font-bold text-neutral-900 dark:text-white">Sony Alpha A7 IV Kit</div>
                            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> Indiranagar, Bengaluru
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-neutral-900 dark:text-white">₹2,800<span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">/day</span></span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-[#070D14]/70 border border-neutral-200/80 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Search className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                          <div>
                            <div className="text-xs font-bold text-neutral-900 dark:text-white">DJI Mavic 3 Cine 4K</div>
                            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> Koramangala, Bengaluru
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-neutral-900 dark:text-white">₹3,400<span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">/day</span></span>
                      </div>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/10">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">Escrow Checkout</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Safe Escrow
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-[#070D14] border border-neutral-200/80 dark:border-white/10 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1"><Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" /> Rental Dates</span>
                          <span className="font-bold text-neutral-900 dark:text-white">Fri, Jul 12 – Sun, 14 (3 Days)</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-600 dark:text-neutral-400">Escrow Security Deposit</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">100% Refundable</span>
                        </div>
                        <div className="pt-1.5 border-t border-neutral-200 dark:border-white/10 flex justify-between text-xs font-bold">
                          <span className="text-neutral-900 dark:text-white">Total Protected Amount</span>
                          <span className="text-primary font-bold">₹8,400</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/10">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">Doorstep Tracking</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Out for Delivery
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-[#070D14] border border-neutral-200/80 dark:border-white/10 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-neutral-900 dark:text-white">Insured Pelican Case</div>
                            <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Courier Arrival: Today, 2:30 PM</div>
                          </div>
                        </div>

                        <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 shrink-0" />
                          Ready for production shoot upon delivery
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}

