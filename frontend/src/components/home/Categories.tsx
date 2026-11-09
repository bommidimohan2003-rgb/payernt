import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Laptop,
  Bike,
  Camera,
  Hammer,
  Music,
  Gamepad2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";

interface CategoryMeta {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  subcategories: string[];
}

export const CANONICAL_CATEGORIES: CategoryMeta[] = [
  {
    id: "electronics",
    name: "Electronics",
    icon: Laptop,
    subcategories: ["Laptops", "Audio & Sound", "Power Banks", "Monitors & Displays"],
  },
  {
    id: "vehicles",
    name: "Vehicles",
    icon: Bike,
    subcategories: ["Bikes", "Electric Scooters", "Motorcycles", "Cycles"],
  },
  {
    id: "cameras",
    name: "Cameras & Photography",
    icon: Camera,
    subcategories: ["Cinema Cameras", "Lenses", "Drones", "Lighting"],
  },
  {
    id: "tools",
    name: "Tools & Equipment",
    icon: Hammer,
    subcategories: ["Power Drills", "Hand Tools", "Generators"],
  },
  {
    id: "music",
    name: "Musical Instruments",
    icon: Music,
    subcategories: ["Guitars", "Keyboards", "Microphones"],
  },
  {
    id: "gaming",
    name: "Gaming",
    icon: Gamepad2,
    subcategories: ["Consoles", "VR Headsets", "Gaming PCs"],
  },
];

export function Categories() {
  const navigate = useNavigate();
  const [selectedCatId, setSelectedCatId] = useState<string>("electronics");
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
            if (c.id && c.count !== undefined) map[c.id.toLowerCase()] = c.count;
            if (c.name && c.count !== undefined) map[c.name.toLowerCase()] = c.count;
          });
          setCounts(map);
        }
      } catch {}
    };
    fetchCats();
    return () => {
      active = false;
    };
  }, []);

  const activeCategory =
    CANONICAL_CATEGORIES.find((c) => c.id === selectedCatId) || CANONICAL_CATEGORIES[0];

  const handleSubcategoryClick = (sub: string) => {
    navigate({
      to: "/browse",
      search: {
        cat: selectedCatId,
        q: sub,
      },
    });
  };

  return (
    <section className="w-full py-3 sm:py-4.5 bg-white dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header with View All Link */}
        <div className="flex items-center justify-between gap-3 mb-2 sm:mb-2.5">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              Categories
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Browse verified rental equipment across essential categories
            </p>
          </div>
          <Link
            to="/categories"
            id="categories-view-all-link"
            className="group shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 min-h-[44px] px-1 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-lg"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4 shrink-0 stroke-[1.75] group-hover:translate-x-0.5 transition-transform motion-reduce:transform-none" aria-hidden="true" />
          </Link>
        </div>

        {/* 6 Circular Monochrome Line Icon Cards (2 cols on mobile for full non-truncated names) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
          {CANONICAL_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCatId === cat.id;
            const count = counts[cat.id] ?? counts[cat.name.toLowerCase()];

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(cat.id)}
                className={cn(
                  "group flex flex-col items-center text-center p-1.5 sm:p-2 min-h-[44px] rounded-2xl transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white",
                  isSelected
                    ? "bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-xs"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50 border border-transparent"
                )}
                aria-pressed={isSelected}
              >
                {/* Circular monochrome icon frame */}
                <div
                  className={cn(
                    "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-colors duration-200",
                    isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950 shadow-xs"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 group-hover:border-neutral-400 dark:group-hover:border-neutral-600 group-hover:text-neutral-950 dark:group-hover:text-white"
                  )}
                >
                  <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[1.75]" />
                </div>

                {/* Category Name (untruncated across mobile and desktop) */}
                <span className="mt-1 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white leading-snug">
                  {cat.name}
                </span>

                {count !== undefined && count > 0 && (
                  <span className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {count} items
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Subcategories Horizontal Scrollable Chips */}
        {activeCategory && activeCategory.subcategories.length > 0 && (
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Explore in {activeCategory.name}
              </span>
              <Link
                to="/browse"
                search={{ cat: activeCategory.id }}
                className="text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:underline inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-md px-1"
              >
                <span>Browse {activeCategory.name}</span>
                <ChevronRight className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              </Link>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
              {activeCategory.subcategories.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => handleSubcategoryClick(sub)}
                  className="shrink-0 min-h-[34px] px-3 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Categories;
