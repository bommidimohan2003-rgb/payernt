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
import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { tracker } from "@/utils/eventTracker";
import { storage } from "@/utils/storage";
import { api, getApiBase } from "@/utils/api";
import { isFakeOrDeletedProduct } from "@/utils/productFilters";
import { useAuth } from "@/hooks/useAuth";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useWishlist } from "@/hooks/useWishlist";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { toast } from "sonner";
import { formatOwnerAddress } from "@/utils/formatters";
import sonyFrontImg from "@/assets/images/sony_a7_front.webp";
import sonyBackImg from "@/assets/images/sony_a7_back.webp";
import sonySideImg from "@/assets/images/sony_a7_side.webp";
import sonyTopImg from "@/assets/images/sony_a7_top.webp";
import droneImg from "@/assets/images/drone.webp";
import cameraImg from "@/assets/images/camera.webp";

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

const DEFAULT_FEATURED_PRODUCT: Product = {
  id: "sony-alpha-a7-iii",
  title: "Sony Alpha a7 III",
  category: "Camera",
  price: 499,
  rating: 4.8,
  reviews: 124,
  image: sonyFrontImg,
  images: [
    sonyFrontImg,
    sonyBackImg,
    sonySideImg,
    sonyTopImg,
  ],
  description:
    "Capture stunning photos and videos with the Sony Alpha a7 III. Perfect for events, travel and professional shoots.",
  available: true,
  owner: {
    id: "owner-sai-teja",
    name: "Sai Teja",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
    city: "Vizag, AP",
  },
} as unknown as Product;

// Curated reference products for Related Products section
const CURATED_RELATED_PRODUCTS = [
  {
    id: "dji-mini-3-drone",
    title: "DJI Mini 3 Drone",
    category: "Camera",
    price: 499,
    rating: 4.7,
    reviews: 98,
    image: droneImg,
    available: true,
  },
  {
    id: "gopro-hero12",
    title: "GoPro HERO12",
    category: "Camera",
    price: 399,
    rating: 4.6,
    reviews: 76,
    image: cameraImg,
    available: true,
  },
  {
    id: "canon-eos-200d",
    title: "Canon EOS 200D",
    category: "Camera",
    price: 449,
    rating: 4.5,
    reviews: 64,
    image: sonySideImg,
    available: true,
  },
  {
    id: "insta360-x3",
    title: "Insta360 X3",
    category: "Camera",
    price: 399,
    rating: 4.6,
    reviews: 72,
    image: sonyFrontImg,
    available: true,
  },
];

const WHY_RENT_FEATURES = [
  {
    title: "Affordable Rentals",
    subtitle: "Save more, rent smart.",
    icon: Coins,
  },
  {
    title: "Verified Lenders",
    subtitle: "Rent with confidence.",
    icon: ShieldCheck,
  },
  {
    title: "Flexible Booking",
    subtitle: "Choose your time.",
    icon: Calendar,
  },
  {
    title: "Secure Rental Experience",
    subtitle: "Your trust, our priority.",
    icon: Lock,
  },
];

const CUSTOMER_REVIEWS = [
  {
    name: "Sneha Reddy",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    rating: 5,
    text: "Amazing camera! Great experience.",
    date: "Oct 20, 2026",
  },
  {
    name: "Rahul Kumar",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    rating: 5,
    text: "Super easy booking and smooth pickup.",
    date: "Oct 18, 2026",
  },
  {
    name: "Divya Sharma",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80",
    rating: 5,
    text: "Loved the rental service!",
    date: "Oct 15, 2026",
  },
];

const FAQ_ITEMS = [
  {
    q: "how does renting work?",
    a: "Browse gear from verified local creators, select your date and time slot, and book instantly. Inspect and test equipment upon pickup or delivery.",
  },
  {
    q: "How do I book this product?",
    a: "Select your desired date and rental slot (Morning, Afternoon, or Full Day), then click 'BOOK NOW' to review insurance options and complete checkout.",
  },
  {
    q: "What happens after booking confirmation?",
    a: "You receive your digital booking confirmation with a secure 4-digit verification PIN and pickup directions. The equipment owner prepares the gear for handover.",
  },
  {
    q: "What is the pickup and return process?",
    a: "Meet the owner at the verified pickup location or opt for express delivery. Test the equipment together, verify condition, and complete the PIN check-in.",
  },
  {
    q: "Can I cancel my booking?",
    a: "Yes! Full refunds are provided on cancellations made at least 24 hours prior to scheduled pickup time.",
  },
];

