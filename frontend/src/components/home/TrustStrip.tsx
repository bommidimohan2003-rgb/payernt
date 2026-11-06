import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import verifiedGearImg from "@/assets/images/slide_verified_gear.jpg";
import secureEscrowImg from "@/assets/images/slide_secure_escrow.jpg";
import flexibleRentalsImg from "@/assets/images/slide_flexible_rentals.jpg";
import expressDeliveryImg from "@/assets/images/slide_express_delivery.jpg";

const trustItems = [
  {
    id: "verified",
    title: "Verified Equipment",
    description: "Quality-checked & tested gear from verified hosts with comprehensive inspections.",
    bgImage: verifiedGearImg,
  },
  {
    id: "escrow",
    title: "Secure Payments",
    description: "Escrow protection & guaranteed fast host payouts upon successful gear return.",
    bgImage: secureEscrowImg,
  },
  {
    id: "flexible",
    title: "Flexible Rentals",
    description: "Custom daily, weekly & monthly flexible dates with seamless extension options.",
    bgImage: flexibleRentalsImg,
  },
  {
    id: "delivery",
    title: "Pan India Delivery",
    description: "Fast doorstep pickup & hassle-free insured return across all major creator hubs.",
    bgImage: expressDeliveryImg,
  },
];

export function TrustStrip() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % trustItems.length);
  }, []);

  // Auto-advance every 5 seconds (5000ms)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const currentItem = trustItems[currentIndex];

  const slideVariants = {
    enter: {
      x: "100%",
      opacity: 0,
    },
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 260, damping: 28 },
        opacity: { duration: 0.4 },
      },
    },
    exit: {
      x: "-100%",
      opacity: 0,
      transition: {
        x: { type: "spring" as const, stiffness: 260, damping: 28 },
        opacity: { duration: 0.3 },
      },
    },
  };

  return (
    <section className="relative overflow-hidden bg-neutral-100/70 dark:bg-[#1E1E1E] py-4 sm:py-6 text-neutral-900 dark:text-white transition-colors duration-300 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Clean Full-Width Showcase Stage with 5-Second Horizontal Slide Transitions */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="relative w-full h-[120px] sm:h-[135px] md:h-[150px] rounded-2xl sm:rounded-3xl border border-black/10 dark:border-white/15 overflow-hidden shadow-md dark:shadow-xl bg-[#09111C]"
        >
          {/* Animated Sliding Full-Width Card */}
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={currentIndex}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full flex flex-col justify-end p-4 sm:p-6 md:p-7"
            >
              {/* Full Card Background Image */}
              <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <img
                  src={currentItem.bgImage}
                  alt={currentItem.title}
                  className="w-full h-full object-cover object-center filter brightness-95"
                />
                {/* Clean Dark Gradient Scrim behind Text */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/30 dark:from-[#05090E]/95 dark:via-[#05090E]/75 dark:to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
              </div>

              {/* Clean Typography Only: Title & Subtitle */}
              <div className="relative z-10 max-w-2xl">
                <h3 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                  {currentItem.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-medium mt-1 leading-snug">
                  {currentItem.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
