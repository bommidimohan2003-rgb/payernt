import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  X,
  ArrowUpDown,
  ChevronDown,
  Check,
  ArrowRight,
  SlidersHorizontal,
  Layers,
  Camera,
  Laptop,
  Plane,
  Drone,
  Headphones,
  Speaker,
  Drill,
  BatteryCharging,
  Lightbulb,
  Bike,
  Hammer,
  Zap,
  Mic,
  Sun,
  MapPin,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Tag,
  Filter,
  LayoutGrid,
  Heart,
  MessageSquare,
  Star,
  User,
  CheckCircle2,
  Calendar,
  Lock,
  Coins,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { ProductCard } from "@/components/common/ProductCard";
import { advancedSearch, isProductInLocation } from "@/utils/searchEngine";
import { searchWithML } from "@/utils/smartSearch";
import type { Product, Category } from "@/types";
import { cn } from "@/lib/utils";
import { useSearch, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { tracker } from "@/utils/eventTracker";
import { storage } from "@/utils/storage";
import { api } from "@/utils/api";
import { isFakeOrDeletedProduct } from "@/utils/productFilters";
import { useAuth } from "@/hooks/useAuth";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useWishlist } from "@/hooks/useWishlist";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { INITIAL_FALLBACK_PRODUCTS } from "@/utils/fallbackProducts";

// Category images removed in favor of clean modern icons

type SortOption = "featured" | "newest" | "price_asc" | "price_desc" | "rating";

const popularTags = [
  "Sony A7 IV",
  "Canon R5",
  "DJI Mavic 3",
  "MacBook Pro",
  "Cinema Camera",
  "Audio Gear",
];

const categoryIconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  all: Layers,
  laptops: Laptop,
  laptop: Laptop,
  cameras: Camera,
  camera: Camera,
  drones: Drone,
  drone: Drone,
  audio: Headphones,
  sound: Speaker,
  tools: Drill,
  tool: Drill,
  powerbanks: BatteryCharging,
  power: BatteryCharging,
  lighting: Lightbulb,
  light: Lightbulb,
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
    (tId === "tools" || tId === "tool") &&
    (pCat.includes("tool") || pCat.includes("drill"))
  )
    return true;
  if (
    (tId === "powerbanks" || tId === "powerbank") &&
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
    (tId === "audio") &&
    (pCat.includes("audio") || pCat.includes("headphone") || pCat.includes("mic") || pCat.includes("sound"))
  )
    return true;
  if (
    (tId === "sound" || tId === "sound-equipment") &&
    (pCat.includes("sound") || pCat.includes("speaker") || pCat.includes("audio") || pCat.includes("mic") || pCat.includes("mixer"))
  )
    return true;
  if (
    (tId === "lighting" || tId === "light") &&
    (pCat.includes("light") || pCat.includes("led") || pCat.includes("softbox"))
  )
    return true;
  return false;
};

const KNOWN_BRANDS = [
  "Sony",
  "DJI",
  "Apple",
  "Canon",
  "Nikon",
  "Fujifilm",
  "Blackmagic",
  "RED",
  "RODE",
  "Sennheiser",
  "Shure",
  "Aputure",
  "Godox",
  "GoPro",
  "Royal Enfield",
];

interface ExploreCategoryCard {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  accentColor: string;
}

