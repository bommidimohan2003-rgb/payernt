import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  X,
  MapPin,
  Calendar,
  Search,
  Check,
  Moon,
  Sun,
  ShieldCheck,
  Navigation,
  SlidersHorizontal,
  RotateCcw,
  Package,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { SectionBox } from "@/components/common/SectionBox";
import { WakeSlider } from "@/components/reactbits/WakeSlider";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { storage } from "@/utils/storage";
import { api } from "@/utils/api";
import { isFakeOrDeletedProduct, isUserOwnProduct } from "@/utils/productFilters";
import { formatProductLocation, isProductAvailable } from "@/utils/formatters";
import { INITIAL_FALLBACK_PRODUCTS } from "@/utils/fallbackProducts";
import {
  matchesProductCategory,
  getCategoryDisplayLabel,
  normalizeCategoryParam,
} from "@/utils/categoryFilter";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface CategoryItem {
  id: string;
  name: string;
}

const PRIMARY_CATEGORIES: CategoryItem[] = [
  { id: "cameras", name: "Cameras" },
  { id: "laptops", name: "Laptops / PCs" },
  { id: "drones", name: "Drones" },
  { id: "audio", name: "Audio Gear" },
  { id: "sound", name: "Sound Equipment" },
  { id: "tools", name: "Drills & Tools" },
  { id: "powerbanks", name: "Power Stations" },
  { id: "lighting", name: "Studio Lighting" },
  { id: "bikes", name: "Bikes & Rides" },
];

