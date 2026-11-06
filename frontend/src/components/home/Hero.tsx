import { useEffect, useState } from "react";
import {
  ArrowRight,
  MapPin,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { useUserLocation } from "@/hooks/useUserLocation";

import cameraImg from "@/assets/images/camera.webp";
import laptopImg from "@/assets/images/laptop.webp";
import bikeImg from "@/assets/images/re_classic350.webp";
import droneImg from "@/assets/images/drone.webp";
import toolImg from "@/assets/images/tool.webp";
import powerbankImg from "@/assets/images/powerbank.webp";

const gearItems = [
  {
    id: "bike",
    title: "Classic 350",
    name: "Royal Enfield Classic 350",
    image: bikeImg,
  },
  {
    id: "camera",
    title: "Camera",
    name: "Sony Alpha Cinema Camera",
    image: cameraImg,
  },
  {
    id: "drone",
    title: "Drone",
    name: "DJI Mavic 3 Pro Drone",
    image: droneImg,
  },
  {
    id: "laptop",
    title: "Laptop",
    name: "Apple MacBook Pro M3 Max",
    image: laptopImg,
  },
  {
    id: "powerbank",
    title: "Powerbank",
    name: "Fast-Charging Power Station",
    image: powerbankImg,
  },
  {
    id: "tool",
    title: "Drilling Machine",
    name: "Heavy-Duty Cordless Drill",
    image: toolImg,
  },
];

const searchSuggestions = [
  "Cameras...",
  "Laptops...",
  "Royal Enfield bikes...",
  "Drones...",
  "Lighting kits...",
  "Audio gear...",
  "Drills & tools...",
];

export function Hero() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGearIndex, setActiveGearIndex] = useState(0);

  // Typewriter placeholder animation (slower, natural pace)
  const [placeholderText, setPlaceholderText] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = searchSuggestions[suggestionIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (placeholderText.length < currentWord.length) {
        timer = setTimeout(() => {
          setPlaceholderText(currentWord.slice(0, placeholderText.length + 1));
        }, 140);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      }
    } else {
      if (placeholderText.length > 0) {
        timer = setTimeout(() => {
          setPlaceholderText(currentWord.slice(0, placeholderText.length - 1));
        }, 65);
      } else {
        setIsDeleting(false);
        setSuggestionIndex((prev) => (prev + 1) % searchSuggestions.length);
      }
    }

    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, suggestionIndex]);

  // Auto-advance gear showcase every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveGearIndex((prev) => (prev + 1) % gearItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const activeGear = gearItems[activeGearIndex];

  const { city: selectedCity } = useUserLocation();

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    navigate({
      to: "/categories",
      search: {
        q: searchTerm.trim() || undefined,
      },
    });
  };

  return (
    <section className="relative overflow-hidden bg-neutral-50/60 dark:bg-[#1E1E1E] text-neutral-900 dark:text-white pt-12 sm:pt-16 lg:pt-20 pb-12 lg:pb-16 transition-colors duration-300">
      {/* Ambient background glow matching dark cinematic reference */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-gradient-to-b from-neutral-200/40 via-neutral-100/10 to-transparent dark:from-[#0B1522] dark:via-[#071017] dark:to-transparent rounded-full blur-[160px] pointer-events-none opacity-60" />
      <div className="absolute top-28 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/5 dark:bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Full-Bleed Transparent Gear Image Cycling One After Another */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeGear.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={activeGear.image}
              alt={activeGear.name}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover object-center opacity-90 dark:opacity-65 filter contrast-110 saturate-120 brightness-[0.95] dark:brightness-90 transition-all pointer-events-none"
            />
          </motion.div>
        </AnimatePresence>

        {/* Soft center ambient backlight glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-primary/5 dark:bg-white/10 rounded-full blur-[160px] pointer-events-none" />

        {/* Seamless full-screen vignettes and edge fades */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-50/95 via-transparent to-neutral-50/95 dark:from-[#05090D] dark:via-transparent dark:to-[#05090D] pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-white/30 via-white/10 to-transparent dark:from-[#05090D]/60 dark:via-[#05090D]/30 dark:to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-neutral-50 dark:from-[#05090D] via-neutral-50/60 dark:via-[#05090D]/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-neutral-50/80 dark:from-[#05090D]/90 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-8 sm:pb-14">
        {/* 1. Value Proposition Headline & Tagline */}
        <div className="text-center max-w-4xl mx-auto space-y-4 sm:space-y-6 mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-neutral-950 dark:text-white leading-[1.08]">
            Rent Professional Tech. <br />
            <span className="text-neutral-950 dark:text-white font-extrabold underline decoration-neutral-400 dark:decoration-neutral-600 underline-offset-8">
              Create Without Limits.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-[#A8B1BA] max-w-xl mx-auto leading-relaxed">
            Peer-to-peer marketplace to rent cinema cameras, drones, laptops, and production gear with instant escrow protection.
          </p>
        </div>

        {/* 2. High-Contrast Integrated Search Bar Module */}
        <div className="max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10">
          <form
            onSubmit={handleSearch}
            className="p-1.5 sm:p-2 rounded-2xl sm:rounded-full bg-white dark:bg-[#1E1E1E] border border-black/15 dark:border-white/20 shadow-2xl flex items-center gap-1.5 sm:gap-2 transition-all focus-within:ring-2 focus-within:ring-primary/20 dark:focus-within:ring-white/20"
          >
            {/* Keyword Search Input */}
            <div className="flex-1 min-w-0 flex items-center gap-2.5 pl-3 sm:pl-4 py-1 bg-transparent">
              <Search className="h-4 w-4 text-neutral-400 dark:text-neutral-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholderText || "Cameras, laptops, drones..."}
                className="w-full bg-transparent text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none truncate font-medium"
              />
            </div>

            {/* Informational Location Indicator (DISPLAY ONLY) */}
            {selectedCity && selectedCity !== "All Cities" && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-sm border border-black/5 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-200">
                <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span suppressHydrationWarning className="truncate text-xs font-medium max-w-[110px]">{selectedCity}</span>
              </div>
            )}

            {/* Search Submit Button */}
            <button
              type="submit"
              className="h-9 sm:h-10 px-3.5 sm:px-6 rounded-xl sm:rounded-full bg-[#161616] hover:bg-[#262626] text-[#F2F0EA] dark:bg-[#F2F0EA] dark:text-[#161616] dark:hover:bg-white text-xs sm:text-sm font-bold transition-all shrink-0 shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* 3. Secondary Navigation Link: Browse All Gear (De-emphasized to prioritize Search) */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/categories"
            className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors duration-200 group py-1 px-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span>Or browse all gear categories</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