function addDaysToDate(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

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

  // Selected Featured Product for Explore Showcase
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Gallery Active Thumbnail Index
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Rental Booking Slot & Duration States
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | "full_day">("morning");
  const [durationPreset, setDurationPreset] = useState<"1 Day" | "3 Days" | "1 Week" | "2 Weeks">("1 Day");
  const [durationMode, setDurationMode] = useState<"slot" | "full_day" | "custom">("slot");
  const [rentalDays, setRentalDays] = useState(1);
  const [endDate, setEndDate] = useState(todayStr);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Availability & Booking State
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>("✔ Available on your selected date!");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(true);

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
    return storage.get<Product[]>("payent_server_products", []).filter((p) => !isFakeOrDeletedProduct(p));
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(() => {
    const cached = storage.get<Product[]>("payent_server_products", []);
    return cached.length === 0;
  });

  const [liveCategories, setLiveCategories] = useState<Category[]>(() => {
    return storage.get<Category[]>("payent_live_categories", []);
  });
  const [mlResults, setMlResults] = useState<Product[] | null>(null);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);

  const sortRef = useRef<HTMLDivElement>(null);
  const relatedScrollRef = useRef<HTMLDivElement>(null);

  const { wishlistCount, has: hasInWishlist, toggle: toggleWishlist } = useWishlist();
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
          setAllProductsList(cleanList);
          storage.set("payent_server_products", cleanList);
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
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list = [...list].sort((a, b) => b.price - a.price);
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

  // Featured Product in Top Showcase
  const featuredProduct = useMemo<Product>(() => {
    if (selectedProductId) {
      const found = allProductsList.find((p) => String(p.id) === String(selectedProductId));
      if (found) return found;
    }
    // Find preferred high-profile product (e.g. Sony camera)
    const preferred = allProductsList.find(
      (p) =>
        p.available &&
        (p.title.toLowerCase().includes("sony") ||
          p.title.toLowerCase().includes("alpha") ||
          p.category.toLowerCase().includes("camera"))
    );
    if (preferred) return preferred;
    return allProductsList.find((p) => p.available) || allProductsList[0] || DEFAULT_FEATURED_PRODUCT;
  }, [allProductsList, selectedProductId]);

  // Gallery Thumbnails for Featured Product
  const featuredThumbnails = useMemo(() => {
    if (!featuredProduct) return [sonyFrontImg, sonyBackImg, sonySideImg, sonyTopImg];
    if (Array.isArray(featuredProduct.images) && featuredProduct.images.length > 0) {
      const valid = featuredProduct.images.filter(Boolean);
      if (valid.length >= 4) return valid.slice(0, 4);
      const list = [...valid];
      const fallbackList = [sonyFrontImg, sonyBackImg, sonySideImg, sonyTopImg];
      let fbIdx = 0;
      while (list.length < 4) {
        list.push(fallbackList[fbIdx % 4]);
        fbIdx++;
      }
      return list;
    }
    const main = featuredProduct.image || sonyFrontImg;
    return [main, sonyBackImg, sonySideImg, sonyTopImg];
  }, [featuredProduct]);

  const activeDisplayImage = featuredThumbnails[selectedImageIndex] || featuredProduct?.image || sonyFrontImg;

  // Category chips
  const categoryChips = useMemo(() => {
    const list = [
      { id: "all", name: "All Gear", count: allProductsList.length },
    ];
    const knownKeys = ["cameras", "drones", "laptops", "bikes", "audio", "lighting", "tools", "powerbanks"];
    knownKeys.forEach((key) => {
      const matchingCount = allProductsList.filter((p) => matchCategory(p.category, key)).length;
      const displayName =
        key === "powerbanks"
          ? "Power Banks"
          : key === "audio"
          ? "Audio"
          : key === "bikes"
          ? "Bikes"
          : key === "tools"
          ? "Tools"
          : key.charAt(0).toUpperCase() + key.slice(1);
      list.push({ id: key, name: displayName, count: matchingCount });
    });
    return list;
  }, [allProductsList]);

  // Handle Duration Preset Selection (1 Day, 3 Days, 1 Week, 2 Weeks)
  const handleDurationPresetClick = (preset: "1 Day" | "3 Days" | "1 Week" | "2 Weeks") => {
    setDurationPreset(preset);
    if (preset === "1 Day") {
      setDurationMode(selectedSlot === "full_day" ? "full_day" : "slot");
      setRentalDays(1);
      setEndDate(selectedDate);
    } else if (preset === "3 Days") {
      setDurationMode("custom");
      setRentalDays(3);
      setEndDate(addDaysToDate(selectedDate, 2));
    } else if (preset === "1 Week") {
      setDurationMode("custom");
      setRentalDays(7);
      setEndDate(addDaysToDate(selectedDate, 6));
    } else if (preset === "2 Weeks") {
      setDurationMode("custom");
      setRentalDays(14);
      setEndDate(addDaysToDate(selectedDate, 13));
    }
  };

  // Handle Slot Selection (Morning, Afternoon, Full Day)
  const handleSlotSelect = (slot: "morning" | "afternoon" | "full_day") => {
    setSelectedSlot(slot);
    if (durationPreset === "1 Day") {
      setDurationMode(slot === "full_day" ? "full_day" : "slot");
    }
  };

  // Price calculations
  const baseDayPrice = Number(featuredProduct?.price) || 499;
  const morningSlotPrice = Math.round(baseDayPrice * 0.5);
  const afternoonSlotPrice = Math.round(baseDayPrice * 0.5);
  const fullDayPrice = baseDayPrice;

  const currentComputedPrice = useMemo(() => {
    if (durationMode === "custom") {
      return baseDayPrice * rentalDays;
    }
    if (selectedSlot === "morning") return morningSlotPrice;
    if (selectedSlot === "afternoon") return afternoonSlotPrice;
    return fullDayPrice;
  }, [durationMode, selectedSlot, baseDayPrice, rentalDays, morningSlotPrice, afternoonSlotPrice, fullDayPrice]);

  // Booking Summary Description
  const bookingSummaryLabel = useMemo(() => {
    if (durationPreset === "1 Day") {
      const slotName =
        selectedSlot === "morning"
          ? "Morning Slot"
          : selectedSlot === "afternoon"
          ? "Afternoon Slot"
          : "Full Day";
      return `1 Day • ${slotName}`;
    }
    return `${rentalDays} Days • Rental`;
  }, [durationPreset, selectedSlot, rentalDays]);

  // Select another product from Related Products grid
  const handleSelectProduct = (p: Product | typeof CURATED_RELATED_PRODUCTS[0]) => {
    setSelectedProductId(String(p.id));
    setSelectedImageIndex(0);
    const element = document.getElementById("featured-hero");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Scroll Related Products carousel
  const scrollRelated = (direction: "left" | "right") => {
    if (relatedScrollRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      relatedScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Handle Date Change
  const handleDateChange = (val: string) => {
    setSelectedDate(val);
    if (durationPreset === "1 Day") {
      setEndDate(val);
    } else {
      setEndDate(addDaysToDate(val, rentalDays - 1));
    }
  };

  // Critical BOOK NOW action (preserves existing booking rules & checkout route)
  const handleBookNowAction = async () => {
    if (!featuredProduct) return;

    if (!user) {
      toast.info("Please log in to proceed with your gear booking.");
      const checkEnd = durationMode === "custom" ? endDate : selectedDate;
      navigate({
        to: "/login",
        search: {
          redirect: `/checkout?id=${featuredProduct.id}&start=${selectedDate}&end=${checkEnd}&mode=${durationMode}&slot=${selectedSlot}`,
        } as any,
      });
      return;
    }

    // Verify availability
    setIsCheckingAvailability(true);
    try {
      const apiBase = getApiBase();
      const checkEnd = durationMode === "custom" ? endDate : selectedDate;
      const effectiveSession = durationMode === "custom" ? "full_day" : selectedSlot;

      const res = await fetch(
        `${apiBase}/api/products/${encodeURIComponent(featuredProduct.id)}/availability?start_date=${selectedDate}&end_date=${checkEnd}&session=${encodeURIComponent(effectiveSession)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.is_available === false || data.status === "blocked" || data.status === "booked") {
          setIsAvailable(false);
          const reason = data.reason || "The selected time slot or date is currently unavailable.";
          setAvailabilityMessage(reason);
          toast.error(reason);
          setIsCheckingAvailability(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Availability network check notice:", err);
    } finally {
      setIsCheckingAvailability(false);
    }

    // Proceed to checkout with exact validated parameters
    const checkEnd = durationMode === "custom" ? endDate : selectedDate;
    navigate({
      to: "/checkout",
      search: {
        id: String(featuredProduct.id),
        start: selectedDate,
        end: checkEnd,
        slot: selectedSlot,
        mode: durationMode,
      } as any,
    });
  };

  const isFeaturedWishlisted = featuredProduct ? hasInWishlist(featuredProduct.id) : false;

  return (
    <MainLayout>
      <div className="bg-[#FAFBF9] dark:bg-[#070C12] text-neutral-900 dark:text-neutral-100 min-h-screen">
        {/* ================================================================= */}
        {/* TOP UTILITY & SEARCH BAR                                          */}
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
                  placeholder="Search for gear, cameras, drones, laptops..."
                  className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalQ("");
                      navigate({ to: "/browse", search: (prev: any) => ({ ...prev, q: undefined }) });
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
                <span className="font-semibold">{isDetecting ? "Locating..." : isLocationActive ? detectedCity : "Vizag, AP"}</span>
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
        {/* MAIN EXPLORE CONTENT CONTAINER                                    */}
        {/* ================================================================= */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-32 space-y-12 sm:space-y-16">
          {/* =============================================================== */}
          {/* 1. TOP HERO SHOWCASE (2-COLUMN REFERENCE LAYOUT)                */}
          {/* =============================================================== */}
          <section id="featured-hero" className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* LEFT COLUMN: PRODUCT IMAGE GALLERY (6 COLS) */}
            <div className="lg:col-span-6 space-y-4">
              {/* Soft Mint Rounded Card */}
              <div className="relative rounded-3xl bg-[#EAF7EE] dark:bg-emerald-950/20 border border-emerald-500/15 p-8 sm:p-12 flex items-center justify-center min-h-[340px] sm:min-h-[420px] overflow-hidden group shadow-xs">
                {/* Available Badge (Top-Left) */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#0D151D] text-emerald-700 dark:text-emerald-400 font-bold text-xs shadow-xs border border-emerald-500/20 select-none">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Available
                  </span>
                </div>

                {/* Heart Wishlist Button (Top-Right) */}
                <button
                  type="button"
                  onClick={() => {
                    if (featuredProduct) {
                      toggleWishlist(featuredProduct.id);
                      toast.success(isFeaturedWishlisted ? "Removed from favourites" : "Saved to favourites!");
                    }
                  }}
                  aria-label="Toggle favourite"
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white dark:bg-[#0D151D] text-neutral-600 dark:text-neutral-300 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all shadow-xs border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center cursor-pointer"
                >
                  <Heart
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isFeaturedWishlisted ? "fill-rose-500 text-rose-500" : ""
                    )}
                  />
                </button>

                {/* High-Resolution Center Equipment Image */}
                <img
                  src={activeDisplayImage}
                  alt={featuredProduct?.title || "Gear"}
                  className="max-h-[260px] sm:max-h-[320px] w-auto max-w-full object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* 4-Thumbnail Gallery Strip */}
              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {featuredThumbnails.map((thumb, idx) => {
                  const isActive = idx === selectedImageIndex;
                  const isFourth = idx === 3;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer p-2 flex items-center justify-center bg-white dark:bg-[#0D151D] shadow-2xs",
                        isActive
                          ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50"
                      )}
                    >
                      <img src={thumb} alt="" className="w-full h-full object-contain" />
                      {isFourth && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-white font-extrabold text-sm sm:text-base">
                          +2
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: PRODUCT INFORMATION & PURCHASE ACTION (6 COLS) */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Product Title & Category */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
                  {featuredProduct?.title || "Sony Alpha a7 III"}
                </h1>
                <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  {featuredProduct?.category || "Camera"} • DSLR
                </p>
              </div>

              {/* Star Rating & Reviews */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1 font-bold text-neutral-900 dark:text-white">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{(featuredProduct?.rating || 4.8).toFixed(1)}</span>
                </div>
                <span className="text-neutral-500 font-medium">
                  ({featuredProduct?.reviews || 124} reviews)
                </span>
              </div>

              {/* Price Display */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                  ₹{(Number(featuredProduct?.price) || 499).toLocaleString("en-IN")}
                </span>
                <span className="text-sm font-semibold text-neutral-500">/ day</span>
              </div>

              {/* Duration Selection Pills (1 Day, 3 Days, 1 Week, 2 Weeks) */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2.5">
                  {(["1 Day", "3 Days", "1 Week", "2 Weeks"] as const).map((preset) => {
                    const isSelected = durationPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleDurationPresetClick(preset)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer",
                          isSelected
                            ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                            : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D151D] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                        )}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description Paragraph */}
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {featuredProduct?.description ||
                  `Capture stunning photos and videos with the ${featuredProduct?.title || "Sony Alpha a7 III"}. Perfect for events, travel and professional shoots.`}
              </p>

              {/* Key Attributes List with Icons */}
              <div className="space-y-2.5 pt-3 border-t border-neutral-200/80 dark:border-neutral-800 text-sm">
                <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-neutral-500">Condition:</span>
                  <span className="font-bold">Excellent</span>
                </div>

                <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-neutral-500">Location:</span>
                  <span className="font-bold">{formatOwnerAddress(featuredProduct) || "Vizag, AP"}</span>
                </div>

                <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white">
                  <User className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-neutral-500">Lender:</span>
                  <span className="font-bold">{featuredProduct?.owner?.name || "Sai Teja"}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
                </div>

                <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Available for Rent
                  </span>
                </div>
              </div>

              {/* Action Buttons: BOOK NOW & ADD TO FAVOURITES */}
              <div className="space-y-3 pt-3">
                <button
                  type="button"
                  id="explore-book-now-btn"
                  onClick={handleBookNowAction}
                  disabled={isCheckingAvailability}
                  className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base bg-[#059669] hover:bg-[#047857] text-white shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
                >
                  <Calendar className="h-5 w-5 shrink-0" />
                  <span>{isCheckingAvailability ? "CHECKING AVAILABILITY..." : "BOOK NOW"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (featuredProduct) {
                      toggleWishlist(featuredProduct.id);
                      toast.success(isFeaturedWishlisted ? "Removed from favourites" : "Saved to favourites!");
                    }
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFeaturedWishlisted ? "fill-rose-500 text-rose-500" : ""
                    )}
                  />
                  <span>{isFeaturedWishlisted ? "REMOVE FROM FAVOURITES" : "ADD TO FAVOURITES"}</span>
                </button>
              </div>
            </div>
          </section>

          {/* =============================================================== */}
          {/* 2. INLINE RENTAL BOOKING CARD                                   */}
          {/* =============================================================== */}
          <section
            id="rental-booking-section"
            className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D151D] p-6 sm:p-8 space-y-6 shadow-xs text-left"
          >
            <div className="flex items-center gap-2.5 pb-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                Rental Booking
              </h2>
            </div>

            {/* 3 Interactive Fields: Select Date, Choose Slot, Booking Summary */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Field 1: Select Date */}
              <div className="md:col-span-4 space-y-2">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Select Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full h-12 px-3.5 pl-10 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/5 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
                  />
                  <Calendar className="h-4 w-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Field 2: Choose Slot (Morning, Afternoon, Full Day) */}
              <div className="md:col-span-5 space-y-2">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Choose Slot
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSlotSelect("morning")}
                    className={cn(
                      "py-2.5 px-2 rounded-2xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                      selectedSlot === "morning"
                        ? "border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-2xs"
                        : "border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>Morning</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      (₹{morningSlotPrice})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSlotSelect("afternoon")}
                    className={cn(
                      "py-2.5 px-2 rounded-2xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                      selectedSlot === "afternoon"
                        ? "border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-2xs"
                        : "border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <Sun className="h-3.5 w-3.5 text-orange-500" />
                      <span>Afternoon</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      (₹{afternoonSlotPrice})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSlotSelect("full_day")}
                    className={cn(
                      "py-2.5 px-2 rounded-2xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                      selectedSlot === "full_day"
                        ? "border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-2xs"
                        : "border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Full Day</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      (₹{fullDayPrice})
                    </span>
                  </button>
                </div>
              </div>

              {/* Field 3: Booking Summary */}
              <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800 pt-4 md:pt-0 md:pl-6">
                <div>
                  <span className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    Booking Summary
                  </span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {bookingSummaryLabel}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                    ₹{currentComputedPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Availability Status Banner */}
            <div className="pt-2 flex items-center justify-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{availabilityMessage}</span>
              </div>
            </div>
          </section>

          {/* =============================================================== */}
          {/* 3. WHY RENT THROUGH PAYENT? (4-CARD GRID)                       */}
          {/* =============================================================== */}
          <section className="space-y-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-10 sm:w-16 bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-800 dark:text-neutral-200 tracking-wider uppercase">
                • Why Rent Through PAYENT? •
              </span>
              <div className="h-px w-10 sm:w-16 bg-neutral-300 dark:bg-neutral-700" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {WHY_RENT_FEATURES.map((feat) => {
                const IconComp = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D151D] p-6 text-center space-y-3 shadow-2xs hover:shadow-sm transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                      <IconComp className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {feat.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =============================================================== */}
          {/* 4. CUSTOMER REVIEWS (3-CARD GRID)                              */}
          {/* =============================================================== */}
          <section className="space-y-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-10 sm:w-16 bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-800 dark:text-neutral-200 tracking-wider uppercase">
                • Customer Reviews •
              </span>
              <div className="h-px w-10 sm:w-16 bg-neutral-300 dark:bg-neutral-700" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {CUSTOMER_REVIEWS.map((rev) => (
                <div
                  key={rev.name}
                  className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D151D] p-5 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{rev.name}</h4>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 italic">
                    "{rev.text}"
                  </p>
                  <span className="block text-[10px] text-neutral-400 font-mono">{rev.date}</span>
                </div>
              ))}
            </div>
          </section>

          {/* =============================================================== */}
          {/* 5. FREQUENTLY ASKED QUESTIONS (5 ACCORDIONS)                    */}
          {/* =============================================================== */}
          <section className="space-y-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-10 sm:w-16 bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-800 dark:text-neutral-200 tracking-wider uppercase">
                • Frequently Asked Questions •
              </span>
              <div className="h-px w-10 sm:w-16 bg-neutral-300 dark:bg-neutral-700" />
            </div>

            <div className="max-w-4xl mx-auto space-y-3 text-left">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D151D] overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4.5 flex items-center justify-between text-left text-xs sm:text-sm font-bold text-neutral-900 dark:text-white cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-neutral-400 transition-transform duration-200 shrink-0",
                          isOpen ? "rotate-180 text-emerald-600" : ""
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4.5 pb-4 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-neutral-100 dark:border-neutral-800/60 pt-3"
                        >
                          {item.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =============================================================== */}
          {/* 6. RELATED PRODUCTS / EXPLORE CATALOG SECTION                    */}
          {/* =============================================================== */}
          <section className="space-y-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-10 sm:w-16 bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-800 dark:text-neutral-200 tracking-wider uppercase">
                • Related Products •
              </span>
              <div className="h-px w-10 sm:w-16 bg-neutral-300 dark:bg-neutral-700" />
            </div>

            {/* Category Filter Chips Bar */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
              {categoryChips.map((c) => {
                const isActive = activeCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategorySelect(c.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                      isActive
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs"
                        : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
                    )}
                  >
                    <span>{c.name}</span>
                    {c.count !== undefined && (
                      <span className="text-[10px] font-mono opacity-70">({c.count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Carousel Controls & Cards */}
            <div className="relative">
              {/* Carousel Left Navigation Arrow */}
              <button
                type="button"
                onClick={() => scrollRelated("left")}
                aria-label="Previous products"
                className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-neutral-700 shadow-md items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Related Products Carousel List */}
              <div
                ref={relatedScrollRef}
                className="flex items-stretch gap-5 overflow-x-auto no-scrollbar scroll-smooth px-1 py-2 text-left"
              >
                {(filteredProducts.length > 0 ? filteredProducts : CURATED_RELATED_PRODUCTS).map((item) => {
                  const isCurrent = String(item.id) === String(featuredProduct?.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectProduct(item as Product)}
                      className={cn(
                        "w-[240px] sm:w-[260px] shrink-0 rounded-3xl border bg-white dark:bg-[#0D151D] p-4 space-y-3 cursor-pointer transition-all hover:shadow-md active:scale-98 relative group",
                        isCurrent
                          ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-neutral-200/90 dark:border-neutral-800 hover:border-emerald-500/50"
                      )}
                    >
                      {/* Product Image Square */}
                      <div className="aspect-square rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 flex items-center justify-center overflow-hidden">
                        <img
                          src={item.image || "/assets/camera.webp"}
                          alt={item.title}
                          className="max-h-[140px] w-auto max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-neutral-500">
                          {item.category || "Gear"}
                        </p>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold">{(item.rating || 4.7).toFixed(1)}</span>
                          <span className="text-neutral-400">({item.reviews || 80})</span>
                        </div>
                      </div>

                      {/* Bottom Row: Price & Available Badge */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="text-sm font-bold text-neutral-900 dark:text-white font-mono">
                          ₹{item.price} <span className="text-[11px] font-normal text-neutral-500">/ day</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Available
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Carousel Right Navigation Arrow */}
              <button
                type="button"
                onClick={() => scrollRelated("right")}
                aria-label="Next products"
                className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-neutral-700 shadow-md items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 active:scale-95 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