export default function FiltersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const search = useSearch({ strict: false }) as {
    q?: string;
    cat?: string;
    category?: string;
    min_p?: string;
    max_p?: string;
    city?: string;
    pincode?: string;
    cond?: string;
    start?: string;
    end?: string;
    sort?: string;
  };

  // Mobile Filter Sidebar Toggle State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const urlCat = useMemo(
    () => normalizeCategoryParam(search as Record<string, unknown>),
    [search]
  );

  // 1. Search Query State
  const [searchQuery, setSearchQuery] = useState<string>(search.q || "");

  // 2. Categories State (Multi-selection)
  const [selectedCats, setSelectedCats] = useState<string[]>(() => {
    if (!urlCat || urlCat === "all") return [];
    return urlCat
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => Boolean(s) && s !== "all");
  });

  // 3. Price Range (Dual Slider & Inputs)
  const [minPrice, setMinPrice] = useState<number>(() => {
    const val = Number(search.min_p);
    return !isNaN(val) && val >= 0 ? val : 0;
  });
  const [maxPrice, setMaxPrice] = useState<number>(() => {
    const val = Number(search.max_p);
    return !isNaN(val) && val > 0 && val <= 10000 ? val : 10000;
  });

  // 4. Availability Dates (Deferred date floor post-mount for SSR/CSR hydration parity)
  const [todayStr, setTodayStr] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(search.start || "");
  const [endDate, setEndDate] = useState<string>(search.end || "");

  // 5. Location State
  const {
    city: detectedCity,
    isDetecting,
    detectLocation,
  } = useUserLocation();
  const [cityInput, setCityInput] = useState<string>(search.city || "");
  const [pincodeInput, setPincodeInput] = useState<string>(search.pincode || "");

  // 6. Condition State (New / Used)
  const [selectedConditions, setSelectedConditions] = useState<string[]>(() => {
    if (!search.cond) return ["new", "used"];
    return search.cond.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  });

  // 7. Products Catalog State (SSR-deterministic initial state; client storage hydrated in useEffect)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [products, setProducts] = useState<Product[]>(() =>
    INITIAL_FALLBACK_PRODUCTS.filter((p) => !isFakeOrDeletedProduct(p))
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hydrate mounted state, client storage cache, and fetch live products post-mount (Obs B)
  useEffect(() => {
    setMounted(true);
    setTodayStr(new Date().toISOString().split("T")[0]);

    const cached = storage.get<Product[]>("payent_server_products", []);
    if (Array.isArray(cached) && cached.length > 0) {
      const cleanCached = cached.filter((p) => !isFakeOrDeletedProduct(p));
      if (cleanCached.length > 0) {
        const merged = [...cleanCached];
        for (const fb of INITIAL_FALLBACK_PRODUCTS) {
          if (!merged.some((p) => String(p.id) === String(fb.id))) {
            merged.push(fb);
          }
        }
        setProducts(merged);
      }
    }

    setIsLoading(true);
    api
      .getPublicCustomProducts()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          const clean = res.filter((p) => !isFakeOrDeletedProduct(p));
          const merged = [...clean];
          for (const fb of INITIAL_FALLBACK_PRODUCTS) {
            if (!merged.some((p) => String(p.id) === String(fb.id))) {
              merged.push(fb);
            }
          }
          setProducts(merged);
          storage.set("payent_server_products", merged);
        }
      })
      .catch((err) => {
        console.warn("[FiltersPage] Server fetch notice:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!isMobileFilterOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isMobileFilterOpen]);

  // Update URL Search Parameters whenever filters change
  const syncUrlParams = useCallback(
    (newParams: {
      qVal?: string;
      cat?: string[];
      minP?: number;
      maxP?: number;
      startD?: string;
      endD?: string;
      cityVal?: string;
      pinVal?: string;
      conds?: string[];
    }) => {
      const qParams: Record<string, any> = {};

      const currentQ = newParams.qVal !== undefined ? newParams.qVal : searchQuery;
      if (currentQ && currentQ.trim()) qParams.q = currentQ.trim();

      const cats = newParams.cat !== undefined ? newParams.cat : selectedCats;
      if (cats.length > 0) qParams.cat = cats.join(",");

      const minVal = newParams.minP !== undefined ? newParams.minP : minPrice;
      if (minVal > 0) qParams.min_p = String(minVal);

      const maxVal = newParams.maxP !== undefined ? newParams.maxP : maxPrice;
      if (maxVal < 10000) qParams.max_p = String(maxVal);

      const sDate = newParams.startD !== undefined ? newParams.startD : startDate;
      if (sDate) qParams.start = sDate;

      const eDate = newParams.endD !== undefined ? newParams.endD : endDate;
      if (eDate) qParams.end = eDate;

      const cCity = newParams.cityVal !== undefined ? newParams.cityVal : cityInput;
      if (cCity && cCity.trim() && cCity.toLowerCase() !== "all cities") {
        qParams.city = cCity.trim();
      }

      const cPin = newParams.pinVal !== undefined ? newParams.pinVal : pincodeInput;
      if (cPin && cPin.trim()) qParams.pincode = cPin.trim();

      const condList = newParams.conds !== undefined ? newParams.conds : selectedConditions;
      if (condList.length === 1) qParams.cond = condList[0];

      if (search.sort) qParams.sort = search.sort;

      navigate({
        to: "/filters",
        search: qParams as any,
        replace: true,
      });
    },
    [
      searchQuery,
      search.sort,
      selectedCats,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      cityInput,
      pincodeInput,
      selectedConditions,
      navigate,
    ]
  );

  // Search input handler with debounce
  const searchTimeoutRef = useRef<any>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchTimeoutRef.current = null;
      syncUrlParams({ qVal: val });
    }, 300);
  };

  // Sync local filter state when URL search params change via Back/Forward or external links
  useEffect(() => {
    if (!searchTimeoutRef.current) {
      setSearchQuery(search.q || "");
    }
    const nextCats =
      urlCat && urlCat !== "all"
        ? urlCat
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter((s) => Boolean(s) && s !== "all")
        : [];
    setSelectedCats(nextCats);

    const minVal = Number(search.min_p);
    setMinPrice(!isNaN(minVal) && minVal >= 0 ? minVal : 0);

    const maxVal = Number(search.max_p);
    setMaxPrice(!isNaN(maxVal) && maxVal > 0 && maxVal <= 10000 ? maxVal : 10000);

    setStartDate(search.start || "");
    setEndDate(search.end || "");
    setCityInput(search.city || "");
    setPincodeInput(search.pincode || "");

    setSelectedConditions(
      search.cond
        ? search.cond
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : ["new", "used"]
    );
  }, [
    search.q,
    urlCat,
    search.min_p,
    search.max_p,
    search.start,
    search.end,
    search.city,
    search.pincode,
    search.cond,
  ]);

  // Category Toggle
  const handleToggleCat = (catId: string) => {
    let next: string[];
    if (selectedCats.includes(catId)) {
      next = selectedCats.filter((c) => c !== catId);
    } else {
      next = [...selectedCats, catId];
    }
    setSelectedCats(next);
    syncUrlParams({ cat: next });
  };

  // Condition Toggle
  const handleToggleCondition = (cond: "new" | "used") => {
    let next: string[];
    if (selectedConditions.includes(cond)) {
      if (selectedConditions.length === 1) return; // Keep at least 1 selected
      next = selectedConditions.filter((c) => c !== cond);
    } else {
      next = [...selectedConditions, cond];
    }
    setSelectedConditions(next);
    syncUrlParams({ conds: next });
  };

  // Reset Everything
  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedCats([]);
    setMinPrice(0);
    setMaxPrice(10000);
    setStartDate("");
    setEndDate("");
    setCityInput("");
    setPincodeInput("");
    setSelectedConditions(["new", "used"]);

    navigate({
      to: "/filters",
      search: {},
      replace: true,
    });
  };

  // Real Category Counts (derived from available products)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PRIMARY_CATEGORIES.forEach((c) => {
      counts[c.id] = 0;
    });

    const activeList = products.filter((p: any) => {
      if (isFakeOrDeletedProduct(p)) return false;
      const isApproved =
        p.status === "approved" ||
        p.verificationStatus === "approved" ||
        p.verificationStatus === "verified" ||
        p.available === true;
      return isApproved && !isUserOwnProduct(p, user);
    });

    activeList.forEach((p) => {
      PRIMARY_CATEGORIES.forEach((c) => {
        if (matchesProductCategory(p.category, c.id)) {
          counts[c.id] = (counts[c.id] || 0) + 1;
        }
      });
    });

    return counts;
  }, [products, user]);

  // Condition Counts
  const conditionCounts = useMemo(() => {
    let newCount = 0;
    let usedCount = 0;
    products.forEach((p: any) => {
      if (isFakeOrDeletedProduct(p) || isUserOwnProduct(p, user)) return;
      const cond = String(p.condition || p.condition_grade || "Like New").toLowerCase();
      if (cond.includes("new") || cond.includes("mint")) {
        newCount++;
      } else {
        usedCount++;
      }
    });
    return { new: newCount, used: usedCount };
  }, [products, user]);

  // Filtered Products matching current criteria
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (isFakeOrDeletedProduct(p)) return false;
      const isApproved =
        p.status === "approved" ||
        p.verificationStatus === "approved" ||
        p.verificationStatus === "verified" ||
        p.available === true;
      if (!isApproved || isUserOwnProduct(p, user)) return false;

      // 1. Text Search Query Filter
      if (searchQuery.trim()) {
        const qLower = searchQuery.trim().toLowerCase();
        const pTitle = String(p.title || p.name || "").toLowerCase();
        const pDesc = String(p.description || "").toLowerCase();
        const pBrand = String(p.brand || "").toLowerCase();
        const pCat = String(p.category || "").toLowerCase();
        if (
          !pTitle.includes(qLower) &&
          !pDesc.includes(qLower) &&
          !pBrand.includes(qLower) &&
          !pCat.includes(qLower)
        ) {
          return false;
        }
      }

      // 2. Category Filter (OR logic across selected)
      if (selectedCats.length > 0) {
        const matchesAny = selectedCats.some((c) => matchesProductCategory(p.category, c));
        if (!matchesAny) return false;
      }

      // 3. Price Filter
      const rate = Number(p.price || p.daily_rate || p.dailyRate || 0);
      if (minPrice > 0 && rate < minPrice) return false;
      if (maxPrice < 10000 && rate > maxPrice) return false;

      // 4. Location Filter
      if (cityInput && cityInput.trim() && cityInput.toLowerCase() !== "all cities") {
        const term = cityInput.trim().toLowerCase();
        const pCity = String(
          p.city || p.area || p.owner_city || p.location || p.owner?.city || p.owner_address || ""
        ).toLowerCase();
        if (!pCity.includes(term)) return false;
      }
      if (pincodeInput && pincodeInput.trim()) {
        const pinTerm = pincodeInput.trim();
        const pPin = String(p.pincode || p.owner_pincode || "");
        if (!pPin.includes(pinTerm)) return false;
      }

      // 5. Condition Filter
      if (selectedConditions.length === 1) {
        const pCond = String(p.condition || p.condition_grade || "Like New").toLowerCase();
        const isNew = pCond.includes("new") || pCond.includes("mint");
        if (selectedConditions[0] === "new" && !isNew) return false;
        if (selectedConditions[0] === "used" && isNew) return false;
      }

      return true;
    });
  }, [
    products,
    user,
    searchQuery,
    selectedCats,
    minPrice,
    maxPrice,
    cityInput,
    pincodeInput,
    selectedConditions,
  ]);

  // Build List of Removable Active Filter Chips
  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

    // Search query chip
    if (searchQuery.trim()) {
      chips.push({
        id: "search-q",
        label: `"${searchQuery.trim()}"`,
        onRemove: () => {
          setSearchQuery("");
          syncUrlParams({ qVal: "" });
        },
      });
    }

    // Category chips
    selectedCats.forEach((catId) => {
      const match = PRIMARY_CATEGORIES.find((c) => c.id === catId);
      chips.push({
        id: `cat-${catId}`,
        label: match ? match.name : getCategoryDisplayLabel(catId),
        onRemove: () => handleToggleCat(catId),
      });
    });

    // Price chip
    if (minPrice > 0 || maxPrice < 10000) {
      chips.push({
        id: "price-range",
        label:
          minPrice > 0
            ? `₹${minPrice.toLocaleString("en-IN")} – ${
                maxPrice >= 10000 ? "Any" : `₹${maxPrice.toLocaleString("en-IN")}`
              }`
            : `≤ ₹${maxPrice.toLocaleString("en-IN")}/day`,
        onRemove: () => {
          setMinPrice(0);
          setMaxPrice(10000);
          syncUrlParams({ minP: 0, maxP: 10000 });
        },
      });
    }

    // Availability chip
    if (startDate || endDate) {
      chips.push({
        id: "dates",
        label: `${startDate || "Any"} → ${endDate || "Any"}`,
        onRemove: () => {
          setStartDate("");
          setEndDate("");
          syncUrlParams({ startD: "", endD: "" });
        },
      });
    }

    // Location chip
    if (cityInput && cityInput !== "All Cities") {
      chips.push({
        id: "city",
        label: `City: ${cityInput}`,
        onRemove: () => {
          setCityInput("");
          syncUrlParams({ cityVal: "" });
        },
      });
    }
    if (pincodeInput) {
      chips.push({
        id: "pincode",
        label: `PIN: ${pincodeInput}`,
        onRemove: () => {
          setPincodeInput("");
          syncUrlParams({ pinVal: "" });
        },
      });
    }

    // Condition chip
    if (selectedConditions.length === 1) {
      chips.push({
        id: "condition",
        label: selectedConditions[0] === "new" ? "Brand New" : "Verified Used",
        onRemove: () => {
          setSelectedConditions(["new", "used"]);
          syncUrlParams({ conds: ["new", "used"] });
        },
      });
    }

    return chips;
  }, [
    searchQuery,
    selectedCats,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    cityInput,
    pincodeInput,
    selectedConditions,
    syncUrlParams,
  ]);

  // Sidebar Filter Section Component (reusable for desktop & mobile with unique DOM prefixes)
  const renderSidebarFilters = (isMobileView = false) => {
    const idPrefix = isMobileView ? "mobile" : "desktop";
    // Exact background matching so top-border notch interruptions stay seamless across surfaces
    const notchBgClass = isMobileView
      ? "bg-white dark:bg-[#1E1E1E]"
      : "bg-neutral-50 dark:bg-[#1E1E1E]";

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* 1. CATEGORY SECTION BOX */}
        <SectionBox
          title="Category"
          titleClassName="text-xs sm:text-[13px] font-semibold px-1"
          cutoutBgClass={notchBgClass}
          className="p-3 sm:p-4 pt-4 sm:pt-5.5 rounded-xl sm:rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs"
          action={
            selectedCats.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCats([]);
                  syncUrlParams({ cat: [] });
                }}
                className="text-xs font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white cursor-pointer px-1 transition-colors"
              >
                Clear all
              </button>
            ) : null
          }
        >
          <div className="space-y-1 sm:space-y-1.5 mt-0.5">
            {PRIMARY_CATEGORIES.map((cat) => {
              const isChecked = selectedCats.includes(cat.id);
              const count = categoryCounts[cat.id] ?? 0;
              const inputId = `${isMobileView ? "mobile" : "desktop"}-filter-cat-${cat.id}`;

              return (
                <label
                  key={cat.id}
                  htmlFor={inputId}
                  className="group flex items-center justify-between py-1.5 sm:py-1 px-1.5 sm:px-2 rounded-md cursor-pointer select-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleCat(cat.id)}
                      className="sr-only peer"
                    />
                    {/* Decorative Checkbox Indicator */}
                    <div
                      aria-hidden="true"
                      className={cn(
                        "w-4 h-4 rounded-[4px] flex items-center justify-center transition-colors duration-150 shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-950 dark:peer-focus-visible:ring-white peer-focus-visible:ring-offset-1",
                        isChecked
                          ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                          : "bg-transparent border border-neutral-400 dark:border-neutral-600 group-hover:border-neutral-700 dark:group-hover:border-neutral-400"
                      )}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[2]" />}
                    </div>

                    <span
                      className={cn(
                        "text-xs transition-colors truncate",
                        isChecked
                          ? "text-neutral-950 dark:text-white font-semibold"
                          : "text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-950 dark:group-hover:text-white"
                      )}
                    >
                      {cat.name}
                    </span>
                  </div>

                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium tabular-nums ml-1.5 shrink-0">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        </SectionBox>

        {/* 2. PRICE RANGE SECTION BOX */}
        <SectionBox
          title="Price"
          titleClassName="text-xs sm:text-[13px] font-semibold px-1"
          cutoutBgClass={notchBgClass}
          className="p-3 sm:p-4 pt-4 sm:pt-5.5 rounded-xl sm:rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-3 sm:space-y-4"
          badge={
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
              {minPrice > 0
                ? `₹${minPrice}–${maxPrice >= 10000 ? "10k+" : maxPrice}`
                : maxPrice >= 10000
                ? "Any"
                : `≤₹${maxPrice}`}
            </span>
          }
          action={
            (minPrice > 0 || maxPrice < 10000) ? (
              <button
                type="button"
                onClick={() => {
                  setMinPrice(0);
                  setMaxPrice(10000);
                  syncUrlParams({ minP: 0, maxP: 10000 });
                }}
                className="text-xs font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white cursor-pointer px-1 transition-colors"
              >
                Clear all
              </button>
            ) : null
          }
        >
          <div className="pt-0.5 sm:pt-1">
            <WakeSlider
              min={200}
              max={10000}
              step={200}
              value={maxPrice}
              onChange={(val) => {
                setMaxPrice(val);
              }}
              onChangeEnd={(val) => {
                syncUrlParams({ maxP: val });
              }}
              formatValue={(v) => (v >= 10000 ? "Any" : `≤ ₹${v.toLocaleString("en-IN")}`)}
              label="Max Rate"
              barCount={12}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-0.5 sm:pt-1">
            <Input
              id={`${idPrefix}-filter-price-min`}
              label="Min"
              type="number"
              min={0}
              max={maxPrice - 100}
              step={100}
              value={minPrice || ""}
              placeholder="0"
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value) || 0);
                setMinPrice(val);
                syncUrlParams({ minP: val });
              }}
              cutoutBgClass={notchBgClass}
              className="text-xs font-mono tabular-nums"
              inputWrapperClassName="h-9 sm:h-11 px-2.5 sm:px-4 rounded-xl border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            />
            <Input
              id={`${idPrefix}-filter-price-max`}
              label="Max"
              type="number"
              min={minPrice + 100}
              max={10000}
              step={100}
              value={maxPrice >= 10000 ? "" : maxPrice}
              placeholder="10k+"
              onChange={(e) => {
                const val = Number(e.target.value) || 10000;
                const clamped = Math.min(10000, Math.max(minPrice + 100, val));
                setMaxPrice(clamped);
                syncUrlParams({ maxP: clamped });
              }}
              cutoutBgClass={notchBgClass}
              className="text-xs font-mono tabular-nums"
              inputWrapperClassName="h-9 sm:h-11 px-2.5 sm:px-4 rounded-xl border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 font-medium tabular-nums">
            <span>₹0</span>
            <span>₹10k</span>
          </div>
        </SectionBox>

        {/* 3. AVAILABILITY DATES SECTION BOX */}
        <SectionBox
          title="Dates"
          titleClassName="text-xs sm:text-[13px] font-semibold px-1"
          icon={<Calendar className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />}
          cutoutBgClass={notchBgClass}
          className="p-3 sm:p-4 pt-4 sm:pt-5.5 rounded-xl sm:rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-3"
          action={
            startDate || endDate ? (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  syncUrlParams({ startD: "", endD: "" });
                }}
                className="text-xs font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white cursor-pointer px-1 transition-colors"
              >
                Clear
              </button>
            ) : null
          }
        >
          <div className="space-y-2.5 sm:space-y-3">
            <Input
              id={`${idPrefix}-filter-date-start`}
              label="Start"
              type="date"
              min={todayStr || undefined}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                syncUrlParams({ startD: e.target.value });
              }}
              icon={<Calendar className="h-3.5 w-3.5 stroke-[1.75]" />}
              cutoutBgClass={notchBgClass}
              className="text-xs [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert cursor-pointer"
              inputWrapperClassName="h-9 sm:h-11 px-2.5 sm:px-4 rounded-xl border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            />

            <Input
              id={`${idPrefix}-filter-date-end`}
              label="End"
              type="date"
              min={startDate || todayStr || undefined}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                syncUrlParams({ endD: e.target.value });
              }}
              icon={<Calendar className="h-3.5 w-3.5 stroke-[1.75]" />}
              cutoutBgClass={notchBgClass}
              className="text-xs [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert cursor-pointer"
              inputWrapperClassName="h-9 sm:h-11 px-2.5 sm:px-4 rounded-xl border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            />
          </div>
        </SectionBox>

        {/* 4. LOCATION SECTION BOX */}
        <SectionBox
          title="Location"
          titleClassName="text-xs sm:text-[13px] font-semibold px-1"
          icon={<MapPin className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />}
          cutoutBgClass={notchBgClass}
          className="p-3 sm:p-4 pt-4 sm:pt-5.5 rounded-xl sm:rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-3"
          action={
            cityInput || pincodeInput ? (
              <button
                type="button"
                onClick={() => {
                  setCityInput("");
                  setPincodeInput("");
                  syncUrlParams({ cityVal: "", pinVal: "" });
                }}
                className="text-xs font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white cursor-pointer px-1 transition-colors"
              >
                Clear
              </button>
            ) : null
          }
        >
          {/* GPS Quick Detect Pill Button (Monochrome) */}
          <button
            type="button"
            onClick={() => {
              detectLocation();
              if (detectedCity && detectedCity !== "All Cities") {
                setCityInput(detectedCity);
                syncUrlParams({ cityVal: detectedCity });
              }
            }}
            className="w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 dark:bg-[#1E1E1E] dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/80 text-xs text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
              <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate text-xs">
                {isDetecting ? "GPS..." : detectedCity || "Auto GPS"}
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-200/80 dark:bg-neutral-800 px-2 py-0.5 rounded-md shrink-0">
              Auto
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:space-y-3">
            <Input
              id={`${idPrefix}-filter-city`}
              label="City"
              type="text"
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value);
                syncUrlParams({ cityVal: e.target.value });
              }}
              placeholder="City"
              icon={<MapPin className="h-3.5 w-3.5 stroke-[1.75]" />}
              cutoutBgClass={notchBgClass}
              className="text-xs"
              inputWrapperClassName="h-9 sm:h-11 px-2.5 sm:px-4 rounded-xl border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
              rightAdornment={
                cityInput ? (
                  <button
                    type="button"
                    aria-label="Clear city filter"
                    onClick={() => {
                      setCityInput("");
                      syncUrlParams({ cityVal: "" });
                    }}
                    className="p-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null
              }
            />

            <Input
              id={`${idPrefix}-filter-pin`}
              label="PIN"
              type="text"
              value={pincodeInput}
              onChange={(e) => {
                setPincodeInput(e.target.value);
                syncUrlParams({ pinVal: e.target.value });
              }}
              placeholder="PIN"
              icon={<Navigation className="h-3.5 w-3.5 stroke-[1.75]" />}
              cutoutBgClass={notchBgClass}
              className="text-xs font-mono tabular-nums"
              inputWrapperClassName="h-9 sm:h-11 px-2.5 sm:px-4 rounded-xl border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
              rightAdornment={
                pincodeInput ? (
                  <button
                    type="button"
                    aria-label="Clear PIN filter"
                    onClick={() => {
                      setPincodeInput("");
                      syncUrlParams({ pinVal: "" });
                    }}
                    className="p-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null
              }
            />
          </div>
        </SectionBox>

        {/* 5. PRODUCT CONDITION SECTION BOX */}
        <SectionBox
          title="Condition"
          titleClassName="text-xs sm:text-[13px] font-semibold px-1"
          icon={<ShieldCheck className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />}
          cutoutBgClass={notchBgClass}
          className="p-3 sm:p-4 pt-4 sm:pt-5.5 rounded-xl sm:rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs"
        >
          <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-2 mt-0.5">
            {[
              { id: "new" as const, label: "Brand New", count: conditionCounts.new },
              { id: "used" as const, label: "Verified Used", count: conditionCounts.used },
            ].map((cond) => {
              const isChecked = selectedConditions.includes(cond.id);
              const isOnlySelected = isChecked && selectedConditions.length === 1;
              const inputId = `${isMobileView ? "mobile" : "desktop"}-filter-cond-${cond.id}`;

              return (
                <label
                  key={cond.id}
                  htmlFor={inputId}
                  className={cn(
                    "group flex items-center justify-between py-1.5 px-2 rounded-md select-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
                    isOnlySelected ? "cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={isChecked}
                      aria-disabled={isOnlySelected}
                      onChange={() => {
                        if (!isOnlySelected) {
                          handleToggleCondition(cond.id);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div
                      aria-hidden="true"
                      className={cn(
                        "w-4 h-4 rounded-[4px] flex items-center justify-center transition-colors duration-150 shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-950 dark:peer-focus-visible:ring-white peer-focus-visible:ring-offset-1",
                        isChecked
                          ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                          : "bg-transparent border border-neutral-400 dark:border-neutral-600 group-hover:border-neutral-700 dark:group-hover:border-neutral-400"
                      )}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[2]" />}
                    </div>

                    <span
                      className={cn(
                        "text-xs sm:text-sm transition-colors truncate",
                        isChecked
                          ? "text-neutral-950 dark:text-white font-semibold"
                          : "text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-950 dark:group-hover:text-white"
                      )}
                    >
                      {cond.label}
                    </span>
                  </div>

                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium tabular-nums ml-1 shrink-0">
                    {cond.count}
                  </span>
                </label>
              );
            })}
          </div>
        </SectionBox>

        {/* Clear All Bottom Button for sidebar */}
        <button
          type="button"
          onClick={handleClearAll}
          className="w-full min-h-[44px] py-2 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-center cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Clear all</span>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-100 font-sans antialiased transition-colors flex flex-col selection:bg-neutral-800 selection:text-white">
      {/* =================================================================== */}
      {/* TOP HEADER: BACK TO EXPLORE + TITLE + THEME TOGGLE + DONE BUTTON    */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-30 h-16 shrink-0 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-8 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Back Link & Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/categories"
            search={search as any}
            className="inline-flex items-center gap-1.5 sm:gap-2 min-h-[44px] px-2 -ml-1 text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            title="Return to standard Explore view"
          >
            <ArrowLeft className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
            <span className="hidden sm:inline">Back to Explore</span>
          </Link>
          <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-800 hidden sm:block" />
          <h1 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
            <span>Filter Marketplace</span>
            <span className="text-xs font-normal text-neutral-600 dark:text-neutral-400 tabular-nums">
              ({filteredProducts.length})
            </span>
          </h1>
        </div>

        {/* Right: Monochrome Header Theme Toggle + Done Button */}
        <div className="flex items-center gap-2 shrink-0">
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              className="h-11 w-11 sm:h-10 sm:w-10 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-neutral-950 dark:hover:border-white bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              {isDark ? (
                <Sun className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              )}
            </button>
          )}
          <Link
            to="/categories"
            search={search as any}
            className="inline-flex items-center justify-center min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
          >
            Done
          </Link>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN TWO-COLUMN BODY LAYOUT (Distinct Desktop & Mobile Sidebars)    */}
      {/* =================================================================== */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex relative min-h-[calc(100vh-4rem)]">
        {/* Desktop Static In-Flow Sidebar (uses #desktop-filter-* IDs) */}
        <aside
          aria-label="Desktop filters"
          className="hidden sm:flex sm:flex-col sm:shrink-0 sm:bg-neutral-50 sm:dark:bg-[#1E1E1E] sm:border-r sm:border-neutral-200 sm:dark:border-neutral-800 sm:w-[220px] md:w-[250px] lg:w-[280px] xl:w-[26%]"
        >
          <div className="flex-1 overflow-y-auto px-3.5 lg:px-5 xl:px-6 py-6 pb-28">
            {renderSidebarFilters(false)}
          </div>
        </aside>

        {/* Mobile Filter Drawer Backdrop + Panel (only mounted when open; uses #mobile-filter-* IDs) */}
        {isMobileFilterOpen && (
          <>
            <div
              onClick={() => setIsMobileFilterOpen(false)}
              className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
              aria-hidden="true"
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Mobile filters"
              className="sm:hidden fixed inset-y-0 left-0 z-50 w-[78vw] max-w-[300px] bg-white dark:bg-[#1E1E1E] shadow-2xl border-r border-neutral-200 dark:border-neutral-800 flex flex-col"
            >
              {/* Mobile Drawer Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1E1E1E] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1 rounded-lg bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Close</span>
                </button>

                <span className="font-bold text-xs text-neutral-900 dark:text-white inline-flex items-center gap-1.5">
                  <span>Filters</span>
                  {activeChips.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-semibold tabular-nums">
                      {activeChips.length}
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer px-2 py-1"
                >
                  Clear all
                </button>
              </div>

              {/* Mobile Scrollable Filter List */}
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {renderSidebarFilters(true)}
              </div>

              {/* Mobile Drawer Bottom Action */}
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Show {filteredProducts.length} Results</span>
                </button>
              </div>
            </aside>
          </>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN: PRODUCT RESULTS GRID (2 COLS MOBILE, 2-3 DESKTOP)   */}
        {/* ----------------------------------------------------------------- */}
        <main className="flex-1 min-w-0 px-3 sm:px-5 lg:px-8 py-3 sm:py-6 pb-28 md:pb-32 flex flex-col space-y-3 sm:space-y-6">
          {/* SEARCH INPUT BAR WITH NOTCH DESIGN */}
          <div className="w-full shrink-0">
            <Input
              label="Search Equipment"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search cameras, laptops, drones"
              icon={<Search className="h-4 w-4 sm:h-5 sm:w-5 stroke-[1.6]" />}
              cutoutBgClass="bg-neutral-50 dark:bg-[#1E1E1E]"
              className="text-xs sm:text-sm"
              inputWrapperClassName="h-11 sm:h-12 px-3 sm:px-5 rounded-xl border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E] shadow-xs"
              rightAdornment={
                searchQuery ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchQuery("");
                      syncUrlParams({ qVal: "" });
                    }}
                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null
              }
            />
          </div>

          {/* STICKY TOP ROW: REMOVABLE FILTER CHIPS + CLEAR ALL */}
          <div className="sticky top-16 z-20 bg-neutral-50/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md pt-1 pb-2.5 sm:pb-3 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between gap-2 sm:gap-3 flex-wrap min-h-[44px]">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="sm:hidden inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold shadow-xs cursor-pointer hover:opacity-90 transition-colors shrink-0"
                title="Open filters"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Filters</span>
                {activeChips.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-black/20 font-bold tabular-nums">
                    {activeChips.length}
                  </span>
                )}
              </button>
              {activeChips.map((chip) => (
                <div
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white dark:bg-[#1E1E1E] border border-neutral-300/80 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 transition-colors shadow-xs"
                >
                  <span className="truncate max-w-[120px] sm:max-w-none">{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}

              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer px-2 py-1 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Clear all</span>
                </button>
              )}

              {activeChips.length === 0 && (
                <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                  Showing all equipment. Use filters to narrow down.
                </span>
              )}
            </div>

            <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium tabular-nums shrink-0">
              {filteredProducts.length} {filteredProducts.length === 1 ? "gear" : "gears"}
            </div>
          </div>

          {/* PRODUCT CARDS GRID (2 COLS MOBILE, 2 COLS SM, 3 COLS LG) */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {filteredProducts.map((p: any) => {
                const rate = p.price || p.daily_rate || p.dailyRate || 0;
                const rawImg =
                  p.image ||
                  p.primary_image ||
                  (Array.isArray(p.images) && p.images[0]) ||
                  "";
                const itemKey = String(p.id);
                const hasFailedImage = Boolean(failedImages[itemKey]) || !rawImg;
                const productLocation = formatProductLocation(p);
                const isAvailable = isProductAvailable(p);

                return (
                  <Link
                    key={p.id}
                    to="/product/$id"
                    params={{ id: itemKey }}
                    search={{ from: "filters" } as any}
                    className="group bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col h-full justify-between transition-colors duration-200 cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                  >
                    {/* Top Image Container */}
                    <div className="relative w-full aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 mb-2 sm:mb-2.5 shrink-0 flex items-center justify-center">
                      {!hasFailedImage ? (
                        <img
                          src={rawImg}
                          alt={p.title || p.name || "Equipment"}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={() =>
                            setFailedImages((prev) =>
                              prev[itemKey] ? prev : { ...prev, [itemKey]: true }
                            )
                          }
                        />
                      ) : (
                        <Package
                          className="h-8 w-8 text-neutral-400 dark:text-neutral-600 stroke-[1.75]"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          "absolute top-1.5 right-1.5 sm:top-2 sm:right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border leading-tight backdrop-blur-md",
                          isAvailable
                            ? "bg-neutral-950/80 text-white border-white/15"
                            : "bg-neutral-950/85 text-neutral-300 border-white/15"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            isAvailable ? "bg-emerald-400" : "bg-rose-400"
                          )}
                          aria-hidden="true"
                        />
                        <span>{isAvailable ? "Available" : "Unavailable"}</span>
                      </span>
                      {p.condition && (
                        <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-950/85 text-white border border-white/15 leading-tight">
                          {p.condition}
                        </span>
                      )}
                    </div>

                    {/* Card Body & Pricing */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="min-w-0">
                        <h2 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate line-clamp-1 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors leading-snug">
                          {p.title || p.name}
                        </h2>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 min-w-0 leading-snug">
                          <MapPin className="h-3 w-3 shrink-0 stroke-[1.75]" aria-hidden="true" />
                          <span className="truncate">{productLocation}</span>
                        </p>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-baseline justify-between gap-1">
                        <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white tabular-nums leading-none">
                          ₹{Number(rate).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 leading-none">
                          / day
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400">
                <Search className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-1 max-w-md">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  No products match your filters
                </h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Try unchecking some categories, expanding the daily price range, or clearing location criteria.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClearAll}
                className="cursor-pointer font-semibold inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Clear all filters</span>
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
