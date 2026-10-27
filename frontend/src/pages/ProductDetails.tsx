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
  Share2,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
import { ProductMessageModal } from "@/components/browse/ProductMessageModal";

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

// Calculate inclusive days between two YYYY-MM-DD dates
function calculateInclusiveDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

import { rentalSecurityService } from "@/services/rentalSecurityService";
import type { RentalSecurity } from "@/types";

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
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Instant cache lookup for zero-latency initial render
  const initialCachedProduct = id ? api.getCachedProduct(id) : null;
  const [product, setProduct] = useState<Product | null>(initialCachedProduct);
  const [productLoading, setProductLoading] = useState<boolean>(!initialCachedProduct);

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

  // Slot Availability Fetch Effect
  useEffect(() => {
    if (!startDate || !id) return;
    let isMounted = true;
    setLoadingSlots(true);
    setSlotsError(null);

    const apiBase = getApiBase();
    fetch(`${apiBase}/api/products/${encodeURIComponent(id)}/slots?date=${encodeURIComponent(startDate)}`)
      .then(async (r) => {
        if (!r.ok) {
          const errData = await r.json().catch(() => null);
          throw new Error(errData?.detail || `Failed to fetch slots (HTTP ${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data && Array.isArray(data.slots)) {
          setDaySlots(data.slots);
          setSlotsError(null);
        } else {
          setDaySlots([]);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.warn("Could not fetch slots:", err);
        setDaySlots([]);
        setSlotsError(err?.message || "Failed to load real-time slot availability from server.");
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, startDate]);

  // Live slot availability synchronization on booking creation, cancellation, or local storage change
  useEffect(() => {
    const handleUpdate = () => {
      if (startDate && id) {
        const apiBase = getApiBase();
        fetch(`${apiBase}/api/products/${encodeURIComponent(id)}/slots?date=${encodeURIComponent(startDate)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && Array.isArray(data.slots)) {
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
      const activeSlot = daySlots.find(
        (s) => s.id === (durationMode === "half_day_morning" ? "morning" : "afternoon")
      );
      if (activeSlot && activeSlot.price) return activeSlot.price;
      const configuredHalf = (product as any).halfDayRate || (product as any).half_day_rate;
      return configuredHalf ? Number(configuredHalf) : Math.round(baseDailyPrice * 0.6);
    }
    if (durationMode === "full_day") {
      const fullSlot = daySlots.find((s) => s.id === "full_day");
      if (fullSlot && fullSlot.price) return fullSlot.price;
      return baseDailyPrice;
    }
    if (rentalDays <= 0) return 0;
    return rentalDays * baseDailyPrice;
  }, [product, durationMode, daySlots, rentalDays]);

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
      const res = await fetch(
        `${apiBase}/api/products/${encodeURIComponent(id)}/availability?start_date=${startDate}&end_date=${checkEnd}&session=${encodeURIComponent(effectiveSession)}`
      );
      if (!res.ok) {
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
    } catch (e) {
      console.debug("Backend availability check error:", e);
      setIsAvailableForDates(false);
      setAvailabilityMessage("Network error during availability check. Please check connection.");
      setAvailabilityChecked(true);
      return;
    }
  };

  // CONFIRM BOOKING LOGIC
  const handleConfirmBooking = async () => {
    if (!product) return;

    if (!user) {
      toast.info("Please log in to confirm your rental booking.");
      navigate({ to: "/login", search: { redirect: `/product/${id}` } as any });
      return;
    }

    if (isOwner) {
      toast.error("You cannot rent your own product.");
      return;
    }

    if (!isAvailableForDates || rentalDays <= 0) {
      toast.error("Please check and confirm date availability before booking.");
      return;
    }

    if (categoryRestriction?.restricted) {
      toast.error(
        categoryRestriction.message ||
        "You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered."
      );
      return;
    }

    setIsCreatingBooking(true);

    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    const renterId = user.accountId || user.id || user.email;
    const bookingId = `ord_${Date.now()}`;
    const newOrder: Order = {
      id: bookingId,
      productId: product.id,
      product_id: product.id,
      productTitle: product.title,
      product_title: product.title,
      productImage: product.image,
      product_image: product.image,
      startDate: startDate,
      start_date: startDate,
      endDate: durationMode === "custom" ? endDate : startDate,
      end_date: durationMode === "custom" ? endDate : startDate,
      total: estimatedTotal,
      status: "pending", // Booking requested
      category: product.category || "",
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      user_email: user.email,
      userEmail: user.email,
      ...({
        renterId,
        ownerId: ownerId || product.owner?.email || "PAYERNT_USER_001",
        rentalDuration: rentalDays,
        rentalRate: Number(product.price) || 0,
        estimatedAmount: estimatedTotal,
        time_slot: selectedSlot,
        timeSlot: selectedSlot,
        duration_type: durationMode.startsWith("half_day") ? "half_day" : (durationMode === "full_day" ? "full_day" : "custom"),
        durationType: durationMode.startsWith("half_day") ? "half_day" : (durationMode === "full_day" ? "full_day" : "custom"),
        start_time: selectedSlot === "morning" ? "08:00" : (selectedSlot === "afternoon" ? "13:00" : "08:00"),
        startTime: selectedSlot === "morning" ? "08:00" : (selectedSlot === "afternoon" ? "13:00" : "08:00"),
        end_time: selectedSlot === "morning" ? "12:00" : (selectedSlot === "afternoon" ? "17:00" : "17:00"),
        endTime: selectedSlot === "morning" ? "12:00" : (selectedSlot === "afternoon" ? "17:00" : "17:00"),
        start_datetime: `${startDate}T${selectedSlot === "morning" ? "08:00:00" : (selectedSlot === "afternoon" ? "13:00:00" : "08:00:00")}Z`,
        end_datetime: `${durationMode === "custom" ? endDate : startDate}T${selectedSlot === "morning" ? "12:00:00" : (selectedSlot === "afternoon" ? "17:00:00" : "17:00:00")}Z`,
      } as any),
    };

    try {
      if (token) {
        await api.createOrder(token, newOrder);
      } else {
        const allOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
        storage.set(STORAGE_KEYS.orders, [newOrder, ...allOrders]);
      }

      api.invalidateCache("user_orders");
      window.dispatchEvent(new CustomEvent("payent_orders_updated"));

      toast.success("Rental booking confirmed successfully!");
      setIsCreatingBooking(false);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error("Booking creation failed:", err);
      const errMsg = err?.message || "Failed to confirm booking reservation.";
      toast.error(errMsg);
      setIsCreatingBooking(false);
      return;
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
      const [similar, together] = await Promise.all([
        api.getSimilarRecommendations(currentId),
        api.getFrequentlyTogetherRecommendations(currentId),
      ]);
      if (isMounted) {
        if (similar && similar.length > 0) setSimilarProducts(similar);
        if (together && together.length > 0) setFrequentlyTogether(together);
      }
    }
    loadRecommendations();
    return () => {
      isMounted = false;
    };
  }, [product?.id, product?.category]);

  // Category-based Booking Restriction Check
  useEffect(() => {
    if (!product?.category || !user) {
      setCategoryRestriction(null);
      return;
    }
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;

    let isMounted = true;
    const evaluateRestriction = async () => {
      try {
        const res = await api.checkCategoryRestriction(token, product.category, product.id);
        if (isMounted) {
          if (res.restricted) {
            setCategoryRestriction({
              restricted: true,
              message:
                res.message ||
                "You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered.",
            });
          } else {
            setCategoryRestriction(null);
          }
        }
      } catch {
        if (isMounted) setCategoryRestriction(null);
      }
    };

    evaluateRestriction();

    const handleSync = () => {
      evaluateRestriction();
    };
    window.addEventListener("payent_orders_updated", handleSync);
    window.addEventListener("payent_queue_updated", handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener("payent_orders_updated", handleSync);
      window.removeEventListener("payent_queue_updated", handleSync);
    };
  }, [product?.id, product?.category, user]);

  if (productLoading && !product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              <div className="aspect-[4/3] w-full rounded-3xl bg-secondary/50 animate-pulse border border-border/80" />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <div className="h-96 w-full rounded-2xl bg-secondary/50 animate-pulse border border-border/80 p-5 space-y-4" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-24 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <Button
            className="mt-6"
            onClick={() => navigate({ to: "/browse" })}
          >
            Browse marketplace
          </Button>
        </div>
      </MainLayout>
    );
  }

  const productSchema = {
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
      ratingValue: product.rating != null ? Number(product.rating) : 5,
      reviewCount: product.reviews || 0,
    },
  };

  const breadcrumbSchema = {
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
  };

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
    return imgs.length > 0 ? imgs : (prim ? [prim] : []);
  }, [product]);

  const brand = getProductBrand(product);
  const isWishlisted = has(product.id);

  return (
    <MainLayout>
      <JsonLd schema={productSchema} />
      <JsonLd schema={breadcrumbSchema} />

      <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
        {/* Navigation Breadcrumb Bar */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-card/60 border border-border/70 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <button
                type="button"
                onClick={() => navigate({ to: "/browse" })}
                id="product-details-back-to-browse-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground font-bold transition-all cursor-pointer group shadow-xs active:scale-95"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>Explore</span>
              </button>

              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 hidden sm:inline-block" />
              
              <Link
                to="/browse"
                className="text-muted-foreground hover:text-foreground capitalize transition-colors hidden sm:inline-block font-semibold"
              >
                {product.category || "Gear"}
              </Link>

              {brand && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 hidden md:inline-block" />
                  <span className="text-muted-foreground hidden md:inline-block font-medium">{brand}</span>
                </>
              )}

              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 hidden lg:inline-block" />
              <span className="text-foreground font-bold truncate max-w-[180px] sm:max-w-xs hidden lg:inline-block">
                {product.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Insured Tag */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>₹50,000 Insured</span>
              </div>

              {/* Share Link Action */}
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share product"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 bg-card hover:bg-secondary text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 text-foreground"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>

              {/* Wishlist Action */}
              <button
                type="button"
                onClick={() => {
                  toggle(product.id);
                  toast.success(
                    isWishlisted ? "Removed from wishlist" : "Saved to wishlist!"
                  );
                }}
                aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border/80 bg-card hover:bg-secondary text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5 transition-transform active:scale-125",
                    isWishlisted ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                  )}
                />
                <span>{isWishlisted ? "Saved" : "Save"}</span>
              </button>

              {/* ID Badge */}
              <span className="text-[11px] text-muted-foreground font-mono bg-secondary/50 px-2.5 py-1 rounded-full border border-border/60 hidden md:inline-block">
                #{product.id}
              </span>
            </div>
          </div>
        </section>

        {/* Main Product Stage (Split Layout) */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-3">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* Left Column: Visual Showcase & Product Overview (7 cols) */}
            <div className="lg:col-span-7 space-y-7">
              {/* Media Player / Angle Viewer Container */}
              <div className="relative rounded-3xl overflow-hidden bg-card/80 border border-border/80 p-2 sm:p-3 shadow-lg">
                {product.angleImages && product.angleImages.length >= 2 ? (
                  <ProductAngleViewer
                    angles={product.angleImages}
                    productTitle={product.title}
                    onWishlistToggle={() => toggle(product.id)}
                    isWishlisted={has(product.id)}
                  />
                ) : product.rotationFrames && product.rotationFrames.length >= 2 ? (
                  <ProductRotationViewer
                    frames={product.rotationFrames}
                    productTitle={product.title}
                  />
                ) : (
                  <PhotoDetailViewer
                    primaryImage={product.image}
                    productTitle={product.title}
                    angles={gallery}
                    videoUrl={product.videoUrl || (product as any).video_url}
                    onWishlistToggle={() => toggle(product.id)}
                    isWishlisted={has(product.id)}
                  />
                )}
              </div>

              {/* Product Header & Quick Badges */}
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-4 text-left">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-foreground px-3 py-1 rounded-xl bg-secondary border border-border">
                      {product.category}
                    </span>
                    {brand && (
                      <span className="text-xs font-bold text-foreground px-3 py-1 rounded-xl bg-secondary/80 border border-border">
                        {brand}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground px-2.5 py-1 rounded-xl bg-secondary/40 border border-border/60">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{formatOwnerAddress(product) || "Direct Handover"}</span>
                    </span>
                  </div>

                  {product.available ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Available for Rent
                    </span>
                  ) : (
                    <span className="text-xs text-destructive font-extrabold px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                      Currently Reserved
                    </span>
                  )}
                </div>

                {/* Main Heading & Verified Reviews */}
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-foreground font-display">
                    {product.title}
                  </h1>

                  <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                    <div className="flex items-center gap-1 text-foreground bg-amber-400/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-400/20">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{(product.rating != null ? Number(product.rating) : 5.0).toFixed(1)}</span>
                    </div>
                    {(product.reviews || 0) > 0 ? (
                      <span className="text-muted-foreground">
                        ({product.reviews} verified renter reviews)
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" /> Newly Listed Gear
                      </span>
                    )}
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">Insured & Ready to Shoot</span>
                  </div>
                </div>

                {/* Description */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Equipment Overview
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {product.description || `Professional ${product.title} in pristine working condition. Maintained, calibrated, and insured for peer-to-peer equipment rental on Payent.`}
                  </p>
                </div>
              </div>

              {/* 10-Second Equipment Inspection Video if present */}
              {(product.videoUrl || (product as any).video_url) && (
                <div className="rounded-3xl bg-card border border-border/80 p-5 space-y-3.5 shadow-xs text-left">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-primary" />
                      <span>Verified 10s Equipment Inspection Video</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3" /> 100% Physical Check
                    </span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden bg-black border border-border/80 aspect-video group shadow-md">
                    <video
                      src={product.videoUrl || (product as any).video_url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    Unedited inspection video recorded by the lender prior to listing to verify pristine condition.
                  </p>
                </div>
              )}

              {/* Bento Specifications Grid */}
              <div className="rounded-3xl bg-card border border-border/80 p-6 space-y-4 shadow-xs text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                      Gear Specifications & Verification
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" /> Calibrated
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 hover:border-primary/40 transition-colors">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Category</span>
                    <span className="font-extrabold text-foreground truncate block capitalize mt-1 text-sm">{product.category}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 hover:border-primary/40 transition-colors">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Brand / Model</span>
                    <span className="font-extrabold text-foreground truncate block mt-1 text-sm">{brand || "Pro Spec"}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 hover:border-primary/40 transition-colors">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Condition</span>
                    <span className="font-extrabold text-foreground truncate block mt-1 text-sm">{(product as unknown as { condition?: string }).condition || "Pristine / Mint"}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 hover:border-primary/40 transition-colors">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pickup Hub</span>
                    <span className="font-extrabold text-foreground truncate block mt-1 text-sm">{formatOwnerAddress(product) || "Direct Handover"}</span>
                  </div>
                </div>
              </div>

              {/* Verified Host & Equipment Lender Profile */}
              {!product.isReference && (
                <div className="rounded-3xl bg-card border border-border/80 p-5 sm:p-6 shadow-xs text-left space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      Gear Host & Verification
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3" /> Verified Partner
                    </span>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <img
                      src={product.owner?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.owner?.name || "Host")}&background=10b981&color=ffffff`}
                      alt={product.owner?.name || "Host"}
                      className="h-14 w-14 rounded-full object-cover border-2 border-primary/20 shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-foreground truncate">
                          {product.owner?.name || "Verified Gear Host"}
                        </span>
                        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {product.owner?.rating || "5.0"} Host Rating
                        </span>
                        <span>·</span>
                        <span>Avg response time &lt; 15 mins</span>
                      </div>
                    </div>

                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => setShowMessageModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                      >
                        <MessageSquare className="h-4 w-4 text-sky-500" />
                        <span>Message Host</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Security & Guarantees Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/40 border border-border/70 text-left">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">₹50,000 Damage Protection</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Included with every rental booking at zero additional deposit fee.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/40 border border-border/70 text-left">
                  <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Verified Handover Checklist</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Digital PIN verification and camera test during gear pickup and return.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Premium Booking Terminal (5 cols - Sticky) */}
            <div className="lg:col-span-5 sticky top-20 space-y-4">
              <div className="rounded-3xl bg-card border border-border/80 p-5 sm:p-6 space-y-5 shadow-xl text-left backdrop-blur-xl relative">
                
                {/* Rate Header Banner */}
                <div className="flex items-baseline justify-between pb-3 border-b border-border/70">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                      Rental Daily Rate
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-3xl sm:text-4xl font-black text-foreground font-display font-mono">
                        ₹{(Number(product.price) || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">/ day</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Half-Day Slots Available
                  </span>
                </div>

                {isOwner ? (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1.5">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      You are the owner of this listing
                    </p>
                    <p className="text-xs text-muted-foreground">
                      To manage availability or block calendar dates, use your Lender Dashboard.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => navigate({ to: "/dashboard" })}
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Duration Type Toggle: Single Day vs Multi-Day */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>Rental Schedule & Duration</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {durationMode === "custom" ? "Custom Range (2+ Days)" : "Single Date Slots"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-secondary/50 border border-border/80">
                        <button
                          type="button"
                          onClick={() => {
                            if (durationMode === "custom") {
                              const restored = selectedSlot === "morning" ? "half_day_morning" : selectedSlot === "afternoon" ? "half_day_afternoon" : "full_day";
                              handleDurationModeChange(restored);
                              setEndDate(startDate || todayStr);
                            }
                          }}
                          className={cn(
                            "py-2.5 px-3 rounded-xl text-center transition-all cursor-pointer text-xs font-bold flex flex-col items-center justify-center gap-0.5",
                            durationMode !== "custom"
                              ? "bg-foreground text-background shadow-md scale-[1.01]"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                          )}
                        >
                          <span>Single Day Rental</span>
                          <span className="text-[9px] opacity-75 font-normal">Morning, Afternoon & Full Day</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleDurationModeChange("custom");
                            if (!endDate || endDate <= startDate) {
                              setEndDate(tomorrowStr);
                            }
                          }}
                          className={cn(
                            "py-2.5 px-3 rounded-xl text-center transition-all cursor-pointer text-xs font-bold flex flex-col items-center justify-center gap-0.5",
                            durationMode === "custom"
                              ? "bg-foreground text-background shadow-md scale-[1.01]"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                          )}
                        >
                          <span>Multi-Day Rental</span>
                          <span className="text-[9px] opacity-75 font-normal">2+ Consecutive Days</span>
                        </button>
                      </div>
                    </div>

                    {/* Interactive Booking Calendar */}
                    <div className="pt-1">
                      <RenterBookingCalendar
                        productId={id}
                        selectedStartDate={startDate}
                        selectedEndDate={durationMode === "custom" ? endDate : startDate}
                        onDateChange={(start, end) => {
                          setStartDate(start);
                          setEndDate(durationMode === "custom" ? end : start);
                          setAvailabilityChecked(false);
                          setIsAvailableForDates(null);
                          setAvailabilityMessage("");
                        }}
                        durationMode={durationMode}
                        session={durationMode === "custom" ? "full_day" : selectedSlot}
                        minDate={todayStr}
                      />
                    </div>

                    {/* Multi-Day Selected Range Banner & Quick Duration Presets */}
                    {durationMode === "custom" && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="font-extrabold text-foreground block">
                                {startDate && endDate && startDate !== endDate
                                  ? `${startDate} → ${endDate}`
                                  : startDate
                                  ? `${startDate} (${rentalDays} Day Rental · Return ${endDate || startDate} 10:00 AM)`
                                  : "Select Start & Return Dates on calendar"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {rentalDays} {rentalDays === 1 ? "Day" : "Days"} Rental ({rentalDays * 24} Elapsed Hours) · Calculated End: {calculatedEndDateTimeStr}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-foreground shrink-0">
                            ₹{(Number(product.price) || 0).toLocaleString("en-IN")}/day
                          </span>
                        </div>

                        {/* Quick Multi-Day Duration Presets (1d, 2d, 3d, 4d, 5d, 7d, 10d, 14d, 30d) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                            <span>Flexible Duration Presets (N × 24h)</span>
                            <span className="font-mono text-[10px]">Exact elapsed 24h intervals</span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                            {[
                              { label: "1 Day", days: 1, desc: "24 hrs" },
                              { label: "2 Days", days: 2, desc: "48 hrs" },
                              { label: "3 Days", days: 3, desc: "72 hrs" },
                              { label: "4 Days", days: 4, desc: "96 hrs" },
                              { label: "5 Days", days: 5, desc: "120 hrs" },
                              { label: "7 Days", days: 7, desc: "168 hrs" },
                            ].map((preset) => {
                              const isSelected = rentalDays === preset.days && durationMode === "custom";
                              return (
                                <button
                                  key={preset.days}
                                  type="button"
                                  onClick={() => handleSelectPresetDuration(preset.days)}
                                  className={cn(
                                    "p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                                    isSelected
                                      ? "bg-primary text-primary-foreground font-black border-primary shadow-xs scale-[1.02]"
                                      : "border-border/80 bg-card hover:bg-secondary text-foreground text-xs font-semibold"
                                  )}
                                >
                                  <span className="text-xs font-bold">{preset.label}</span>
                                  <span className="text-[9px] opacity-75 font-mono">{preset.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interactive Slot Availability Cards (for Single Date) */}
                    {durationMode !== "custom" && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span>Available Time Slots for Selected Date</span>
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground font-medium">
                            {startDate
                              ? new Date(startDate + "T00:00:00").toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Today"}
                          </span>
                        </div>

                        {loadingSlots ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse border border-border/60 p-3 flex flex-col justify-between">
                                <div className="h-3 w-20 bg-muted/70 rounded" />
                                <div className="h-4 w-12 bg-muted/70 rounded" />
                              </div>
                            ))}
                          </div>
                        ) : slotsError ? (
                          <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <span>{slotsError}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setStartDate((s) => (s ? `${s}` : todayStr));
                              }}
                              className="text-xs underline font-bold hover:opacity-80 cursor-pointer"
                            >
                              Retry
                            </button>
                          </div>
                        ) : daySlots.length === 0 ? (
                          <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 text-muted-foreground text-xs text-center">
                            No slot intervals configured for this date.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {daySlots.map((slot: any) => {
                              const isSelected = selectedSlot === slot.id;
                              const isBooked = slot.status === "booked";
                              const isBlocked = slot.status === "blocked" || (slot as any).isBlocked;
                              const isNotOffered = slot.status === "not_available";
                              const isClickable = !isBooked && !isBlocked && !isNotOffered;
                              const slotRate = Number(
                                slot.price ?? slot.rate ?? (slot.id === "full_day" ? Number(product.price || 0) : Math.round(Number(product.price || 0) * 0.6))
                              );

                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={!isClickable}
                                  onClick={() => handleSlotSelect(slot.id as any)}
                                  className={cn(
                                    "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between group",
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40 scale-[1.02]"
                                      : isClickable
                                      ? "border-border/80 bg-card/60 hover:border-primary/40 hover:bg-secondary/40 cursor-pointer"
                                      : "border-border/60 bg-muted/40 cursor-not-allowed opacity-70"
                                  )}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className={cn(
                                        "text-xs font-bold",
                                        !isClickable ? "line-through decoration-rose-500 decoration-2 text-muted-foreground/70" : "text-foreground"
                                      )}>
                                        {slot.id === "morning" ? "Morning" : slot.id === "afternoon" ? "Afternoon" : "Full Day"}
                                      </span>
                                      <span
                                        className={cn(
                                          "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                          isClickable
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                            : isBooked
                                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                            : isBlocked
                                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                            : "bg-muted text-muted-foreground border border-border"
                                        )}
                                      >
                                        {slot.statusLabel || (isBooked ? "BOOKED" : isBlocked ? "BLOCKED" : "AVAILABLE")}
                                      </span>
                                    </div>
                                    <p className={cn(
                                      "text-[10px] font-mono",
                                      !isClickable ? "line-through decoration-rose-400 text-muted-foreground/50" : "text-muted-foreground"
                                    )}>
                                      {slot.id === "full_day" ? "24 Elapsed Hours (10:00 AM → 10:00 AM)" : (slot.label?.includes("—") ? slot.label.split("—")[1].trim() : slot.label)}
                                    </p>
                                  </div>
                                  <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground text-[10px]">Rate</span>
                                    <span className={cn(
                                      "font-extrabold font-mono text-xs sm:text-sm",
                                      !isClickable ? "line-through decoration-rose-500/60 text-muted-foreground/60" : "text-foreground"
                                    )}>
                                      ₹{slotRate.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 1: Check Availability Action */}
                    {!availabilityChecked || isAvailableForDates === false ? (
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCheckAvailability}
                          className="w-full py-3.5 px-4 rounded-2xl bg-foreground text-background font-extrabold text-xs shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CalendarCheck className="h-4 w-4" />
                          <span>Check Slot Availability</span>
                        </button>

                        {availabilityChecked && isAvailableForDates === false && (
                          <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                            <CalendarX className="h-4 w-4 shrink-0" />
                            <span>{availabilityMessage}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Step 2: Available Summary Matrix & Confirm Booking */
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3.5 pt-2"
                      >
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>{availabilityMessage}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAvailabilityChecked(false);
                              setIsAvailableForDates(null);
                            }}
                            className="text-[11px] underline hover:opacity-80 cursor-pointer font-semibold"
                          >
                            Change Schedule
                          </button>
                        </div>

                        {/* Booking Summary Box */}
                        <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 space-y-2.5 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Selected Gear:</span>
                            <span className="font-extrabold text-foreground truncate max-w-[200px]">
                              {product.title}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Rental Schedule:</span>
                            <span className="font-extrabold text-foreground capitalize">
                              {durationMode === "half_day_morning"
                                ? "Morning Slot (8:00 AM – 12:00 PM · 4 hrs)"
                                : durationMode === "half_day_afternoon"
                                ? "Afternoon Slot (1:00 PM – 5:00 PM · 4 hrs)"
                                : durationMode === "full_day"
                                ? "Full Day (24 Elapsed Hours · 10:00 AM → 10:00 AM)"
                                : `${rentalDays} Days Rental (${rentalDays * 24} Elapsed Hours)`}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Start Instant:</span>
                            <span className="font-semibold text-foreground font-mono">
                              {startDate} at {selectedSlot === "morning" ? "8:00 AM" : selectedSlot === "afternoon" ? "1:00 PM" : "10:00 AM"}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Calculated End Instant:</span>
                            <span className="font-semibold text-foreground font-mono">
                              {calculatedEndDateTimeStr}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Applicable Unit Rate:</span>
                            <span className="font-semibold text-foreground">
                              {durationMode.startsWith("half_day")
                                ? `₹${estimatedTotal.toLocaleString("en-IN")} / half-day`
                                : `₹${(Number(product.price) || 0).toLocaleString("en-IN")} / day`}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Availability Verification:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Authoritative Backend Confirmed
                            </span>
                          </div>
                          <div className="pt-2 border-t border-border flex justify-between items-baseline">
                            <span className="font-bold text-foreground text-sm">Total Estimated Rental Price:</span>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display font-mono">
                              ₹{estimatedTotal.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Category Restriction Warning */}
                        {categoryRestriction?.restricted && (
                          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold text-amber-300 block mb-0.5">Category Restriction Active</span>
                              {categoryRestriction.message}
                            </div>
                          </div>
                        )}

                        {/* Confirm Booking Button */}
                        <button
                          type="button"
                          disabled={isCreatingBooking || categoryRestriction?.restricted}
                          onClick={handleConfirmBooking}
                          id="confirm-booking-btn"
                          className={`w-full py-4 px-4 rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                            categoryRestriction?.restricted
                              ? "bg-amber-900/40 text-amber-300/80 border border-amber-500/30 cursor-not-allowed opacity-80"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98"
                          }`}
                        >
                          {isCreatingBooking ? (
                            <span>Creating Booking Request...</span>
                          ) : categoryRestriction?.restricted ? (
                            <>
                              <AlertCircle className="h-4 w-4" />
                              <span>Awaiting Delivery (Category Locked)</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Confirm Booking Request (₹{estimatedTotal.toLocaleString("en-IN")})</span>
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}

                    {/* Secondary Action: Add to Cart */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Prefer to rent later?</span>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={isAddingToCart}
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>{justAddedToCart ? "Added to Cart!" : "Add to Rental Cart"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Product Messaging Modal */}
        {showMessageModal && (
          <ProductMessageModal
            isOpen={showMessageModal}
            onClose={() => setShowMessageModal(false)}
            product={product}
          />
        )}

        {/* Recommendations Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 space-y-10">
          {frequentlyTogether.length > 0 && (
            <RecommendationSection
              title="Frequently Booked Together"
              subtitle="Popular gear combinations rented in single shoots and creative projects"
              products={frequentlyTogether}
              type="frequently_together"
              badge="Bundle Pick"
              layout="compact"
            />
          )}

          {similarProducts.length > 0 && (
            <RecommendationSection
              title="Similar Tech Gear"
              subtitle={`Explore items similar to ${product.title} in ${product.category}`}
              products={similarProducts}
              type="similar"
              badge="Category Match"
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
