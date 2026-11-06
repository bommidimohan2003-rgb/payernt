import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Package } from "lucide-react";
import { api } from "@/utils/api";
import type { Category } from "@/types";

import cameraImg from "@/assets/images/camera.webp";
import laptopImg from "@/assets/images/laptop.webp";
import droneImg from "@/assets/images/drone.webp";
import bikeImg from "@/assets/images/re_classic350.webp";
import toolImg from "@/assets/images/tool.webp";
import powerbankImg from "@/assets/images/powerbank.webp";
import audioImg from "@/assets/images/audio.jpg";
import vrImg from "@/assets/images/vr.jpg";

export const categoryImageMap: Record<string, string> = {
  camera: cameraImg,
  cameras: cameraImg,
  "cinema cameras": cameraImg,
  laptop: laptopImg,
  laptops: laptopImg,
  macbook: laptopImg,
  workstations: laptopImg,
  drone: droneImg,
  drones: droneImg,
  fpv: droneImg,
  bike: bikeImg,
  bikes: bikeImg,
  "bikes & rides": bikeImg,
  "bike (classic 350)": bikeImg,
  "royal enfield": bikeImg,
  "classic 350": bikeImg,
  motorcycle: bikeImg,
  motorcycles: bikeImg,
  rides: bikeImg,
  cycles: bikeImg,
  tool: toolImg,
  tools: toolImg,
  "power tools": toolImg,
  "drilling machine": toolImg,
  "drilling tools": toolImg,
  "electronic drilling tools": toolImg,
  drill: toolImg,
  drills: toolImg,
  powerbank: powerbankImg,
  powerbanks: powerbankImg,
  "power bank": powerbankImg,
  "power banks": powerbankImg,
  "power stations": powerbankImg,
  power: powerbankImg,
  audio: audioImg,
  audios: audioImg,
  sound: audioImg,
  "audio gear": audioImg,
  "studio audio": audioImg,
  microphones: audioImg,
  headphones: audioImg,
  mic: audioImg,
  mics: audioImg,
  vr: vrImg,
  ar: vrImg,
  "vr & ar": vrImg,
  "vr/ar": vrImg,
  "meta quest": vrImg,
  "vision pro": vrImg,
};

const defaultCategories: (Category & { description?: string })[] = [
  {
    id: "cameras",
    name: "Cameras",
    icon: "Camera",
    image: cameraImg,
    count: 18,
    description: "Cinema & Mirrorless",
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: "drones",
    name: "Drones",
    icon: "Plane",
    image: droneImg,
    count: 12,
    description: "4K Cinema & FPV Rigs",
    color: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "laptops",
    name: "Laptops",
    icon: "Laptop",
    image: laptopImg,
    count: 14,
    description: "MacBook & Workstations",
    color: "bg-purple-100 text-purple-800",
  },
  {
    id: "bikes",
    name: "Bikes",
    icon: "Bike",
    image: bikeImg,
    count: 9,
    description: "Royal Enfield Cruisers",
    color: "bg-amber-100 text-amber-800",
  },
  {
    id: "audio",
    name: "Audio",
    icon: "Mic",
    image: audioImg,
    count: 16,
    description: "Studio Mics & Rigs",
    color: "bg-violet-100 text-violet-800",
  },
  {
    id: "tools",
    name: "Drilling Machine",
    icon: "Hammer",
    image: toolImg,
    count: 15,
    description: "Cordless Drills",
    color: "bg-red-100 text-red-800",
  },
  {
    id: "powerbanks",
    name: "Power Bank",
    icon: "Zap",
    image: powerbankImg,
    count: 11,
    description: "Power Stations",
    color: "bg-slate-100 text-slate-800",
  },
];

export function Categories() {
  const [categories, setCategories] = useState<(Category & { description?: string })[]>(defaultCategories);

  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const data = await api.getPublicCategories();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          // Sync real product counts from backend while preserving the curated hero showcase categories & verified images
          const enriched = defaultCategories.map((defCat) => {
            const match = data.find(
              (c: Category) =>
                c.id.toLowerCase() === defCat.id.toLowerCase() ||
                c.name.toLowerCase() === defCat.name.toLowerCase() ||
                c.name.toLowerCase().includes(defCat.id.toLowerCase()) ||
                defCat.name.toLowerCase().includes(c.name.toLowerCase())
            );
            return {
              ...defCat,
              count: match && typeof match.count === "number" ? match.count : defCat.count,
            };
          });
          setCategories(enriched);
        }
      } catch {
        // Fallback to default rich categories on error
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-neutral-50/50 dark:bg-[#1E1E1E] py-8 sm:py-12 lg:py-14 text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                Explore Gear By Category
              </h2>
              <span className="inline-block w-8 h-[3px] bg-primary rounded-full" />
            </div>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-[#A8B1BA]">
              Professional equipment and creator gear verified for peer-to-peer rental.
            </p>
          </div>

          <Link
            to="/categories"
            className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-[#A8B1BA] hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors group self-start sm:self-auto"
          >
            <span>View All Categories</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 text-neutral-700 dark:text-neutral-300" />
          </Link>
        </div>

        {/* Category Showcase Grid: Responsive columns across all screen sizes (2 on mobile, 3 on tablet, 7 on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 lg:gap-3.5">
          {categories.map((cat) => {
            const imgSrc =
              cat.image ||
              categoryImageMap[cat.id.toLowerCase()] ||
              categoryImageMap[cat.name.toLowerCase()] ||
              categoryImageMap[cat.name.toLowerCase().replace(/[^a-z0-9]/g, "")] ||
              cameraImg;

            return (
              <Link
                key={cat.id}
                to="/categories"
                search={{ cat: cat.id }}
                className="group relative rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-900 border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 shadow-sm hover:shadow-xl dark:shadow-none backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 cursor-pointer h-24 sm:h-32 md:h-36 lg:h-44 flex flex-col justify-end"
              >
                {/* Full Card Background Photo */}
                <div className="absolute inset-0 w-full h-full bg-neutral-900 overflow-hidden">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={cat.name}
                      loading="lazy"
                      decoding="async"
                      width={300}
                      height={240}
                      className="w-full h-full object-cover filter opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white">
                      <Package className="h-7 w-7 opacity-70" />
                    </div>
                  )}

                  {/* Multi-stop dark gradient overlay on image for crisp text readability across all background types */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20 pointer-events-none" />
                </div>

                {/* Clean Category Title overlaid on the bottom of the image */}
                <div className="relative z-10 p-2.5 sm:p-3.5 text-left w-full">
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-primary transition-colors leading-tight line-clamp-1 drop-shadow-sm">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p
                      title={cat.description}
                      className="hidden md:block text-xs text-white/80 line-clamp-2 mt-0.5 font-medium drop-shadow-xs leading-tight"
                    >
                      {cat.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
