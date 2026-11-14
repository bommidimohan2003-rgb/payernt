import { useNavigate, useParams, Link } from "@tanstack/react-router";
import {
  Check,
  Truck,
  MessageSquare,
  MessageSquareQuote,
  MapPin,
  Star,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Info,
  Tag,
  ShoppingBag,
  Calendar,
  Clock,
  Heart,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  CalendarX,
  RotateCcw,
  User,
  Package,
  KeyRound,
  Video,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sun,
  Maximize2,
  X,
  LayoutGrid,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { Rating } from "@/components/common/Rating";
import { RentalProductCard } from "@/components/common/RentalProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/common/JsonLd";
import { INITIAL_FALLBACK_PRODUCTS } from "@/utils/fallbackProducts";
import { PhotoDetailViewer } from "@/components/common/PhotoDetailViewer";
import { ProductRotationViewer } from "@/components/common/ProductRotationViewer";
import { ProductAngleViewer } from "@/components/common/ProductAngleViewer";
import { RecommendationSection } from "@/components/recommendations/RecommendationSection";
import { RenterBookingCalendar } from "@/components/booking/RenterBookingCalendar";
import { LatticeLoader } from "@/components/reactbits/LatticeLoader";
import { tracker } from "@/utils/eventTracker";
import { api, getApiBase, normalizeProductData } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { isFakeOrDeletedProduct, isUserOwnProduct } from "@/utils/productFilters";
import { formatOwnerAddress, formatRelativeTime } from "@/utils/formatters";
import type { Product, Order } from "@/types";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import { ProductMessageModal } from "@/components/browse/ProductMessageModal";
import { ShareProductModal } from "@/components/common/ShareProductModal";
import { TermsAndConditionsModal } from "@/components/common/TermsAndConditionsModal";
import { rentalSecurityService } from "@/services/rentalSecurityService";
import { reviewsApi, type ReviewItem } from "@/services/api";
import type { RentalSecurity } from "@/types";

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

function getProductBrand(product: Product): string | null {
  if ((product as unknown as { brand?: string }).brand) {
    return (product as unknown as { brand: string }).brand;
  }
  const text = `${product.title} ${product.description || ""}`.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (text.includes(b.toLowerCase())) {
      return b;
    }
  }
  return null;
}

// Helper to format ISO YYYY-MM-DD
function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to format friendly date e.g. "Nov 05, 2026"
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// Calculate inclusive days between two YYYY-MM-DD dates
function calculateInclusiveDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const [sY, sM, sD] = startStr.split("-").map(Number);
  const [eY, eM, eD] = endStr.split("-").map(Number);
  if (!sY || !sM || !sD || !eY || !eM || !eD) return 0;
  const start = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Short-lived client cache for day slots (30-second TTL)
interface CachedSlots {
  slots: any[];
  timestamp: number;
}
const slotsCache = new Map<string, CachedSlots>();
const inFlightSlotsRequests = new Map<string, Promise<any[]>>();

export const invalidateSlotsCache = (productId?: string) => {
  if (productId) {
    for (const key of slotsCache.keys()) {
      if (key.startsWith(`${productId}:`)) {
        slotsCache.delete(key);
      }
    }
  } else {
    slotsCache.clear();
  }
};

