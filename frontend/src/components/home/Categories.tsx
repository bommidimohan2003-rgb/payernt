import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Laptop,
  Camera,
  Bike,
  Car,
  Drone,
  Gamepad2,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";

/** Handcrafted vector icons accurately matching user reference design without image crops */
export function AudioCategoryIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9.5" y="6" width="5" height="12" rx="2.5" />
      <path d="M5.5 8.5a5.5 5.5 0 0 0 0 7" />
      <path d="M18.5 8.5a5.5 5.5 0 0 1 0 7" />
    </svg>
  );
}

export function ToolsCategoryIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.2-2.2a4.5 4.5 0 0 1-5.5 5.5l-8.5 8.5a1.5 1.5 0 0 1-2.1-2.1l8.5-8.5a4.5 4.5 0 0 1 5.5-5.5z" />
      <path d="m4 4 3 3" />
      <path d="m9 9 6 6" />
      <path d="m17 17 3 3" />
    </svg>
  );
}

export function OutdoorCategoryIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m7.5 4-3.5 5h2l-2.5 4h2L3 17.5h9l-2.5-4.5h2l-2.5-4h2z" />
      <path d="m16.5 7.5-3 4.5h1.8l-2.2 4h1.8L12.5 19.5h8.5l-2.4-3.5h1.8l-2.2-4h1.8z" />
      <path d="M2 20.5h20" />
    </svg>
  );
}

export interface CategoryMeta {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  subcategories: string[];
}

export const CANONICAL_CATEGORIES: CategoryMeta[] = [
  {
    id: "laptops",
    name: "Laptops",
    icon: Laptop,
    subcategories: [
      "MacBooks",
      "Windows Laptops",
      "Gaming Laptops",
      "Ultrabooks",
      "Workstations",
    ],
  },
  {
    id: "cameras",
    name: "Cameras",
    icon: Camera,
    subcategories: [
      "Cinema Cameras",
      "Mirrorless",
      "Lenses",
      "Action Cams",
      "Gimbals",
    ],
  },
  {
    id: "bikes",
    name: "Bikes",
    icon: Bike,
    subcategories: [
      "Electric Bikes",
      "Mountain Bikes",
      "City Cycles",
      "Scooters",
    ],
  },
  {
    id: "cars",
    name: "Cars",
    icon: Car,
    subcategories: ["Electric Cars", "SUVs", "Sedans", "Self-Drive"],
  },
  {
    id: "drones",
    name: "Drones",
    icon: Drone,
    subcategories: [
      "FPV Drones",
      "Camera Drones",
      "Cinematic Drones",
      "Accessories",
    ],
  },
  {
    id: "gaming",
    name: "Gaming",
    icon: Gamepad2,
    subcategories: ["PS5 & Xbox", "VR Headsets", "Handhelds", "Gaming Rigs"],
  },
  {
    id: "audio",
    name: "Audio",
    icon: AudioCategoryIcon,
    subcategories: [
      "Wireless Earbuds",
      "Noise Cancelling",
      "Microphones",
      "Studio Monitors",
    ],
  },
  {
    id: "tools",
    name: "Tools",
    icon: ToolsCategoryIcon,
    subcategories: [
      "Power Drills",
      "Hand Tools",
      "Measuring Equipment",
      "Generators",
    ],
  },
  {
    id: "outdoor",
    name: "Outdoor",
    icon: OutdoorCategoryIcon,
    subcategories: [
      "Camping & Tents",
      "Hiking Gear",
      "Action Gear",
      "Portable Power",
    ],
  },
  {
    id: "more",
    name: "More",
    icon: MoreHorizontal,
    subcategories: [
      "Lighting",
      "Monitors & Displays",
      "Power Banks",
      "Studio Accessories",
    ],
  },
];

export function Categories() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    const fetchCats = async () => {
      try {
        const fetcher = api.getPublicCategories || api.getCategories;
        if (!fetcher) return;
        const data = await fetcher.call(api);
        if (active && Array.isArray(data)) {
          const map: Record<string, number> = {};
          data.forEach((c) => {
            if (c.id && c.count !== undefined)
              map[c.id.toLowerCase()] = c.count;
            if (c.name && c.count !== undefined)
              map[c.name.toLowerCase()] = c.count;
          });
          setCounts(map);
        }
      } catch {
        /* ignore category fetch errors */
      }
    };
    fetchCats();
    return () => {
      active = false;
    };
  }, []);

  const handleCategoryClick = (cat: CategoryMeta) => {
    if (cat.id === "more") {
      navigate({ to: "/categories" });
      return;
    }
    navigate({
      to: "/browse",
      search: {
        cat: cat.id,
      },
    });
  };

  return (
    <section className="w-full py-3 sm:py-4.5 bg-white dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header with Title and View All Link */}
        <div className="flex items-center justify-between gap-3 mb-2.5 sm:mb-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              Browse by Category
            </h2>
          </div>
          <Link
            to="/categories"
            id="categories-view-all-link"
            className="group shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 min-h-[44px] px-1 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-lg"
          >
            <span>View All</span>
            {/* prettier-ignore */}
            <ArrowRight className="h-4 w-4 shrink-0 stroke-[1.75] group-hover:translate-x-0.5 transition-transform motion-reduce:transform-none" aria-hidden="true" />
          </Link>
        </div>

        {/* Backward-compatible test anchor: grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 */}
        {/* Horizontal Category Cards Row matching reference image with 30% reduced box sizes */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none snap-x snap-mandatory">
          {CANONICAL_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count =
              counts[cat.id.toLowerCase()] ?? counts[cat.name.toLowerCase()];

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                title={
                  count !== undefined ? `${cat.name} (${count})` : cat.name
                }
                aria-label={
                  count !== undefined ? `${cat.name} (${count})` : cat.name
                }
                className={cn(
                  "group flex flex-col items-center justify-center shrink-0 snap-start select-none cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white",
                  "w-[54px] sm:w-[59px] md:w-[65px] lg:w-[69px] h-[58px] sm:h-[63px] md:h-[69px] rounded-[13px] sm:rounded-[14px] p-1 sm:p-1.5",
                  "border border-neutral-200/90 dark:border-neutral-700/60 bg-white dark:bg-[#262626] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-neutral-950 dark:hover:border-white hover:shadow-xs",
                )}
              >
                {/* Crisp Vector Icon without circular badge */}
                <div className="flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 shrink-0">
                  <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0 transition-colors duration-200 stroke-[1.75] text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-950 dark:group-hover:text-white" />
                </div>

                {/* Category label below icon */}
                <span className="text-[9.5px] sm:text-[10.5px] text-center leading-tight truncate max-w-[48px] sm:max-w-[54px] md:max-w-[60px] mt-0.5 sm:mt-1 font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors duration-200">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Categories;
