import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Search as SearchIcon,
  X,
  ArrowUpDown,
  ChevronDown,
  Check,
  Layers,
  Camera,
  Laptop,
  Drone,
  Headphones,
  Speaker,
  Drill,
  BatteryCharging,
  Lightbulb,
  Bike,
  MapPin,
  RotateCcw,
  LayoutGrid,
  Heart,
  MessageSquare,
  SlidersHorizontal,
  Calendar,
  Bell,
  Music,
  Gamepad2,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { RentalProductCard, RentalProductCardSkeleton } from "@/components/common/RentalProductCard";
import { BackButton } from "@/components/common/BackButton";
import { advancedSearch } from "@/utils/searchEngine";
import { searchWithML } from "@/utils/smartSearch";
import {
  matchesProductCategory,
  getCategoryDisplayLabel,
  normalizeCategoryParam,
} from "@/utils/categoryFilter";
import type { Product, Category } from "@/types";
import { cn } from "@/lib/utils";
import { useSearch, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { tracker } from "@/utils/eventTracker";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { api } from "@/utils/api";
import { isFakeOrDeletedProduct, isUserOwnProduct } from "@/utils/productFilters";
import { useAuth } from "@/hooks/useAuth";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useWishlist } from "@/hooks/useWishlist";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { INITIAL_FALLBACK_PRODUCTS } from "@/utils/fallbackProducts";

type SortOption = "featured" | "newest" | "price_asc" | "price_desc" | "rating";

interface CategoryDefinition {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

// Category symbols and metadata preserved from the brand catalog cards
const PRIMARY_CATEGORIES: CategoryDefinition[] = [
  { id: "all", name: "All Categories", icon: Layers },
  { id: "laptops", name: "Laptops / PCs", icon: Laptop },
  { id: "cameras", name: "Cameras", icon: Camera },
  { id: "drones", name: "Drones", icon: Drone },
  { id: "audio", name: "Audio", icon: Headphones },
  { id: "sound", name: "Sound Equipment", icon: Speaker },
  { id: "tools", name: "Drills & Tools", icon: Drill },
  { id: "powerbanks", name: "Power Stations", icon: BatteryCharging },
  { id: "lighting", name: "Studio Lighting", icon: Lightbulb },
  { id: "bikes", name: "Bikes & Rides", icon: Bike },
];

const categoryIconMap: Record<
  string,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  all: Layers,
  electronics: Laptop,
  electronic: Laptop,
  vehicles: Bike,
  vehicle: Bike,
  music: Music,
  musical: Music,
  gaming: Gamepad2,
  game: Gamepad2,
  cameras: Camera,
  camera: Camera,
  laptops: Laptop,
  laptop: Laptop,
  drones: Drone,
  drone: Drone,
  audio: Headphones,
  sound: Speaker,
  tools: Drill,
  tool: Drill,
  drills: Drill,
  drill: Drill,
  powerbanks: BatteryCharging,
  powerbank: BatteryCharging,
  power: BatteryCharging,
  lighting: Lightbulb,
  light: Lightbulb,
  studio: Lightbulb,
  bikes: Bike,
  bike: Bike,
};

