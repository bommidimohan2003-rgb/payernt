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
import { INITIAL_FALLBACK_PRODUCTS } from "@/utils/fallbackProducts";
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
    min_p?: string;
    max_p?: string;
    city?: string;
    pincode?: string;
    cond?: string;
    start?: string;
    end?: string;
    sort?: string;
  };

  // 1. Search Query State
  const [searchQuery, setSearchQuery] = useState<string>(search.q || "");

  // 2. Categories State (Multi-selection)
  const [selectedCats, setSelectedCats] = useState<string[]>(() => {
    if (!search.cat || search.cat === "all") return [];
    return search.cat
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
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

  // 4. Availability Dates
  const todayStr = new Date().toISOString().split("T")[0];
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

  // 7. Products Catalog State
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = storage.get<Product[]>("payent_server_products", []);
    const clean = cached.filter((p) => !isFakeOrDeletedProduct(p));
    return clean.length > 0 ? clean : INITIAL_FALLBACK_PRODUCTS;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 8. Mobile Sidebar Drawer Toggle
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Fetch real products on mount
  useEffect(() => {
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
      syncUrlParams({ qVal: val });
    }, 300);
  };

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
      const pCat = String(p.category || "").toLowerCase();
      PRIMARY_CATEGORIES.forEach((c) => {
        if (
          pCat.includes(c.id) ||
          (c.id === "laptops" && (pCat.includes("pc") || pCat.includes("mac")))
        ) {
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
        const pCat = String(p.category || "").toLowerCase();
        const matchesAny = selectedCats.some((c) => {
          if (pCat.includes(c)) return true;
          if (c === "laptops" && (pCat.includes("pc") || pCat.includes("mac"))) return true;
          return false;
        });
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
          p.city || p.owner_city || p.location || p.owner_address || ""
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
        label: match ? match.name : catId,
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

  // Sidebar Filter Section Component (reusable for desktop & mobile drawer)
  const renderSidebarFilters = (isMobileView = false) => {
    // Exact background matching so top-border notch interruptions are 100% invisible and seamless
    const notchBgClass = isMobileView
      ? "bg-white dark:bg-[#1E1E1E]"
      : "bg-neutral-50 dark:bg-[#1E1E1E]";

    return (
      <div className="space-y-6">
        {/* 1. CATEGORY SECTION BOX */}
        <SectionBox
          title="Category"
          cutoutBgClass={notchBgClass}
          className="p-4 pt-5.5 rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs"
          action={
            selectedCats.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCats([]);
                  syncUrlParams({ cat: [] });
                }}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer px-1 transition-colors"
              >
                Reset
              </button>
            ) : null
          }
        >
          <div className="space-y-2 mt-1">
            {PRIMARY_CATEGORIES.map((cat) => {
              const isChecked = selectedCats.includes(cat.id);
              const count = categoryCounts[cat.id] ?? 0;

              return (
                <label
                  key={cat.id}
                  onClick={() => handleToggleCat(cat.id)}
                  className="group flex items-center justify-between py-1.5 px-2 -mx-1 rounded-lg cursor-pointer select-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                >
                  <div className="flex items-center gap-3">
                    {/* Reference Screenshot Checkbox */}
                    <div
                      className={cn(
                        "w-4.5 h-4.5 rounded-[5px] flex items-center justify-center transition-all duration-150 shrink-0",
                        isChecked
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs"
                          : "bg-transparent border border-neutral-400 dark:border-neutral-700 group-hover:border-neutral-600 dark:group-hover:border-neutral-500"
                      )}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <span
                      className={cn(
                        "text-sm tracking-tight transition-colors",
                        isChecked
                          ? "text-neutral-900 dark:text-white font-medium"
                          : "text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white"
                      )}
                    >
                      {cat.name}
                    </span>
                  </div>

                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        </SectionBox>

        {/* 2. PRICE RANGE SECTION BOX (WAKESLIDER + NOTCH NUMERIC INPUTS) */}
        <SectionBox
          title="Price Range"
          cutoutBgClass={notchBgClass}
          className="p-4 pt-5.5 rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-4"
          badge={
            <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 font-mono">
              {minPrice > 0
                ? `₹${minPrice.toLocaleString("en-IN")} – ${maxPrice >= 10000 ? "₹10,000+" : `₹${maxPrice.toLocaleString("en-IN")}`}`
                : maxPrice >= 10000
                ? "Any price"
                : `≤ ₹${maxPrice.toLocaleString("en-IN")}/day`}
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
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer px-1 transition-colors"
              >
                Reset
              </button>
            ) : null
          }
        >
          {/* React Bits WakeSlider: Price Wave Slider */}
          <div className="pt-1">
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
              formatValue={(v) => (v >= 10000 ? "Any price" : `≤ ₹${v.toLocaleString("en-IN")}/day`)}
              label="Max Daily Rate"
              barCount={30}
            />
          </div>

          {/* Direct Min / Max Input Fields with Notch Styling (Image 1 style) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Input
              label="Min (₹)"
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
              className="text-xs font-mono"
              inputWrapperClassName="h-11 sm:h-11 rounded-[16px] border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            />
            <Input
              label="Max (₹)"
              type="number"
              min={minPrice + 100}
              max={10000}
              step={100}
              value={maxPrice >= 10000 ? "" : maxPrice}
              placeholder="10,000+"
              onChange={(e) => {
                const val = Number(e.target.value) || 10000;
                const clamped = Math.min(10000, Math.max(minPrice + 100, val));
                setMaxPrice(clamped);
                syncUrlParams({ maxP: clamped });
              }}
              cutoutBgClass={notchBgClass}
              className="text-xs font-mono"
              inputWrapperClassName="h-11 sm:h-11 rounded-[16px] border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            />
          </div>

          {/* Quick Min / Max bound hints */}
          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>₹0/day</span>
            <span>₹10,000/day</span>
          </div>
        </SectionBox>

        {/* 3. AVAILABILITY DATES SECTION BOX (INPUTS WITH NOTCH STYLING) */}
        <SectionBox
          title="Availability Dates"
          icon={<Calendar className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />}
          cutoutBgClass={notchBgClass}
          className="p-4 pt-5.5 rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-3.5"
          action={
            startDate || endDate ? (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  syncUrlParams({ startD: "", endD: "" });
                }}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer px-1 transition-colors"
              >
                Clear
              </button>
            ) : null
          }
        >
          <div className="space-y-3">
            {/* Start Date Input using Notch Design */}
            <Input
              label="Start Date"
              type="date"
              min={todayStr}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                syncUrlParams({ startD: e.target.value });
              }}
              icon={<Calendar className="h-4 w-4 stroke-[1.6]" />}
              cutoutBgClass={notchBgClass}
              className="text-xs [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert cursor-pointer"
              inputWrapperClassName="h-11 sm:h-11 rounded-[16px] border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            />

            {/* End Date Input using Notch Design */}
            <Input
              label="End Date"
              type="date"
              min={startDate || todayStr}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                syncUrlParams({ endD: e.target.value });
              }}
              icon={<Calendar className="h-4 w-4 stroke-[1.6]" />}
              cutoutBgClass={notchBgClass}
              className="text-xs [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert cursor-pointer"
              inputWrapperClassName="h-11 sm:h-11 rounded-[16px] border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            />
          </div>

          <p className="text-[11px] text-neutral-500 leading-tight">
            Backend excludes confirmed rental conflicts for chosen dates.
          </p>
        </SectionBox>

        {/* 4. LOCATION & DISTANCE SECTION BOX */}
        <SectionBox
          title="Location & Distance"
          icon={<MapPin className="h-3.5 w-3.5 text-[#8FAF7E]" />}
          cutoutBgClass={notchBgClass}
          className="p-4 pt-5.5 rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-3.5"
          action={
            cityInput || pincodeInput ? (
              <button
                type="button"
                onClick={() => {
                  setCityInput("");
                  setPincodeInput("");
                  syncUrlParams({ cityVal: "", pinVal: "" });
                }}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer px-1 transition-colors"
              >
                Clear
              </button>
            ) : null
          }
        >
          {/* GPS Quick Detect Pill Button */}
          <button
            type="button"
            onClick={() => {
              detectLocation();
              if (detectedCity && detectedCity !== "All Cities") {
                setCityInput(detectedCity);
                syncUrlParams({ cityVal: detectedCity });
              }
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-[16px] bg-white hover:bg-neutral-50 dark:bg-[#1E1E1E] dark:hover:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 text-xs text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#8FAF7E] shrink-0" />
              <span className="text-neutral-800 dark:text-neutral-200 font-medium truncate">
                {isDetecting ? "Detecting GPS..." : detectedCity || "Use Current GPS Location"}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#8FAF7E] uppercase bg-[#8FAF7E]/10 px-1.5 py-0.5 rounded">
              GPS
            </span>
          </button>

          {/* City Input with Notch Design */}
          <Input
            label="City / Region"
            type="text"
            value={cityInput}
            onChange={(e) => {
              setCityInput(e.target.value);
              syncUrlParams({ cityVal: e.target.value });
            }}
            placeholder="e.g. Hyderabad, Bengaluru..."
            icon={<MapPin className="h-4 w-4 stroke-[1.6]" />}
            cutoutBgClass={notchBgClass}
            className="text-xs"
            inputWrapperClassName="h-11 sm:h-11 rounded-[16px] border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            rightAdornment={
              cityInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setCityInput("");
                    syncUrlParams({ cityVal: "" });
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null
            }
          />

          {/* PIN Code Input with Notch Design */}
          <Input
            label="PIN Code"
            type="text"
            value={pincodeInput}
            onChange={(e) => {
              setPincodeInput(e.target.value);
              syncUrlParams({ pinVal: e.target.value });
            }}
            placeholder="e.g. 500081"
            icon={<Navigation className="h-4 w-4 stroke-[1.6]" />}
            cutoutBgClass={notchBgClass}
            className="text-xs font-mono"
            inputWrapperClassName="h-11 sm:h-11 rounded-[16px] border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E]"
            rightAdornment={
              pincodeInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setPincodeInput("");
                    syncUrlParams({ pinVal: "" });
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null
            }
          />
        </SectionBox>

        {/* 5. PRODUCT CONDITION SECTION BOX */}
        <SectionBox
          title="Condition"
          icon={<ShieldCheck className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />}
          cutoutBgClass={notchBgClass}
          className="p-4 pt-5.5 rounded-2xl border-neutral-300/80 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs"
        >
          <div className="space-y-2 mt-1">
            {[
              { id: "new" as const, label: "Brand New / Mint", count: conditionCounts.new },
              { id: "used" as const, label: "Verified Used", count: conditionCounts.used },
            ].map((cond) => {
              const isChecked = selectedConditions.includes(cond.id);

              return (
                <label
                  key={cond.id}
                  onClick={() => handleToggleCondition(cond.id)}
                  className="group flex items-center justify-between py-1.5 px-2 -mx-1 rounded-lg cursor-pointer select-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-4.5 h-4.5 rounded-[5px] flex items-center justify-center transition-all duration-150 shrink-0",
                        isChecked
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs"
                          : "bg-transparent border border-neutral-400 dark:border-neutral-700 group-hover:border-neutral-600 dark:group-hover:border-neutral-500"
                      )}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <span
                      className={cn(
                        "text-sm tracking-tight transition-colors",
                        isChecked
                          ? "text-neutral-900 dark:text-white font-medium"
                          : "text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white"
                      )}
                    >
                      {cond.label}
                    </span>
                  </div>

                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                    {cond.count}
                  </span>
                </label>
              );
            })}
          </div>
        </SectionBox>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-100 font-sans antialiased transition-colors flex flex-col selection:bg-neutral-800 selection:text-white">
      {/* =================================================================== */}
      {/* TOP HEADER: BACK TO EXPLORE + BRAND + TITLE + DONE BUTTON           */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-30 h-16 shrink-0 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Left: Back Link & Title */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/categories"
            search={search as any}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
            title="Return to standard Explore view"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2]" />
            <span className="hidden sm:inline">Back to Explore</span>
          </Link>
          <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-800 hidden sm:block" />
          <h1 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Filter Marketplace</span>
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 hidden md:inline">
              ({filteredProducts.length} items)
            </span>
          </h1>
        </div>

        {/* Right: Mobile Filter Drawer Toggle + Done Button */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-900 dark:text-white cursor-pointer transition-colors shadow-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#8FAF7E]" />
            <span>Filters ({activeChips.length})</span>
          </button>

          <Link
            to="/categories"
            search={search as any}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Done
          </Link>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN TWO-COLUMN BODY LAYOUT (SCREENSHOT PROPORTIONS: 28% / 72%)     */}
      {/* Desktop: Exactly calculated viewport height for independent scroll  */}
      {/* =================================================================== */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex relative overflow-hidden lg:h-[calc(100vh-4rem)]">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN: DESKTOP FILTER SIDEBAR (~28% DESKTOP)                */}
        {/* Independently scrollable, stable, and visually balanced           */}
        {/* ----------------------------------------------------------------- */}
        <aside className="hidden lg:flex flex-col w-[320px] xl:w-[28%] shrink-0 h-full bg-neutral-50 dark:bg-[#1E1E1E] border-r border-neutral-200 dark:border-neutral-800">
          <div className="flex-1 overflow-y-auto px-5 xl:px-6 py-6 custom-scrollbar">
            {renderSidebarFilters(false)}
          </div>
        </aside>

        {/* ----------------------------------------------------------------- */}
        {/* MOBILE FILTER DRAWER OVERLAY & SLIDE-OVER                         */}
        {/* Clean full-page experience on mobile without competing containers */}
        {/* ----------------------------------------------------------------- */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileSidebarOpen(false)}
            />

            {/* Slide-over panel */}
            <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#1E1E1E] ml-auto h-full flex flex-col shadow-2xl z-10">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#8FAF7E]" />
                  <span className="font-bold text-sm text-neutral-900 dark:text-white">
                    Filter Criteria ({activeChips.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
                {renderSidebarFilters(true)}
              </div>

              {/* Drawer Footer: Clear & Apply Actions */}
              <div className="p-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1E1E1E] flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-center cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                  <span>Clear all</span>
                </button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl font-bold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>Apply Filters ({filteredProducts.length})</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN: PRODUCT RESULTS GRID (~72% DESKTOP)                 */}
        {/* Sticky top controls + strictly aligned 3-column cards grid        */}
        {/* ----------------------------------------------------------------- */}
        <main className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 custom-scrollbar flex flex-col space-y-6">
          {/* SEARCH INPUT BAR WITH NOTCH DESIGN (Image 1 Style) */}
          <div className="w-full shrink-0">
            <Input
              label="Search Equipment"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search cameras, lenses, laptops, audio, lighting, drones..."
              icon={<Search className="h-5 w-5 stroke-[1.6]" />}
              cutoutBgClass="bg-neutral-50 dark:bg-[#1E1E1E]"
              className="text-sm sm:text-base"
              inputWrapperClassName="h-12 sm:h-13 rounded-[20px] border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E] shadow-xs"
              rightAdornment={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      syncUrlParams({ qVal: "" });
                    }}
                    className="p-1 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null
              }
            />
          </div>

          {/* STICKY TOP ROW: REMOVABLE FILTER CHIPS + CLEAR ALL (EXACT REFERENCE) */}
          <div className="sticky top-0 z-20 bg-neutral-50/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md pt-1 pb-3 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between gap-3 flex-wrap min-h-[38px]">
            <div className="flex items-center gap-2 flex-wrap">
              {activeChips.map((chip) => (
                <div
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E1E1E] border border-neutral-300/80 dark:border-neutral-700 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 transition-colors shadow-xs"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="text-neutral-400 hover:text-black dark:hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs sm:text-sm font-medium text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer px-2 py-1 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clear all</span>
                </button>
              )}

              {activeChips.length === 0 && (
                <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Showing all equipment. Use filters on the left to narrow down.
                </span>
              )}
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono shrink-0">
              {filteredProducts.length} {filteredProducts.length === 1 ? "gear" : "gears"} available
            </div>
          </div>

          {/* PRODUCT CARDS GRID (3 COLUMNS ON DESKTOP - EQUAL DIMENSIONS & ALIGNED) */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-24">
              {filteredProducts.map((p: any) => {
                const rate = p.price || p.daily_rate || p.dailyRate || 0;
                const img =
                  p.image ||
                  p.primary_image ||
                  (Array.isArray(p.images) && p.images[0]) ||
                  "/placeholder.png";
                const vendorName =
                  p.owner_name || p.ownerName || p.brand || "Verified Vendor";

                return (
                  <Link
                    key={p.id}
                    to="/product/$id"
                    params={{ id: String(p.id) }}
                    search={{ from: "filters" } as any}
                    className="group bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-3.5 flex flex-col h-full justify-between transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
                  >
                    {/* Top Image Container with Fixed Consistent Aspect Ratio */}
                    <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 mb-3 shrink-0">
                      <img
                        src={img}
                        alt={p.title || p.name || "Equipment"}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80";
                        }}
                      />
                      {p.condition && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-black/70 text-white backdrop-blur-xs border border-white/10">
                          {p.condition}
                        </span>
                      )}
                    </div>

                    {/* Card Body & Footer: Strictly Aligned (Image 2 style) */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight line-clamp-1 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                            {p.title || p.name}
                          </h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {vendorName}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white font-mono">
                            ₹{Number(rate).toLocaleString("en-IN")}
                          </span>
                          <span className="block text-[10px] text-neutral-500 dark:text-neutral-400 -mt-0.5">
                            / day
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                <Search className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  No products match your filters
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>Clear all filters</span>
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* FLOATING THEME TOGGLE (EXACT REFERENCE SCREENSHOT BOTTOM RIGHT)     */}
      {/* =================================================================== */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#1E1E1E] border border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-900 dark:text-white text-xs font-semibold shadow-xl cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Toggle Dark / Light Theme"
        >
          {isDark ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>Theme</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-blue-400" />
              <span>Theme</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