const EXPLORE_CATEGORY_CARDS: ExploreCategoryCard[] = [
  {
    id: "laptops",
    name: "Laptops / PCs",
    tagline: "Creator Workstations & PCs",
    description: "MacBook Pro, editing workstations & high-performance rigs",
    icon: Laptop,
    accentColor: "hover:border-neutral-400 dark:hover:border-neutral-600",
  },
  {
    id: "cameras",
    name: "Cameras",
    tagline: "Mirrorless, Cinema & Lenses",
    description: "Sony Alpha, Canon EOS, cinema bodies & prime cinema lenses",
    icon: Camera,
    accentColor: "hover:border-neutral-400 dark:hover:border-neutral-600",
  },
  {
    id: "drones",
    name: "Drones",
    tagline: "4K Aerial & FPV Systems",
    description: "DJI Mavic 3, Mini 4 Pro, Avata & pro controller kits",
    icon: Drone,
    accentColor: "hover:border-neutral-400 dark:hover:border-neutral-600",
  },
  {
    id: "audio",
    name: "Audio",
    tagline: "Headphones & Monitoring",
    description: "Studio reference headphones, monitoring gear & DACs",
    icon: Headphones,
    accentColor: "hover:border-neutral-400 dark:hover:border-neutral-600",
  },
  {
    id: "sound",
    name: "Sound Equipment",
    tagline: "PA Speakers, Mics & Mixers",
    description: "RODE wireless mics, PA sound systems & audio consoles",
    icon: Speaker,
    accentColor: "hover:border-neutral-400 dark:hover:border-neutral-600",
  },
  {
    id: "tools",
    name: "Drills & Tools",
    tagline: "Power Drills & Hardware",
    description: "Heavy-duty hammer drills, impact drivers & toolkits",
    icon: Drill,
    accentColor: "hover:border-neutral-400 dark:hover:border-neutral-600",
  },
  {
    id: "powerbanks",
    name: "Power Stations",
    tagline: "Battery Generators & Packs",
    description: "High-output power stations, portable generators & batteries",
    icon: BatteryCharging,
    accentColor: "hover:border-neutral-400 dark:hover:border-neutral-600",
  },
  {
    id: "lighting",
    name: "Studio Lighting",
    tagline: "Continuous Lights & Softboxes",
    description: "Daylight LED fixtures, RGB studio bars & softbox diffusers",
    icon: Lightbulb,
    accentColor: "hover:border-neutral-400 dark:hover:border-neutral-600",
  },
];

