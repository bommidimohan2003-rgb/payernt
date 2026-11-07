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
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { ProductCard } from "@/components/common/ProductCard";
import { BackButton } from "@/components/common/BackButton";
import { advancedSearch } from "@/utils/searchEngine";
import { searchWithML } from "@/utils/smartSearch";
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
  icon: React.ComponentType<{ className?: string }>;
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
  React.ComponentType<{ className?: string }>
> = {
  all: Layers,
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

const matchCategory = (productCat: string, targetId: string) => {
  if (!productCat) return false;
  const pCat = productCat.toLowerCase().trim();
  const tId = targetId.toLowerCase().trim();
  if (tId === "all") return true;
  if (pCat === tId) return true;
  if (
    (tId === "bikes" || tId === "bike") &&
    (pCat.includes("bike") ||
      pCat.includes("motorcycle") ||
      pCat.includes("ride") ||
      pCat.includes("cycle"))
  )
    return true;
  if (
    (tId === "tools" || tId === "tool" || tId === "drills" || tId === "drill") &&
    (pCat.includes("tool") || pCat.includes("drill"))
  )
    return true;
  if (
    (tId === "powerbanks" || tId === "powerbank" || tId === "power") &&
    (pCat.includes("power") || pCat.includes("battery"))
  )
    return true;
  if (
    (tId === "cameras" || tId === "camera") &&
    (pCat.includes("camera") ||
      pCat.includes("cinema") ||
      pCat.includes("lens"))
  )
    return true;
  if (
    (tId === "laptops" || tId === "laptop") &&
    (pCat.includes("laptop") ||
      pCat.includes("macbook") ||
      pCat.includes("computer"))
  )
    return true;
  if ((tId === "drones" || tId === "drone") && pCat.includes("drone"))
    return true;
  if (
    tId === "audio" &&
    (pCat.includes("audio") || pCat.includes("mic") || pCat.includes("headphone") || pCat.includes("sound"))
  )
    return true;
  if (
    tId === "sound" &&
    (pCat.includes("sound") || pCat.includes("speaker") || pCat.includes("audio") || pCat.includes("mic"))
  )
    return true;
  if (
    (tId === "lighting" || tId === "light" || tId === "studio") &&
    (pCat.includes("light") || pCat.includes("led") || pCat.includes("softbox"))
  )
    return true;
  return false;
};

export default function Categories() {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as {
    q?: string;
    cat?: string;
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
  const activeCategory = search.cat || "all";
  const [sort, setSort] = useState<SortOption>(() => (search.sort as SortOption) || "featured");
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.cat && search.cat !== "all") {
      count += search.cat.split(",").filter(Boolean).length;
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

  const [allProductsList, setAllProductsList] = useState<Product[]>(() => {
    const cached = storage.get<Product[]>("payent_server_products", []);
    const clean = cached.filter((p) => !isFakeOrDeletedProduct(p));
    if (clean.length > 0) return clean;
    storage.set("payent_server_products", INITIAL_FALLBACK_PRODUCTS);
    return INITIAL_FALLBACK_PRODUCTS;
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  const [liveCategories, setLiveCategories] = useState<Category[]>(() => {
    return storage.get<Category[]>("payent_live_categories", []);
  });
  const [mlResults, setMlResults] = useState<Product[] | null>(null);

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
      searchWithML(allProductsList, q.trim()).then((res) => {
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
    const selectedCats = (search.cat || "all")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    let list =
      mlResults !== null
        ? mlResults
        : allProductsList.filter((p) => {
            if (!selectedCats || selectedCats.length === 0 || selectedCats.includes("all")) {
              return true;
            }
            return selectedCats.some((c) => matchCategory(p.category, c));
          });

    if (mlResults === null && q && q.trim()) {
      list = advancedSearch(list, q.trim());
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

      // Location filter (City / Pincode)
      if (search.city && search.city.trim() && search.city.toLowerCase() !== "all cities") {
        const cTerm = search.city.trim().toLowerCase();
        const pCity = String(p.city || p.owner_city || p.location || p.owner_address || "").toLowerCase();
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
    search.cat,
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
        map[c.id] = validProducts.filter((p) => matchCategory(p.category, c.id)).length;
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
          const count = allProductsList.filter((p) => matchCategory(p.category, lc.id)).length;
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
    const found = categoryChips.find((c) => c.id === activeCategory);
    return found ? found.name : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
  }, [activeCategory, categoryChips]);

  const totalItems = filteredProducts.length;

  return (
    <MainLayout>
      <div className="bg-[#FAFBF9] dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-100 min-h-screen">
        {/* ================================================================= */}
        {/* TOP SEARCH & UTILITY BAR + CATEGORY SYMBOLS BAR                   */}
        {/* ================================================================= */}
        <section className="bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-md sticky top-0 z-30 pt-3.5 pb-3 transition-all">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-3">
            {/* Back Button + Search Input + Location Badge + User Links */}
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              {/* Left Group: Back Button + Search Bar + Location Badge positioned together on the left */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-2xl">
                <BackButton fallback="/" />

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setLocalQ(e.target.value)}
                    placeholder="Search gear, cameras, drones, laptops..."
                    className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalQ("");
                        navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, q: undefined }) });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </form>

                {/* Dedicated Filter Button */}
                <Link
                  to="/filters"
                  search={search as any}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs",
                    activeFilterCount > 0
                      ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white ring-2 ring-[#8FAF7E]/30"
                      : "bg-neutral-100 dark:bg-white/5 text-neutral-800 dark:text-[#BDBDBD] border-neutral-200 dark:border-neutral-700/80 hover:bg-neutral-200 dark:hover:bg-white/10"
                  )}
                  title="Open full-page product filters"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#8FAF7E]" />
                  <span className="hidden xs:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="h-4.5 min-w-[18px] px-1 rounded-full text-[10px] font-bold bg-[#8FAF7E] text-black flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Link>

                {/* Location Badge - now on the left beside search */}
                <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-100 dark:bg-white/5 rounded-full border border-neutral-200 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{isDetecting ? "Locating..." : isLocationActive ? detectedCity : "Hyderabad"}</span>
                  <button
                    type="button"
                    onClick={() => detectLocation()}
                    disabled={isDetecting}
                    className="p-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Detect current location"
                  >
                    <RotateCcw className={cn("h-3 w-3", isDetecting && "animate-spin")} />
                  </button>
                </div>
              </div>

              {/* Right Quick Links: Notifications, Wishlist, Messages */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Link
                  to="/notifications"
                  id="explore-notifications-btn"
                  className="p-1.5 sm:p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors relative cursor-pointer active:scale-95"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/wishlist"
                  className="p-1.5 sm:p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors relative cursor-pointer active:scale-95"
                  aria-label="Wishlist"
                  title="Wishlist"
                >
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/messages"
                  className="p-1.5 sm:p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors relative cursor-pointer active:scale-95"
                  aria-label="Messages"
                  title="Messages"
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Active Filters Summary Chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-[#BDBDBD] uppercase tracking-wider mr-1 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3 text-[#8FAF7E]" />
                  Active Filters:
                </span>

                {/* Category Chips */}
                {search.cat && search.cat !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <span>{search.cat.split(",").join(", ")}</span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, cat: undefined }) })}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {/* Price Chip */}
                {(search.min_p || (search.max_p && Number(search.max_p) < 10000)) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <span>
                      ₹{search.min_p || 0} – {Number(search.max_p) < 10000 ? `₹${search.max_p}` : "Any"}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, min_p: undefined, max_p: undefined }) })}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {/* Dates Chip */}
                {(search.start || search.end) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <Calendar className="h-3 w-3 text-[#8FAF7E]" />
                    <span>{search.start || "Any"} to {search.end || "Any"}</span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, start: undefined, end: undefined }) })}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {/* Location Chip */}
                {(search.city || search.pincode) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <MapPin className="h-3 w-3 text-[#8FAF7E]" />
                    <span>{search.city || search.pincode}</span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, city: undefined, pincode: undefined }) })}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {/* Condition Chip */}
                {search.cond && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700">
                    <span className="capitalize">{search.cond}</span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: targetRoute, search: (prev: any) => ({ ...prev, cond: undefined }) })}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                <Link
                  to="/filters"
                  search={search as any}
                  className="text-xs font-bold text-[#8FAF7E] hover:underline cursor-pointer ml-1"
                >
                  Edit in Filters
                </Link>

                <button
                  type="button"
                  onClick={() => navigate({ to: targetRoute, search: { q: search.q } as any })}
                  className="text-xs text-neutral-400 hover:text-red-500 underline cursor-pointer ml-1"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* CATEGORY SYMBOLS BAR — Circular icon category bar matching mobile explorer spec */}
            <div className="flex items-center gap-3 sm:gap-4.5 overflow-x-auto no-scrollbar py-2.5">
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
                    className={cn(
                      "group inline-flex items-center justify-center w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full transition-all duration-200 cursor-pointer shrink-0 border active:scale-95 shadow-xs",
                      isActive
                        ? "bg-[#1E1E1E] text-[#00D492] border-2 border-[#00D492] ring-2 ring-[#00D492]/40 shadow-sm"
                        : "bg-[#F5F4F5] dark:bg-[#272727] text-[#525252] dark:text-neutral-300 border-[#E5E7EB] dark:border-white/10 hover:bg-[#EDEDED] dark:hover:bg-[#333333] hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/20"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6 shrink-0 transition-colors",
                        isActive
                          ? "text-[#00D492]"
                          : "text-[#525252] dark:text-neutral-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"
                      )}
                      strokeWidth={1.85}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* MAIN PRODUCT CATALOG CONTENT                                      */}
        {/* ================================================================= */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32 space-y-6">
          {/* Catalog Header & Sort Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{q ? `Search: "${q}"` : activeCategoryTitle}</span>
                <span className="text-sm font-semibold text-neutral-400 font-normal">
                  ({totalItems} {totalItems === 1 ? "gear" : "gears"})
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
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
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs font-bold text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer shadow-xs transition-colors"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-neutral-500" />
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
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-750 shadow-xl p-1.5 z-40">
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
                        "w-full text-left px-3 py-1.5 text-xs rounded-xl transition-colors flex items-center justify-between cursor-pointer",
                        sort === opt.id
                          ? "bg-neutral-100 dark:bg-white/10 font-bold text-neutral-950 dark:text-white"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5"
                      )}
                    >
                      <span>{opt.label}</span>
                      {sort === opt.id && <Check className="h-3 w-3 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Equipment Grid */}
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 animate-pulse"
                >
                  <div className="aspect-[4/3] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
                  <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 pt-2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E]">
              <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-white/5 mx-auto grid place-items-center text-neutral-400 mb-3">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                No gear found in this category
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Try selecting another category or clear your search filters.
              </p>
              <button
                type="button"
                onClick={() => handleCategorySelect("all")}
                className="mt-4 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                View All Categories
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
