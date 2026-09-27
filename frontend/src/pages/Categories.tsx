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
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { ProductCard } from "@/components/common/ProductCard";
import { BrowseSwipeDeck } from "@/components/browse/BrowseSwipeDeck";
import { advancedSearch, isProductInLocation } from "@/utils/searchEngine";
import { searchWithML } from "@/utils/smartSearch";
import type { Product, Category } from "@/types";
import { cn } from "@/lib/utils";
import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { tracker } from "@/utils/eventTracker";
import { storage } from "@/utils/storage";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useWishlist } from "@/hooks/useWishlist";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { PayentLogoMark } from "@/components/common/LogoIcon";

type SortOption = "featured" | "newest" | "price_asc" | "price_desc" | "rating";

const popularTags = [
  "Sony FX3",
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
  cameras: Camera,
  camera: Camera,
  laptops: Laptop,
  laptop: Laptop,
  drones: Plane,
  drone: Plane,
  audio: Mic,
  sound: Mic,
  lighting: Sun,
  light: Sun,
  bikes: Bike,
  bike: Bike,
  tools: Hammer,
  powerbanks: Zap,
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
    (tId === "audio" || tId === "sound") &&
    (pCat.includes("audio") || pCat.includes("mic") || pCat.includes("sound"))
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

const ITEMS_PER_PAGE = 12;

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

  const activeCategory = search.cat || "all";
  const [q, setLocalQ] = useState(search.q || "");
  const [sort, setSort] = useState<SortOption>("featured");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"swipe" | "grid">("swipe");

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
    try {
      const stored = localStorage.getItem("payernt_products_v2");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return storage.get<Product[]>("payent_server_products", []);
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("payernt_products_v2");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    const cached = storage.get<Product[]>("payent_server_products", []);
    return cached.length === 0;
  });
  const [fetchError, setFetchError] = useState<boolean>(false);

  const [liveCategories, setLiveCategories] = useState<Category[]>(() => {
    return storage.get<Category[]>("payent_live_categories", []);
  });
  const [mlResults, setMlResults] = useState<Product[] | null>(null);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [popularQueries] = useState<string[]>(popularTags);

  const sortRef = useRef<HTMLDivElement>(null);

  const { wishlistCount } = useWishlist();
  const { unreadCount } = useUnreadMessages();

  // User location detection (Informational badge & sort prioritization only)
  const {
    city: detectedCity,
    isDetecting,
    detectLocation,
  } = useUserLocation();

  const isLocationActive = Boolean(
    detectedCity &&
      detectedCity !== "Location unavailable" &&
      detectedCity !== "All Cities",
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

  // Typewriter effect for search placeholder with gear product names
  const SEARCH_SUGGESTIONS = useMemo(
    () => [
      "Sony FX3 Cinema Camera...",
      "DJI Mavic 3 Pro Drone...",
      "MacBook Pro M3 Max...",
      "Canon EOS R5 C...",
      "Sony FE 24-70mm f/2.8...",
      "Aputure 300d II Light...",
      "RODE Wireless PRO...",
      "GoPro HERO12 Black...",
    ],
    [],
  );

  const [typedPlaceholder, setTypedPlaceholder] = useState("Search gear...");

  useEffect(() => {
    let itemIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    const tick = () => {
      const currentWord = SEARCH_SUGGESTIONS[itemIdx] || "Search gear...";
      if (isDeleting) {
        setTypedPlaceholder(`Search "${currentWord.slice(0, charIdx)}"`);
        charIdx--;
        if (charIdx < 0) {
          isDeleting = false;
          itemIdx = (itemIdx + 1) % SEARCH_SUGGESTIONS.length;
          timer = setTimeout(tick, 400);
          return;
        }
        timer = setTimeout(tick, 35);
      } else {
        setTypedPlaceholder(`Search "${currentWord.slice(0, charIdx)}"`);
        charIdx++;
        if (charIdx > currentWord.length) {
          isDeleting = true;
          timer = setTimeout(tick, 2000);
          return;
        }
        timer = setTimeout(tick, 65);
      }
    };

    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [SEARCH_SUGGESTIONS]);

  // Sync search URL query with local state
  useEffect(() => {
    setLocalQ(search.q || "");
  }, [search.q]);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  // Track search
  useEffect(() => {
    if (search.q && search.q.trim()) {
      const timer = setTimeout(() => {
        tracker.search(search.q!);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [search.q]);

  // Fetch real products from backend and sync with Payernt store
  const fetchPublicProducts = useCallback(() => {
    try {
      const stored = localStorage.getItem("payernt_products_v2");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllProductsList(parsed);
          storage.set("payent_server_products", parsed);
        }
      }
    } catch {}

    api
      .getPublicProducts()
      .then((serverProducts) => {
        if (Array.isArray(serverProducts) && serverProducts.length > 0) {
          setAllProductsList(serverProducts);
          storage.set("payent_server_products", serverProducts);
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
      window.removeEventListener(
        "payent_products_updated",
        fetchPublicProducts,
      );
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
      .catch((err) =>
        console.warn("[Browse] Public categories fetch notice:", err),
      );
  }, []);

  // Compute highest catalog price for sliders
  const highestPriceInCatalog = useMemo(() => {
    if (!allProductsList.length) return 5000;
    const maxP = Math.max(...allProductsList.map((p) => p.price || 0));
    return Math.max(maxP, 1000);
  }, [allProductsList]);

  // Extract brands dynamically from actual catalog items
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
      to: "/browse",
      search: (prev: any) => ({
        ...prev,
        q: q.trim() || undefined,
      }),
    });
    setCurrentPage(1);
  };

  const handleCategorySelect = (catId: string) => {
    navigate({
      to: "/browse",
      search: (prev: any) => ({
        ...prev,
        cat: catId === "all" ? undefined : catId,
      }),
    });
    setCurrentPage(1);
  };

  const handleBrandToggle = (brand: string) => {
    const nextBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(nextBrands);
    navigate({
      to: "/browse",
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
      to: "/browse",
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
            activeCategory === "all"
              ? true
              : matchCategory(p.category, activeCategory),
          );

    if (mlResults === null && q && q.trim()) {
      list = advancedSearch(list, q.trim());
    }

    // Exact Explore Visibility Rule (Sections 10, 11, 12):
    // CONDITION 1: Product is approved by Admin.
    // CONDITION 2: Product owner is NOT the currently logged-in/current user.
    const activeDemoUserId = typeof window !== "undefined" ? localStorage.getItem("payent_active_demo_user") || "user_001" : "user_001";
    const currentUserId = user?.id || activeDemoUserId;
    const currentUserEmail = user?.email?.toLowerCase().trim() || "";
    const currentUserName = (user?.fullName || "").toLowerCase().trim();

    list = list.filter((p: any) => {
      // 1. Check Admin approval
      const isApproved =
        p.status === "approved" ||
        p.verificationStatus === "approved" ||
        p.verificationStatus === "verified";

      // 2. Hide current user's own products
      const pOwnerId = p.ownerId || p.owner?.id;
      const pOwnerEmail = p.owner?.email?.toLowerCase().trim();
      const pOwnerName = (p.owner?.name || p.owner?.fullName || p.verificationDocs?.ownerFullName)?.toLowerCase().trim();

      const isOwnProduct = Boolean(
        (pOwnerId && (pOwnerId === currentUserId || pOwnerId === activeDemoUserId)) ||
        (currentUserEmail && pOwnerEmail && pOwnerEmail === currentUserEmail) ||
        (currentUserName && pOwnerName && pOwnerName === currentUserName)
      );

      // SHOW product ONLY IF: status === "approved" AND ownerId !== currentUserId
      return isApproved && !isOwnProduct;
    });

    // Brand Filter
    if (selectedBrands.length > 0) {
      list = list.filter((p) => {
        const text = `${p.title} ${p.description || ""} ${p.category || ""}`.toLowerCase();
        return selectedBrands.some((b) => text.includes(b.toLowerCase()));
      });
    }

    // Min Price Filter
    if (minPriceFilter > 0) {
      list = list.filter((p) => (p.price || 0) >= minPriceFilter);
    }

    // Max Price Filter
    if (maxPriceFilter !== null) {
      list = list.filter((p) => (p.price || 0) <= maxPriceFilter);
    }

    // Rating Filter
    if (minRatingFilter > 0) {
      list = list.filter((p) => (p.rating || 5.0) >= minRatingFilter);
    }

    // Availability Filter
    if (availableOnlyFilter) {
      list = list.filter((p) => {
        if (p.availability_status !== undefined) {
          return p.availability_status === "available";
        }
        return p.available !== false;
      });
    }

    // Location Prioritization (Sort nearby items first if location detected)
    if (isLocationActive) {
      list = [...list].sort((a, b) => {
        const aIn = isProductInLocation(a, detectedCity) ? 1 : 0;
        const bIn = isProductInLocation(b, detectedCity) ? 1 : 0;
        return bIn - aIn;
      });
    }

    // Sorting
    switch (sort) {
      case "price_asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => (b.rating || 5) - (a.rating || 5));
        break;
      case "newest":
        list = [...list].sort((a, b) => {
          const tA = (a as Product & { created_at?: string }).created_at
            ? new Date((a as Product & { created_at?: string }).created_at!).getTime()
            : 0;
          const tB = (b as Product & { created_at?: string }).created_at
            ? new Date((b as Product & { created_at?: string }).created_at!).getTime()
            : 0;
          return tB - tA;
        });
        break;
      case "featured":
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
    detectedCity,
    isLocationActive,
    minPriceFilter,
    maxPriceFilter,
    minRatingFilter,
    availableOnlyFilter,
    user,
  ]);

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeCategory !== "all") count++;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (minPriceFilter > 0) count++;
    if (maxPriceFilter !== null && maxPriceFilter < highestPriceInCatalog) count++;
    if (minRatingFilter > 0) count++;
    if (availableOnlyFilter) count++;
    if (q) count++;
    return count;
  }, [
    activeCategory,
    selectedBrands,
    minPriceFilter,
    maxPriceFilter,
    highestPriceInCatalog,
    minRatingFilter,
    availableOnlyFilter,
    q,
  ]);

  // Available categories with real counts
  const categoryChips = useMemo(() => {
    const list = [
      {
        id: "all",
        name: "All Gear",
        count: allProductsList.length,
      },
    ];

    if (liveCategories.length > 0) {
      liveCategories.forEach((cat) => {
        const catSlug = ((cat as any).slug || cat.name || cat.id || "").toLowerCase();
        const matchingCount = allProductsList.filter((p) =>
          matchCategory(p.category, catSlug) ||
          matchCategory(p.category, cat.id) ||
          matchCategory(p.category, cat.name)
        ).length;
        list.push({
          id: catSlug,
          name: cat.name,
          count: matchingCount,
        });
      });
    } else {
      const knownKeys = [
        "cameras",
        "drones",
        "laptops",
        "bikes",
        "audio",
        "tools",
        "powerbanks",
      ];
      knownKeys.forEach((key) => {
        const matchingCount = allProductsList.filter((p) =>
          matchCategory(p.category, key),
        ).length;
        const displayName =
          key === "powerbanks"
            ? "Power Banks"
            : key === "audio"
              ? "Audio"
              : key === "bikes"
                ? "Bikes"
                : key === "tools"
                  ? "Drilling Tools"
                  : key.charAt(0).toUpperCase() + key.slice(1);
        list.push({
          id: key,
          name: displayName,
          count: matchingCount,
        });
      });
    }
    return list;
  }, [liveCategories, allProductsList]);

  // Filtered categories and brands inside the sidebar search
  const visibleCategories = useMemo(() => {
    if (!filterSearch.trim()) return categoryChips;
    const term = filterSearch.toLowerCase().trim();
    return categoryChips.filter((c) => c.name.toLowerCase().includes(term));
  }, [categoryChips, filterSearch]);

  const visibleBrands = useMemo(() => {
    if (!filterSearch.trim()) return availableBrands;
    const term = filterSearch.toLowerCase().trim();
    return availableBrands.filter((b) => b.brand.toLowerCase().includes(term));
  }, [availableBrands, filterSearch]);

  return (
    <MainLayout>
      {/* 1. TOP BROWSE SEARCH & UTILITY BAR */}
      <section className="bg-white/95 dark:bg-[#070C12]/95 py-2.5 sm:py-3.5 backdrop-blur-xl transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            {/* Search Input Form (Full width on mobile, max-w-md on desktop) */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex-1 max-w-full sm:max-w-md"
              >
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 dark:text-[#8D98A3]" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setLocalQ(e.target.value)}
                  placeholder={typedPlaceholder}
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-[#697680] focus:outline-none focus:ring-1.5 focus:ring-emerald-500 shadow-xs transition-all"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalQ("");
                      navigate({
                        to: "/browse",
                        search: (prev: Record<string, unknown>) => ({ ...prev, q: undefined }),
                      });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {/* Location Tab / Pill (Shown inline on desktop) */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-neutral-100 dark:bg-white/5 rounded-full border border-neutral-200 dark:border-white/10 shrink-0 text-xs text-neutral-700 dark:text-[#AAB3BC]">
                <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span suppressHydrationWarning className="font-semibold text-xs truncate max-w-[120px] md:max-w-[150px]">
                  {isDetecting ? "Locating..." : isLocationActive ? detectedCity : "Pan India"}
                </span>
                <button
                  type="button"
                  onClick={() => detectLocation()}
                  disabled={isDetecting}
                  title="Update location"
                  className="p-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className={cn("h-3 w-3", isDetecting && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Mobile Second Row: Location Tab on Left + Wishlist & Messages on Right / Desktop Right End */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 w-full sm:w-auto">
              {/* Location Tab on Mobile (Takes left side of row 2) */}
              <div className="flex sm:hidden items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-white/5 rounded-full border border-neutral-200 dark:border-white/10 text-xs text-neutral-700 dark:text-[#AAB3BC]">
                <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span suppressHydrationWarning className="font-semibold text-xs truncate max-w-[160px]">
                  {isDetecting ? "Locating..." : isLocationActive ? detectedCity : "Pan India"}
                </span>
                <button
                  type="button"
                  onClick={() => detectLocation()}
                  disabled={isDetecting}
                  title="Update location"
                  className="p-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className={cn("h-3 w-3", isDetecting && "animate-spin")} />
                </button>
              </div>

              {/* Wishlist & Messages Circular Dark Buttons */}
              <div className="flex items-center gap-2 sm:gap-2.5 ml-auto sm:ml-0">
                {/* Wishlist Button */}
                <Link
                  to="/wishlist"
                  id="browse-top-wishlist"
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-900 dark:bg-[#151D24] text-white hover:bg-neutral-800 dark:hover:bg-[#1F2B36] border border-neutral-800 dark:border-white/15 transition-all flex items-center justify-center cursor-pointer shadow-sm group"
                  aria-label="Wishlist"
                  title="Wishlist"
                >
                  <Heart className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-white/90 group-hover:text-white stroke-[1.8] group-hover:scale-110 transition-transform" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 min-w-[17px] h-[17px] rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                {/* Messages Button */}
                <Link
                  to="/messages"
                  id="browse-top-messages"
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-900 dark:bg-[#151D24] text-white hover:bg-neutral-800 dark:hover:bg-[#1F2B36] border border-neutral-800 dark:border-white/15 transition-all flex items-center justify-center cursor-pointer shadow-sm group"
                  aria-label="Messages"
                  title="Messages"
                >
                  <MessageSquare className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-white/90 group-hover:text-white stroke-[1.8] group-hover:scale-110 transition-transform" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 min-w-[17px] h-[17px] rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY PILLS BAR */}
      <section className="bg-white dark:bg-[#080E14] sticky top-[68px] z-30 shadow-xs backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {categoryChips.map((c) => {
              const isActive = activeCategory === c.id;
              const IconComp = categoryIconMap[c.id] || Tag;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategorySelect(c.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                    isActive
                      ? "bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] shadow-sm"
                      : "bg-black/5 dark:bg-white/5 text-neutral-700 dark:text-[#AAB3BC] hover:bg-black/10 dark:hover:bg-white/10",
                  )}
                >
                  <IconComp
                    className={cn(
                      "h-3.5 w-3.5",
                      isActive
                        ? "text-emerald-400 dark:text-emerald-600"
                        : "text-neutral-500 dark:text-[#697680]",
                    )}
                  />
                  <span>{c.name}</span>
                  {c.count !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                        isActive
                          ? "bg-white/20 text-white dark:bg-black/15 dark:text-black"
                          : "bg-black/5 dark:bg-white/10 text-neutral-500 dark:text-[#8D98A3]",
                      )}
                    >
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. MAIN BROWSE LAYOUT */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-neutral-950 dark:text-white">
                {totalItems}{" "}
                {totalItems === 1 ? "piece of gear" : "pieces of gear"}
              </h2>
              {isLocationActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                  <MapPin className="h-3 w-3" />
                  Prioritizing {detectedCity}
                </span>
              )}
              {mlResults !== null && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                  <Sparkles className="h-3 w-3" />
                  AI Ranked
                </span>
              )}
            </div>

            {didYouMean && (
              <p className="mt-1 text-xs text-neutral-500 dark:text-[#8D98A3]">
                Did you mean:{" "}
                <button
                  type="button"
                  onClick={() => {
                    setLocalQ(didYouMean);
                    navigate({
                      to: "/browse",
                      search: (prev: Record<string, unknown>) => ({
                        ...prev,
                        q: didYouMean,
                      }),
                    });
                  }}
                  className="font-bold text-emerald-500 underline underline-offset-2 hover:opacity-80"
                >
                  {didYouMean}
                </button>
                ?
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-[#0D151D] text-xs font-bold text-neutral-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] font-mono flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Mode Switcher: Swipe Deck (Primary Default) vs Grid View */}
            <div className="flex items-center p-0.5 rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-[#0D151D]">
              <button
                type="button"
                onClick={() => setViewMode("swipe")}
                id="view-mode-swipe-btn"
                title="Primary Swipe Experience"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "swipe"
                    ? "bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] shadow-xs"
                    : "text-neutral-600 dark:text-[#AAB3BC] hover:text-neutral-900 dark:hover:text-white",
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Swipe Deck</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                id="view-mode-grid-btn"
                title="Grid Catalog View"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] shadow-xs"
                    : "text-neutral-600 dark:text-[#AAB3BC] hover:text-neutral-900 dark:hover:text-white",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-[#0D151D] text-xs font-bold text-neutral-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-neutral-500 dark:text-[#8D98A3]" />
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
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-[#111A22] border border-black/10 dark:border-white/15 shadow-2xl p-1.5 z-40">
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
                          ? "bg-black/5 dark:bg-white/10 font-bold text-neutral-950 dark:text-white"
                          : "text-neutral-700 dark:text-[#AAB3BC] hover:bg-black/5 dark:hover:bg-white/5",
                      )}
                    >
                      <span>{opt.label}</span>
                      {sort === opt.id && (
                        <Check className="h-3 w-3 text-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Removal Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-[11px] font-semibold text-neutral-400 dark:text-[#697680]">
              Active Filters:
            </span>

            {q && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs text-neutral-800 dark:text-[#E0E5EA] border border-black/10 dark:border-white/15">
                Query: "{q}"
                <button
                  type="button"
                  onClick={() => {
                    setLocalQ("");
                    navigate({
                      to: "/browse",
                      search: (prev: Record<string, unknown>) => ({
                        ...prev,
                        q: undefined,
                      }),
                    });
                  }}
                  className="hover:text-emerald-500 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {activeCategory !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs text-neutral-800 dark:text-[#E0E5EA] border border-black/10 dark:border-white/15">
                Category: {activeCategory}
                <button
                  type="button"
                  onClick={() => handleCategorySelect("all")}
                  className="hover:text-emerald-500 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedBrands.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs text-neutral-800 dark:text-[#E0E5EA] border border-black/10 dark:border-white/15"
              >
                Brand: {b}
                <button
                  type="button"
                  onClick={() => handleBrandToggle(b)}
                  className="hover:text-emerald-500 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {(minPriceFilter > 0 ||
              (maxPriceFilter !== null &&
                maxPriceFilter < highestPriceInCatalog)) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs text-neutral-800 dark:text-[#E0E5EA] border border-black/10 dark:border-white/15">
                Rate: ₹{minPriceFilter} - ₹{maxPriceFilter ?? highestPriceInCatalog}/day
                <button
                  type="button"
                  onClick={() => {
                    setMinPriceFilter(0);
                    setMaxPriceFilter(highestPriceInCatalog);
                  }}
                  className="hover:text-emerald-500 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {minRatingFilter > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs text-neutral-800 dark:text-[#E0E5EA] border border-black/10 dark:border-white/15">
                {minRatingFilter}+ Stars
                <button
                  type="button"
                  onClick={() => setMinRatingFilter(0)}
                  className="hover:text-emerald-500 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {availableOnlyFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs text-neutral-800 dark:text-[#E0E5EA] border border-black/10 dark:border-white/15">
                Available Gear Only
                <button
                  type="button"
                  onClick={() => setAvailableOnlyFilter(false)}
                  className="hover:text-emerald-500 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2 ml-1 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* 2-Column Layout (Desktop Filter + Product Grid) */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* DESKTOP ADVANCED FILTER PANEL */}
          <aside className="hidden lg:block lg:col-span-1 sticky top-[136px] space-y-6 p-5 rounded-3xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 shadow-sm max-h-[calc(100vh-160px)] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Filters
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-[#8D98A3] dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Filter Search Input */}
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs">
                <SearchIcon className="w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Search filters..."
                  className="bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none w-full"
                />
                {filterSearch && (
                  <button
                    type="button"
                    onClick={() => setFilterSearch("")}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <span className="block text-xs font-bold text-neutral-700 dark:text-[#AAB3BC] mb-2 uppercase tracking-wider">
                Category
              </span>
              <div className="space-y-1 max-h-44 overflow-y-auto no-scrollbar pr-1">
                {visibleCategories.map((c) => {
                  const isChecked = activeCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCategorySelect(c.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left",
                        isChecked
                          ? "bg-neutral-100 dark:bg-white/10 font-bold text-neutral-950 dark:text-white"
                          : "text-neutral-600 dark:text-[#AAB3BC] hover:bg-neutral-50 dark:hover:bg-white/5",
                      )}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-neutral-400">
                        {c.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Filter */}
            {visibleBrands.length > 0 && (
              <div className="pt-3 border-t border-black/10 dark:border-white/10">
                <span className="block text-xs font-bold text-neutral-700 dark:text-[#AAB3BC] mb-2 uppercase tracking-wider">
                  Brand / Maker
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar pr-1">
                  {visibleBrands.map(({ brand, count }) => {
                    const isChecked = selectedBrands.includes(brand);
                    return (
                      <label
                        key={brand}
                        className="flex items-center justify-between text-xs text-neutral-700 dark:text-[#AAB3BC] hover:text-neutral-950 dark:hover:text-white cursor-pointer px-1 py-0.5"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleBrandToggle(brand)}
                            className="h-3.5 w-3.5 rounded border-black/20 dark:border-white/20 accent-emerald-500 cursor-pointer"
                          />
                          <span className="truncate">{brand}</span>
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Range Slider & Inputs */}
            <div className="pt-3 border-t border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-neutral-700 dark:text-[#AAB3BC] uppercase tracking-wider font-bold">
                  Daily Rate
                </span>
                <span className="font-mono font-bold text-neutral-950 dark:text-white">
                  ₹{minPriceFilter} - ₹{maxPriceFilter ?? highestPriceInCatalog}
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={highestPriceInCatalog}
                step={200}
                value={maxPriceFilter ?? highestPriceInCatalog}
                onChange={(e) => {
                  setMaxPriceFilter(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full accent-neutral-950 dark:accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-1">
                <span>₹200</span>
                <span>₹{highestPriceInCatalog}/day</span>
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="pt-3 border-t border-black/10 dark:border-white/10">
              <span className="block text-xs font-bold text-neutral-700 dark:text-[#AAB3BC] mb-2 uppercase tracking-wider">
                Minimum Rating
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "All", val: 0 },
                  { label: "4.0★+", val: 4.0 },
                  { label: "4.5★+", val: 4.5 },
                ].map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => {
                      setMinRatingFilter(r.val);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer",
                      minRatingFilter === r.val
                        ? "bg-[#161616] text-white border-[#161616] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] dark:border-[#F2F0EA]"
                        : "bg-transparent text-neutral-600 dark:text-[#AAB3BC] border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="pt-3 border-t border-black/10 dark:border-white/10">
              <label className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-[#AAB3BC] cursor-pointer">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Available Gear Only
                </span>
                <input
                  type="checkbox"
                  checked={availableOnlyFilter}
                  onChange={(e) => {
                    setAvailableOnlyFilter(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="h-4 w-4 rounded border-black/20 dark:border-white/20 accent-emerald-500 cursor-pointer"
                />
              </label>
            </div>
          </aside>

          {/* RIGHT PRODUCT GRID (Col-Span 3) */}
          <main className="col-span-1 lg:col-span-3">
            {/* LOADING STATE */}
            {isLoadingProducts && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[22px] bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 p-4 space-y-3 animate-pulse"
                  >
                    <div className="aspect-[16/11] rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
                    <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 pt-2" />
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY RESULTS STATE */}
            {!isLoadingProducts && filteredProducts.length === 0 && (
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-white/5 mx-auto grid place-items-center text-neutral-400 mb-3">
                  <Camera className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  No gear matches these filters
                </h3>
                <p className="text-xs text-neutral-500 dark:text-[#8D98A3] mt-1 max-w-sm mx-auto">
                  Try adjusting your price range, selected brand, or search keywords to find available creator gear.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-5 py-2 rounded-full bg-[#161616] text-white dark:bg-[#F2F0EA] dark:text-[#161616] text-xs font-bold shadow-sm"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* PRIMARY INTERACTION: SWIPE DECK EXPERIENCE */}
            {!isLoadingProducts && filteredProducts.length > 0 && viewMode === "swipe" && (
              <BrowseSwipeDeck
                products={filteredProducts}
                onResetFilters={handleResetFilters}
              />
            )}

            {/* ALTERNATIVE INTERACTION: CLASSIC GRID */}
            {!isLoadingProducts && filteredProducts.length > 0 && viewMode === "grid" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0D151D] text-xs font-bold text-neutral-700 dark:text-neutral-300 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-mono font-bold text-neutral-500 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0D151D] text-xs font-bold text-neutral-700 dark:text-neutral-300 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </section>

      {/* 4. MOBILE FILTER DRAWER */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-h-[85vh] rounded-t-3xl bg-white dark:bg-[#0D151D] border-t border-black/10 dark:border-white/10 flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-sm text-neutral-900 dark:text-white">
                    Filter Gear ({totalItems})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 space-y-6 overflow-y-auto flex-1">
                {/* Category Selection */}
                <div>
                  <span className="block text-xs font-bold text-neutral-700 dark:text-[#AAB3BC] mb-2 uppercase">
                    Categories
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryChips.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCategorySelect(c.id)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-bold text-left truncate transition-colors",
                          activeCategory === c.id
                            ? "bg-[#161616] text-white dark:bg-[#F2F0EA] dark:text-[#161616]"
                            : "bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-[#AAB3BC]",
                        )}
                      >
                        {c.name} ({c.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                {availableBrands.length > 0 && (
                  <div>
                    <span className="block text-xs font-bold text-neutral-700 dark:text-[#AAB3BC] mb-2 uppercase">
                      Brands
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {availableBrands.map(({ brand, count }) => {
                        const isChecked = selectedBrands.includes(brand);
                        return (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => handleBrandToggle(brand)}
                            className={cn(
                              "px-3 py-2 rounded-xl text-xs font-bold text-left truncate transition-colors",
                              isChecked
                                ? "bg-[#161616] text-white dark:bg-[#F2F0EA] dark:text-[#161616]"
                                : "bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-[#AAB3BC]",
                            )}
                          >
                            {brand} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Price Slider */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-neutral-700 dark:text-[#AAB3BC]">Daily Rate</span>
                    <span className="font-mono">₹{maxPriceFilter ?? highestPriceInCatalog}/day</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={highestPriceInCatalog}
                    step={200}
                    value={maxPriceFilter ?? highestPriceInCatalog}
                    onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Rating */}
                <div>
                  <span className="block text-xs font-bold text-neutral-700 dark:text-[#AAB3BC] mb-2 uppercase">
                    Minimum Rating
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "All", val: 0 },
                      { label: "4.0★+", val: 4.0 },
                      { label: "4.5★+", val: 4.5 },
                    ].map((r) => (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => setMinRatingFilter(r.val)}
                        className={cn(
                          "py-2 text-xs font-bold rounded-xl border transition-colors",
                          minRatingFilter === r.val
                            ? "bg-[#161616] text-white dark:bg-[#F2F0EA] dark:text-[#161616]"
                            : "bg-transparent text-neutral-600 dark:text-[#AAB3BC] border-black/10 dark:border-white/10",
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100 dark:bg-white/5 cursor-pointer">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Available Gear Only
                    </span>
                    <input
                      type="checkbox"
                      checked={availableOnlyFilter}
                      onChange={(e) => setAvailableOnlyFilter(e.target.checked)}
                      className="h-4 w-4 rounded accent-emerald-500"
                    />
                  </label>
                </div>
              </div>

              {/* Sticky Footer Action Bar */}
              <div className="p-4 border-t border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#080E14] flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex-1 h-11 rounded-2xl border border-black/10 dark:border-white/10 text-xs font-bold text-neutral-700 dark:text-[#AAB3BC] hover:bg-neutral-100 dark:hover:bg-white/5"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex-1 h-11 rounded-2xl bg-[#161616] text-white dark:bg-[#F2F0EA] dark:text-[#161616] text-xs font-bold shadow-md"
                >
                  Apply Filters ({totalItems})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