export default function Categories() {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as {
    q?: string;
    cat?: string;
    brand?: string;
    min_p?: string;
    max_p?: string;
  };
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const targetRoute = pathname.startsWith("/categories") ? "/categories" : pathname.startsWith("/payent") ? "/payent/explore" : "/browse";
  const [q, setLocalQ] = useState(search.q || "");
  const hasCatParam = Boolean(search.cat);
  const isCategoryDiscoveryView = !hasCatParam && !q.trim();
  const activeCategory = search.cat || "all";
  const [sort, setSort] = useState<SortOption>("featured");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Advanced Filter States
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    return search.brand ? search.brand.split(",").filter(Boolean) : [];
  });
  const [minPriceFilter, setMinPriceFilter] = useState<number>(() => {
    return search.min_p ? Number(search.min_p) : 0;
  });
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(() => {
    return search.max_p ? Number(search.max_p) : null;
  });
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [availableOnlyFilter, setAvailableOnlyFilter] = useState<boolean>(false);

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
  const [didYouMean, setDidYouMean] = useState<string | null>(null);

  const sortRef = useRef<HTMLDivElement>(null);

  const { wishlistCount } = useWishlist();
  const { unreadCount } = useUnreadMessages();

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

  // Track search
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

  // Compute highest catalog price for sliders
  const highestPriceInCatalog = useMemo(() => {
    if (!allProductsList.length) return 5000;
    const maxP = Math.max(...allProductsList.map((p) => p.price || 0));
    return Math.max(maxP, 1000);
  }, [allProductsList]);

  // Extract brands dynamically from catalog items
  const availableBrands = useMemo(() => {
    const brandMap = new Map<string, number>();
    allProductsList.forEach((p) => {
      const text = `${p.title} ${p.description || ""} ${p.category || ""}`.toLowerCase();
      KNOWN_BRANDS.forEach((b) => {
        if (text.includes(b.toLowerCase())) {
          brandMap.set(b, (brandMap.get(b) || 0) + 1);
        }
      });
    });
    return Array.from(brandMap.entries()).map(([brand, count]) => ({
      brand,
      count,
    }));
  }, [allProductsList]);

  // ML / Smart search trigger
  useEffect(() => {
    if (!q || !q.trim()) {
      setMlResults(null);
      setDidYouMean(null);
      return;
    }
    const timer = setTimeout(() => {
      searchWithML(allProductsList, q.trim()).then((res) => {
        if (res.results && res.results.length > 0) {
          setMlResults(res.results);
          setDidYouMean(res.didYouMean || null);
        } else {
          setMlResults(null);
          setDidYouMean(res.didYouMean || null);
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
    setCurrentPage(1);
  };

  const handleCategorySelect = (catId: string) => {
    navigate({
      to: targetRoute,
      search: (prev: any) => ({
        ...prev,
        cat: catId,
      }),
    });
    setCurrentPage(1);
  };

  const handleBackToCategories = () => {
    setLocalQ("");
    navigate({
      to: targetRoute,
      search: (prev: any) => {
        const next = { ...prev };
        delete next.cat;
        delete next.q;
        return next;
      },
    });
    setCurrentPage(1);
  };

  const handleBrandToggle = (brand: string) => {
    const nextBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(nextBrands);
    navigate({
      to: targetRoute,
      search: (prev: any) => ({
        ...prev,
        brand: nextBrands.length > 0 ? nextBrands.join(",") : undefined,
      }),
    });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setLocalQ("");
    setSelectedBrands([]);
    setFilterSearch("");
    setMinPriceFilter(0);
    setMaxPriceFilter(highestPriceInCatalog);
    setMinRatingFilter(0);
    setAvailableOnlyFilter(false);
    setSort("featured");
    navigate({
      to: targetRoute,
      search: {},
    });
    setCurrentPage(1);
  };

  // Filtered & Sorted Product List
  const filteredProducts = useMemo(() => {
    let list =
      mlResults !== null
        ? mlResults
        : allProductsList.filter((p) =>
            activeCategory === "all" ? true : matchCategory(p.category, activeCategory)
          );

    if (mlResults === null && q && q.trim()) {
      list = advancedSearch(list, q.trim());
    }

    const activeDemoUserId =
      typeof window !== "undefined"
        ? localStorage.getItem("payent_active_demo_user") || "user_001"
        : "user_001";
    const currentUserId = user?.id || activeDemoUserId;
    const currentUserEmail = user?.email?.toLowerCase().trim() || "";
    const currentUserName = (user?.fullName || "").toLowerCase().trim();

    list = list.filter((p: any) => {
      if (isFakeOrDeletedProduct(p)) return false;
      const isApproved =
        p.status === "approved" ||
        p.verificationStatus === "approved" ||
        p.verificationStatus === "verified" ||
        p.available === true;

      const pOwnerId = p.ownerId || p.owner?.id;
      const pOwnerEmail = p.owner?.email?.toLowerCase().trim();
      const pOwnerName = (
        p.owner?.name ||
        p.owner?.fullName ||
        p.verificationDocs?.ownerFullName
      )?.toLowerCase().trim();

      const isOwnProduct = Boolean(
        (pOwnerId && (pOwnerId === currentUserId || pOwnerId === activeDemoUserId)) ||
          (currentUserEmail && pOwnerEmail && pOwnerEmail === currentUserEmail) ||
          (currentUserName && pOwnerName && pOwnerName === currentUserName)
      );

      return isApproved && !isOwnProduct;
    });

    if (selectedBrands.length > 0) {
      list = list.filter((p) => {
        const text = `${p.title} ${p.description || ""} ${p.category || ""}`.toLowerCase();
        return selectedBrands.some((b) => text.includes(b.toLowerCase()));
      });
    }

    if (minPriceFilter > 0) {
      list = list.filter((p) => (p.price || 0) >= minPriceFilter);
    }

    if (maxPriceFilter !== null) {
      list = list.filter((p) => (p.price || 0) <= maxPriceFilter);
    }

    if (minRatingFilter > 0) {
      list = list.filter((p) => (p.rating || 5.0) >= minRatingFilter);
    }

    if (availableOnlyFilter) {
      list = list.filter((p) => p.available !== false);
    }

    switch (sort) {
      case "price_asc":
        list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price_desc":
        list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "rating":
        list = [...list].sort((a, b) => (b.rating || 5) - (a.rating || 5));
        break;
      default:
        break;
    }

    return list;
  }, [
    activeCategory,
    q,
    selectedBrands,
    sort,
    mlResults,
    allProductsList,
    minPriceFilter,
    maxPriceFilter,
    minRatingFilter,
    availableOnlyFilter,
    user,
  ]);

  // Real Category Counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    EXPLORE_CATEGORY_CARDS.forEach((c) => {
      map[c.id] = allProductsList.filter((p) => matchCategory(p.category, c.id)).length;
    });
    return map;
  }, [allProductsList]);

  // Category chips
  const categoryChips = useMemo(() => {
    const list = [
      { id: "all", name: "All Categories", count: allProductsList.length },
    ];
    EXPLORE_CATEGORY_CARDS.forEach((c) => {
      const count = categoryCounts[c.id] || 0;
      list.push({ id: c.id, name: c.name.split(" ")[0], count });
    });
    return list;
  }, [allProductsList, categoryCounts]);

  // Title for selected category
  const activeCategoryTitle = useMemo(() => {
    if (activeCategory === "all") return "All Tech Gear";
    const found = EXPLORE_CATEGORY_CARDS.find((c) => c.id === activeCategory);
    return found ? found.name : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
  }, [activeCategory]);

  const totalItems = filteredProducts.length;

  return (
    <MainLayout>
      <div className="bg-[#FAFBF9] dark:bg-[#070C12] text-neutral-900 dark:text-neutral-100 min-h-screen">
        {/* ================================================================= */}
        {/* TOP SEARCH & UTILITY BAR                                          */}
        {/* ================================================================= */}
        <section className="bg-white/80 dark:bg-[#090F16]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 sticky top-0 z-30 py-3">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {/* Location Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-100 dark:bg-white/5 rounded-full border border-neutral-200 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{isDetecting ? "Locating..." : isLocationActive ? detectedCity : "Hyderabad"}</span>
                <button
                  type="button"
                  onClick={() => detectLocation()}
                  disabled={isDetecting}
                  className="p-0.5 text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <RotateCcw className={cn("h-3 w-3", isDetecting && "animate-spin")} />
                </button>
              </div>

              {/* Right Quick Links */}
              <div className="flex items-center gap-2">
                <Link
                  to="/wishlist"
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors relative"
                  aria-label="Wishlist"
                >
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/profile"
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors"
                  aria-label="User Profile"
                >
                  <User className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* MAIN EXPLORE CONTENT                                              */}
        {/* ================================================================= */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-32 space-y-10 sm:space-y-12">
          {/* =============================================================== */}
          {/* STATE 1: EXPLORE BY CATEGORY (Default Category Selection View)   */}
          {/* =============================================================== */}
          {isCategoryDiscoveryView && (
            <section className="space-y-8 animate-in fade-in duration-300">
              {/* Category Showcase Header */}
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                  ✦ Select a Category to Rent
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
                  Explore Gear by Category
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Select a category below to browse verified cameras, drones, laptops, audio gear, and more.
                </p>
              </div>

              {/* 8-Category Cards Grid (Icon-Based Minimalist Design) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
                {EXPLORE_CATEGORY_CARDS.map((cat) => {
                  const IconComp = cat.icon;
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={cn(
                        "group relative rounded-2xl sm:rounded-3xl border border-neutral-200/90 dark:border-neutral-800",
                        "bg-white dark:bg-[#0D151D] p-5 sm:p-7 cursor-pointer",
                        "transition-all duration-300 ease-out",
                        "hover:shadow-xl hover:-translate-y-1 hover:border-neutral-400/90 dark:hover:border-neutral-600/90",
                        "flex flex-col items-center justify-center text-center overflow-hidden select-none",
                        cat.accentColor
                      )}
                    >
                      {/* Top Right Gear Count Badge */}
                      <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5">
                        <span className="text-[10px] sm:text-[11px] font-bold font-mono px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400 border border-neutral-200/40 dark:border-white/5">
                          {count} {count === 1 ? "gear" : "gears"}
                        </span>
                      </div>

                      {/* Large Centered Modern Icon Container */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-2xl sm:rounded-3xl bg-neutral-100/90 dark:bg-white/[0.06] border border-neutral-200/50 dark:border-white/[0.08] flex items-center justify-center mt-2 mb-3.5 sm:mb-4 transition-all duration-300 group-hover:scale-108 group-hover:bg-neutral-200/60 dark:group-hover:bg-white/[0.12] group-hover:border-neutral-300 dark:group-hover:border-white/20 group-hover:shadow-sm">
                        <IconComp
                          className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 text-[var(--foreground,#000000)] dark:text-[var(--foreground,#ffffff)] transition-colors duration-200"
                          strokeWidth={1.5}
                        />
                      </div>

                      {/* Category Name Below the Icon */}
                      <h3 className="text-sm sm:text-base font-bold text-[var(--foreground,#000000)] dark:text-[var(--foreground,#ffffff)] tracking-tight group-hover:text-black dark:group-hover:text-white transition-colors">
                        {cat.name}
                      </h3>

                      {/* Tagline / Subtitle */}
                      <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium line-clamp-1 mt-1">
                        {cat.tagline}
                      </p>

                      {/* Subtle Explore Action Indicator */}
                      <div className="mt-3.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 w-full flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold text-neutral-600 dark:text-neutral-400 group-hover:text-[var(--foreground)] dark:group-hover:text-white transition-colors">
                        <span>Explore</span>
                        <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All Equipment Banner */}
              <div className="pt-2">
                <div
                  onClick={() => handleCategorySelect("all")}
                  className="group relative rounded-3xl border border-dashed border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/[0.04] dark:bg-emerald-950/20 hover:bg-emerald-500/[0.08] dark:hover:bg-emerald-950/30 p-6 cursor-pointer transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Browse Complete Gear Vault
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Explore all {allProductsList.length} verified pieces of equipment across every category in our catalog.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shrink-0">
                    <span>View All Gear</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =============================================================== */}
          {/* STATE 2: PRODUCTS OF SELECTED CATEGORY (or Search Results)       */}
          {/* =============================================================== */}
          {!isCategoryDiscoveryView && (
            <section className="space-y-6 animate-in fade-in duration-300">
              {/* Category Breadcrumb & Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToCategories}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
                    title="Back to all categories"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>All Categories</span>
                  </button>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                      <span>{q ? `Search: "${q}"` : activeCategoryTitle}</span>
                      <span className="text-sm font-semibold text-neutral-400 font-normal">
                        ({totalItems} {totalItems === 1 ? "gear" : "gears"})
                      </span>
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {q
                        ? `Showing matching equipment for "${q}"`
                        : activeCategory === "all"
                        ? "Browse all verified rental equipment across every category in our catalog."
                        : `Browse verified ${activeCategoryTitle.toLowerCase()} available for rent.`}
                    </p>
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0D151D] text-xs font-bold text-neutral-900 dark:text-white hover:bg-neutral-50 cursor-pointer shadow-xs"
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
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#111A22] border border-neutral-200 dark:border-neutral-750 shadow-xl p-1.5 z-40">
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

              {/* Category Pills Bar for Quick Switching */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {categoryChips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategorySelect(c.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                      activeCategory === c.id
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs"
                        : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
                    )}
                  >
                    <span>{c.name}</span>
                    {c.count !== undefined && (
                      <span className="text-[10px] font-mono opacity-70">({c.count})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              {isLoadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-3xl bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 animate-pulse"
                    >
                      <div className="aspect-[4/3] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
                      <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 pt-2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0D151D]">
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
                    onClick={handleBackToCategories}
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
            </section>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
