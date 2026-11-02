import { useNavigate, useParams, Link } from "@tanstack/react-router";
import {
  Check,
  Truck,
  MessageSquare,
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
  Coins,
  Lock,
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
import { formatOwnerAddress } from "@/utils/formatters";
import type { Product, Order } from "@/types";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import { ProductMessageModal } from "@/components/browse/ProductMessageModal";
import { ShareProductModal } from "@/components/common/ShareProductModal";
import { rentalSecurityService } from "@/services/rentalSecurityService";
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
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [relatedCarouselPage, setRelatedCarouselPage] = useState(0);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);

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
    const cached = api.getCachedProduct(id);
    if (cached && isMounted) {
      setProduct(cached);
      setProductLoading(false);
    } else {
      setProductLoading(true);
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
  const ownerEmail = product?.owner?.email?.toLowerCase().trim() || "";
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
    ((ownerId && currentUserId && ownerId === currentUserId) ||
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

    rentalSecurityService
      .getSecurityDeposit(currentId)
      .then((sec) => {
        if (isMounted) setSecurityRecord(sec);
      })
      .catch(() => {});

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

  // Gallery image assembly
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
    imgs = imgs.filter(Boolean);
    const prim = product.image || (product as any).primary_image;
    if (prim && !imgs.includes(prim)) {
      imgs = [prim, ...imgs];
    } else if (!imgs.length && prim) {
      imgs = [prim];
    }
    if (imgs.length === 0 && Array.isArray(product.rotationFrames) && product.rotationFrames.length > 0) {
      imgs = product.rotationFrames.filter(Boolean);
    }
    if (imgs.length === 0 && Array.isArray(product.angleImages) && product.angleImages.length > 0) {
      imgs = product.angleImages.filter(Boolean);
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

  const brand = product ? getProductBrand(product) : null;
  const isWishlisted = product ? has(product.id) : false;

  // Customer Reviews Data (Reference matches Sneha Reddy, Rahul Kumar, Divya Sharma)
  const customerReviews = [
    {
      name: "Sneha Reddy",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces",
      rating: 5,
      comment: "Amazing camera! Great experience.",
      date: "Oct 20, 2026",
    },
    {
      name: "Rahul Kumar",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces",
      rating: 5,
      comment: "Super easy booking and smooth pickup.",
      date: "Oct 18, 2026",
    },
    {
      name: "Divya Sharma",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces",
      rating: 5,
      comment: "Loved the rental service!",
      date: "Oct 15, 2026",
    },
  ];

  // Frequently Asked Questions
  const faqItems = [
    {
      question: "how does renting work?",
      answer: "Browse the catalog, select your gear, pick your rental dates or morning/afternoon slot, verify identity via quick KYC, and confirm booking. Pick up from verified lenders or opt for express delivery.",
    },
    {
      question: "How do I book this product?",
      answer: "Choose your date, select your slot (Morning, Afternoon, or Full Day), verify slot availability with 'Check Slot Availability', and click 'BOOK NOW' to review and confirm your booking.",
    },
    {
      question: "What happens after booking confirmation?",
      answer: "You receive a secure 6-digit handover PIN. When meeting the equipment host, inspect the gear, test all functions, share your PIN to activate rental, and start shooting.",
    },
    {
      question: "What is the pickup and return process?",
      answer: "Meet the equipment host at the designated pickup address or receive doorstep delivery. Return the equipment on schedule in original condition using the digital return PIN.",
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, you can cancel your rental booking directly from your Renter Dashboard prior to pickup. Instant full refunds apply per standard platform cancellation policies.",
    },
  ];

  // Related Products
  const relatedProductsList = useMemo(() => {
    const list = [...similarProducts, ...frequentlyTogether].filter(
      (p, i, arr) => p && p.id !== product.id && arr.findIndex((x) => x.id === p.id) === i
    );
    if (list.length >= 4) return list;
    const catalog = storage.get<Product[]>("payent_server_products", []);
    for (const p of catalog) {
      if (p && p.id !== product.id && !list.some((x) => x.id === p.id)) {
        list.push(p);
      }
      if (list.length >= 8) break;
    }
    return list;
  }, [similarProducts, frequentlyTogether, product.id]);

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
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-3">
              <div className="aspect-[4/3] w-full rounded-3xl bg-secondary/50 animate-pulse border border-border/80" />
            </div>
            <div className="lg:col-span-6 space-y-4">
              <div className="h-96 w-full rounded-3xl bg-secondary/50 animate-pulse border border-border/80 p-5 space-y-4" />
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

      <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-emerald-500/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-12">
          
          {/* 1. TOP HERO: PRODUCT GALLERY & DETAILS (2-Column Grid matching Reference) */}
          <section className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Image Gallery (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              {/* Main Product Showcase Card with soft mint tint */}
              <div className="relative rounded-3xl overflow-hidden bg-[#EAF7EE] dark:bg-emerald-950/25 border border-emerald-500/20 p-8 sm:p-12 flex items-center justify-center min-h-[380px] sm:min-h-[460px] shadow-sm group">
                {/* Top-Left: Availability Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                  {product.available ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-black/70 text-emerald-700 dark:text-emerald-400 font-semibold text-xs shadow-xs backdrop-blur-md border border-emerald-500/20 select-none">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-black/70 text-rose-600 dark:text-rose-400 font-semibold text-xs shadow-xs backdrop-blur-md border border-rose-500/20 select-none">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Reserved
                    </span>
                  )}
                </div>

                {/* Top-Right: Heart Wishlist Button */}
                <button
                  type="button"
                  onClick={() => {
                    toggle(product.id);
                    toast.success(isWishlisted ? "Removed from favourites" : "Saved to favourites!");
                  }}
                  aria-label={isWishlisted ? "Remove from favourites" : "Add to favourites"}
                  className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/95 dark:bg-black/70 text-neutral-600 dark:text-neutral-300 hover:text-rose-500 hover:scale-110 active:scale-95 transition-all shadow-xs border border-neutral-200/60 dark:border-neutral-700/60 backdrop-blur-md cursor-pointer"
                >
                  <Heart className={cn("h-5 w-5 transition-colors", isWishlisted ? "fill-rose-500 text-rose-500" : "")} />
                </button>

                {/* Center High-Resolution Product Image */}
                <img
                  src={activeDisplayImage}
                  alt={product.title}
                  onClick={() => setIsPhotoViewerOpen(true)}
                  className="max-h-[300px] sm:max-h-[380px] w-auto max-w-full object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                />
              </div>

              {/* 4-Thumbnail Gallery Strip */}
              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {thumbnails.map((thumb, idx) => {
                  const isActive = idx === selectedImageIndex;
                  const isFourth = idx === 3;
                  const remainingCount = gallery.length - 4;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer p-2 flex items-center justify-center bg-card ${
                        isActive
                          ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-border/80 hover:border-emerald-500/50"
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
              </div>
            </div>

            {/* Right Column: Product Information & Purchase Action (6 cols) */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Title & Subtitle */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
                  {product.title}
                </h1>
                <p className="text-sm font-semibold text-muted-foreground">
                  {product.category || "Gear"} {brand ? `• ${brand}` : ""}
                </p>
              </div>

              {/* Star Rating & Reviews Count */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1 font-bold text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{(product.rating != null ? Number(product.rating) : 4.8).toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground font-medium">
                  ({product.reviews || 124} reviews)
                </span>
              </div>

              {/* Price Display */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-display font-mono">
                  ₹{(Number(product.price) || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">/ day</span>
              </div>

              {/* Rental Duration Preset Pills */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: "1 Day", days: 1 },
                    { label: "3 Days", days: 3 },
                    { label: "1 Week", days: 7 },
                    { label: "2 Weeks", days: 14 },
                  ].map((preset) => {
                    const isSelected =
                      (preset.days === 1 && durationMode !== "custom") ||
                      (durationMode === "custom" && rentalDays === preset.days);
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          if (preset.days === 1) {
                            handleDurationModeChange("full_day");
                          } else {
                            handleSelectPresetDuration(preset.days);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                            : "border-border/80 bg-card hover:bg-secondary text-muted-foreground"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description ||
                  `Capture stunning photos and videos with the ${product.title}. Perfect for events, travel and professional shoots.`}
              </p>

              {/* Product Key Details with Icons */}
              <div className="space-y-2.5 pt-2 border-t border-border/60 text-sm">
                <div className="flex items-center gap-2.5 text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-muted-foreground">Condition:</span>
                  <span className="font-bold">{(product as any).condition || "Excellent"}</span>
                </div>

                <div className="flex items-center gap-2.5 text-foreground">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-muted-foreground">Location:</span>
                  <span className="font-bold">{formatOwnerAddress(product) || "Vizag, AP"}</span>
                </div>

                <div className="flex items-center gap-2.5 text-foreground">
                  <User className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-muted-foreground">Lender:</span>
                  <span className="font-bold">{product.owner?.name || "Sai Teja"}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
                </div>

                <div className="flex items-center gap-2.5 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {product.available ? "Available for Rent" : "Currently Reserved"}
                  </span>
                </div>
              </div>

              {/* Action Buttons: BOOK NOW & ADD TO FAVOURITES */}
              <div className="space-y-3 pt-3">
                <button
                  type="button"
                  id="product-details-book-now-btn"
                  onClick={handleBookNowAction}
                  disabled={categoryRestriction?.restricted}
                  className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 ${
                    categoryRestriction?.restricted
                      ? "bg-amber-900/40 text-amber-300 border border-amber-500/30 cursor-not-allowed opacity-80"
                      : "bg-[#059669] hover:bg-[#047857] text-white"
                  }`}
                >
                  <Calendar className="h-5 w-5 shrink-0" />
                  <span>BOOK NOW</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggle(product.id);
                    toast.success(isWishlisted ? "Removed from favourites" : "Saved to favourites!");
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Heart className={cn("h-4 w-4", isWishlisted ? "fill-rose-500 text-rose-500" : "")} />
                  <span>{isWishlisted ? "REMOVE FROM FAVOURITES" : "ADD TO FAVOURITES"}</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. RENTAL BOOKING INLINE TERMINAL */}
          <section id="rental-booking-section" className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-xs text-left">
            <div className="flex items-center justify-between border-b border-border/60 pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Rental Booking</h2>
                  <p className="text-xs text-muted-foreground">Select date, choose time slot, and verify slot availability.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFullCalendar(!showFullCalendar)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showFullCalendar ? "Hide Full Calendar" : "View Full Monthly Calendar"}</span>
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showFullCalendar ? "rotate-90" : "")} />
              </button>
            </div>

            {/* 3-Column Configuration Grid */}
            <div className="grid md:grid-cols-12 gap-6 items-start">
              {/* Column 1: Select Date */}
              <div className="md:col-span-3 space-y-2">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Select Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full h-12 px-3.5 pl-10 rounded-2xl border border-border bg-secondary/30 text-xs sm:text-sm font-semibold text-foreground focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
                  />
                  <Calendar className="h-4 w-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {durationMode === "custom" && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[11px] font-bold text-muted-foreground">Return Date</label>
                    <input
                      type="date"
                      min={startDate || todayStr}
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/30 text-xs font-semibold text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Column 2: Choose Slot */}
              <div className="md:col-span-6 space-y-2">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Choose Slot
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Morning */}
                  <button
                    type="button"
                    onClick={() => handleSlotSelect("morning")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedSlot === "morning" && durationMode === "half_day_morning"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-border/80 bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-bold text-foreground">Morning</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">8:00 AM to 12:00 PM</div>
                    <div className="mt-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{morningPrice}
                    </div>
                  </button>

                  {/* Afternoon */}
                  <button
                    type="button"
                    onClick={() => handleSlotSelect("afternoon")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedSlot === "afternoon" && durationMode === "half_day_afternoon"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-border/80 bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sun className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-bold text-foreground">Afternoon</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">1:00 PM to 5:00 PM</div>
                    <div className="mt-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{afternoonPrice}
                    </div>
                  </button>

                  {/* Full Day */}
                  <button
                    type="button"
                    onClick={() => handleSlotSelect("full_day")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedSlot === "full_day" && durationMode === "full_day"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-border/80 bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-bold text-foreground">Full Day</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">24 Elapsed Hours</div>
                    <div className="mt-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{fullDayPrice}
                    </div>
                  </button>
                </div>
              </div>

              {/* Column 3: Booking Summary */}
              <div className="md:col-span-3 space-y-2 p-3.5 rounded-2xl bg-secondary/30 border border-border/70">
                <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{estimatedTotal.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Slot Availability Banner & Direct Confirmation */}
            {availabilityChecked && isAvailableForDates ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Available on your selected date!</span>
                </span>
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Confirm Booking (₹{estimatedTotal.toLocaleString("en-IN")})
                </button>
              </div>
            ) : availabilityChecked && isAvailableForDates === false ? (
              <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                <CalendarX className="h-4 w-4 shrink-0" />
                <span>{availabilityMessage}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">Click below to verify real-time slot availability before booking.</p>
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  Check Slot Availability
                </button>
              </div>
            )}

            {/* Expandable Monthly Calendar */}
            {showFullCalendar && (
              <div className="pt-4 border-t border-border/60">
                <RenterBookingCalendar
                  productId={product.id}
                  onDateChange={(start, end) => {
                    handleStartDateChange(start);
                    handleEndDateChange(end);
                  }}
                  productTitle={product.title}
                  pricePerDay={Number(product.price) || 0}
                  productAvailable={product.available}
                  selectedStartDate={startDate}
                  selectedEndDate={endDate}
                  durationMode={durationMode}
                  selectedSlot={selectedSlot}
                  onSelectStartDate={handleStartDateChange}
                  onSelectEndDate={handleEndDateChange}
                  onSelectDurationMode={handleDurationModeChange}
                  onSelectSlot={handleSlotSelect}
                  onCheckAvailability={handleCheckAvailability}
                  isCheckingAvailability={false}
                  availabilityChecked={availabilityChecked}
                  isAvailableForDates={isAvailableForDates}
                  availabilityMessage={availabilityMessage}
                />
              </div>
            )}
          </section>

          {/* 3. WHY RENT THROUGH PAYENT? (4-Card Feature Grid) */}
          <section className="space-y-6 text-center pt-2">
            <div className="flex items-center justify-center gap-3">
              <span className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight font-display">
                Why Rent Through PAYENT?
              </h2>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center">
              {/* Feature 1 */}
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3 flex flex-col items-center">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Coins className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Affordable Rentals</h3>
                <p className="text-xs text-muted-foreground">Save more, rent smart.</p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3 flex flex-col items-center">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Verified Lenders</h3>
                <p className="text-xs text-muted-foreground">Rent with confidence.</p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3 flex flex-col items-center">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Flexible Booking</h3>
                <p className="text-xs text-muted-foreground">Choose your time.</p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3 flex flex-col items-center">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Secure Rental Experience</h3>
                <p className="text-xs text-muted-foreground">Your trust, our priority.</p>
              </div>
            </div>
          </section>

          {/* 4. CUSTOMER REVIEWS (3 Reviews Cards) */}
          <section className="space-y-6 text-center pt-2">
            <div className="flex items-center justify-center gap-3">
              <span className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight font-display">
                Customer Reviews
              </h2>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {customerReviews.map((rev, idx) => (
                <div key={idx} className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-3">
                    <img src={rev.avatar} alt={rev.name} className="h-11 w-11 rounded-full object-cover border border-emerald-500/20 shadow-xs" />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{rev.name}</h4>
                      <div className="flex items-center text-amber-400">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "{rev.comment}"
                  </p>
                  <div className="text-[11px] text-muted-foreground/75 font-medium">
                    {rev.date}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. FREQUENTLY ASKED QUESTIONS (Accordion) */}
          <section className="space-y-6 pt-2">
            <div className="flex items-center justify-center gap-3">
              <span className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight font-display">
                Frequently Asked Questions
              </h2>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
            </div>

            <div className="max-w-4xl mx-auto divide-y divide-border/60 rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs text-left">
              {faqItems.map((faq, idx) => {
                const isOpen = activeFaqIndex === idx;
                return (
                  <div key={idx} className="p-4 sm:p-5 transition-colors hover:bg-secondary/20">
                    <button
                      type="button"
                      onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left font-bold text-sm text-foreground hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      <span className="capitalize">{faq.question}</span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2", isOpen ? "rotate-180 text-emerald-600" : "")} />
                    </button>
                    {isOpen && (
                      <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed pr-6">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. RELATED PRODUCTS (Carousel/Grid matching Reference) */}
          <section className="space-y-6 pt-2">
            <div className="flex items-center justify-center gap-3">
              <span className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight font-display">
                Related Products
              </h2>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
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

              {/* 4 Related Product Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {displayedRelated.map((rel) => (
                  <Link
                    key={rel.id}
                    to="/payent/products/$id"
                    params={{ id: rel.id }}
                    className="group rounded-3xl border border-border/80 bg-card p-4 space-y-3 hover:shadow-lg transition-all hover:border-emerald-500/40 text-left block"
                  >
                    <div className="aspect-[4/3] rounded-2xl bg-[#EAF7EE] dark:bg-emerald-950/20 p-4 flex items-center justify-center overflow-hidden">
                      <img
                        src={rel.image || "/brand/payent-logo-icon.png"}
                        alt={rel.title}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors truncate">
                        {rel.title}
                      </h3>
                      <p className="text-xs text-muted-foreground capitalize">{rel.category || "Gear"}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{(rel.rating != null ? Number(rel.rating) : 4.7).toFixed(1)}</span>
                      <span className="text-muted-foreground font-normal">({rel.reviews || 84})</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{(Number(rel.price) || 0).toLocaleString("en-IN")}{" "}
                        <span className="text-xs text-muted-foreground font-normal font-sans">/ day</span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
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

        </div>

        {/* Full-Screen Photo Detail Viewer Modal on Image Click */}
        {isPhotoViewerOpen && (
          <PhotoDetailViewer
            primaryImage={activeDisplayImage}
            productTitle={product.title}
            angles={gallery}
            videoUrl={product.videoUrl || (product as any).video_url}
            onWishlistToggle={() => toggle(product.id)}
            isWishlisted={isWishlisted}
          />
        )}

        {/* Product Message Modal */}
        {showMessageModal && (
          <ProductMessageModal
            isOpen={showMessageModal}
            onClose={() => setShowMessageModal(false)}
            product={product}
          />
        )}

        <ShareProductModal />
      </div>
    </MainLayout>
  );
}
