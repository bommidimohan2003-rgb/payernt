import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { MainLayout } from "@/layouts/MainLayout";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Laptop,
  Bike,
  Plane,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import sonyA7FrontImg from "@/assets/images/sony_a7_front.webp";
import macbookFrontImg from "@/assets/images/macbook_front.webp";
import droneFrontImg from "@/assets/images/drone_front.webp";
import reClassic350Img from "@/assets/images/re_classic350.webp";

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: "login" | "register" | "forgot-password" | "reset-password";
  title: string;
  subtitle: string;
}

// Clear high-visibility background images array (Cameras, Laptops, Bikes, Drones)
const BACKGROUND_GEAR_PHOTOS = [
  {
    id: "camera",
    category: "Camera",
    title: "Sony Cinema & Mirrorless Cameras",
    image: sonyA7FrontImg,
    icon: Camera,
  },
  {
    id: "laptop",
    category: "Laptop",
    title: "High-Performance Workstations & MacBooks",
    image: macbookFrontImg,
    icon: Laptop,
  },
  {
    id: "bike",
    category: "Bike & Ride",
    title: "Royal Enfield & Sport Motorcycles",
    image: reClassic350Img,
    icon: Bike,
  },
  {
    id: "drone",
    category: "Drone",
    title: "5.1K Aerial Drones & Quadcopters",
    image: droneFrontImg,
    icon: Plane,
  },
];

export function AuthLayout({
  children,
  mode,
  title,
  subtitle,
}: AuthLayoutProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const location = useLocation();

  // Auto-play clear background slider every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % BACKGROUND_GEAR_PHOTOS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const nextPhoto = () =>
    setActiveIdx((prev) => (prev + 1) % BACKGROUND_GEAR_PHOTOS.length);
  const prevPhoto = () =>
    setActiveIdx((prev) =>
      prev > 0 ? prev - 1 : BACKGROUND_GEAR_PHOTOS.length - 1,
    );

  const currentGear = BACKGROUND_GEAR_PHOTOS[activeIdx];
  const IconComp = currentGear.icon;

  return (
    <MainLayout>
      <section className="relative min-h-[calc(100vh-70px)] flex items-center p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto bg-black">
        {/* CRYSTAL CLEAR HIGH-VISIBILITY FULL PAGE BACKGROUND IMAGE SLIDER */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentGear.id}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full flex items-center justify-center"
            >
              <img
                src={currentGear.image}
                alt={currentGear.title}
                decoding="async"
                width={800}
                height={600}
                className="w-full h-full object-cover object-center filter saturate-125 contrast-105"
              />
            </motion.div>
          </AnimatePresence>

          {/* Light subtle scrim for text readability without obscuring clear background photos */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/70" />
        </div>

        {/* LEFT CORNER FLOATING BADGE & CONTROLS */}
        <div className="absolute bottom-6 left-6 z-20 hidden md:flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-white shadow-2xl">
          <div className="p-2 rounded-xl bg-primary text-primary-foreground">
            <IconComp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">
              Featured Gear • {currentGear.category}
            </p>
            <p className="text-xs font-bold text-white">{currentGear.title}</p>
          </div>

          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-white/20">
            {BACKGROUND_GEAR_PHOTOS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  activeIdx === idx
                    ? "w-5 bg-primary"
                    : "w-2 bg-white/40 hover:bg-white/80"
                }`}
                aria-label={`View photo ${idx + 1}`}
              />
            ))}
            <button
              onClick={prevPhoto}
              className="p-1 rounded-full hover:bg-white/20 transition-all cursor-pointer ml-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={nextPhoto}
              className="p-1 rounded-full hover:bg-white/20 transition-all cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* LEFT SIDE ALIGNED FORM CONTAINER */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex justify-start">
          <div
            className={cn(
              "w-full card-premium p-5 sm:p-6 shadow-2xl border-white/25 bg-background/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl space-y-4 transition-all duration-300",
              mode === "register" ? "max-w-xl lg:max-w-2xl" : "max-w-md",
            )}
          >
            {/* Header Navigation Tabs: Sign In / Create Account */}
            {mode !== "forgot-password" && mode !== "reset-password" && (
              <div className="flex items-center rounded-2xl bg-secondary/80 p-1.5 border border-border/80">
                <Link
                  to="/login"
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 text-center cursor-pointer ${
                    location.pathname === "/login"
                      ? "bg-background text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 text-center cursor-pointer ${
                    location.pathname === "/register"
                      ? "bg-background text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </Link>
              </div>
            )}

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-display">
                {title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-normal leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Form Children */}
            <div className="space-y-4">{children}</div>

            {/* Security Footnote */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                256-Bit SSL Encrypted Security
              </span>
              <span>Instant Protection</span>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