export default function ProductDetails() {
  const params = useParams({ strict: false }) as { id?: string };
  const routeParamId = params?.id || (typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean).pop() || "" : "");
  const id = String(routeParamId || "");
  const navigate = useNavigate();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const { addToCart, cartItems } = useCart();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [justAddedToCart, setJustAddedToCart] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [securityRecord, setSecurityRecord] = useState<RentalSecurity | null>(null);
  const [categoryRestriction, setCategoryRestriction] = useState<{
    restricted: boolean;
    message: string;
  } | null>(null);
  // SSR-deterministic fallback lookup (client storage cache hydrated in useEffect post-mount for Obs B)
  const initialCachedProduct = useMemo(() => {
    if (!id) return null;
    const targetKey = String(id).toLowerCase().trim();
    const fromFallback = INITIAL_FALLBACK_PRODUCTS.find(
      (p) => String(p.id).toLowerCase() === targetKey || String(p.id) === String(id)
    );
    return fromFallback || null;
  }, [id]);
  const [product, setProduct] = useState<Product | null>(initialCachedProduct);
  const [productLoading, setProductLoading] = useState<boolean>(!initialCachedProduct);
  const [productError, setProductError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState<number>(0);
  const [cachedCatalog, setCachedCatalog] = useState<Product[]>([]);

  // Redesign Visual UI States
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [relatedCarouselPage, setRelatedCarouselPage] = useState(0);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [isFullscreenGridView, setIsFullscreenGridView] = useState(false);
  const [isFullscreenVideoActive, setIsFullscreenVideoActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);

  // Close full screen viewer on Escape key
  useEffect(() => {
    if (!isPhotoViewerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPhotoViewerOpen(false);
        setIsFullscreenGridView(false);
        setIsFullscreenVideoActive(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPhotoViewerOpen]);

  // Dynamic Genuine Reviews State
  const [genuineReviews, setGenuineReviews] = useState<ReviewItem[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!product?.id) {
      setGenuineReviews([]);
      return;
    }
    setIsReviewsLoading(true);
    reviewsApi
      .getReviews({ product_id: product.id, limit: 6 })
      .then((res) => {
        if (isMounted) {
          setGenuineReviews(res?.reviews || []);
          setIsReviewsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setGenuineReviews([]);
          setIsReviewsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  // Date Selection & Availability States (initialized post-mount to guarantee SSR/CSR parity)
  const [todayStr, setTodayStr] = useState<string>("");
  const [tomorrowStr, setTomorrowStr] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    const todayVal = toDateInputValue(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowVal = toDateInputValue(tomorrow);
    setTodayStr(todayVal);
    setTomorrowStr(tomorrowVal);
    setStartDate((prev) => prev || todayVal);
    setEndDate((prev) => prev || todayVal);
  }, []);
  const [availabilityChecked, setAvailabilityChecked] = useState<boolean>(false);
  const [isAvailableForDates, setIsAvailableForDates] = useState<boolean | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>("");
  const [isCreatingBooking, setIsCreatingBooking] = useState<boolean>(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);

  // Flexible Rental Duration & Time Slot State
  type DurationMode = "half_day_morning" | "half_day_afternoon" | "full_day" | "custom";
  const [durationMode, setDurationMode] = useState<DurationMode>("full_day");
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | "full_day">("full_day");
  const [daySlots, setDaySlots] = useState<Array<{
    id: "morning" | "afternoon" | "full_day";
    name: string;
    label: string;
    startTime: string;
    endTime: string;
    startDatetime: string;
    endDatetime: string;
    status: string;
    statusLabel: string;
    price: number;
  }>>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const slotsAbortControllerRef = useRef<AbortController | null>(null);

  // Time Slot Dropdown State
  const [isSlotDropdownOpen, setIsSlotDropdownOpen] = useState(false);
  const slotDropdownRef = useRef<HTMLDivElement>(null);

  // Close slot dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (slotDropdownRef.current && !slotDropdownRef.current.contains(event.target as Node)) {
        setIsSlotDropdownOpen(false);
      }
    }
    if (isSlotDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSlotDropdownOpen]);

  // Stale-While-Revalidate: hydrate local cache & fetch latest product details post-mount
  useEffect(() => {
    let isMounted = true;
    setSelectedImageIndex(0);
    setIsVideoActive(false);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
    setProductError(null);

    const storedCatalog = storage.get<Product[]>("payent_server_products", []);
    if (Array.isArray(storedCatalog) && storedCatalog.length > 0 && isMounted) {
      setCachedCatalog(storedCatalog);
    }

    const cached = initialCachedProduct || api.getCachedProduct(id);
    if (cached) {
      if (isMounted) {
        setProduct(cached);
        setProductLoading(false);
      }
    } else {
      if (isMounted) {
        setProduct(null);
        setProductLoading(true);
      }
    }

    async function loadTargetProduct() {
      let found: Product | null = cached || null;
      let directStatus: number | null = null;
      let hadFetchError = false;
      const apiBase = getApiBase();

      if (apiBase && id) {
        try {
          const res = await fetch(`${apiBase}/api/products/${encodeURIComponent(id)}`);
          directStatus = res.status;
          if (res.ok) {
            const raw = await res.json();
            if (raw && raw.id) {
              const normalized = normalizeProductData(raw);
              if (!isFakeOrDeletedProduct(normalized)) {
                found = normalized;
              }
            }
          } else if (res.status >= 500) {
            hadFetchError = true;
          }
        } catch {
          hadFetchError = true;
        }
      }

      if (!found) {
        try {
          const items = await api.getPublicProducts();
          if (Array.isArray(items)) {
            const targetKey = String(id).toLowerCase().trim();
            found =
              items.find(
                (p: Product) =>
                  String(p.id).toLowerCase() === targetKey ||
                  String(p.id) === String(id)
              ) || null;
          }
        } catch {
          hadFetchError = true;
        }
      }

      if (!found) {
        try {
          const localItems = storage.get<Product[]>("payent_server_products", []);
          if (Array.isArray(localItems)) {
            const targetKey = String(id).toLowerCase().trim();
            found =
              localItems.find(
                (p: Product) =>
                  String(p.id).toLowerCase() === targetKey ||
                  String(p.id) === String(id)
              ) || null;
          }
        } catch {
          /* ignore */
        }
      }

      if (!found) {
        const targetKey = String(id).toLowerCase().trim();
        found =
          INITIAL_FALLBACK_PRODUCTS.find(
            (p) =>
              String(p.id).toLowerCase() === targetKey ||
              String(p.id) === String(id)
          ) || null;
      }

      if (isMounted) {
        if (found) {
          setProduct(found);
          setProductError(null);
          api.cacheProduct(found);
        } else if (!cached) {
          setProduct(null);
          if (hadFetchError && directStatus !== 404) {
            setProductError(
              "Unable to load product details right now. Please check your connection and try again."
            );
          } else {
            setProductError(null);
          }
        }
        setProductLoading(false);
      }
    }

    loadTargetProduct();
    return () => {
      isMounted = false;
    };
  }, [id, initialCachedProduct, reloadCount]);

  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [frequentlyTogether, setFrequentlyTogether] = useState<Product[]>([]);
  const [localOrders, setLocalOrders] = useState<Order[]>([]);

  useEffect(() => {
    const syncLocalOrders = () => {
      setLocalOrders(storage.get<Order[]>(STORAGE_KEYS.orders, []));
    };
    syncLocalOrders();
    if (typeof window !== "undefined") {
      window.addEventListener("payent_orders_updated", syncLocalOrders);
      window.addEventListener("storage", syncLocalOrders);
      return () => {
        window.removeEventListener("payent_orders_updated", syncLocalOrders);
        window.removeEventListener("storage", syncLocalOrders);
      };
    }
  }, []);

  // Existing Bookings lookup for Date Overlap Detection (SSR-safe via post-mount localOrders state)
  const existingProductBookings = useMemo(() => {
    if (!product || localOrders.length === 0) return [];
    return localOrders.filter(
      (o) =>
        (o.productId === product.id || (o as any).product_id === product.id) &&
        o.status !== "cancelled"
    );
  }, [product, localOrders]);

  const currentUserId = user?.id || user?.email || "";
  const ownerId =
    (product as any)?.ownerId ||
    (product as any)?.owner_id ||
    (product as any)?.user_id ||
    product?.owner?.email ||
    "";
  const ownerEmail = ((product as any)?.owner_email || (product as any)?.user_email || product?.owner?.email || "").toLowerCase().trim();
  const userEmail = user?.email?.toLowerCase().trim() || "";
  const ownerName = (
    product?.owner?.name ||
    (product as Product & { owner_name?: string })?.owner_name ||
    ""
  ).toLowerCase().trim();
  const userFullName = (user?.fullName || "").toLowerCase().trim();

  const isOwner = Boolean(
    user &&
    product &&
    !product.isReference &&
    (isUserOwnProduct(product, user) ||
      (ownerId && currentUserId && ownerId === currentUserId) ||
      (ownerEmail && userEmail && ownerEmail === userEmail) ||
      (ownerName && userFullName && ownerName === userFullName))
  );

  const isInCart = Boolean(
    product && cartItems.some((item) => item.product_id === product.id),
  );

  // Slot Availability Fetch Effect with deduplication, short-lived cache, cancellation and timeout
  useEffect(() => {
    if (!startDate || !id) return;
    const cacheKey = `${id}:${startDate}`;

    // 1. Check short-lived client cache (30s)
    const cached = slotsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      setDaySlots(cached.slots);
      setSlotsError(null);
      setLoadingSlots(false);
      return;
    }

    // 2. Abort prior in-flight request
    if (slotsAbortControllerRef.current) {
      slotsAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    slotsAbortControllerRef.current = controller;

    setLoadingSlots(true);
    setSlotsError(null);

    const timeoutId = setTimeout(() => {
      controller.abort("TIMEOUT");
    }, 8000);

    // 3. Deduplicate concurrent requests
    let reqPromise = inFlightSlotsRequests.get(cacheKey);
    if (!reqPromise) {
      reqPromise = (async () => {
        const apiBase = getApiBase();
        const r = await fetch(
          `${apiBase}/api/products/${encodeURIComponent(id)}/slots?date=${encodeURIComponent(startDate)}`,
          { signal: controller.signal }
        );
        if (!r.ok) {
          const errData = await r.json().catch(() => null);
          throw new Error(errData?.detail || `Failed to fetch slots (HTTP ${r.status})`);
        }
        const data = await r.json();
        return Array.isArray(data?.slots) ? data.slots : [];
      })();
      inFlightSlotsRequests.set(cacheKey, reqPromise);
    }

    reqPromise
      .then((slots) => {
        if (slotsAbortControllerRef.current !== controller) return;
        slotsCache.set(cacheKey, { slots, timestamp: Date.now() });
        setDaySlots(slots);
        setSlotsError(null);
      })
      .catch((err: any) => {
        if (slotsAbortControllerRef.current !== controller) return;
        if (err.name === "AbortError" || controller.signal.aborted) {
          if (controller.signal.reason === "TIMEOUT") {
            setSlotsError("Slot availability check timed out. Please retry.");
          }
          return;
        }
        console.warn("Could not fetch slots:", err);
        setDaySlots([]);
        setSlotsError(err?.message || "Failed to load real-time slot availability from server.");
      })
      .finally(() => {
        clearTimeout(timeoutId);
        inFlightSlotsRequests.delete(cacheKey);
        if (slotsAbortControllerRef.current === controller) {
          setLoadingSlots(false);
        }
      });

    return () => {
      clearTimeout(timeoutId);
      if (slotsAbortControllerRef.current === controller) {
        controller.abort();
      }
    };
  }, [id, startDate]);

  // Live slot availability synchronization on booking creation, cancellation, or local storage change
  useEffect(() => {
    const handleUpdate = () => {
      if (id) {
        invalidateSlotsCache(id);
      }
      if (startDate && id) {
        const apiBase = getApiBase();
        fetch(`${apiBase}/api/products/${encodeURIComponent(id)}/slots?date=${encodeURIComponent(startDate)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && Array.isArray(data.slots)) {
              slotsCache.set(`${id}:${startDate}`, { slots: data.slots, timestamp: Date.now() });
              setDaySlots(data.slots);
            }
          })
          .catch(() => {});
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("payent_orders_updated", handleUpdate);
      window.addEventListener("payent_booking_updated", handleUpdate);
      window.addEventListener("storage", handleUpdate);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("payent_orders_updated", handleUpdate);
        window.removeEventListener("payent_booking_updated", handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      }
    };
  }, [id, startDate]);

  const handleDurationModeChange = (rawMode: string) => {
    const mode: DurationMode =
      rawMode === "half_day_morning" ||
      rawMode === "half_day_afternoon" ||
      rawMode === "full_day" ||
      rawMode === "custom"
        ? rawMode
        : "full_day";
    setDurationMode(mode);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");

    if (mode === "half_day_morning") {
      setSelectedSlot("morning");
      if (startDate) setEndDate(startDate);
    } else if (mode === "half_day_afternoon") {
      setSelectedSlot("afternoon");
      if (startDate) setEndDate(startDate);
    } else if (mode === "full_day") {
      setSelectedSlot("full_day");
      if (startDate) setEndDate(startDate);
    } else if (mode === "custom") {
      setSelectedSlot("full_day");
      if (startDate && (!endDate || endDate === startDate)) {
        const parts = startDate.split("-").map(Number);
        const startObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const endObj = new Date(startObj);
        endObj.setDate(startObj.getDate() + 1);
        setEndDate(toDateInputValue(endObj));
      }
    }
  };

  const handleSlotSelect = (rawSlotId: string) => {
    const slotId: "morning" | "afternoon" | "full_day" =
      rawSlotId === "morning" || rawSlotId === "afternoon" || rawSlotId === "full_day"
        ? rawSlotId
        : "full_day";
    setSelectedSlot(slotId);
    if (slotId === "morning") {
      setDurationMode("half_day_morning");
    } else if (slotId === "afternoon") {
      setDurationMode("half_day_afternoon");
    } else {
      setDurationMode("full_day");
    }
    if (startDate) setEndDate(startDate);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
  };

  // Rental Calculation
  const rentalDays = useMemo(() => {
    if (durationMode !== "custom") return 1;
    if (!startDate || !endDate) return 0;
    return calculateInclusiveDays(startDate, endDate);
  }, [durationMode, startDate, endDate]);

  const calculatedEndDateTimeStr = useMemo(() => {
    if (!startDate) return "";
    if (durationMode === "half_day_morning") {
      return `${startDate} at 12:00 PM (4h)`;
    }
    if (durationMode === "half_day_afternoon") {
      return `${startDate} at 5:00 PM (4h)`;
    }
    if (durationMode === "full_day") {
      const parts = startDate.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + 1);
      return `${toDateInputValue(d)} at 10:00 AM (24h)`;
    }
    const days = rentalDays > 0 ? rentalDays : 1;
    const parts = startDate.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    return `${endDate || toDateInputValue(d)} at 10:00 AM (${days * 24}h)`;
  }, [startDate, endDate, durationMode, rentalDays]);

  const estimatedTotal = useMemo(() => {
    if (!product) return 0;
    const baseDailyPrice = Number(product.price) || 0;
    if (durationMode === "half_day_morning" || durationMode === "half_day_afternoon") {
      return Math.round(baseDailyPrice * 0.5);
    }
    if (durationMode === "full_day") {
      const fullSlot = daySlots.find((s) => s.id === "full_day");
      if (fullSlot && fullSlot.price) return fullSlot.price;
      return baseDailyPrice;
    }
    if (rentalDays <= 0) return 0;
    return rentalDays * baseDailyPrice;
  }, [product, durationMode, daySlots, rentalDays]);

  // Dynamic slot rates
  const morningPrice = useMemo(() => {
    const slot = daySlots.find((s) => s.id === "morning");
    if (slot && slot.price) return slot.price;
    return Math.round((Number(product?.price) || 0) * 0.5);
  }, [daySlots, product?.price]);

  const afternoonPrice = useMemo(() => {
    const slot = daySlots.find((s) => s.id === "afternoon");
    if (slot && slot.price) return slot.price;
    return Math.round((Number(product?.price) || 0) * 0.5);
  }, [daySlots, product?.price]);

  const fullDayPrice = useMemo(() => {
    const slot = daySlots.find((s) => s.id === "full_day");
    if (slot && slot.price) return slot.price;
    return Number(product?.price) || 0;
  }, [daySlots, product?.price]);

  // Active Slot Info for Dropdown Display (monochrome aligned)
  const currentSlotInfo = useMemo(() => {
    if (durationMode === "half_day_morning") {
      return {
        id: "morning" as const,
        title: "Morning Slot",
        time: "8:00 AM – 12:00 PM (4 Hours)",
        shortTime: "8 AM - 12 PM",
        price: morningPrice,
        priceSuffix: "",
        icon: Sun,
        iconColor: "text-neutral-900 dark:text-neutral-100",
        iconBg: "bg-neutral-200/80 dark:bg-neutral-800",
        tag: "Morning",
      };
    }
    if (durationMode === "half_day_afternoon") {
      return {
        id: "afternoon" as const,
        title: "Afternoon Slot",
        time: "1:00 PM – 5:00 PM (4 Hours)",
        shortTime: "1 PM - 5 PM",
        price: afternoonPrice,
        priceSuffix: "",
        icon: Sun,
        iconColor: "text-neutral-900 dark:text-neutral-100",
        iconBg: "bg-neutral-200/80 dark:bg-neutral-800",
        tag: "Afternoon",
      };
    }
    if (durationMode === "custom") {
      return {
        id: "custom" as const,
        title: "Multi-Day Rental",
        time: `${rentalDays} Days (${startDate} → ${endDate})`,
        shortTime: `${rentalDays} Days Range`,
        price: fullDayPrice,
        priceSuffix: "/day",
        icon: Clock,
        iconColor: "text-neutral-900 dark:text-neutral-100",
        iconBg: "bg-neutral-200/80 dark:bg-neutral-800",
        tag: "Multi-Day",
      };
    }
    return {
      id: "full_day" as const,
      title: "1 Full Day",
      time: "Full 24-Hour Rental Period",
      shortTime: "24 Hours",
      price: fullDayPrice,
      priceSuffix: "",
      icon: Calendar,
      iconColor: "text-neutral-900 dark:text-neutral-100",
      iconBg: "bg-neutral-200/80 dark:bg-neutral-800",
      tag: "Full Day",
    };
  }, [durationMode, morningPrice, afternoonPrice, fullDayPrice, rentalDays, startDate, endDate]);

  const slotOptions = useMemo(() => [
    {
      id: "morning" as const,
      title: "Morning Slot",
      time: "8:00 AM – 12:00 PM (4 Hours)",
      price: morningPrice,
      priceSuffix: "",
      icon: Sun,
      iconColor: "text-neutral-900 dark:text-neutral-100",
      iconBg: "bg-neutral-200/80 dark:bg-neutral-800",
      tag: "Half-day",
    },
    {
      id: "afternoon" as const,
      title: "Afternoon Slot",
      time: "1:00 PM – 5:00 PM (4 Hours)",
      price: afternoonPrice,
      priceSuffix: "",
      icon: Sun,
      iconColor: "text-neutral-900 dark:text-neutral-100",
      iconBg: "bg-neutral-200/80 dark:bg-neutral-800",
      tag: "Half-day",
    },
    {
      id: "full_day" as const,
      title: "1 Full Day",
      time: "Full 24-Hour Rental Period",
      price: fullDayPrice,
      priceSuffix: "",
      icon: Calendar,
      iconColor: "text-neutral-900 dark:text-neutral-100",
      iconBg: "bg-neutral-200/80 dark:bg-neutral-800",
      tag: "Popular",
    },
    {
      id: "custom" as const,
      title: "Multi-Day Rental",
      time: "Select custom date range on calendar",
      price: fullDayPrice,
      priceSuffix: "/day",
      icon: Clock,
      iconColor: "text-neutral-900 dark:text-neutral-100",
      iconBg: "bg-neutral-200/80 dark:bg-neutral-800",
      tag: "Flexible",
    },
  ], [morningPrice, afternoonPrice, fullDayPrice]);

  // Handle Date Changes (resets check state)
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
    if (durationMode !== "custom") {
      setEndDate(val);
    } else if (endDate && val && endDate <= val) {
      const [y, m, d] = val.split("-").map(Number);
      const nextDay = new Date(y, m - 1, d + 1);
      setEndDate(toDateInputValue(nextDay));
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
  };

  // Change duration by adjusting days directly
  const handleDaysChange = (newDays: number) => {
    const validDays = Math.max(2, Math.min(90, newDays));
    if (!startDate) return;
    const [sY, sM, sD] = startDate.split("-").map(Number);
    const startObj = new Date(sY, sM - 1, sD);
    const endObj = new Date(startObj);
    endObj.setDate(startObj.getDate() + validDays - 1);
    const endStr = toDateInputValue(endObj);
    setEndDate(endStr);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
  };

  // CHECK AVAILABILITY LOGIC
  const handleCheckAvailability = async () => {
    if (!startDate) {
      toast.error("Please select a Rental Date.");
      throw new Error("Please select a Rental Date.");
    }
    if (durationMode === "custom" && !endDate) {
      toast.error("Please select both a Start Date and Return Date for multi-day rental.");
      throw new Error("Please select both a Start Date and Return Date for multi-day rental.");
    }

    const start = new Date(startDate);
    const end = new Date(durationMode === "custom" ? endDate : startDate);
    const today = new Date(todayStr);

    if (start < today) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("Start date cannot be in the past.");
      setAvailabilityChecked(true);
      toast.error("Start date cannot be in the past.");
      throw new Error("Start date cannot be in the past.");
    }

    if (end < start) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("End date must be on or after the start date.");
      setAvailabilityChecked(true);
      toast.error("End date cannot be earlier than start date.");
      throw new Error("End date cannot be earlier than start date.");
    }

    if (product && !product.available) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("This gear is currently marked as unavailable by the owner.");
      setAvailabilityChecked(true);
      throw new Error("This gear is currently marked as unavailable by the owner.");
    }

    // If single day slot selection (morning, afternoon, full_day), inspect live slot status
    if (durationMode !== "custom" && daySlots.length > 0) {
      const targetSlot = daySlots.find((s) => s.id === selectedSlot);
      if (targetSlot) {
        if (targetSlot.status === "blocked" || (targetSlot as any).isBlocked) {
          setIsAvailableForDates(false);
          setAvailabilityMessage(`The selected date or time slot is blocked by the owner for maintenance or personal use.`);
          setAvailabilityChecked(true);
          toast.error("Date or slot is blocked by owner.");
          throw new Error("Date or slot is blocked by owner.");
        }
        if (targetSlot.status === "booked") {
          setIsAvailableForDates(false);
          setAvailabilityMessage(`The ${targetSlot.name} slot is already booked for ${startDate}. Please choose another slot.`);
          setAvailabilityChecked(true);
          toast.error(`Slot ${targetSlot.name} is booked.`);
          throw new Error(`Slot ${targetSlot.name} is booked.`);
        }
        if (targetSlot.status === "not_available") {
          setIsAvailableForDates(false);
          setAvailabilityMessage(`The ${targetSlot.name} slot is not available: ${targetSlot.statusLabel}.`);
          setAvailabilityChecked(true);
          toast.error(`Slot ${targetSlot.name} is not available.`);
          throw new Error(`Slot ${targetSlot.name} is not available.`);
        }
      }
    }

    // Backend authoritative availability verification for requested date span and session
    setIsCheckingAvailability(true);
    const checkStartTime = performance.now();
    const ensureVisibleDelay = async () => {
      const elapsed = performance.now() - checkStartTime;
      if (elapsed < 800) {
        await new Promise((r) => setTimeout(r, 800 - elapsed));
      }
    };
    try {
      const checkEnd = durationMode === "custom" ? endDate : startDate;
      const effectiveSession = durationMode === "custom" ? "full_day" : selectedSlot;
      const apiBase = getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort("TIMEOUT"), 8000);

      let res: Response;
      try {
        res = await fetch(
          `${apiBase}/api/products/${encodeURIComponent(id)}/availability?start_date=${startDate}&end_date=${checkEnd}&session=${encodeURIComponent(effectiveSession)}`,
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        if (res.status === 404) {
          // Unseeded showcase product: check against local active reservations
          const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
          const activeOverlap = localOrders.some((o) => {
            const pId = String(o.productId || (o as any).product_id || "");
            if (pId !== String(id) || o.status === "cancelled") return false;
            if (!o.startDate || !o.endDate) return false;
            // Includes the automatically blocked next calendar day after o.endDate
            const [eY, eM, eD] = String(o.endDate).split("-").map(Number);
            const nextDay = new Date(eY, eM - 1, eD + 1);
            const y = nextDay.getFullYear();
            const m = String(nextDay.getMonth() + 1).padStart(2, "0");
            const d = String(nextDay.getDate()).padStart(2, "0");
            const nextDateStr = `${y}-${m}-${d}`;
            return !(checkEnd < o.startDate || startDate > nextDateStr);
          });
          if (activeOverlap) {
            setIsAvailableForDates(false);
            setAvailabilityMessage("This product is unavailable on the day following an existing booking.");
            setAvailabilityChecked(true);
            toast.error("This product is unavailable on the day following an existing booking.");
            return;
          }
          setIsAvailableForDates(true);
          setAvailabilityMessage("✓ Product and time slot available for selected dates");
          setAvailabilityChecked(true);
          toast.success("Gear is available. Review booking summary below.");
          return;
        }
        setIsAvailableForDates(false);
        setAvailabilityMessage("Could not verify real-time availability with server. Please retry.");
        setAvailabilityChecked(true);
        toast.error("Availability check failed. Please retry.");
        return;
      }
      const availData = await res.json();
      if (availData.is_available === false || availData.isAvailable === false || availData.status === "blocked" || availData.status === "booked") {
        setIsAvailableForDates(false);
        const reason = availData.reason || (availData.status === "blocked" ? "This product is unavailable on the day following an existing booking." : "Selected dates/slot are already reserved.");
        setAvailabilityMessage(reason);
        setAvailabilityChecked(true);
        toast.error(reason);
        return;
      }
      if (availData.conflicts && availData.conflicts.length > 0) {
        const firstConflict = availData.conflicts[0];
        const isPrepBlocked = firstConflict.reason === "preparation_blocked" || (firstConflict.detail && firstConflict.detail.includes("following an existing booking"));
        const isBlocked = firstConflict.reason === "blocked" || isPrepBlocked;
        setIsAvailableForDates(false);
        const conflictText = isPrepBlocked
          ? "This product is unavailable on the day following an existing booking."
          : isBlocked
          ? `Unavailable: Date ${firstConflict.date} is blocked by the equipment owner.`
          : `Unavailable: Date ${firstConflict.date} is already reserved by another renter.`;
        setAvailabilityMessage(conflictText);
        setAvailabilityChecked(true);
        toast.error(conflictText);
        return;
      }

      setIsAvailableForDates(true);
      setAvailabilityMessage("✓ Product and time slot available for selected dates");
      setAvailabilityChecked(true);
      toast.success("Gear is available. Review booking summary below.");
    } catch (e: any) {
      console.debug("Backend availability check error:", e);
      setIsAvailableForDates(false);
      const isTimeout = e?.name === "AbortError" || e?.message?.includes?.("timeout");
      setAvailabilityMessage(
        isTimeout
          ? "Availability check timed out. Please check connection and retry."
          : "Network error during availability check. Please check connection."
      );
      setAvailabilityChecked(true);
      return;
    } finally {
      await ensureVisibleDelay();
      setIsCheckingAvailability(false);
    }
  };

  // PROCEED TO CHECKOUT & DELIVERY FLOW
  const handleProceedToCheckout = () => {
    if (!product) return;

    if (!user) {
      toast.info("Please log in to proceed with your gear booking.");
      navigate({
        to: "/login",
        search: {
          redirect: `/checkout?id=${id}&start=${startDate}&end=${durationMode === "custom" ? endDate : startDate}&mode=${durationMode}&slot=${selectedSlot}`
        } as any,
      });
      return;
    }

    if (isOwner) {
      toast.error("You cannot rent your own product.");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions to proceed.");
      return;
    }

    if (!isAvailableForDates || rentalDays <= 0) {
      toast.error("Please check and confirm date availability before proceeding.");
      return;
    }

    if (categoryRestriction?.restricted) {
      toast.error(
        categoryRestriction.message ||
        "You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered."
      );
      return;
    }

    const checkEnd = durationMode === "custom" ? endDate : startDate;
    navigate({
      to: "/checkout",
      search: {
        id: product.id,
        start: startDate,
        end: checkEnd,
        mode: durationMode,
        slot: selectedSlot,
      } as any,
    });
  };

  // Main BOOK NOW trigger from Hero
  const handleBookNowAction = async () => {
    if (isOwner) {
      toast.error("You cannot rent your own product.");
      throw new Error("You cannot rent your own product.");
    }
    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions to proceed.");
      throw new Error("Please accept the terms and conditions to proceed.");
    }
    if (isAvailableForDates) {
      handleProceedToCheckout();
    } else {
      await handleCheckAvailability();
      const el = document.getElementById("rental-booking-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      toast.info("Please log in to add items to your rental cart.");
      navigate({ to: "/login", search: { redirect: `/product/${id}` } as any });
      return;
    }
    if (!product.available) {
      toast.error("This gear item is currently unavailable.");
      return;
    }
    setIsAddingToCart(true);
    const success = await addToCart(product.id);
    setIsAddingToCart(false);
    if (success) {
      setJustAddedToCart(true);
      setTimeout(() => setJustAddedToCart(false), 3000);
    }
  };

  useEffect(() => {
    if (!product) return;
    const currentId = product.id;
    tracker.viewProduct(currentId, product.category);

    let isMounted = true;
    async function loadRecommendations() {
      try {
        const [similar, together] = await Promise.all([
          api.getSimilarRecommendations
            ? api.getSimilarRecommendations(String(currentId)).catch(() => [])
            : Promise.resolve([]),
          api.getFrequentlyTogetherRecommendations
            ? api.getFrequentlyTogetherRecommendations(String(currentId)).catch(() => [])
            : Promise.resolve([]),
        ]);
        if (isMounted) {
          setSimilarProducts(Array.isArray(similar) ? similar : []);
          setFrequentlyTogether(Array.isArray(together) ? together : []);
        }
      } catch {
        if (isMounted) {
          setSimilarProducts([]);
          setFrequentlyTogether([]);
        }
      }
    }
    loadRecommendations();

    if (typeof (rentalSecurityService as any)?.getSecurityDeposit === "function") {
      (rentalSecurityService as any)
        .getSecurityDeposit(currentId)
        .then((sec: any) => {
          if (isMounted) setSecurityRecord(sec);
        })
        .catch(() => {});
    } else if (typeof (rentalSecurityService as any)?.getSecurityRecordsByProduct === "function") {
      try {
        const records = (rentalSecurityService as any).getSecurityRecordsByProduct(String(currentId));
        if (isMounted && Array.isArray(records) && records.length > 0) {
          setSecurityRecord(records[0]);
        }
      } catch {}
    }

    return () => {
      isMounted = false;
    };
  }, [product]);

  // Category-based Booking Restriction Check
  useEffect(() => {
    if (!product?.id || !product?.category || !user) {
      setCategoryRestriction(null);
      return;
    }

    let isMounted = true;
    const checkCategoryRestriction = async () => {
      try {
        const orders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
        const activeCategoryOrder = orders.find(
          (o) =>
            o.category === product.category &&
            o.productId !== product.id &&
            ["pending", "confirmed", "in_progress", "active"].includes(o.status || "")
        );

        if (activeCategoryOrder && isMounted) {
          setCategoryRestriction({
            restricted: true,
            message:
              "You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered.",
          });
        } else if (isMounted) {
          setCategoryRestriction(null);
        }
      } catch (err) {
        console.warn("Could not check category restrictions:", err);
      }
    };

    checkCategoryRestriction();
    const handleSync = () => checkCategoryRestriction();
    window.addEventListener("payent_orders_updated", handleSync);
    window.addEventListener("payent_queue_updated", handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener("payent_orders_updated", handleSync);
      window.removeEventListener("payent_queue_updated", handleSync);
    };
  }, [product?.id, product?.category, user]);

const productSchema = product ? {
    "@type": "Product",
    name: product.title,
    image: product.image,
    description: product.description,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: "paYent",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      priceValidUntil: "2027-12-31",
      availability: product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `https://payent.com/product/${product.id}`,
    },
    ...(Number(product.reviews || genuineReviews.length || 0) > 0 && product.rating != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(product.rating),
            reviewCount: genuineReviews.length || Number(product.reviews),
          },
        }
      : {}),
  } : null;

  const breadcrumbSchema = product ? {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://payent.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Explore",
        item: "https://payent.com/browse",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: `https://payent.com/product/${product.id}`,
      },
    ],
  } : null;

  // Gallery image assembly — collects all product photos, angle views, and rotation frames
  const gallery = useMemo(() => {
    if (!product) return [];
    let imgs: string[] = [];
    const rawImgs = (product as any)?.images;
    if (Array.isArray(rawImgs)) {
      imgs = [...rawImgs];
    } else if (typeof rawImgs === "string") {
      try {
        const parsed = JSON.parse(rawImgs);
        if (Array.isArray(parsed)) imgs = parsed;
        else if (typeof parsed === "string") imgs = [parsed];
      } catch {
        imgs = [rawImgs];
      }
    }

    // Include angleImages if available
    if (Array.isArray(product.angleImages) && product.angleImages.length > 0) {
      product.angleImages.forEach((a: any) => {
        const url = typeof a === "string" ? a : a?.image || a?.url;
        if (url && !imgs.includes(url)) imgs.push(url);
      });
    }

    // Include rotationFrames if available
    if (Array.isArray(product.rotationFrames) && product.rotationFrames.length > 0) {
      product.rotationFrames.forEach((rf: any) => {
        if (typeof rf === "string" && rf && !imgs.includes(rf)) imgs.push(rf);
      });
    }

    const prim = product.image || (product as any).primary_image;
    if (prim && !imgs.includes(prim)) {
      imgs = [prim, ...imgs];
    } else if (!imgs.length && prim) {
      imgs = [prim];
    }

    imgs = imgs.filter(Boolean);

    // If fewer than 4 images, expand so all 4 card views/angles are browseable in full screen
    if (imgs.length > 0 && imgs.length < 4) {
      const base = [...imgs];
      while (imgs.length < 4) {
        imgs.push(base[imgs.length % base.length]);
      }
    }

    return imgs.length > 0 ? imgs : (prim ? [prim] : []);
  }, [product]);

  // Thumbnails row assembly (up to 4)
  const thumbnails = useMemo(() => {
    if (gallery.length >= 4) return gallery.slice(0, 4);
    if (gallery.length > 0) {
      const list = [...gallery];
      while (list.length < 4) {
        list.push(gallery[list.length % gallery.length]);
      }
      return list.slice(0, 4);
    }
    const prim = product?.image || "";
    return [prim, prim, prim, prim];
  }, [gallery, product?.image]);

  const activeDisplayImage = gallery[selectedImageIndex] || thumbnails[selectedImageIndex] || product?.image || "";
  const rawVideoUrl = product?.videoUrl || (product as any)?.video_url;
  const activeVideoUrl = (rawVideoUrl && !rawVideoUrl.includes("mixkit.co") && !rawVideoUrl.includes("gv4p8hu7ccji2cie9xdk"))
    ? rawVideoUrl
    : (product?.id === "prod-1792662405953" || (product?.title === "Acer" && product?.category === "computers"))
    ? "https://res.cloudinary.com/dvyendk6j/video/upload/v1793724284/l2vmxn9hwk6p0cs4ajoz.mp4"
    : "/videos/inspection-sample.mp4";

  const brand = product ? getProductBrand(product) : null;
  const isWishlisted = product ? has(product.id) : false;

  // Related Products (2×2 on mobile, 4×1 on lg+)
  const relatedPageSize = 4;

  const relatedProductsList = useMemo(() => {
    if (!product) return [];
    const currentId = product.id;
    const list = [...similarProducts, ...frequentlyTogether].filter(
      (p, i, arr) =>
        p &&
        p.id !== currentId &&
        !isFakeOrDeletedProduct(p) &&
        !isUserOwnProduct(p, user) &&
        arr.findIndex((x) => x.id === p.id) === i
    );
    if (list.length >= 4) return list;
    const sourceCatalog =
      cachedCatalog.length > 0 ? cachedCatalog : INITIAL_FALLBACK_PRODUCTS;
    for (const p of sourceCatalog) {
      if (
        p &&
        p.id !== currentId &&
        !isFakeOrDeletedProduct(p) &&
        !isUserOwnProduct(p, user) &&
        !list.some((x) => x.id === p.id)
      ) {
        list.push(p);
      }
      if (list.length >= 8) break;
    }
    return list;
  }, [similarProducts, frequentlyTogether, cachedCatalog, product?.id, user]);

  const displayedRelated = useMemo(() => {
    if (relatedProductsList.length <= relatedPageSize) return relatedProductsList;
    const start = (relatedCarouselPage * relatedPageSize) % relatedProductsList.length;
    const slice = relatedProductsList.slice(start, start + relatedPageSize);
    if (slice.length < relatedPageSize) {
      return [...slice, ...relatedProductsList.slice(0, relatedPageSize - slice.length)];
    }
    return slice;
  }, [relatedProductsList, relatedCarouselPage, relatedPageSize]);


  if (productLoading && !product) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background text-neutral-900 dark:text-neutral-100">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full min-w-0">
              <div className="lg:col-span-6 space-y-3 min-w-0 w-full">
                <div className="aspect-[4/3] w-full rounded-3xl bg-neutral-200/70 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800" />
              </div>
              <div className="lg:col-span-6 space-y-4 min-w-0 w-full">
                <div className="h-96 w-full rounded-3xl bg-neutral-200/70 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 p-5 space-y-4" />
              </div>
            </div>
          </div>
        </div>
        <ShareProductModal />
      </MainLayout>
    );
  }

  if (productError && !product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-24 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto stroke-[1.75]" />
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Unable to load product</h1>
          <p className="text-sm text-muted-foreground">{productError}</p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              size="sm"
              onClick={() => {
                setProductError(null);
                setProductLoading(true);
                setReloadCount((c) => c + 1);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Retry</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: "/browse" })}
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
              <span>Browse Explore Items</span>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-24 text-center space-y-4">
          <h1 className="text-3xl font-semibold text-foreground">Product not found</h1>
          <p className="text-sm text-muted-foreground">The equipment you requested may have been unlisted or moved.</p>
          <Button
            size="sm"
            className="mt-4 inline-flex items-center gap-1.5"
            onClick={() => navigate({ to: "/browse" })}
          >
            <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
            <span>Browse Explore Items</span>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {productSchema && <JsonLd schema={productSchema} />}
      {breadcrumbSchema && <JsonLd schema={breadcrumbSchema} />}

      <div className="min-h-screen bg-neutral-50 dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-100 pb-24 transition-colors duration-200 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">

          {/* Back Navigation Bar & Category Breadcrumb */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/categories" });
                }
              }}
              className="group inline-flex items-center gap-2 min-h-[40px] text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors" aria-hidden="true" />
              <span>Back</span>
            </button>

            {product?.category && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <Link to="/categories" className="hover:text-neutral-950 dark:hover:text-white transition-colors">
                  Explore
                </Link>
                <span aria-hidden="true">/</span>
                <Link
                  to="/categories"
                  search={{ cat: product.category }}
                  className="capitalize hover:text-neutral-950 dark:hover:text-white transition-colors font-medium text-neutral-900 dark:text-neutral-200"
                >
                  {product.category}
                </Link>
              </div>
            )}
          </div>

          {/* Product Heading Bar (On Clean Page Canvas — Always Readable Regardless of Photo/Video State) */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800 text-left">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 capitalize">
                <span>{product.category || "Gear"}</span>
                {brand && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{brand}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-neutral-950 dark:text-white tracking-tight font-display">
                {product.title}
              </h1>
            </div>

            {(() => {
              const totalCount =
                genuineReviews.length > 0
                  ? genuineReviews.length
                  : product.reviews
                  ? Number(product.reviews)
                  : 0;
              const avgRating =
                totalCount > 0 && product.rating != null ? Number(product.rating) : null;

              return (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("customer-reviews-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  title="View Customer Reviews"
                  className="shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1E1E1E] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors cursor-pointer text-xs select-none w-fit"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <span className="font-bold tabular-nums">
                    {avgRating != null ? avgRating.toFixed(1) : "New"}
                  </span>
                  <span className="text-neutral-600 dark:text-neutral-400 font-medium tabular-nums">
                    ({totalCount} {totalCount === 1 ? "review" : "reviews"})
                  </span>
                </button>
              );
            })()}
          </div>
          
          {/* 1. TOP HERO: PRODUCT GALLERY & DETAILS (2-Column Grid) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-x-10 lg:gap-y-6 items-start w-full min-w-0">
            
            {/* 1. Left Top / Mobile 1st: Image Gallery & 10s Video Showcase */}
            <div className="order-1 lg:order-1 lg:col-span-6 lg:col-start-1 lg:row-start-1 space-y-4 min-w-0 w-full">
              {/* Main Product Showcase Card */}
              <div className="relative rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-200 dark:border-neutral-800 aspect-[4/3] sm:aspect-[16/11] min-h-[340px] sm:min-h-[440px] max-h-[500px] w-full flex items-center justify-center shadow-sm group">
                {/* Center Showcase: 10s Video Player or High-Resolution Photo */}
                {isVideoActive ? (
                  <div className="w-full h-full min-h-[340px] sm:min-h-[440px] rounded-3xl overflow-hidden bg-black flex flex-col items-center justify-center relative">
                    <video
                      key={activeVideoUrl}
                      poster={activeDisplayImage || product?.image}
                      controls
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      className="w-full h-full max-h-[460px] object-contain rounded-3xl"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.currentSrc?.includes("l2vmxn9hwk6p0cs4ajoz")) {
                          target.src = "https://res.cloudinary.com/dvyendk6j/video/upload/v1793724284/l2vmxn9hwk6p0cs4ajoz.mp4";
                          target.load();
                          target.play().catch(() => {});
                        }
                      }}
                    >
                      <source src={activeVideoUrl} type="video/mp4" />
                      <source src={activeVideoUrl.replace(/\.mp4$/, ".webm")} type="video/webm" />
                    </video>
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-neutral-950/85 backdrop-blur-md text-xs text-white font-semibold border border-white/20 flex items-center gap-1.5 select-none pointer-events-none">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Verified 10s Inspection Video</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full min-h-[340px] sm:min-h-[440px] overflow-hidden flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
                    <img
                      src={activeDisplayImage}
                      alt={`${product.title} photo ${selectedImageIndex + 1}`}
                      onClick={() => {
                        setIsFullscreenVideoActive(false);
                        setIsPhotoViewerOpen(true);
                      }}
                      className="w-full h-full min-h-[340px] sm:min-h-[440px] max-h-[500px] object-cover object-center cursor-pointer"
                    />
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />
                  </div>
                )}

                {/* Top Controls: Availability Status Badge & 10s Video Badge */}
                <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2 pointer-events-auto">
                  {product.available ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-950/80 text-white font-semibold text-xs shadow-sm backdrop-blur-md border border-white/15 select-none">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-950/80 text-rose-300 font-semibold text-xs shadow-sm backdrop-blur-md border border-rose-500/30 select-none">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Reserved
                    </span>
                  )}

                  {/* 10s Equipment Video Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVideoActive((prev) => !prev);
                    }}
                    title="Watch 10-second verified equipment inspection video"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors shadow-sm backdrop-blur-md border cursor-pointer",
                      isVideoActive
                        ? "bg-white text-neutral-950 border-white"
                        : "bg-neutral-950/80 hover:bg-neutral-950 text-white border-white/20"
                    )}
                  >
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isVideoActive ? "Show Photos" : "10s Video"}</span>
                  </button>
                </div>

                {/* Top-Right: Fullscreen Button & Heart Wishlist Button */}
                <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreenVideoActive(isVideoActive);
                      setIsPhotoViewerOpen(true);
                    }}
                    title={isVideoActive ? "View Video Full Screen" : "View Image Full Screen"}
                    aria-label={isVideoActive ? "View Video Full Screen" : "View Image Full Screen"}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-neutral-950/80 hover:bg-neutral-950 text-white transition-colors shadow-sm border border-white/20 backdrop-blur-md cursor-pointer"
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const was = isWishlisted;
                      const ok = await toggle(String(product.id));
                      if (!ok) {
                        toast.error("Failed to update wishlist. Please try again.");
                        return;
                      }
                      toast.success(was ? "Removed from Wishlist" : "Added to Wishlist");
                    }}
                    aria-pressed={isWishlisted}
                    aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-neutral-950/80 hover:bg-neutral-950 text-white transition-colors shadow-sm border border-white/20 backdrop-blur-md cursor-pointer pointer-events-auto"
                  >
                    <Heart className={cn("h-4 w-4 transition-colors", isWishlisted ? "fill-white text-white" : "")} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* 5-Thumbnail Media Strip (Photos + 10s Video Option) */}
              <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full min-w-0">
                {thumbnails.map((thumb, idx) => {
                  const isActive = !isVideoActive && idx === selectedImageIndex;
                  const isFourth = idx === 3;
                  const remainingCount = gallery.length - 4;
                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`View photo ${idx + 1} of ${product.title}`}
                      onClick={() => {
                        setIsVideoActive(false);
                        setSelectedImageIndex(idx);
                      }}
                      className={cn(
                        "relative aspect-square rounded-2xl overflow-hidden border-2 transition-colors cursor-pointer p-1 sm:p-2 flex items-center justify-center bg-white dark:bg-[#1E1E1E] min-w-0",
                        isActive
                          ? "border-neutral-950 dark:border-white ring-1 ring-neutral-950/20 dark:ring-white/30 shadow-xs"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                      )}
                    >
                      <img
                        src={thumb}
                        alt={`${product.title} view ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                      {isFourth && remainingCount > 0 && (
                        <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-sm sm:text-base tabular-nums">
                          +{remainingCount}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* 10s Video Button Thumbnail */}
                <button
                  type="button"
                  onClick={() => setIsVideoActive(true)}
                  title="Play 10s Inspection Video"
                  aria-label="Play 10-second equipment inspection video"
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden border-2 transition-colors cursor-pointer p-1 sm:p-2 flex flex-col items-center justify-center bg-neutral-950 text-white min-w-0",
                    isVideoActive
                      ? "border-neutral-950 dark:border-white ring-1 ring-neutral-950/20 dark:ring-white/30 shadow-xs"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                  )}
                >
                  <Video className="h-4 w-4 sm:h-5 sm:w-5 text-white mb-0.5 sm:mb-1 shrink-0 stroke-[1.75]" aria-hidden="true" />
                  <span className="text-xs font-medium text-neutral-200 truncate max-w-full">10s Video</span>
                </button>
              </div>

              </div>

            {/* 2. Check Availability & Rental Booking Section */}
            <div id="rental-booking-section" className="order-2 lg:order-3 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:row-span-2 space-y-4 text-left lg:sticky lg:top-24 min-w-0 w-full">
              <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] pt-5 sm:pt-6 p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-[#1E1E1E] flex items-center gap-1.5 z-10 pointer-events-none select-none">
                  <Calendar className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                  <span className="text-xs sm:text-[13px] font-semibold text-neutral-950 dark:text-white">
                    Rental Booking
                  </span>
                </div>

                <div className="flex items-center justify-between pb-1 flex-wrap gap-2.5">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Select date, choose time slot, and verify availability.</p>
                </div>

                {/* Calendar Dropdown Selector */}
                <div className="relative pt-1.5 space-y-1.5">
                  <label className="absolute -top-2 left-3 px-1.5 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-700 dark:text-neutral-300 pointer-events-none select-none z-10">
                    Rental Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFullCalendar((prev) => !prev)}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-[#262626] hover:bg-neutral-100 dark:hover:bg-[#2E2E2E] transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-neutral-200/80 dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-100 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="text-left truncate">
                        <span className="text-xs sm:text-sm font-semibold text-neutral-950 dark:text-white tabular-nums block truncate">
                          {startDate ? (
                            durationMode === "custom" && endDate && endDate !== startDate
                              ? `${startDate} → ${endDate} (${rentalDays} Days)`
                              : startDate
                          ) : (
                            "Select date on calendar"
                          )}
                        </span>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 block">
                          {showFullCalendar ? "Click to collapse calendar" : "Click to select date on calendar"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 shrink-0">
                      <span>{showFullCalendar ? "Close" : "Open Calendar"}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showFullCalendar ? "rotate-180" : "")} aria-hidden="true" />
                    </div>
                  </button>

                  {/* Dropdown Calendar Panel */}
                  {showFullCalendar && (
                    <div className="pt-2 max-w-sm sm:max-w-md mx-auto">
                      <RenterBookingCalendar
                        productId={product.id}
                        selectedStartDate={startDate}
                        selectedEndDate={endDate}
                        onDateChange={handleDateRangeChange}
                        productTitle={product.title}
                        pricePerDay={Number(product.price) || 0}
                        productAvailable={product.available}
                        durationMode={durationMode}
                        selectedSlot={selectedSlot}
                        session={selectedSlot}
                        onSelectStartDate={handleStartDateChange}
                        onSelectEndDate={handleEndDateChange}
                        onSelectDurationMode={handleDurationModeChange}
                        onSelectSlot={handleSlotSelect}
                        onCheckAvailability={handleCheckAvailability}
                        isCheckingAvailability={isCheckingAvailability}
                        availabilityChecked={availabilityChecked}
                        isAvailableForDates={isAvailableForDates}
                        availabilityMessage={availabilityMessage}
                      />
                    </div>
                  )}
                </div>

                {/* Time Slot Dropdown Menu */}
                <div ref={slotDropdownRef} className="relative pt-2 space-y-1.5">
                  <label className="absolute -top-1.5 left-3 px-1.5 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-700 dark:text-neutral-300 pointer-events-none select-none z-10">
                    Time Slot
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSlotDropdownOpen((prev) => !prev)}
                    className={cn(
                      "w-full p-2.5 sm:p-3 rounded-xl border transition-colors flex items-center justify-between cursor-pointer group text-left",
                      isSlotDropdownOpen
                        ? "border-neutral-950 dark:border-white bg-neutral-100 dark:bg-[#262626]"
                        : "border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-[#262626] hover:bg-neutral-100 dark:hover:bg-[#2E2E2E]"
                    )}
                    aria-haspopup="listbox"
                    aria-expanded={isSlotDropdownOpen}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", currentSlotInfo.iconBg, currentSlotInfo.iconColor)}>
                        <currentSlotInfo.icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="text-left truncate min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-neutral-950 dark:text-white block truncate">
                            {currentSlotInfo.title}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white tabular-nums bg-neutral-200/80 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md shrink-0">
                            ₹{currentSlotInfo.price}{currentSlotInfo.priceSuffix}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 block truncate">
                          {currentSlotInfo.time}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 shrink-0 ml-2">
                      <span className="hidden xs:inline">{isSlotDropdownOpen ? "Close" : "Select Slot"}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isSlotDropdownOpen ? "rotate-180" : "")} aria-hidden="true" />
                    </div>
                  </button>

                  {/* Dropdown Menu Options */}
                  {isSlotDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xl space-y-1">
                      {slotOptions.map((opt) => {
                        const isSelected =
                          (opt.id === "custom" && durationMode === "custom") ||
                          (opt.id !== "custom" && selectedSlot === opt.id && durationMode !== "custom");
                        const OptIcon = opt.icon;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (opt.id === "custom") {
                                handleDurationModeChange("custom");
                                setShowFullCalendar(true);
                              } else {
                                handleSlotSelect(opt.id);
                              }
                              setIsSlotDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full p-2 sm:p-2.5 rounded-lg flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer",
                              isSelected
                                ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                                : "hover:bg-neutral-100 dark:hover:bg-neutral-800/70 border border-transparent text-neutral-900 dark:text-neutral-100"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                                  isSelected
                                    ? "bg-white/15 text-white dark:bg-neutral-950/10 dark:text-neutral-950"
                                    : cn(opt.iconBg, opt.iconColor)
                                )}
                              >
                                <OptIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              </div>
                              <div className="truncate min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">
                                    {opt.title}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded",
                                      isSelected
                                        ? "bg-white/20 text-white dark:bg-black/10 dark:text-neutral-950"
                                        : "bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                                    )}
                                  >
                                    {opt.tag}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    "text-[11px] block truncate",
                                    isSelected ? "text-neutral-200 dark:text-neutral-700" : "text-neutral-600 dark:text-neutral-400"
                                  )}
                                >
                                  {opt.time}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-semibold tabular-nums">
                                ₹{opt.price}{opt.priceSuffix}
                              </span>
                              <div className={cn("w-4 h-4 rounded-full flex items-center justify-center", isSelected ? "opacity-100" : "opacity-0")}>
                                <Check className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Multi-Day Days Marker / Stepper */}
                {durationMode === "custom" && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80">
                        <div>
                          <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block">
                            Rental Duration
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-neutral-950 dark:text-white tabular-nums">
                            {rentalDays} {rentalDays === 1 ? "Day" : "Days"} ({startDate} → {endDate})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            onClick={() => handleDaysChange(rentalDays - 1)}
                            disabled={rentalDays <= 2}
                            aria-label="Decrease rental days"
                            className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-700/80 flex items-center justify-center font-bold text-base hover:bg-neutral-200/70 dark:hover:bg-[#1E1E1E] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-neutral-950 dark:text-white"
                            title="Decrease days"
                          >
                            -
                          </button>

                          <div className="flex items-center justify-center px-2 py-1 bg-white dark:bg-[#1E1E1E] border border-neutral-300 dark:border-neutral-700/80 rounded-lg">
                            <input
                              type="number"
                              min={2}
                              max={90}
                              aria-label="Number of rental days"
                              value={rentalDays}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) handleDaysChange(val);
                              }}
                              className="w-8 text-center font-semibold tabular-nums text-xs sm:text-sm bg-transparent outline-none text-neutral-950 dark:text-white"
                            />
                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 ml-0.5">d</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDaysChange(rentalDays + 1)}
                            disabled={rentalDays >= 90}
                            aria-label="Increase rental days"
                            className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-700/80 flex items-center justify-center font-bold text-base hover:bg-neutral-200/70 dark:hover:bg-[#1E1E1E] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-neutral-950 dark:text-white"
                            title="Increase days"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Booking Summary */}
                <div className="relative rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 pt-4.5 pb-3 px-3.5 sm:px-4 flex items-center justify-between gap-3">
                  <div className="absolute -top-2.5 left-3 px-1.5 bg-neutral-50 dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-700 dark:text-neutral-300 pointer-events-none select-none z-10">
                    Booking Summary
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {durationMode === "half_day_morning"
                        ? "1 Day • Morning Slot"
                        : durationMode === "half_day_afternoon"
                        ? "1 Day • Afternoon Slot"
                        : durationMode === "full_day"
                        ? startDate ? `1 Day • Full Day (${startDate})` : "1 Day • Full Day"
                        : `${rentalDays} Days Rental (${startDate} → ${endDate})`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                      Estimated Total
                    </span>
                    <div className="text-xl sm:text-2xl font-semibold text-neutral-950 dark:text-white tabular-nums">
                      ₹{estimatedTotal.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Slot Availability Banner & Direct Confirmation / Check Availability */}
                {availabilityChecked && isAvailableForDates ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      <span>Available on your selected dates.</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                      {/* Accessible Monochrome Terms Checkbox + Agreement Trigger */}
                      <div className="flex items-center gap-2.5 select-none py-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={termsAccepted}
                          onClick={() => setTermsAccepted((prev) => !prev)}
                          className="relative flex h-9 w-9 -m-1.5 items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-md"
                          aria-label="Toggle terms and conditions acceptance"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-[5px] border transition-colors",
                              termsAccepted
                                ? "bg-neutral-950 border-neutral-950 text-white dark:bg-white dark:border-white dark:text-neutral-950"
                                : "border-neutral-400 dark:border-neutral-600 bg-white dark:bg-[#1E1E1E]"
                            )}
                          >
                            {termsAccepted && <Check className="h-3.5 w-3.5 stroke-[2]" />}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-left text-xs sm:text-[13px] font-medium text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer group flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded"
                        >
                          <span
                            className={cn(
                              "underline decoration-neutral-400 dark:decoration-neutral-500 group-hover:decoration-neutral-950 dark:group-hover:decoration-white transition-colors",
                              termsAccepted ? "font-semibold" : "font-medium"
                            )}
                          >
                            T&C will apply
                          </span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-700 transition-colors">
                            view
                          </span>
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={handleProceedToCheckout}
                        disabled={categoryRestriction?.restricted}
                        className="py-2 px-4 rounded-full font-semibold text-xs sm:text-sm shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 min-h-[40px]"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>Confirm Booking & Rent (₹{estimatedTotal.toLocaleString("en-IN")})</span>
                      </Button>
                    </div>
                  </div>
                ) : availabilityChecked && isAvailableForDates === false ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-400 text-xs font-bold flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CalendarX className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{availabilityMessage}</span>
                      </div>
                      <LatticeLoader
                        status="error"
                        label="Slot unavailable"
                        showTimer={false}
                        gridSize={3}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleCheckAvailability}
                        disabled={isCheckingAvailability}
                        className="py-2 px-4 rounded-xl font-semibold text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-950 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 min-h-[40px]"
                      >
                        {isCheckingAvailability ? (
                          <LatticeLoader
                            status="working"
                            label="Verifying real-time availability..."
                            gridSize={3}
                            pattern="ripple"
                            showTimer
                            embedded
                          />
                        ) : (
                          <>
                            <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Re-check Availability</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end items-center pt-1">
                    <Button
                      type="button"
                      id="check-availability-action-btn"
                      onClick={handleCheckAvailability}
                      disabled={isCheckingAvailability || categoryRestriction?.restricted}
                      className="py-2 px-4.5 rounded-full font-semibold text-xs sm:text-sm shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 disabled:opacity-70 disabled:cursor-not-allowed min-h-[40px]"
                    >
                      {isCheckingAvailability ? (
                        <LatticeLoader
                          status="working"
                          label="Verifying real-time availability..."
                          gridSize={3}
                          pattern="ripple"
                          showTimer
                          embedded
                        />
                      ) : (
                        <>
                          <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>CHECK AVAILABILITY</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Product Overview & BOOK NOW Section */}
            <div className="order-3 lg:order-2 lg:col-span-6 lg:col-start-1 lg:row-start-2 min-w-0 w-full">
              <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] pt-5 sm:pt-6 p-5 sm:p-6 shadow-xs space-y-5 text-left">
                <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-[#1E1E1E] flex items-center gap-1.5 z-10 pointer-events-none select-none">
                  <Info className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300 stroke-[1.75]" aria-hidden="true" />
                  <span className="text-xs sm:text-[13px] font-semibold text-neutral-950 dark:text-white">
                    Product Overview
                  </span>
                </div>
                {/* Product Description */}
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {product.description || "Verified equipment available for rent on paYent."}
                </p>

                {/* Price Display */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-semibold text-neutral-950 dark:text-white font-display tabular-nums">
                      ₹{(Number(product.price) || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">/ day</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold",
                      product.available
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        product.available ? "bg-emerald-600 dark:bg-emerald-400" : "bg-rose-600 dark:bg-rose-400"
                      )}
                    />
                    <span>{product.available ? "Available for Rent" : "Currently Reserved"}</span>
                  </div>
                </div>

                {/* Condition, Location, Lender */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 text-neutral-950 dark:text-white">
                    <ShieldCheck className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">Condition:</span>
                    <span className="font-bold">{product.condition || "Like New"}</span>
                  </div>

                  <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700" aria-hidden="true">•</span>

                  <div className="flex items-center gap-1.5 text-neutral-950 dark:text-white">
                    <MapPin className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">Location:</span>
                    <span className="font-bold">{formatOwnerAddress(product)}</span>
                  </div>

                  <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700" aria-hidden="true">•</span>

                  <div className="flex items-center gap-1.5 text-neutral-950 dark:text-white">
                    <User className="h-4 w-4 text-neutral-700 dark:text-neutral-300 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">Lender:</span>
                    <span className="font-bold">
                      {product.owner?.name || product.ownerName || product.owner_name || "Verified Lender"}
                    </span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  </div>
                </div>

                {/* Action Row: Terms and Conditions Checkbox & BOOK NOW */}
                <div className="pt-3 flex items-center justify-between flex-wrap gap-3 border-t border-neutral-200 dark:border-neutral-800 mt-1">
                  <div className="flex items-center gap-2.5 select-none py-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={termsAccepted}
                      onClick={() => setTermsAccepted((prev) => !prev)}
                      className="relative flex h-9 w-9 -m-1.5 items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-md"
                      aria-label="Toggle terms and conditions acceptance"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-[5px] border transition-colors",
                          termsAccepted
                            ? "bg-neutral-950 border-neutral-950 text-white dark:bg-white dark:border-white dark:text-neutral-950"
                            : "border-neutral-400 dark:border-neutral-600 bg-white dark:bg-[#1E1E1E]"
                        )}
                      >
                        {termsAccepted && <Check className="h-3.5 w-3.5 stroke-[2]" />}
                      </span>
                    </button>

                    {/* Text: Clicking opens the Terms & Conditions popup modal */}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-left text-xs sm:text-[13px] font-medium text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer group flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded"
                    >
                      <span
                        className={cn(
                          "underline decoration-neutral-400 dark:decoration-neutral-500 group-hover:decoration-neutral-950 dark:group-hover:decoration-white transition-colors",
                          termsAccepted ? "font-semibold" : "font-medium"
                        )}
                      >
                        T&C will apply
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-700 transition-colors">
                        view
                      </span>
                    </button>
                  </div>

                  <Button
                    type="button"
                    id="product-details-book-now-btn"
                    onClick={handleBookNowAction}
                    disabled={categoryRestriction?.restricted || isCheckingAvailability}
                    className={`py-2 px-4 rounded-full font-semibold text-xs sm:text-sm shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                      categoryRestriction?.restricted
                        ? "bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 cursor-not-allowed opacity-80"
                        : "bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                    }`}
                  >
                    {isCheckingAvailability ? (
                      <LatticeLoader
                        embedded
                        status="working"
                        label="Verifying..."
                        gridSize={3}
                        pattern="ripple"
                        showTimer
                      />
                    ) : (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0 stroke-[1.75]" aria-hidden="true" />
                        <span>Book Now</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* 2. RELATED PRODUCTS (Unified Storefront Card Grid: 2x2 Mobile, 4 cols Desktop) */}
          <section className="space-y-4 sm:space-y-5 pt-2">
            <div className="flex items-center justify-between gap-2.5">
              <h2 className="text-lg sm:text-2xl font-semibold text-neutral-950 dark:text-white tracking-tight font-display">
                Related Products
              </h2>
            </div>

            <div className="relative">
              {/* Left Arrow Button */}
              {relatedProductsList.length > relatedPageSize && (
                <button
                  type="button"
                  onClick={() => setRelatedCarouselPage((p) => Math.max(0, p - 1))}
                  disabled={relatedCarouselPage === 0}
                  className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 shadow-md hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Previous related products"
                >
                  <ChevronLeft className="h-4 w-4 text-neutral-900 dark:text-white" aria-hidden="true" />
                </button>
              )}

              {/* 4 Related Product Cards (2x2 on Mobile / 4 on Desktop) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                {displayedRelated.map((rel) => (
                  <RentalProductCard key={rel.id} product={rel} />
                ))}
              </div>

              {/* Right Arrow Button */}
              {relatedProductsList.length > relatedPageSize && (
                <button
                  type="button"
                  onClick={() => setRelatedCarouselPage((p) => p + 1)}
                  disabled={(relatedCarouselPage + 1) * relatedPageSize >= relatedProductsList.length}
                  className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 shadow-md hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Next related products"
                >
                  <ChevronRight className="h-4 w-4 text-neutral-900 dark:text-white" aria-hidden="true" />
                </button>
              )}
            </div>
          </section>

          {/* 3. CUSTOMER REVIEWS (Monochrome Storefront Surface) */}
          <section id="customer-reviews-section" className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-semibold text-neutral-950 dark:text-white tracking-tight font-display">
                  Customer Reviews
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 tabular-nums">
                  {genuineReviews.length} {genuineReviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>
              <Link
                to="/reviews"
                className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs sm:text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Write a Review</span>
              </Link>
            </div>

            {genuineReviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {genuineReviews.map((rev) => {
                  const ratingVal = Math.max(1, Math.min(5, Math.round(rev.rating || 5)));
                  const photo = rev.userProfilePhotoUrl || rev.user_profile_photo_url || rev.userAvatar;
                  return (
                    <div
                      key={rev.id}
                      className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3.5 flex flex-col justify-between transition-colors hover:border-neutral-400 dark:hover:border-neutral-600"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {photo ? (
                              <img
                                src={photo}
                                alt={rev.userName}
                                className="h-11 w-11 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shadow-xs shrink-0"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-xs shrink-0 text-sm">
                                {(rev.userName || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-neutral-950 dark:text-white truncate">{rev.userName}</h3>
                              {rev.isVerified && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                  <span>Verified Rental</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center text-amber-400 shrink-0">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  i < ratingVal
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-neutral-200 text-neutral-200 dark:fill-neutral-800 dark:text-neutral-800"
                                )}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        {formatRelativeTime(rev.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-5 shadow-xs">
                {/* Product Preview Card */}
                {product && (
                  <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-sm w-full text-left">
                    <div className="h-12 w-12 flex items-center justify-center shrink-0">
                      <img
                        src={product.image || "/brand/payent-logo-icon.png"}
                        alt={product.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-neutral-950 dark:text-white truncate">{product.title}</h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 capitalize truncate">{product.category || "Gear"}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0 tabular-nums">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                      <span>
                        {product.rating != null && Number(product.reviews || 0) > 0
                          ? Number(product.rating).toFixed(1)
                          : "New"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
                    No customer reviews yet
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Have you rented this gear through paYent? Share verified feedback to help other renters decide.
                  </p>
                </div>

                <Link
                  to="/reviews"
                  className="inline-flex items-center gap-2 min-h-[40px] px-6 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <MessageSquareQuote className="h-4 w-4" aria-hidden="true" />
                  <span>Write a Review</span>
                </Link>
              </div>
            )}
          </section>

        </div>

        {/* Full-Screen Photo Detail Viewer Lightbox Modal (Supports Photos & 10s Video) */}
        {isPhotoViewerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fullscreen-viewer-title"
            className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-4 sm:p-6 select-none"
            onClick={() => {
              setIsPhotoViewerOpen(false);
              setIsFullscreenGridView(false);
              setIsFullscreenVideoActive(false);
            }}
          >
            {/* Top Bar with Title, Counter, Video/Photo Toggle, Grid/Single Toggle and Close Button */}
            <div
              className="w-full max-w-6xl flex items-center justify-between gap-4 pb-3 border-b border-white/10 text-white z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md border border-white/20 shrink-0 tabular-nums">
                  {isFullscreenVideoActive
                    ? "Verified 10s Video"
                    : isFullscreenGridView
                    ? `All Photos (${gallery.length})`
                    : `Photo ${selectedImageIndex + 1} of ${gallery.length}`}
                </span>
                <h3 id="fullscreen-viewer-title" className="text-sm sm:text-base font-bold text-white truncate max-w-md">
                  {product.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {/* Watch 10s Video Toggle button */}
                {activeVideoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullscreenVideoActive((prev) => !prev);
                      setIsFullscreenGridView(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer backdrop-blur-md border flex items-center gap-1.5",
                      isFullscreenVideoActive
                        ? "bg-white text-neutral-950 border-white shadow-md"
                        : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                    )}
                  >
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isFullscreenVideoActive ? "Show Photos" : "10s Video"}</span>
                  </button>
                )}

                {/* Toggle Grid View */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreenGridView((prev) => !prev);
                    setIsFullscreenVideoActive(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer backdrop-blur-md border flex items-center gap-1.5",
                    isFullscreenGridView
                      ? "bg-white text-neutral-950 border-white"
                      : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isFullscreenGridView ? "Single View" : "All Photos"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoViewerOpen(false);
                    setIsFullscreenGridView(false);
                    setIsFullscreenVideoActive(false);
                  }}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer backdrop-blur-md border border-white/20 shadow-md"
                  aria-label="Close full screen viewer"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Content: Grid of All Photos/Video OR Single Large Photo/Video */}
            {isFullscreenGridView ? (
              <div
                className="w-full max-w-5xl flex-1 overflow-y-auto py-6 px-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 10s Video Card in Grid View */}
                {activeVideoUrl && (
                  <button
                    type="button"
                    aria-label="Watch 10-second verification video"
                    onClick={() => {
                      setIsFullscreenVideoActive(true);
                      setIsFullscreenGridView(false);
                    }}
                    className={cn(
                      "group relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/60 border-2 transition-colors cursor-pointer shadow-lg p-2 flex flex-col items-center justify-center",
                      isFullscreenVideoActive
                        ? "border-white ring-2 ring-white/40"
                        : "border-white/20 hover:border-white/60"
                    )}
                  >
                    <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                      <video
                        src={activeVideoUrl}
                        poster={activeDisplayImage || product?.image}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40">
                        <div className="h-10 w-10 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow-lg">
                          <Video className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/80 text-white text-xs font-semibold border border-white/20">
                          10s Video
                        </span>
                      </div>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-xs font-medium">
                      Video
                    </span>
                  </button>
                )}

                {gallery.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Select photo ${idx + 1} of ${product.title}`}
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setIsFullscreenVideoActive(false);
                      setIsFullscreenGridView(false);
                    }}
                    className={cn(
                      "group relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/50 border-2 transition-colors cursor-pointer shadow-lg p-2 flex items-center justify-center",
                      !isFullscreenVideoActive && idx === selectedImageIndex
                        ? "border-white ring-2 ring-white/40"
                        : "border-white/20 hover:border-white/60"
                    )}
                  >
                    <img src={src} alt={`${product.title} angle ${idx + 1}`} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-white text-neutral-950 text-xs font-semibold shadow-md">
                        Photo #{idx + 1}
                      </span>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs font-medium tabular-nums">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Central Stage: High-Res Video or High-Res Image with Nav Chevrons */}
                <div
                  className="relative w-full max-w-5xl flex-1 flex items-center justify-center min-h-0 my-auto py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isFullscreenVideoActive && activeVideoUrl ? (
                    <div className="relative w-full max-w-4xl max-h-[72vh] flex items-center justify-center">
                      <video
                        key={activeVideoUrl}
                        src={activeVideoUrl}
                        poster={activeDisplayImage || product?.image}
                        controls
                        autoPlay
                        playsInline
                        className="max-h-[72vh] max-w-full rounded-2xl shadow-2xl bg-black border border-white/20"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.currentSrc?.includes("l2vmxn9hwk6p0cs4ajoz")) {
                            target.src = "https://res.cloudinary.com/dvyendk6j/video/upload/v1793724284/l2vmxn9hwk6p0cs4ajoz.mp4";
                            target.load();
                            target.play().catch(() => {});
                          }
                        }}
                      >
                        <source src={activeVideoUrl} type="video/mp4" />
                        <source src={activeVideoUrl.replace(/\.mp4$/, ".webm")} type="video/webm" />
                      </video>
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs text-white font-semibold border border-white/20 flex items-center gap-1.5 select-none pointer-events-none">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Verified 10s Inspection Video</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <img
                        src={gallery[selectedImageIndex] || activeDisplayImage}
                        alt={product.title}
                        className="max-h-[70vh] max-w-full object-contain rounded-2xl drop-shadow-2xl"
                      />

                      {gallery.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
                            }}
                            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-colors cursor-pointer backdrop-blur-md shadow-xl"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
                            }}
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-colors cursor-pointer backdrop-blur-md shadow-xl"
                            aria-label="Next image"
                          >
                            <ChevronRight className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom Thumbnails Row */}
                <div
                  className="flex items-center justify-center gap-2.5 pt-2 max-w-full overflow-x-auto z-10 pb-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {activeVideoUrl && (
                    <button
                      type="button"
                      onClick={() => setIsFullscreenVideoActive(true)}
                      aria-label="Watch 10s Inspection Video"
                      className={cn(
                        "h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border-2 transition-colors p-1 bg-black/60 shrink-0 cursor-pointer flex flex-col items-center justify-center gap-0.5 relative group",
                        isFullscreenVideoActive
                          ? "border-white ring-2 ring-white/40"
                          : "border-white/20 hover:border-white/50 opacity-75 hover:opacity-100"
                      )}
                      title="Watch 10s Inspection Video"
                    >
                      <Video className="h-5 w-5 text-white stroke-[1.75]" aria-hidden="true" />
                      <span className="text-xs font-medium text-white">Video</span>
                    </button>
                  )}

                  {gallery.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`View photo ${idx + 1} of ${product.title}`}
                      onClick={() => {
                        setIsFullscreenVideoActive(false);
                        setSelectedImageIndex(idx);
                      }}
                      className={cn(
                        "h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border-2 transition-colors p-1 bg-black/40 shrink-0 cursor-pointer",
                        !isFullscreenVideoActive && idx === selectedImageIndex
                          ? "border-white ring-2 ring-white/40"
                          : "border-white/20 opacity-65 hover:opacity-100"
                      )}
                    >
                      <img src={src} alt={`${product.title} thumbnail ${idx + 1}`} className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Product Message Modal */}
        {showMessageModal && (
          <ProductMessageModal
            isOpen={showMessageModal}
            onClose={() => setShowMessageModal(false)}
            product={product}
          />
        )}

        {/* Terms & Conditions Popup Modal */}
        <TermsAndConditionsModal
          open={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setTermsAccepted(true);
            toast.success("Terms and conditions accepted");
          }}
          productTitle={product?.title}
          isAccepted={termsAccepted}
        />

        <ShareProductModal />
      </div>
    </MainLayout>
  );
}