export default function Categories() {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as {
    q?: string;
    cat?: string;
    category?: string;
    brand?: string;
    min_p?: string;
    max_p?: string;
    city?: string;
    pincode?: string;
    cond?: string;
    start?: string;
    end?: string;
    sort?: string;
  };
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const targetRoute = pathname.startsWith("/categories")
    ? "/categories"
    : pathname.startsWith("/payent")
    ? "/payent/explore"
    : "/browse";

  const [q, setLocalQ] = useState(search.q || "");
  const normalizedCat = useMemo(
    () => normalizeCategoryParam(search as Record<string, unknown>),
    [search]
  );
  const activeCategory = normalizedCat || "all";
  const [sort, setSort] = useState<SortOption>(() => (search.sort as SortOption) || "featured");
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (normalizedCat && normalizedCat !== "all") {
      count += normalizedCat.split(",").filter(Boolean).length;
    }
    if (search.min_p && Number(search.min_p) > 0) count++;
    if (search.max_p && Number(search.max_p) < 10000) count++;
    if (search.city && search.city !== "All Cities") count++;
    if (search.pincode) count++;
    if (search.cond) count++;
    if (search.start || search.end) count++;
    if (search.sort && search.sort !== "featured") count++;
    return count;
  }, [search]);

  const [allProductsList, setAllProductsList] = useState<Product[]>(() =>
    INITIAL_FALLBACK_PRODUCTS.filter((p) => !isFakeOrDeletedProduct(p))
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  const [liveCategories, setLiveCategories] = useState<Category[]>([]);
  const [mlResults, setMlResults] = useState<Product[] | null>(null);

  // Hydrate client cache post-mount to avoid SSR/CSR hydration divergence (Obs B)
  useEffect(() => {
    const cached = storage.get<Product[]>("payent_server_products", []);
    if (Array.isArray(cached) && cached.length > 0) {
      const clean = cached.filter((p) => !isFakeOrDeletedProduct(p));
      if (clean.length > 0) {
        const merged = [...clean];
        for (const fallback of INITIAL_FALLBACK_PRODUCTS) {
          if (!merged.some((p) => String(p.id).toLowerCase() === String(fallback.id).toLowerCase())) {
            merged.push(fallback);
          }
        }
        setAllProductsList(merged);
      }
    }
    const cachedCats = storage.get<Category[]>("payent_live_categories", []);
    if (Array.isArray(cachedCats) && cachedCats.length > 0) {
      setLiveCategories(cachedCats);
    }
  }, []);

  const sortRef = useRef<HTMLDivElement>(null);
  const { wishlistCount } = useWishlist();
  const { unreadCount } = useUnreadMessages();
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Sync notification unread count for top bar
  useEffect(() => {
    const checkNotifs = async () => {
      const token = storage.get<string | null>(STORAGE_KEYS.token, null);
      if (!token) {
        setUnreadNotifsCount(0);
        return;
      }
      try {
        const notifs = await api.getNotifications(token);
        if (Array.isArray(notifs)) {
          const unread = notifs.filter((n: any) => !n.read).length;
          setUnreadNotifsCount(unread);
        }
      } catch {
        // ignore
      }
    };
    void checkNotifs();
    const interval = setInterval(checkNotifs, 15000);
    window.addEventListener("payent_notifications_updated", checkNotifs);
    return () => {
      clearInterval(interval);
      window.removeEventListener("payent_notifications_updated", checkNotifs);
    };
  }, [user]);

  // User location detection
  const {
    city: detectedCity,
    isDetecting,
    detectLocation,
  } = useUserLocation();

  const isLocationActive = Boolean(
    detectedCity &&
      detectedCity !== "Location unavailable" &&
      detectedCity !== "All Cities"
  );

  // Auto-close sort dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync search URL query with local state
  useEffect(() => {
    setLocalQ(search.q || "");
  }, [search.q]);

  // Track search events
  useEffect(() => {
    if (search.q && search.q.trim()) {
      const timer = setTimeout(() => {
        tracker.search(search.q!);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [search.q]);

  // Fetch real products from backend
  const fetchPublicProducts = useCallback(() => {
    api
      .getPublicProducts()
      .then((serverProducts) => {
        if (Array.isArray(serverProducts)) {
          const cleanList = serverProducts.filter((p) => !isFakeOrDeletedProduct(p));
          // Merge live backend products with showcase products so categories never empty out
          const merged = [...cleanList];
          for (const fallback of INITIAL_FALLBACK_PRODUCTS) {
            const exists = merged.some(
              (p) => String(p.id).toLowerCase() === String(fallback.id).toLowerCase()
            );
            if (!exists) {
              merged.push(fallback);
            }
          }
          setAllProductsList(merged);
          storage.set("payent_server_products", merged);
        }
      })
      .catch((err) => {
        console.warn("[Browse] Server products fetch notice:", err);
      })
      .finally(() => {
        setIsLoadingProducts(false);
      });
  }, []);

  useEffect(() => {
    api.invalidateCache("public_custom_products");
    fetchPublicProducts();
    window.addEventListener("payent_products_updated", fetchPublicProducts);
    return () => {
      window.removeEventListener("payent_products_updated", fetchPublicProducts);
    };
  }, [fetchPublicProducts]);

  // Fetch real categories from backend
  useEffect(() => {
    api
      .getPublicCategories()
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setLiveCategories(cats);
          storage.set("payent_live_categories", cats);
        }
      })
      .catch((err) => console.warn("[Browse] Public categories fetch notice:", err));
  }, []);

  // ML / Smart search trigger
  useEffect(() => {
    if (!q || !q.trim()) {
      setMlResults(null);
      return;
    }
    const timer = setTimeout(() => {
      searchWithML(allProductsList, q.trim(), undefined, 50).then((res) => {
        if (res.results && res.results.length > 0) {
          setMlResults(res.results);
        } else {
          setMlResults(null);
        }
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [q, allProductsList]);

  // Search Submit Handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: targetRoute,
      search: (prev: any) => ({
        ...prev,
        q: q.trim() || undefined,
      }),
    });
  };

  const handleCategorySelect = (catId: string) => {
    navigate({
      to: targetRoute,
      search: (prev: any) => {
        const next = { ...prev };
        delete next.category;
        if (catId === "all") {
          delete next.cat;
        } else {
          next.cat = catId;
        }
        return next;
      },
    });
  };

  // Filtered & Sorted Product List
  const filteredProducts = useMemo(() => {
    const selectedCats = (normalizedCat || "all")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => Boolean(s) && s !== "all");

    let list = mlResults !== null ? mlResults : allProductsList;

    if (mlResults === null && q && q.trim()) {
      list = advancedSearch(list, q.trim());
    }

    if (selectedCats.length > 0) {
      list = list.filter((p) =>
        selectedCats.some((c) => matchesProductCategory(p.category, c))
      );
    }

    const minP = Number(search.min_p) || 0;
    const effectiveMaxP = Number(search.max_p) || 10000;

    list = list.filter((p: any) => {
      if (isFakeOrDeletedProduct(p)) return false;
      const isApproved =
        p.status === "approved" ||
        p.verificationStatus === "approved" ||
        p.verificationStatus === "verified" ||
        p.available === true;

      const isOwnProduct = isUserOwnProduct(p, user);
      if (!isApproved || isOwnProduct) return false;

      const cost = Number(p.price || (p as any).daily_rate || (p as any).dailyRate || 0);

      // Price filter
      if (minP > 0 && cost < minP) return false;
      if (effectiveMaxP < 10000 && cost > effectiveMaxP) return false;

      // Condition filter
      if (search.cond) {
        const condList = search.cond.split(",").map((s) => s.trim().toLowerCase());
        const hasNew = condList.includes("new");
        const hasUsed = condList.includes("used");
        const pCond = String(p.condition || p.condition_grade || "Like New").toLowerCase();
        if (hasNew && !hasUsed) {
          if (!pCond.includes("new") && !pCond.includes("mint")) return false;
        } else if (hasUsed && !hasNew) {
          if (pCond.includes("brand new") || pCond.includes("brand-new")) return false;
        }
      }

      // Location filter (City / Area / Pincode)
      if (search.city && search.city.trim() && search.city.toLowerCase() !== "all cities") {
        const cTerm = search.city.trim().toLowerCase();
        const pCity = String(
          p.city || p.area || p.owner_city || p.location || p.owner?.city || p.owner_address || ""
        ).toLowerCase();
        if (!pCity.includes(cTerm)) return false;
      }
      if (search.pincode && search.pincode.trim()) {
        const pinTerm = search.pincode.trim();
        const pPin = String(p.pincode || p.owner_pincode || "");
        if (!pPin.includes(pinTerm)) return false;
      }

      return true;
    });

    const activeSort = search.sort || sort;
    switch (activeSort) {
      case "price_asc":
        list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price_desc":
        list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "rating":
        list = [...list].sort((a, b) => (b.rating || 5) - (a.rating || 5));
        break;
      case "newest":
        list = [...list].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
        break;
      default:
        break;
    }

    return list;
  }, [
    normalizedCat,
    search.min_p,
    search.max_p,
    search.city,
    search.pincode,
    search.cond,
    search.sort,
    q,
    sort,
    mlResults,
    allProductsList,
    user,
  ]);

  // Real Category Counts (excluding user's own vendor products)
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    const validProducts = allProductsList.filter((p: any) => {
      if (isFakeOrDeletedProduct(p)) return false;
      const isApproved =
        p.status === "approved" ||
        p.verificationStatus === "approved" ||
        p.verificationStatus === "verified" ||
        p.available === true;
      return isApproved && !isUserOwnProduct(p, user);
    });

    PRIMARY_CATEGORIES.forEach((c) => {
      if (c.id === "all") {
        map["all"] = validProducts.length;
      } else {
        map[c.id] = validProducts.filter((p) => matchesProductCategory(p.category, c.id)).length;
      }
    });
    return map;
  }, [allProductsList, user]);

  // Category filter chips with symbols from original category cards
  const categoryChips = useMemo(() => {
    const list = PRIMARY_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      count: categoryCounts[c.id] ?? 0,
    }));

    if (liveCategories && liveCategories.length > 0) {
      liveCategories.forEach((lc) => {
        const exists = list.some(
          (item) =>
            item.id.toLowerCase() === lc.id.toLowerCase() ||
            item.name.toLowerCase() === lc.name.toLowerCase()
        );
        if (!exists) {
          const Icon = categoryIconMap[lc.id.toLowerCase()] || LayoutGrid;
          const count = allProductsList.filter((p) => matchesProductCategory(p.category, lc.id)).length;
          list.push({
            id: lc.id,
            name: lc.name,
            icon: Icon,
            count,
          });
        }
      });
    }

    return list;
  }, [categoryCounts, liveCategories, allProductsList]);

  // Title for selected category
  const activeCategoryTitle = useMemo(() => {
    if (activeCategory === "all") return "All Tech Gear";
    const parts = activeCategory.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map(getCategoryDisplayLabel).join(" & ");
    }
    const found = categoryChips.find((c) => c.id === activeCategory.toLowerCase());
    return found ? found.name : getCategoryDisplayLabel(activeCategory);
  }, [activeCategory, categoryChips]);

  const totalItems = filteredProducts.length;

  return (
    <MainLayout>
      <div className="bg-white dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-100 min-h-screen">
        {/* ================================================================= */}
        {/* TOP SEARCH & UTILITY BAR + CATEGORY SYMBOLS BAR                   */}
        {/* ================================================================= */}
        <section className="bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md sticky top-0 z-30 pt-3.5 pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-3">
            {/* Back Button + Search Input + Location Badge + User Links */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Left Group: Back Button + Search Bar + Filter Button + Location Badge */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-2xl">
                <BackButton fallback="/payent" />

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0 max-w-md">
                  <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400 pointer-events-none" aria-hidden="true" />
                  <input
                    type="text"
                    aria-label="Search rentals"
                    value={q}
                    onChange={(e) => setLocalQ(e.target.value)}
                    placeholder="Search rentals"
                    className="w-full min-h-[44px] pl-10 pr-10 py-2 text-xs sm:text-sm rounded-full bg-neutral-100 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white shadow-xs transition-colors"
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalQ("");
                        navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, q: undefined }) });
                      }}
                      aria-label="Clear search"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </form>

                {/* Dedicated Filter Button (label visible across all viewports) */}
                <Link
                  to="/filters"
                  search={search as any}
                  className={cn(
                    "inline-flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-full border text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white",
                    activeFilterCount > 0
                      ? "bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 dark:border-white"
                      : "bg-neutral-100 dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700/80 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  )}
                  title="Open full-page product filters"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold bg-white text-neutral-950 dark:bg-[#1E1E1E] dark:text-white flex items-center justify-center tabular-nums">
                      {activeFilterCount}
                    </span>
                  )}
                </Link>

                {/* Location Badge */}
                <div className="hidden md:flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 bg-neutral-100 dark:bg-[#1E1E1E] rounded-full border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
                  <span className="font-semibold">{isDetecting ? "Locating..." : isLocationActive ? detectedCity : "Hyderabad"}</span>
                  <button
                    type="button"
                    onClick={() => detectLocation()}
                    disabled={isDetecting}
                    aria-label="Detect current location"
                    className="p-1.5 rounded-full text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                    title="Detect current location"
                  >
                    <RotateCcw className={cn("h-3.5 w-3.5", isDetecting && "animate-spin")} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Right Quick Links: Notifications, Wishlist, Messages (>= 44x44px hitboxes) */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <Link
                  to="/notifications"
                  id="explore-notifications-btn"
                  className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums">
                      {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/wishlist"
                  className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                  aria-label="Wishlist"
                  title="Wishlist"
                >
                  <Heart className="h-5 w-5" aria-hidden="true" />
                  {wishlistCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/messages"
                  className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                  aria-label="Messages"
                  title="Messages"
                >
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Active Filters Summary Chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mr-1 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3 text-neutral-900 dark:text-white" aria-hidden="true" />
                  Active Filters:
                </span>

                {/* Category Chips */}
                {normalizedCat && normalizedCat !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <span>
                      {normalizedCat
                        .split(",")
                        .filter(Boolean)
                        .map(getCategoryDisplayLabel)
                        .join(", ")}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove category filter"
                      onClick={() =>
                        navigate({
                          to: targetRoute,
                          search: (prev: any) => ({
                            ...prev,
                            cat: undefined,
                            category: undefined,
                          }),
                        })
                      }
                      className="p-0.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                )}

                {/* Price Chip */}
                {(search.min_p || (search.max_p && Number(search.max_p) < 10000)) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700 tabular-nums">
                    <span>
                      ₹{search.min_p || 0} – {Number(search.max_p) < 10000 ? `₹${search.max_p}` : "Any"}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove price filter"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, min_p: undefined, max_p: undefined }) })}
                      className="p-0.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                )}

                {/* Dates Chip */}
                {(search.start || search.end) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <Calendar className="h-3 w-3 text-neutral-900 dark:text-white" aria-hidden="true" />
                    <span>{search.start || "Any"} to {search.end || "Any"}</span>
                    <button
                      type="button"
                      aria-label="Remove dates filter"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, start: undefined, end: undefined }) })}
                      className="p-0.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                )}

                {/* Location Chip */}
                {(search.city || search.pincode) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <MapPin className="h-3 w-3 text-neutral-900 dark:text-white" aria-hidden="true" />
                    <span>{search.city || search.pincode}</span>
                    <button
                      type="button"
                      aria-label="Remove location filter"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, city: undefined, pincode: undefined }) })}
                      className="p-0.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                )}

                {/* Condition Chip */}
                {search.cond && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <span className="capitalize">{search.cond}</span>
                    <button
                      type="button"
                      aria-label="Remove condition filter"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, cond: undefined }) })}
                      className="p-0.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                )}

                <Link
                  to="/filters"
                  search={search as any}
                  className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline cursor-pointer ml-1"
                >
                  Edit in Filters
                </Link>

                <button
                  type="button"
                  onClick={() => navigate({ to: targetRoute, search: { q: search.q } as any })}
                  aria-label="Clear all filters"
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white underline cursor-pointer ml-1"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* CATEGORY SYMBOLS BAR — Circular icons with visible text labels beneath for touch clarity */}
            <div className="flex items-start gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar py-2">
              {categoryChips.map((c) => {
                const Icon = c.icon;
                const isActive = activeCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategorySelect(c.id)}
                    title={`${c.name} (${c.count})`}
                    aria-label={`${c.name} (${c.count})`}
                    aria-pressed={isActive}
                    className="group inline-flex flex-col items-center gap-1.5 min-w-[68px] sm:min-w-[78px] shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-xl p-1"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-colors border shadow-xs",
                        isActive
                          ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white"
                          : "bg-neutral-100 dark:bg-[#1E1E1E] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 group-hover:text-neutral-950 dark:group-hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 shrink-0 transition-colors",
                          isActive
                            ? "text-white dark:text-neutral-950"
                            : "text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-950 dark:group-hover:text-white"
                        )}
                        strokeWidth={1.6}
                      />
                    </span>
                    <span
                      className={cn(
                        "text-[11px] sm:text-xs text-center leading-tight line-clamp-1 max-w-[76px]",
                        isActive
                          ? "font-semibold text-neutral-950 dark:text-white"
                          : "font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white"
                      )}
                    >
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* MAIN PRODUCT CATALOG CONTENT                                      */}
        {/* ================================================================= */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Catalog Header & Sort Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{q ? `Search: "${q}"` : activeCategoryTitle}</span>
                <span className="text-sm font-normal text-neutral-600 dark:text-neutral-400 tabular-nums">
                  ({totalItems} {totalItems === 1 ? "gear" : "gears"})
                </span>
              </h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                {q
                  ? `Showing matching equipment for "${q}"`
                  : activeCategory === "all"
                  ? "Browse all verified rental equipment across every category in our catalog."
                  : `Browse verified ${activeCategoryTitle.toLowerCase()} available for rent.`}
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center">
              <div className="relative self-end sm:self-center" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                aria-expanded={isSortOpen}
                className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer shadow-xs transition-colors"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
                <span>
                  Sort:{" "}
                  {sort === "featured"
                    ? "Recommended"
                    : sort === "newest"
                    ? "Newest"
                    : sort === "price_asc"
                    ? "Price: Low to High"
                    : sort === "price_desc"
                    ? "Price: High to Low"
                    : "Highest Rated"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 shadow-xl p-1.5 z-40">
                  {[
                    { id: "featured", label: "Recommended" },
                    { id: "newest", label: "Newest" },
                    { id: "price_asc", label: "Price: Low to High" },
                    { id: "price_desc", label: "Price: High to Low" },
                    { id: "rating", label: "Highest Rated" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSort(opt.id as SortOption);
                        setIsSortOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors flex items-center justify-between cursor-pointer",
                        sort === opt.id
                          ? "bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-950 dark:text-white"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                      )}
                    >
                      <span>{opt.label}</span>
                      {sort === opt.id && <Check className="h-3.5 w-3.5 text-neutral-950 dark:text-white" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Explore Equipment Grid (Taller Portrait Cards & Responsive 2/3/4 Column Grid) */}
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <RentalProductCardSkeleton key={i} variant="explore" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E]">
              <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto grid place-items-center text-neutral-600 dark:text-neutral-300 mb-3">
                <Camera className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                No gear found in this category
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Try selecting another category or clear your search filters.
              </p>
              <button
                type="button"
                onClick={() => handleCategorySelect("all")}
                className="mt-4 min-h-[44px] px-5 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                View All Categories
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {filteredProducts.map((product) => (
                <RentalProductCard key={String(product.id)} product={product} variant="explore" />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
