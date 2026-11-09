import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

const HERO_CAPTION = "Get What You Need, Without Owning It.";

export function Hero() {
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Sync rendered studio product assets with root .dark class without SSR/CSR hydration mismatch
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const syncTheme = () => setIsDarkTheme(root.classList.contains("dark"));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Smooth continuous typewriter animation on the single caption, respecting reduced motion
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setCurrentText(HERO_CAPTION);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (currentText.length < HERO_CAPTION.length) {
        timer = setTimeout(() => {
          setCurrentText(HERO_CAPTION.slice(0, currentText.length + 1));
        }, 46);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      if (currentText.length > 0) {
        timer = setTimeout(() => {
          setCurrentText(HERO_CAPTION.slice(0, currentText.length - 1));
        }, 24);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false);
        }, 320);
      }
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting]);

  const handleScrollToExplore = () => {
    const section = document.getElementById("explore-rentals");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      aria-label="paYent Rentals Hero"
      className="relative w-full overflow-hidden bg-white dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80 py-2.5 sm:py-3.5 md:py-4 lg:py-5 transition-colors duration-200"
    >
      {/* Studio Window-Pane Lighting (Light Mode) & Overhead Softbox (Dark Mode) */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[82%] sm:w-[74%] md:w-[68%] opacity-[0.1] dark:opacity-0"
        style={{
          maskImage: "linear-gradient(to left, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)",
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[linear-gradient(126deg,transparent_12%,rgba(0,0,0,0.6)_24%,transparent_36%,rgba(0,0,0,0.65)_48%,transparent_60%,rgba(0,0,0,0.45)_72%,transparent_82%)]" />
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[82%] sm:w-[74%] md:w-[68%] opacity-0 dark:opacity-100"
        style={{
          maskImage: "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_68%_46%,rgba(255,255,255,0.065)_0%,rgba(255,255,255,0.02)_42%,transparent_72%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Identical two-column composition across mobile, tablet, and desktop */}
        <div className="grid grid-cols-[minmax(0,48fr)_minmax(0,52fr)] items-center gap-2 sm:gap-4 md:gap-5 lg:gap-6 min-h-[140px] sm:min-h-[180px] md:min-h-[220px] lg:min-h-[300px]">
          {/* ========================================================
              LEFT COLUMN (48%): Editorial Typography & CTA
              ======================================================== */}
          <div className="z-10 text-left max-w-xl py-1 pr-1 sm:pr-2 md:pr-4">
            {/* Main Heading: Light font for Rent / Anything, Bold for You Need */}
            <h1 className="text-[1.25rem] sm:text-[1.85rem] md:text-[2.25rem] lg:text-[2.85rem] xl:text-[3.15rem] font-sans tracking-tight leading-[1.08] text-balance">
              <span className="sr-only">Rent Anything</span>
              <span aria-hidden="true" className="block font-light text-neutral-900 dark:text-neutral-100">
                <span className="block">Rent</span>
                <span className="block">Anything</span>
              </span>
              <span className="block font-bold text-neutral-950 dark:text-white mt-0.5 sm:mt-1">
                You Need
              </span>
            </h1>

            {/* Horizontal Monochrome Accent Divider */}
            <div
              className="w-10 sm:w-12 md:w-14 h-[3px] sm:h-[3.5px] md:h-1 bg-neutral-950 dark:bg-white rounded-full mt-2.5 mb-2.5 sm:mt-3 sm:mb-3"
              aria-hidden="true"
            />

            {/* Single Fixed Caption with Continuous Typing Animation */}
            <div className="min-h-[2rem] sm:min-h-[2.25rem] md:min-h-[2.4rem] flex items-center">
              <p className="sr-only">{HERO_CAPTION}</p>
              <p
                aria-hidden="true"
                className="text-xs sm:text-sm md:text-[0.95rem] lg:text-[1.0625rem] xl:text-lg font-normal tracking-normal leading-snug text-neutral-600 dark:text-neutral-300 lg:whitespace-nowrap"
              >
                <span>{currentText}</span>
                <span
                  className="inline-block w-[1.5px] sm:w-[2px] h-3.5 sm:h-4 md:h-[1.125rem] ml-0.5 sm:ml-1 bg-neutral-950 dark:bg-white align-middle"
                  aria-hidden="true"
                />
              </p>
            </div>

            {/* Outlined Pill CTA Button */}
            <div className="mt-2 sm:mt-3 md:mt-3.5 flex items-center">
              <button
                type="button"
                onClick={handleScrollToExplore}
                id="hero-explore-rentals-cta"
                className="group inline-flex items-center gap-1.5 sm:gap-2.5 min-h-[44px] px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-full border border-neutral-950 dark:border-white bg-transparent text-neutral-950 dark:text-white hover:bg-neutral-950 hover:text-white dark:hover:bg-white dark:hover:text-neutral-950 text-xs md:text-sm font-semibold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white whitespace-nowrap"
              >
                <span>Explore Rentals</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[1.75] group-hover:translate-x-1 transition-transform motion-reduce:transform-none" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN (52%): Standalone Studio Trio with Grounded Contact Shadows
              Single <img> per product swapped dynamically via isDarkTheme
              ======================================================== */}
          <div className="relative w-full h-[140px] sm:h-[180px] md:h-[220px] lg:h-[300px] select-none">
            {/* 1. SILVER LAPTOP */}
            <div className="absolute top-[1%] right-[5%] sm:top-[2%] sm:right-[8%] md:top-[2%] md:right-[9%] lg:top-[2%] lg:right-[10%] w-[58%] sm:w-[53%] md:w-[51%] lg:w-[50%] max-w-[320px] z-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-[3%] left-[10%] right-[8%] h-[20%] rounded-full bg-black/18 dark:bg-black/75 blur-md rotate-[26deg]"
              />
              <img
                src={isDarkTheme ? "/hero_laptop_dark.webp" : "/hero_laptop.webp"}
                alt="Brushed silver laptop"
                width={944}
                height={680}
                className="relative w-full h-auto object-contain drop-shadow-[8px_16px_18px_rgba(0,0,0,0.20)] dark:drop-shadow-[0_18px_28px_rgba(0,0,0,0.92)]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            {/* 2. BLACK OVER-EAR HEADPHONES */}
            <div className="absolute top-[16%] left-[1%] sm:top-[17%] sm:left-[2%] md:top-[18%] md:left-[3%] lg:top-[18%] lg:left-[3%] w-[38%] sm:w-[35%] md:w-[34%] lg:w-[33%] max-w-[195px] z-20 rotate-[6deg]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[1%] left-[14%] right-[4%] h-[18%] rounded-full bg-black/22 dark:bg-black/80 blur-md"
              />
              <img
                src={isDarkTheme ? "/hero_headphones_dark.webp" : "/hero_headphones.webp"}
                alt="Matte black wireless over-ear headphones"
                width={746}
                height={819}
                className="relative w-full h-auto object-contain drop-shadow-[10px_18px_18px_rgba(0,0,0,0.26)] dark:drop-shadow-[0_20px_28px_rgba(0,0,0,0.95)]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            {/* 3. MONOCHROME DSLR CAMERA */}
            <div className="absolute bottom-[-3%] right-[22%] sm:bottom-[-2%] sm:right-[25%] md:bottom-[-2%] md:right-[27%] lg:bottom-[-2%] lg:right-[28%] w-[31%] sm:w-[30%] md:w-[28%] lg:w-[27%] max-w-[170px] z-30">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-[3%] left-[8%] right-[2%] h-[18%] rounded-full bg-black/25 dark:bg-black/85 blur-md"
              />
              <img
                src={isDarkTheme ? "/hero_camera_dark.webp" : "/hero_camera.webp"}
                alt="Monochrome professional DSLR camera with zoom lens"
                width={781}
                height={782}
                className="relative w-full h-auto object-contain drop-shadow-[10px_18px_20px_rgba(0,0,0,0.28)] dark:drop-shadow-[0_22px_30px_rgba(0,0,0,0.95)]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
