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
  Sparkles,
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
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { Rating } from "@/components/common/Rating";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/common/JsonLd";
import { INITIAL_FALLBACK_PRODUCTS, findFallbackProduct } from "@/utils/fallbackProducts";
import cameraImg from "@/assets/images/camera.webp";
import { PhotoDetailViewer } from "@/components/common/PhotoDetailViewer";
import { ProductRotationViewer } from "@/components/common/ProductRotationViewer";
import { ProductAngleViewer } from "@/components/common/ProductAngleViewer";
import { RecommendationSection } from "@/components/recommendations/RecommendationSection";
import { RenterBookingCalendar } from "@/components/booking/RenterBookingCalendar";
import { tracker } from "@/utils/eventTracker";
import { api, getApiBase } from "@/utils/api";
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
  const start = new Date(startStr);
  const end = new Date(endStr);
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
  // Instant cache lookup for zero-latency initial render
  const initialCachedProduct = useMemo(() => {
    if (!id) return null;
    const fromApi = api.getCachedProduct(id);
    if (fromApi) return fromApi;
    const targetKey = String(id).toLowerCase();
    const fromFallback = INITIAL_FALLBACK_PRODUCTS.find(
      (p) => String(p.id).toLowerCase() === targetKey || String(p.id) === String(id)
    );
    if (fromFallback) return fromFallback;
    if (targetKey === "1" || targetKey.includes("sony")) return INITIAL_FALLBACK_PRODUCTS[0];
    return null;
  }, [id]);
  const [product, setProduct] = useState<Product | null>(initialCachedProduct);
  const [productLoading, setProductLoading] = useState<boolean>(!initialCachedProduct);

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

  // Date Selection & Availability States
  const todayStr = useMemo(() => toDateInputValue(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateInputValue(d);
  }, []);

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
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

  // Stale-While-Revalidate: load latest product details in background
  useEffect(() => {
    let isMounted = true;
    setSelectedImageIndex(0);
    setIsVideoActive(false);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");

    const cached = initialCachedProduct || api.getCachedProduct(id);
    const initial = cached;
    if (initial) {
      if (isMounted) {
        setProduct(initial);
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
      try {
        const live = await api.getProductById(id);
        if (live) found = live;
      } catch {
        /* ignore */
      }

      if (!found) {
        try {
          const items = await api.getPublicProducts();
          if (Array.isArray(items)) {
            const targetKey = String(id).toLowerCase();
            found =
              items.find(
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
        try {
          const localItems = storage.get<Product[]>("payent_server_products", []);
          if (Array.isArray(localItems)) {
            const targetKey = String(id).toLowerCase();
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
        found = {
          id: id || "sony-alpha-a7-iii",
          title: "Sony Alpha a7 III",
          category: "Camera",
          price: 499,
          rating: 4.8,
          reviews: 124,
          image: cameraImg,
          images: [cameraImg],
          description: "Capture stunning photos and videos with the Sony Alpha a7 III. Perfect for events, travel and professional shoots.",
          condition: "Excellent",
          location: "Vizag, AP",
          available: true,
          owner: {
            id: "owner-sai-teja",
            name: "Sai Teja",
            city: "Vizag, AP",
            isVerified: true,
          },
        } as unknown as Product;
      }

      if (isMounted) {
        if (found) {
          setProduct(found);
          api.cacheProduct(found);
        } else if (!cached) {
          setProduct(null);
        }
        setProductLoading(false);
      }
    }

    loadTargetProduct();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [frequentlyTogether, setFrequentlyTogether] = useState<Product[]>([]);

  // Existing Bookings lookup for Date Overlap Detection
  const existingProductBookings = useMemo(() => {
    if (!product) return [];
    const allOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    return allOrders.filter(
      (o) =>
        (o.productId === product.id || (o as any).product_id === product.id) &&
        o.status !== "cancelled"
    );
  }, [product]);

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

  const handleDurationModeChange = (mode: DurationMode) => {
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
    }
  };

  const handleSelectPresetDuration = (days: number) => {
    setDurationMode("custom");
    setSelectedSlot("full_day");
    if (!startDate) return;
    const parts = startDate.split("-").map(Number);
    const startObj = new Date(parts[0], parts[1] - 1, parts[2]);
    // Exactly N elapsed 24-hour days:
    const endObj = new Date(startObj);
    endObj.setDate(startObj.getDate() + Math.max(1, days - 1));
    const endStr = toDateInputValue(endObj);
    setEndDate(endStr);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
  };

  const handleSlotSelect = (slotId: "morning" | "afternoon" | "full_day") => {
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

  // Handle Date Changes (resets check state)
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
    if (durationMode !== "custom") {
      setEndDate(val);
    } else if (endDate && val && new Date(endDate) < new Date(val)) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setAvailabilityChecked(false);
    setIsAvailableForDates(null);
    setAvailabilityMessage("");
  };

  // CHECK AVAILABILITY LOGIC
  const handleCheckAvailability = async () => {
    if (!startDate) {
      toast.error("Please select a Rental Date.");
      return;
    }
    if (durationMode === "custom" && !endDate) {
      toast.error("Please select both a Start Date and Return Date for multi-day rental.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(durationMode === "custom" ? endDate : startDate);
    const today = new Date(todayStr);

    if (start < today) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("Start date cannot be in the past.");
      setAvailabilityChecked(true);
      toast.error("Start date cannot be in the past.");
      return;
    }

    if (end < start) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("End date must be on or after the start date.");
      setAvailabilityChecked(true);
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    if (product && !product.available) {
      setIsAvailableForDates(false);
      setAvailabilityMessage("This gear is currently marked as unavailable by the owner.");
      setAvailabilityChecked(true);
      return;
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
          return;
        }
        if (targetSlot.status === "booked") {
          setIsAvailableForDates(false);
          setAvailabilityMessage(`The ${targetSlot.name} slot is already booked for ${startDate}. Please choose another slot.`);
          setAvailabilityChecked(true);
          toast.error(`Slot ${targetSlot.name} is booked.`);
          return;
        }
        if (targetSlot.status === "not_available") {
          setIsAvailableForDates(false);
          setAvailabilityMessage(`The ${targetSlot.name} slot is not available: ${targetSlot.statusLabel}.`);
          setAvailabilityChecked(true);
          toast.error(`Slot ${targetSlot.name} is not available.`);
          return;
        }
      }
    }

    // Backend authoritative availability verification for requested date span and session
    setIsCheckingAvailability(true);
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
            return !(checkEnd < o.startDate || startDate > o.endDate);
          });
          if (activeOverlap) {
            setIsAvailableForDates(false);
            setAvailabilityMessage("Selected dates conflict with an existing reservation.");
            setAvailabilityChecked(true);
            toast.error("Selected dates are already reserved.");
            return;
          }
          setIsAvailableForDates(true);
          setAvailabilityMessage("✓ Product and time slot available for selected dates!");
          setAvailabilityChecked(true);
          toast.success("Gear is available! Review booking summary below.");
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
        const reason = availData.reason || (availData.status === "blocked" ? "Selected dates/slot are blocked by owner." : "Selected dates/slot are already reserved.");
        setAvailabilityMessage(reason);
        setAvailabilityChecked(true);
        toast.error(reason);
        return;
      }
      if (availData.conflicts && availData.conflicts.length > 0) {
        const firstConflict = availData.conflicts[0];
        const isBlocked = firstConflict.reason === "blocked";
        setIsAvailableForDates(false);
        setAvailabilityMessage(
          isBlocked
            ? `Unavailable: Date ${firstConflict.date} is blocked by the equipment owner.`
            : `Unavailable: Date ${firstConflict.date} is already reserved by another renter.`
        );
        setAvailabilityChecked(true);
        toast.error(
          isBlocked
            ? `Date ${firstConflict.date} is blocked by owner.`
            : `Date ${firstConflict.date} is already reserved.`
        );
        return;
      }

      setIsAvailableForDates(true);
      setAvailabilityMessage("✓ Product and time slot available for selected dates!");
      setAvailabilityChecked(true);
      toast.success("Gear is available! Review booking summary below.");
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
      return;
    }
    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions to proceed.");
      return;
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
      name: "Payent",
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating != null ? Number(product.rating) : 4.8,
      reviewCount: product.reviews || 124,
    },
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

  // Related Products
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
    const catalog = storage.get<Product[]>("payent_server_products", []);
    for (const p of catalog) {
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
  }, [similarProducts, frequentlyTogether, product?.id, user]);

  const displayedRelated = useMemo(() => {
    if (relatedProductsList.length <= 4) return relatedProductsList;
    const start = (relatedCarouselPage * 4) % relatedProductsList.length;
    const slice = relatedProductsList.slice(start, start + 4);
    if (slice.length < 4) {
      return [...slice, ...relatedProductsList.slice(0, 4 - slice.length)];
    }
    return slice;
  }, [relatedProductsList, relatedCarouselPage]);


  if (productLoading && !product) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background text-neutral-900 dark:text-neutral-100">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full min-w-0">
              <div className="lg:col-span-6 space-y-3 min-w-0 w-full">
                <div className="aspect-[4/3] w-full rounded-3xl bg-neutral-200/60 dark:bg-[#1E1E1E] animate-pulse border border-black/10 dark:border-white/10" />
              </div>
              <div className="lg:col-span-6 space-y-4 min-w-0 w-full">
                <div className="h-96 w-full rounded-3xl bg-neutral-200/60 dark:bg-[#1E1E1E] animate-pulse border border-black/10 dark:border-white/10 p-5 space-y-4" />
              </div>
            </div>
          </div>
        </div>
        <ShareProductModal />
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-24 text-center space-y-4">
          <h1 className="text-3xl font-extrabold text-foreground">Product not found</h1>
          <p className="text-sm text-muted-foreground">The equipment you requested may have been unlisted or moved.</p>
          <Button
            className="mt-4"
            onClick={() => navigate({ to: "/browse" })}
          >
            Browse Explore Items
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <JsonLd schema={productSchema} />
      <JsonLd schema={breadcrumbSchema} />

      <div className="min-h-screen bg-background text-neutral-900 dark:text-neutral-100 pb-24 transition-colors duration-300 selection:bg-foreground/15">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-8">

          {/* Back Navigation Bar & Category Breadcrumb */}
          <div className="flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/categories" });
                }
              }}
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white px-3.5 py-1.5 sm:py-2 rounded-full bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 shadow-xs hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white" />
              <span>Back</span>
            </button>

            {product?.category && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 dark:text-[#A8B1BA]">
                <Link to="/categories" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Categories
                </Link>
                <span>/</span>
                <Link
                  to="/categories"
                  search={{ cat: product.category }}
                  className="capitalize hover:text-neutral-900 dark:hover:text-white transition-colors font-medium text-neutral-800 dark:text-neutral-200"
                >
                  {product.category}
                </Link>
              </div>
            )}
          </div>
          
          {/* 1. TOP HERO: PRODUCT GALLERY & DETAILS (2-Column Grid matching Reference) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-x-12 lg:gap-y-6 items-start w-full min-w-0">
            
            {/* 1. Left Top / Mobile 1st: Image Gallery & 10s Video Showcase */}
            <div className="order-1 lg:order-1 lg:col-span-6 lg:col-start-1 lg:row-start-1 space-y-4 min-w-0 w-full">
              {/* Main Product Showcase Card with edge-to-edge image & floating overlay badges */}
              <div className="relative rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 aspect-[4/3] sm:aspect-[16/11] min-h-[380px] sm:min-h-[460px] max-h-[520px] w-full flex items-center justify-center shadow-md group">
                {/* Center Showcase: 10s Video Player or High-Resolution Photo */}
                {isVideoActive ? (
                  <div className="w-full h-full min-h-[380px] sm:min-h-[460px] rounded-3xl overflow-hidden bg-black flex flex-col items-center justify-center relative shadow-inner">
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
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] text-primary font-bold border border-primary/30 flex items-center gap-1.5 select-none pointer-events-none">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verified 10s Inspection Video</span>
                    </div>
                    {/* Full Screen Video Overlay Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFullscreenVideoActive(true);
                        setIsPhotoViewerOpen(true);
                      }}
                      title="Watch video in full screen"
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer z-10 hover:scale-105 active:scale-95 shadow-md flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Maximize2 className="h-3.5 w-3.5 text-primary" />
                      <span>Full Screen</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] overflow-hidden flex items-center justify-center">
                    <img
                      src={activeDisplayImage}
                      alt={product.title}
                      onClick={() => {
                        setIsFullscreenVideoActive(false);
                        setIsPhotoViewerOpen(true);
                      }}
                      className="w-full h-full min-h-[380px] sm:min-h-[460px] max-h-[520px] object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105 cursor-pointer"
                    />
                    {/* Top gradient overlay to ensure wording & badge legibility directly on the image */}
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />
                    {/* Bottom gradient overlay for title & category legibility on the image */}
                    <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
                  </div>
                )}

                {/* Bottom Overlays: Title & Category on Left, Reviews / Rating on Right Bottom Overlap */}
                {!isVideoActive && (
                  <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-5 z-10 flex flex-col xs:flex-row xs:items-end justify-between gap-2 sm:gap-3">
                    {/* Bottom-Left: Title & Category / Brand */}
                    <div className="text-left pointer-events-none space-y-0.5 sm:space-y-1 min-w-0 max-w-full xs:max-w-[65%]">
                      <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight drop-shadow-md font-display line-clamp-2">
                        {product.title}
                      </h1>
                      <p className="text-xs sm:text-sm font-semibold text-neutral-200 drop-shadow-sm flex items-center gap-1.5 capitalize truncate">
                        <span className="text-primary font-bold">{product.category || "Gear"}</span>
                        {brand && (
                          <>
                            <span className="text-neutral-400">•</span>
                            <span>{brand}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Bottom-Right: Review / Rating Badge Overlapping on Product Image */}
                    {(() => {
                      const totalCount = genuineReviews.length > 0 ? genuineReviews.length : (product.reviews ? Number(product.reviews) : 0);
                      const avgRating = totalCount > 0 && product.rating != null ? Number(product.rating) : (totalCount > 0 ? 5.0 : null);

                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById("customer-reviews-section")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          title="View Customer Reviews"
                          className="pointer-events-auto shrink-0 inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-black/65 dark:bg-black/75 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer text-[11px] sm:text-xs select-none w-fit"
                        >
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-amber-300 font-mono">
                            {avgRating != null ? avgRating.toFixed(1) : "5.0"}
                          </span>
                          <span className="text-neutral-300 font-medium text-[11px]">
                            ({totalCount} {totalCount === 1 ? "review" : "reviews"})
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* Top Controls: Status Badge & 10s Video Badge — overlapping directly on the image */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-auto">
                  {product.available ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 dark:bg-black/75 text-primary font-semibold text-xs shadow-md backdrop-blur-md border border-primary/30 select-none">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 dark:bg-black/75 text-rose-400 font-semibold text-xs shadow-md backdrop-blur-md border border-rose-500/30 select-none">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Reserved
                    </span>
                  )}

                  {/* 10s Equipment Video Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVideoActive((prev) => !prev);
                    }}
                    title="Watch 10-second verified equipment inspection video"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-md backdrop-blur-md border cursor-pointer active:scale-95",
                      isVideoActive
                        ? "bg-primary text-white border-primary ring-2 ring-primary/30"
                        : "bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white border-white/20 hover:border-primary/40"
                    )}
                  >
                    <Video className="h-3.5 w-3.5 text-primary" />
                    <span>{isVideoActive ? "Show Photos" : "10s Video"}</span>
                  </button>
                </div>

                {/* Top-Right: Fullscreen Button & Heart Wishlist Button — overlapping directly on the image */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
                  {/* Fullscreen Symbol Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreenVideoActive(isVideoActive);
                      setIsPhotoViewerOpen(true);
                    }}
                    title={isVideoActive ? "View Video Full Screen" : "View Image Full Screen"}
                    aria-label={isVideoActive ? "View Video Full Screen" : "View Image Full Screen"}
                    className="p-2.5 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white hover:text-primary hover:scale-110 active:scale-95 transition-all shadow-md border border-white/20 backdrop-blur-md cursor-pointer"
                  >
                    <Maximize2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </button>

                  {/* Heart Wishlist Button */}
                  <button
                    type="button"
                    onClick={() => {
                      toggle(product.id);
                      toast.success(isWishlisted ? "Removed from favourites" : "Saved to favourites!");
                    }}
                    aria-label={isWishlisted ? "Remove from favourites" : "Add to favourites"}
                    className="p-2.5 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white hover:text-rose-500 hover:scale-110 active:scale-95 transition-all shadow-md border border-white/20 backdrop-blur-md cursor-pointer pointer-events-auto"
                  >
                    <Heart className={cn("h-4.5 w-4.5 sm:h-5 sm:w-5 transition-colors", isWishlisted ? "fill-rose-500 text-rose-500" : "")} />
                  </button>
                </div>
              </div>

              {/* 5-Thumbnail Media Strip (Photos + 10s Video Option) */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3 w-full min-w-0">
                {thumbnails.map((thumb, idx) => {
                  const isActive = !isVideoActive && idx === selectedImageIndex;
                  const isFourth = idx === 3;
                  const remainingCount = gallery.length - 4;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsVideoActive(false);
                        setSelectedImageIndex(idx);
                      }}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer p-1 sm:p-2 flex items-center justify-center bg-card min-w-0 ${
                        isActive
                          ? "border-primary ring-2 ring-primary/20 shadow-xs"
                          : "border-border/80 hover:border-primary/50"
                      }`}
                    >
                      <img src={thumb} alt="" className="w-full h-full object-contain" />
                      {isFourth && remainingCount > 0 && (
                        <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center text-white font-extrabold text-sm sm:text-base">
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
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer p-1 sm:p-2 flex flex-col items-center justify-center bg-neutral-950 text-white min-w-0 ${
                    isVideoActive
                      ? "border-primary ring-2 ring-primary/30 shadow-xs"
                      : "border-border/80 hover:border-primary/50"
                  }`}
                >
                  <Video className="h-4 w-4 sm:h-5 sm:w-5 text-primary mb-0.5 sm:mb-1 shrink-0" />
                  <span className="text-[8.5px] sm:text-[10px] font-bold tracking-tight text-neutral-200 truncate max-w-full">10s Video</span>
                </button>
              </div>

              </div>

            {/* 2. Check Availability & Rental Booking Section (Mobile/Tablet: 1st after gallery (order-2), Desktop: Right Column Sticky) */}
            <div id="rental-booking-section" className="order-2 lg:order-3 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:row-span-2 space-y-4 text-left lg:sticky lg:top-24 min-w-0 w-full">
              <div className="rounded-2xl sm:rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-1 flex-wrap gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-foreground">Rental Booking</h2>
                      <p className="text-[11px] text-muted-foreground">Select date, choose time slot, and verify availability.</p>
                    </div>
                  </div>
                </div>

                {/* Calendar Dropdown Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Rental Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFullCalendar((prev) => !prev)}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-black/10 dark:border-white/10 bg-neutral-100/70 dark:bg-[#1E1E1E] hover:bg-neutral-100 dark:hover:bg-white/10 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="text-left truncate">
                        <span className="text-xs sm:text-sm font-bold text-foreground font-mono block truncate">
                          {startDate ? (
                            durationMode === "custom" && endDate && endDate !== startDate
                              ? `${startDate} → ${endDate}`
                              : startDate
                          ) : (
                            "Select date on calendar"
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium block">
                          {showFullCalendar ? "Click to collapse calendar" : "Click to select date on calendar"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary shrink-0">
                      <span>{showFullCalendar ? "Close" : "Open Calendar"}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showFullCalendar ? "rotate-180" : "")} />
                    </div>
                  </button>

                  {/* Dropdown Calendar Panel */}
                  {showFullCalendar && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200 max-w-sm sm:max-w-md mx-auto">
                      <RenterBookingCalendar
                        productId={product.id}
                        selectedStartDate={startDate}
                        selectedEndDate={endDate}
                        onDateChange={(start, end) => {
                          handleStartDateChange(start);
                          handleEndDateChange(end);
                        }}
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

                {/* Choose Slot */}
                <div className="space-y-1.5 pt-0.5">
                  <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Choose Time Slot
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full min-w-0">
                    {/* Morning */}
                    <button
                      type="button"
                      onClick={() => handleSlotSelect("morning")}
                      className={`p-1.5 xs:p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 flex flex-col justify-between ${
                        selectedSlot === "morning" && durationMode === "half_day_morning"
                          ? "border-primary bg-primary/10 dark:bg-primary/15 ring-2 ring-primary/20 shadow-xs"
                          : "border-black/10 dark:border-white/10 bg-neutral-100/60 dark:bg-[#1E1E1E] hover:bg-neutral-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 mb-0.5 min-w-0">
                          <Sun className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="text-[10px] xs:text-[11px] sm:text-xs font-bold text-foreground truncate">Morning</span>
                        </div>
                        <div className="text-[8px] xs:text-[8.5px] sm:text-[10px] text-muted-foreground truncate leading-tight">
                          8 AM - 12 PM
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] xs:text-[11px] sm:text-xs font-extrabold text-primary font-mono">
                        ₹{morningPrice}
                      </div>
                    </button>

                    {/* Afternoon */}
                    <button
                      type="button"
                      onClick={() => handleSlotSelect("afternoon")}
                      className={`p-1.5 xs:p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 flex flex-col justify-between ${
                        selectedSlot === "afternoon" && durationMode === "half_day_afternoon"
                          ? "border-primary bg-primary/10 dark:bg-primary/15 ring-2 ring-primary/20 shadow-xs"
                          : "border-black/10 dark:border-white/10 bg-neutral-100/60 dark:bg-[#1E1E1E] hover:bg-neutral-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 mb-0.5 min-w-0">
                          <Sun className="h-3 w-3 text-orange-500 shrink-0" />
                          <span className="text-[10px] xs:text-[11px] sm:text-xs font-bold text-foreground truncate">Afternoon</span>
                        </div>
                        <div className="text-[8px] xs:text-[8.5px] sm:text-[10px] text-muted-foreground truncate leading-tight">
                          1 PM - 5 PM
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] xs:text-[11px] sm:text-xs font-extrabold text-primary font-mono">
                        ₹{afternoonPrice}
                      </div>
                    </button>

                    {/* Full Day */}
                    <button
                      type="button"
                      onClick={() => handleSlotSelect("full_day")}
                      className={`p-1.5 xs:p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 flex flex-col justify-between ${
                        selectedSlot === "full_day" && durationMode === "full_day"
                          ? "border-primary bg-primary/10 dark:bg-primary/15 ring-2 ring-primary/20 shadow-xs"
                          : "border-black/10 dark:border-white/10 bg-neutral-100/60 dark:bg-[#1E1E1E] hover:bg-neutral-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 mb-0.5 min-w-0">
                          <Calendar className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-[10px] xs:text-[11px] sm:text-xs font-bold text-foreground truncate">Full Day</span>
                        </div>
                        <div className="text-[8px] xs:text-[8.5px] sm:text-[10px] text-muted-foreground truncate leading-tight">
                          24 Hours
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] xs:text-[11px] sm:text-xs font-extrabold text-primary font-mono">
                        ₹{fullDayPrice}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Booking Summary */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-neutral-100/70 dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Booking Summary
                    </span>
                    <div className="text-xs font-semibold text-foreground">
                      {durationMode === "half_day_morning"
                        ? "1 Day • Morning Slot"
                        : durationMode === "half_day_afternoon"
                        ? "1 Day • Afternoon Slot"
                        : durationMode === "full_day"
                        ? "1 Day • Full Day"
                        : `${rentalDays} Days Rental`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Estimated Total
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-primary font-mono">
                      ₹{estimatedTotal.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Slot Availability Banner & Direct Confirmation / Check Availability */}
                {availabilityChecked && isAvailableForDates ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>Available on your selected dates!</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                      {/* Circular Button with Image 2 Animated Swoosh & Protruding Tick + Clickable Terms Text */}
                      <div className="flex items-center gap-2.5 select-none py-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={termsAccepted}
                          onClick={() => setTermsAccepted((prev) => !prev)}
                          className="relative flex h-7 w-7 items-center justify-center cursor-pointer transition-transform active:scale-90 focus:outline-hidden group"
                          aria-label="Toggle terms and conditions acceptance"
                        >
                          <AnimatePresence mode="wait">
                            {termsAccepted ? (
                              <motion.svg
                                key="checked-swoosh-icon-right"
                                width="28"
                                height="28"
                                viewBox="0 0 40 40"
                                className="overflow-visible shrink-0 drop-shadow-xs text-primary"
                                initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                exit={{ scale: 0.5, rotate: -30, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 450, damping: 20 }}
                              >
                                <motion.path
                                  d="M 28 8.5 A 13.5 13.5 0 0 0 11.5 29.5"
                                  stroke="currentColor"
                                  strokeWidth="3.2"
                                  strokeLinecap="round"
                                  fill="none"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.35, ease: "easeOut" }}
                                />
                                <motion.polygon
                                  points="6,31.5 15,25 14,35"
                                  fill="currentColor"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.12, duration: 0.2 }}
                                />
                                <motion.path
                                  d="M 16 33.5 A 13.5 13.5 0 0 0 32.5 22"
                                  stroke="currentColor"
                                  strokeWidth="3.2"
                                  strokeLinecap="round"
                                  fill="none"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.3, ease: "easeOut" }}
                                />
                                <motion.path
                                  d="M 11.5 21 L 18 27.5 L 34.5 8"
                                  stroke="currentColor"
                                  strokeWidth="4.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 420,
                                    damping: 22,
                                    delay: 0.08,
                                  }}
                                />
                              </motion.svg>
                            ) : (
                              <motion.svg
                                key="unchecked-circle-right"
                                width="28"
                                height="28"
                                viewBox="0 0 40 40"
                                className="overflow-visible shrink-0"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                              >
                                <circle
                                  cx="20"
                                  cy="20"
                                  r="13.5"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  fill="none"
                                  className="text-neutral-400 dark:text-neutral-500 group-hover:text-primary transition-colors"
                                />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-left text-xs sm:text-[13px] font-medium text-foreground hover:text-primary transition-colors cursor-pointer group flex items-center gap-1.5 focus:outline-hidden"
                        >
                          <span
                            className={cn(
                              "underline decoration-neutral-300 dark:decoration-neutral-600 group-hover:decoration-primary transition-all",
                              termsAccepted && "text-primary font-semibold decoration-primary"
                            )}
                          >
                            terms&condtion will apply
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground group-hover:text-foreground group-hover:bg-primary/10 transition-colors">
                            view
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleProceedToCheckout}
                        disabled={categoryRestriction?.restricted}
                        className="py-2 sm:py-2.5 px-5 rounded-full font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
                      >
                        <ShoppingBag className="h-4 w-4 shrink-0" />
                        <span>Confirm Booking & Rent (₹{estimatedTotal.toLocaleString("en-IN")})</span>
                      </button>
                    </div>
                  </div>
                ) : availabilityChecked && isAvailableForDates === false ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                      <CalendarX className="h-4 w-4 shrink-0" />
                      <span>{availabilityMessage}</span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCheckAvailability}
                        disabled={isCheckingAvailability}
                        className="py-2.5 sm:py-3 px-5 rounded-xl font-bold text-xs bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        {isCheckingAvailability ? (
                          <>
                            <span className="h-3.5 w-3.5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                            <span>Checking...</span>
                          </>
                        ) : (
                          <span>Re-check Availability</span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleCheckAvailability}
                      disabled={isCheckingAvailability || categoryRestriction?.restricted}
                      className="py-2.5 sm:py-3 px-6 rounded-full font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {isCheckingAvailability ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Checking Availability...</span>
                        </>
                      ) : (
                        <>
                          <CalendarCheck className="h-4 w-4 shrink-0" />
                          <span>CHECK AVAILABILITY</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Product Details & Book Section (Mobile/Tablet: 2nd after check availability (order-3), Desktop: Left Column under Gallery (order-2)) */}
            <div className="order-3 lg:order-2 lg:col-span-6 lg:col-start-1 lg:row-start-2 min-w-0 w-full">
              <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-5 sm:p-6 shadow-xs space-y-5 text-left">
                {/* 1. Product Description moved to top of this section */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description ||
                    `Capture stunning photos and videos with the ${product.title}. Perfect for events, travel and professional shoots.`}
                </p>

                {/* 2. Price Display */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-foreground font-display font-mono">
                      ₹{(Number(product.price) || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">/ day</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                    <span>{product.available ? "Available for Rent" : "Currently Reserved"}</span>
                  </div>
                </div>

                {/* 3. Condition, Location, Lender all on one line */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-border/60 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-muted-foreground">Condition:</span>
                    <span className="font-bold">{(product as any).condition || "Like New"}</span>
                  </div>

                  <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>

                  <div className="flex items-center gap-1.5 text-foreground">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-muted-foreground">Location:</span>
                    <span className="font-bold">{formatOwnerAddress(product) || "Bengaluru"}</span>
                  </div>

                  <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>

                  <div className="flex items-center gap-1.5 text-foreground">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-muted-foreground">Lender:</span>
                    <span className="font-bold">{product.owner?.name || "Arun Kumar"}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />
                  </div>
                </div>

                {/* Action Row: Terms and Conditions Checkbox & BOOK NOW */}
                <div className="pt-3 flex items-center justify-between flex-wrap gap-3 border-t border-border/40 mt-1">
                  {/* Circular Button with Image 2 Animated Swoosh & Protruding Tick + Clickable Terms Text */}
                  <div className="flex items-center gap-2.5 select-none py-1">
                    {/* Circle Toggle Button: Animates to Image 2 curved arrow + protruding tick when active */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={termsAccepted}
                      onClick={() => setTermsAccepted((prev) => !prev)}
                      className="relative flex h-7 w-7 items-center justify-center cursor-pointer transition-transform active:scale-90 focus:outline-hidden group"
                      aria-label="Toggle terms and conditions acceptance"
                    >
                      <AnimatePresence mode="wait">
                        {termsAccepted ? (
                          <motion.svg
                            key="checked-swoosh-icon"
                            width="28"
                            height="28"
                            viewBox="0 0 40 40"
                            className="overflow-visible shrink-0 drop-shadow-xs text-primary"
                            initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            exit={{ scale: 0.5, rotate: -30, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 450, damping: 20 }}
                          >
                            {/* Upper-left circular arrow arc */}
                            <motion.path
                              d="M 28 8.5 A 13.5 13.5 0 0 0 11.5 29.5"
                              stroke="currentColor"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                              fill="none"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                            />
                            {/* Arrowhead at bottom left pointing left */}
                            <motion.polygon
                              points="6,31.5 15,25 14,35"
                              fill="currentColor"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.12, duration: 0.2 }}
                            />
                            {/* Lower-right arc */}
                            <motion.path
                              d="M 16 33.5 A 13.5 13.5 0 0 0 32.5 22"
                              stroke="currentColor"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                              fill="none"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                            {/* Bold checkmark extending OUTSIDE the circular perimeter */}
                            <motion.path
                              d="M 11.5 21 L 18 27.5 L 34.5 8"
                              stroke="currentColor"
                              strokeWidth="4.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 420,
                                damping: 22,
                                delay: 0.08,
                              }}
                            />
                          </motion.svg>
                        ) : (
                          <motion.svg
                            key="unchecked-circle"
                            width="28"
                            height="28"
                            viewBox="0 0 40 40"
                            className="overflow-visible shrink-0"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                          >
                            <circle
                              cx="20"
                              cy="20"
                              r="13.5"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              fill="none"
                              className="text-neutral-400 dark:text-neutral-500 group-hover:text-primary transition-colors"
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </button>

                    {/* Text: Clicking opens the Terms & Conditions popup modal */}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-left text-xs sm:text-[13px] font-medium text-foreground hover:text-primary transition-colors cursor-pointer group flex items-center gap-1.5 focus:outline-hidden"
                    >
                      <span
                        className={cn(
                          "underline decoration-neutral-300 dark:decoration-neutral-600 group-hover:decoration-primary transition-all",
                          termsAccepted && "text-primary font-semibold decoration-primary"
                        )}
                      >
                        terms&condtion will apply
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground group-hover:text-foreground group-hover:bg-primary/10 transition-colors">
                        view
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    id="product-details-book-now-btn"
                    onClick={handleBookNowAction}
                    disabled={categoryRestriction?.restricted}
                    className={`py-2.5 sm:py-3 px-6 rounded-full font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                      categoryRestriction?.restricted
                        ? "bg-amber-900/40 text-amber-300 border border-amber-500/30 cursor-not-allowed opacity-80"
                        : "bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4 shrink-0" />
                    <span>BOOK NOW</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 2. RELATED PRODUCTS (Left-aligned title with overlapping details on image) */}
          <section className="space-y-6 pt-2">
            <div className="flex items-center justify-start gap-2.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight font-display">
                Related Products
              </h2>
            </div>

            <div className="relative">
              {/* Left Arrow Button */}
              {relatedProductsList.length > 4 && (
                <button
                  type="button"
                  onClick={() => setRelatedCarouselPage((p) => Math.max(0, p - 1))}
                  disabled={relatedCarouselPage === 0}
                  className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-2.5 rounded-full bg-card border border-border shadow-md hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  aria-label="Previous related products"
                >
                  <ChevronLeft className="h-4 w-4 text-foreground" />
                </button>
              )}

              {/* 4 Related Product Cards - Clean Edge-to-Edge Cards without Background Divs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {displayedRelated.map((rel) => (
                  <Link
                    key={rel.id}
                    to="/payent/products/$id"
                    params={{ id: rel.id }}
                    className="group relative aspect-[4/3] rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800/80 hover:border-primary/50 shadow-md hover:shadow-xl transition-all block text-left"
                  >
                    {/* Edge-to-Edge Product Image */}
                    <img
                      src={rel.image || "/brand/payent-logo-icon.png"}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Smooth dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                    {/* Overlap: Top Rating Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold text-amber-400 shadow-sm pointer-events-none">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{(rel.rating != null ? Number(rel.rating) : 4.7).toFixed(1)}</span>
                      <span className="text-white/60 font-normal text-[10px]">({rel.reviews || 84})</span>
                    </div>

                    {/* Overlap: Bottom Details */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 space-y-1">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-primary transition-colors truncate drop-shadow-sm">
                          {rel.title}
                        </h3>
                        <p className="text-xs text-neutral-300 capitalize truncate">
                          {rel.category || "Gear"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-white/15">
                        <span className="font-extrabold text-sm text-white font-mono drop-shadow-sm">
                          ₹{(Number(rel.price) || 0).toLocaleString("en-IN")}{" "}
                          <span className="text-[11px] text-neutral-300 font-normal font-sans">/ day</span>
                        </span>
                        <span className="text-[11px] font-semibold text-primary flex items-center gap-1 drop-shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Available
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Right Arrow Button */}
              {relatedProductsList.length > 4 && (
                <button
                  type="button"
                  onClick={() => setRelatedCarouselPage((p) => p + 1)}
                  disabled={(relatedCarouselPage + 1) * 4 >= relatedProductsList.length}
                  className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-2.5 rounded-full bg-card border border-border shadow-md hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  aria-label="Next related products"
                >
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </button>
              )}
            </div>
          </section>

          {/* 3. CUSTOMER REVIEWS (Left-aligned title with modern Payent theme card) */}
          <section id="customer-reviews-section" className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight font-display">
                  Customer Reviews
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {genuineReviews.length} {genuineReviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>
              <Link
                to="/reviews"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
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
                      className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 shadow-xs space-y-3.5 flex flex-col justify-between transition-all hover:border-primary/40"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {photo ? (
                              <img
                                src={photo}
                                alt={rev.userName}
                                className="h-11 w-11 rounded-full object-cover border border-primary/20 shadow-xs shrink-0"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shadow-xs shrink-0 text-sm">
                                {(rev.userName || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground truncate">{rev.userName}</h4>
                              {rev.isVerified && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
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
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>
                      <div className="text-[11px] text-muted-foreground/75 font-medium pt-2 border-t border-border/40">
                        {formatRelativeTime(rev.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#1E1E1E]/90 backdrop-blur-sm p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-5 shadow-xs relative overflow-hidden">
                {/* Subtle ambient aura */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-28 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                {/* Product Preview Card */}
                {product && (
                  <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 backdrop-blur-md max-w-sm w-full text-left">
                    <div className="h-12 w-12 flex items-center justify-center shrink-0">
                      <img
                        src={product.image || "/brand/payent-logo-icon.png"}
                        alt={product.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-foreground truncate">{product.title}</h4>
                      <p className="text-[11px] text-muted-foreground capitalize truncate">{product.category || "Gear"}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 shrink-0">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{(product.rating != null ? Number(product.rating) : 4.9).toFixed(1)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Be the First to Review
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Have you rented this gear through PAYENT? Share your verified feedback to help other creators in the community.
                  </p>
                </div>

                <Link
                  to="/reviews"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Write a Review</span>
                </Link>
              </div>
            )}
          </section>

        </div>

        {/* Full-Screen Photo Detail Viewer Lightbox Modal (Supports Photos & 10s Video) */}
        {isPhotoViewerOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200 select-none"
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
                <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md border border-white/20 shrink-0 font-mono">
                  {isFullscreenVideoActive
                    ? "Verified 10s Video"
                    : isFullscreenGridView
                    ? `All Photos (${gallery.length})`
                    : `Photo ${selectedImageIndex + 1} of ${gallery.length}`}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
                  {product.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {/* Watch 10s Video Toggle button if video is available */}
                {activeVideoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullscreenVideoActive((prev) => !prev);
                      setIsFullscreenGridView(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer backdrop-blur-md border flex items-center gap-1.5",
                      isFullscreenVideoActive
                        ? "bg-primary text-white border-primary ring-2 ring-primary/30 shadow-md"
                        : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                    )}
                  >
                    <Video className="h-3.5 w-3.5 text-primary" />
                    <span>{isFullscreenVideoActive ? "Show Photos" : "10s Video"}</span>
                  </button>
                )}

                {/* Toggle Grid View to see ALL product photos at once */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreenGridView((prev) => !prev);
                    setIsFullscreenVideoActive(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all cursor-pointer backdrop-blur-md border flex items-center gap-1.5",
                    isFullscreenGridView
                      ? "bg-primary border-primary"
                      : "bg-white/10 hover:bg-white/20 border-white/20"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>{isFullscreenGridView ? "Single View" : "All Photos"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoViewerOpen(false);
                    setIsFullscreenGridView(false);
                    setIsFullscreenVideoActive(false);
                  }}
                  className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer backdrop-blur-md border border-white/20 shadow-md"
                  aria-label="Close full screen viewer"
                >
                  <X className="h-5 w-5" />
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
                    onClick={() => {
                      setIsFullscreenVideoActive(true);
                      setIsFullscreenGridView(false);
                    }}
                    className={cn(
                      "group relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/60 border-2 transition-all cursor-pointer shadow-lg hover:scale-[1.03] p-2 flex flex-col items-center justify-center",
                      isFullscreenVideoActive
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-white/20 hover:border-primary/50"
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
                        <div className="h-10 w-10 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Video className="h-5 w-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/80 text-primary text-[11px] font-bold border border-primary/30">
                          10s Video
                        </span>
                      </div>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-primary text-[10px] font-bold">
                      Video
                    </span>
                  </button>
                )}

                {gallery.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setIsFullscreenVideoActive(false);
                      setIsFullscreenGridView(false);
                    }}
                    className={cn(
                      "group relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/50 border-2 transition-all cursor-pointer shadow-lg hover:scale-[1.03] p-2 flex items-center justify-center",
                      !isFullscreenVideoActive && idx === selectedImageIndex
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-white/20 hover:border-primary/50"
                    )}
                  >
                    <img src={src} alt="" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-primary text-white text-[11px] font-bold shadow-md">
                        Photo #{idx + 1}
                      </span>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono">
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
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] text-primary font-bold border border-primary/30 flex items-center gap-1.5 select-none pointer-events-none">
                        <ShieldCheck className="h-3.5 w-3.5" />
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
                            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-xl"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
                            }}
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-xl"
                            aria-label="Next image"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom Thumbnails Row — ALWAYS shows all product images + 10s video option! */}
                <div
                  className="flex items-center justify-center gap-2.5 pt-2 max-w-full overflow-x-auto z-10 pb-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 10s Video Thumbnail Button */}
                  {activeVideoUrl && (
                    <button
                      type="button"
                      onClick={() => setIsFullscreenVideoActive(true)}
                      className={cn(
                        "h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border-2 transition-all p-1 bg-black/60 shrink-0 cursor-pointer flex flex-col items-center justify-center gap-0.5 relative group",
                        isFullscreenVideoActive
                          ? "border-primary ring-2 ring-primary/30 scale-105"
                          : "border-white/20 hover:border-white/50 opacity-70 hover:opacity-100"
                      )}
                      title="Watch 10s Inspection Video"
                    >
                      <Video className={cn("h-5 w-5", isFullscreenVideoActive ? "text-primary" : "text-white")} />
                      <span className="text-[9px] font-bold text-white uppercase tracking-tight">Video</span>
                    </button>
                  )}

                  {/* Photo Thumbnails */}
                  {gallery.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsFullscreenVideoActive(false);
                        setSelectedImageIndex(idx);
                      }}
                      className={cn(
                        "h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border-2 transition-all p-1 bg-black/40 shrink-0 cursor-pointer",
                        !isFullscreenVideoActive && idx === selectedImageIndex
                          ? "border-primary ring-2 ring-primary/30 scale-105"
                          : "border-white/20 opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={src} alt="" className="h-full w-full object-contain" />
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
            toast.success("Terms & conditions accepted!");
          }}
          productTitle={product?.title}
          isAccepted={termsAccepted}
        />

        <ShareProductModal />
      </div>
    </MainLayout>
  );
}
