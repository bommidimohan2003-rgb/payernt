import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Package,
  Truck,
  MessageSquare,
  KeyRound,
  AlertTriangle,
  Clock,
  Lock,
  CheckCircle,
  MapPin,
  Copy,
  ExternalLink,
  Edit3,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Ban,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  Store,
  XCircle,
  CreditCard,
  Receipt,
  RotateCcw,
  Download,
  RefreshCw,
  FileText,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/common/Button";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { Order } from "@/types";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { useNavigate } from "@tanstack/react-router";
import { getOptimizedImageUrl } from "@/utils/images";
import { SecretPinDisplay } from "@/components/common/SecretPinDisplay";
import { LiveRentalQueue } from "@/components/rental/LiveRentalQueue";
import { formatBookingDateTime } from "@/utils/formatters";
import { cn } from "@/lib/utils";

export type BookingFilter = "all" | "pending" | "ongoing" | "cancelled" | "completed";

export const CANCELLATION_REASONS = [
  "I no longer need this product.",
  "I found a better alternative.",
  "The rental price is too high.",
  "My plans have changed.",
  "The product is not suitable for my needs.",
  "I booked by mistake.",
  "Other reason.",
] as const;

export const isEligibleForCancellation = (order: Order | null | undefined): boolean => {
  if (!order) return false;
  const st = String(order.status || "").toLowerCase();
  if (st === "cancelled" || st === "canceled" || st === "completed" || st === "returned") {
    return false;
  }
  if (st === "active" || st === "in_progress" || st === "ongoing") {
    return false;
  }
  const delSt = String((order as any).delivery_status || (order as any).deliveryStatus || "").toUpperCase();
  if (["PICKED_UP_FROM_VENDOR", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(delSt)) {
    return false;
  }
  return true;
};

const LEGACY_SAMPLE_ORDER_IDS = new Set([
  "ord_1793113916585",
  "ord_1793113916123",
  "ord_1793113915678",
  "ord_1793113915432",
]);

export const stripLegacySampleOrders = (items: Order[]): Order[] => {
  if (!Array.isArray(items)) return [];
  return items.filter((o) => !LEGACY_SAMPLE_ORDER_IDS.has(String(o?.id || "")));
};

/**
 * Status categorization logic mapped to backend booking statuses
 */
export const isCancelledBooking = (o: Order): boolean => {
  const s = String(o.status || "").toLowerCase().trim();
  return (
    s === "cancelled" ||
    s === "canceled" ||
    s === "rejected" ||
    s === "declined" ||
    s === "failed" ||
    Boolean((o as any).cancelledAt || (o as any).cancelled_at)
  );
};

export const isCompletedBooking = (o: Order): boolean => {
  if (isCancelledBooking(o)) return false;
  const s = String(o.status || "").toLowerCase().trim();
  return s === "completed" || s === "rental_completed" || s === "returned";
};

export const isPendingBooking = (o: Order): boolean => {
  if (isCancelledBooking(o) || isCompletedBooking(o)) return false;
  const s = String(o.status || "").toLowerCase().trim();
  return (
    s === "pending" ||
    s === "requested" ||
    s === "security_pending" ||
    s === "awaiting_confirmation" ||
    s === "payment_pending"
  );
};

export const isOngoingBooking = (o: Order): boolean => {
  if (isCancelledBooking(o) || isCompletedBooking(o) || isPendingBooking(o)) return false;
  return true;
};

/**
 * Infer or retrieve clean category name
 */
export function getOrderCategory(order: Order): string {
  if (order.category && order.category.trim() !== "") {
    return order.category;
  }
  const title = String(order.productTitle || (order as any).product_title || "").toLowerCase();
  if (
    title.includes("camera") ||
    title.includes("eos") ||
    title.includes("lens") ||
    title.includes("fx3") ||
    title.includes("sony a") ||
    title.includes("dslr")
  ) {
    return "Cameras";
  }
  if (
    title.includes("vivobook") ||
    title.includes("laptop") ||
    title.includes("macbook") ||
    title.includes("dell") ||
    title.includes("thinkpad")
  ) {
    return "Computers";
  }
  if (title.includes("bike") || title.includes("mtb") || title.includes("cycle") || title.includes("sprint")) {
    return "Bicycles";
  }
  if (
    title.includes("headphone") ||
    title.includes("audio") ||
    title.includes("wh-") ||
    title.includes("mic") ||
    title.includes("speaker")
  ) {
    return "Audio";
  }
  if (title.includes("drone") || title.includes("dji")) {
    return "Drones";
  }
  return "Tech Gear";
}

/**
 * Format booked date and rental duration string matching mockup
 */
export function getOrderDates(order: Order) {
  const createdRaw =
    order.createdAt || (order as any).created_at || (order as any).confirmedAt || (order as any).confirmed_at;
  let bookedOnText = "Date unavailable";
  if (createdRaw) {
    try {
      const dt = new Date(createdRaw);
      if (!isNaN(dt.getTime())) {
        const dStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const tStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
        bookedOnText = `${dStr}, ${tStr}`;
      }
    } catch {
      bookedOnText = String(createdRaw);
    }
  }

  const startRaw = order.startDate || (order as any).start_date;
  const endRaw = order.endDate || (order as any).end_date;
  let rentalText = "Rental: On request";

  if (startRaw) {
    const parse = (d: string) => {
      try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? null : dt;
      } catch {
        return null;
      }
    };
    const dtStart = parse(startRaw);
    const dtEnd = endRaw ? parse(endRaw) : dtStart;

    if (dtStart && dtEnd) {
      const diffTime = Math.abs(dtEnd.getTime() - dtStart.getTime());
      const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
      const daysStr = `(${diffDays} ${diffDays === 1 ? "day" : "days"})`;

      const startFmt = dtStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      const endFmt = dtEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      const yearStr = dtEnd.getFullYear();

      if (dtStart.getTime() === dtEnd.getTime()) {
        rentalText = `Rental: ${startFmt} ${yearStr} (1 day)`;
      } else {
        rentalText = `Rental: ${startFmt} – ${endFmt} ${yearStr} ${daysStr}`;
      }
    } else {
      rentalText = `Rental: ${startRaw}${endRaw && endRaw !== startRaw ? ` – ${endRaw}` : ""}`;
    }
  }

  return { bookedOnText, rentalText };
}

/**
 * Status badge styling supporting Light & Dark themes
 */
function getStatusBadge(status: string, isCancelled: boolean) {
  const norm = (status || "").toLowerCase().trim();
  if (
    isCancelled ||
    norm === "cancelled" ||
    norm === "canceled" ||
    norm === "rejected" ||
    norm === "declined" ||
    norm === "failed"
  ) {
    return {
      label: norm === "rejected" || norm === "declined" ? "Declined" : "Cancelled",
      classes: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    };
  }
  if (norm === "accepted" || norm === "confirmed") {
    return {
      label: "Confirmed",
      classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (norm === "completed" || norm === "rental_completed" || norm === "returned") {
    return {
      label: "Completed",
      classes: "bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-white/10",
    };
  }
  if (norm === "pending" || norm === "requested" || norm === "security_pending" || norm === "awaiting_confirmation") {
    return {
      label: norm === "security_pending" ? "Security Pending" : norm === "requested" ? "Requested" : "Pending",
      classes: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (norm === "ready_for_pickup" || norm === "ready") {
    return {
      label: "Ready for Pickup",
      classes: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };
  }
  if (norm === "rental_in_progress" || norm === "active") {
    return {
      label: "Ongoing",
      classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  return {
    label: norm.replace(/_/g, " "),
    classes: "bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/10",
  };
}

/**
 * Compact Lifecycle Progress Tracker
 */
function BookingProgressTracker({ status, isCancelled }: { status: string; isCancelled: boolean }) {
  const norm = String(status || "").toLowerCase();

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
        <Ban className="h-4 w-4 shrink-0" />
        <span>This booking was cancelled and equipment handover is permanently voided. All deposits and holds have been released.</span>
      </div>
    );
  }

  const steps = [
    { id: 1, label: "Booking Placed", description: "Escrow secured", done: true },
    {
      id: 2,
      label: "Lender Confirmed",
      description: "Gear reserved",
      done: !["requested", "pending", "payment_pending"].includes(norm),
      current: ["requested", "pending"].includes(norm),
    },
    {
      id: 3,
      label: "Handover Verified",
      description: "PIN at pickup",
      done: ["handover_completed", "active", "rental_in_progress", "return_initiated", "handed_back", "awaiting_inspection", "completed"].includes(norm),
      current: ["confirmed", "ready_for_pickup", "out_for_delivery"].includes(norm),
    },
    {
      id: 4,
      label: "Active Shoot",
      description: "Gear in use",
      done: ["return_initiated", "handed_back", "awaiting_inspection", "completed"].includes(norm),
      current: ["handover_completed", "active", "rental_in_progress"].includes(norm),
    },
    {
      id: 5,
      label: "Returned",
      description: "Deposit released",
      done: ["completed"].includes(norm),
      current: ["return_initiated", "handed_back", "awaiting_inspection"].includes(norm),
    },
  ];

  return (
    <div className="rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/60 dark:bg-white/[0.02] p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
        <span>Order Lifecycle Progress</span>
        <span className="text-xs font-normal text-neutral-600 dark:text-neutral-400">Real-time status</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-2.5 rounded-lg border text-left transition-colors ${
              step.done
                ? "bg-emerald-500/10 border-emerald-500/25"
                : step.current
                ? "bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                : "bg-white/70 dark:bg-white/5 border-neutral-200/60 dark:border-white/5 opacity-75 text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
                  step.done
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : step.current
                    ? "bg-white/20 dark:bg-black/20 text-inherit"
                    : "bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                0{step.id}
              </span>
              {step.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.75] text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : step.current ? (
                <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" aria-hidden="true"></span>
              ) : (
                <Clock className="h-3.5 w-3.5 stroke-[1.75] text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              )}
            </div>
            <div className={`text-xs font-semibold leading-tight ${step.done ? "text-neutral-900 dark:text-white" : step.current ? "text-inherit" : "text-neutral-700 dark:text-neutral-300"}`}>
              {step.label}
            </div>
            <div className={`text-[11px] mt-0.5 truncate ${step.current ? "text-white/80 dark:text-black/80" : "text-neutral-600 dark:text-neutral-400"}`}>
              {step.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  // Cancellation Modal & Flow State
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [cancellationExplanation, setCancellationExplanation] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);

  const cancellingOrder = useMemo(() => {
    if (!cancellingOrderId) return null;
    return (
      orders.find(
        (o) =>
          o.id === cancellingOrderId ||
          o.productId === cancellingOrderId ||
          (o as any).product_id === cancellingOrderId
      ) || null
    );
  }, [orders, cancellingOrderId]);

  const openCancellationModal = useCallback((orderId: string) => {
    setCancellingOrderId(orderId);
    setSelectedReason("");
    setCancellationExplanation("");
  }, []);

  const closeCancellationModal = useCallback(() => {
    if (isCancelling) return;
    setCancellingOrderId(null);
    setSelectedReason("");
    setCancellationExplanation("");
  }, [isCancelling]);
  const [revealedPins, setRevealedPins] = useState<Record<string, { pin: string; instructions?: string }>>({});
  const [loadingPinOrderId, setLoadingPinOrderId] = useState<string | null>(null);

  // Filter & Selected Booking View State
  const [activeFilter, setActiveFilter] = useState<BookingFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_high" | "amount_low">("newest");
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const isFetchingOrdersRef = useRef<boolean>(false);

  const toggleBookingDetails = useCallback((orderId: string | number) => {
    const idStr = String(orderId);
    setExpandedBookingId((prev) => (prev !== null && String(prev) === idStr ? null : idStr));
  }, []);

  const closeBookingDetails = useCallback(() => {
    setExpandedBookingId(null);
  }, []);

  // Location Edit Modal State
  const [locationModalOrder, setLocationModalOrder] = useState<Order | null>(null);
  const [editMethod, setEditMethod] = useState<"delivery" | "pickup" | "custom">("delivery");
  const [editAddress, setEditAddress] = useState("");
  const [editDirections, setEditDirections] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // Payment Receipt Modal & Status Checker State
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [receiptData, setReceiptData] = useState<{
    receipt_number?: string;
    order_id?: string;
    product_title?: string;
    transaction_id?: string;
    total_amount?: number;
    payment_status?: string;
    issued_at?: string;
    escrow_guarantee?: string;
  } | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const receiptReqSeqRef = useRef(0);

  const handleCloseReceipt = useCallback(() => {
    receiptReqSeqRef.current += 1;
    setShowReceiptModal(false);
    setReceiptLoading(false);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptOrder(null);
  }, []);

  const handleOpenReceipt = async (order: Order) => {
    const seq = ++receiptReqSeqRef.current;
    setReceiptOrder(order);
    setReceiptData(null);
    setReceiptError(null);
    setShowReceiptModal(true);

    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      setReceiptLoading(false);
      setReceiptError("Please sign in to view your official rental receipt.");
      return;
    }

    setReceiptLoading(true);
    try {
      const data = await api.getPaymentReceipt(token, order.id);
      if (receiptReqSeqRef.current !== seq) return;
      if (!data || typeof data !== "object") {
        setReceiptError("Official receipt data is unavailable for this booking.");
      } else {
        setReceiptData(data);
      }
    } catch (err: unknown) {
      if (receiptReqSeqRef.current !== seq) return;
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Unable to retrieve the official receipt for this booking.";
      setReceiptData(null);
      setReceiptError(msg);
    } finally {
      if (receiptReqSeqRef.current === seq) {
        setReceiptLoading(false);
      }
    }
  };

  const handleCheckOrderPaymentStatus = async (orderId: string) => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;

    toast.loading("Checking real-time payment status...", { id: "check-pay" });
    try {
      const res = await api.getPaymentStatus(token, orderId);
      toast.dismiss("check-pay");
      const st = String(res.payment_status || "").toLowerCase();
      if (st === "paid" || st === "successful") {
        toast.success("Payment verified. Booking is confirmed.");
        void loadOrders();
      } else if (st === "failed") {
        toast.error("Payment failed. Please retry payment.");
        void loadOrders();
      } else {
        toast.info("Payment is still pending gateway confirmation.");
      }
    } catch (err: any) {
      toast.dismiss("check-pay");
      toast.error(err?.message || "Failed to check payment status.");
    }
  };

  const navigate = useNavigate();

  const handleCopyAddress = (text: string) => {
    if (!text || text.trim() === "") {
      toast.error("No address available to copy.");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Location address copied to clipboard");
  };

  const handleOpenLocationModal = (order: Order) => {
    const method = (order.deliveryMethod || (order as any).delivery_method || "delivery").toLowerCase();
    const address =
      order.deliveryAddress ||
      (order as any).delivery_address ||
      (method === "pickup"
        ? order.pickupLocation || (order as any).pickup_location || ""
        : order.customLocation || (order as any).custom_location || "");
    const directions = order.locationDirections || (order as any).location_directions || "";

    setEditMethod(method === "pickup" ? "pickup" : method === "custom" ? "custom" : "delivery");
    setEditAddress(address);
    setEditDirections(directions);
    setEditReason("");
    setLocationModalOrder(order);
  };

  const handleSaveLocation = async () => {
    if (!locationModalOrder) return;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      toast.error("Please sign in to update your booking location.");
      return;
    }

    if (editMethod === "delivery" && !editAddress.trim()) {
      toast.error("Please enter a valid delivery address.");
      return;
    }

    const isAccepted = !["requested", "pending"].includes(String(locationModalOrder.status).toLowerCase());
    if (isAccepted && !editReason.trim()) {
      toast.error("Please provide a reason for the location change request.");
      return;
    }

    setIsSavingLocation(true);
    try {
      const payload: any = {
        deliveryMethod: editMethod,
        deliveryAddress: editMethod === "delivery" ? editAddress.trim() : "",
        pickupLocation: editMethod === "pickup" ? editAddress.trim() || "Lender Verified Hub" : "",
        customLocation: editMethod === "custom" ? editAddress.trim() : "",
        locationDirections: editDirections.trim(),
        reason: editReason.trim(),
      };

      const res = await api.updateOrderLocation(token, locationModalOrder.id, payload);
      toast.success(
        res.message ||
          (isAccepted
            ? "Location change request submitted for lender approval."
            : "Booking location updated.")
      );

      loadOrders();
      setLocationModalOrder(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update booking location.");
    } finally {
      setIsSavingLocation(false);
    }
  };

  const loadOrders = useCallback(() => {
    if (isFetchingOrdersRef.current) return;
    const rawLocal = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    const cleanLocal = stripLegacySampleOrders(rawLocal);
    if (cleanLocal.length !== rawLocal.length) {
      storage.set(STORAGE_KEYS.orders, cleanLocal);
    }

    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) {
      setErrorState(null);
      setOrders(cleanLocal);
      setLoading(false);
      return;
    }

    isFetchingOrdersRef.current = true;
    setErrorState(null);
    setRefreshError(null);
    api
      .getOrders(currentToken)
      .then((data) => {
        const backendOrders = Array.isArray(data) ? data : [];
        const backendOrderIds = new Set(backendOrders.map((o) => o.id));
        const missingLocal = cleanLocal.filter((o) => !backendOrderIds.has(o.id));
        const merged = [...backendOrders, ...missingLocal];
        setOrders(merged);
        setRefreshError(null);
        storage.set(STORAGE_KEYS.orders, merged);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Unable to load your bookings. Please try again.";
        setOrders(cleanLocal);
        if (cleanLocal.length === 0) {
          setErrorState(message);
        } else {
          setRefreshError(message);
        }
      })
      .finally(() => {
        isFetchingOrdersRef.current = false;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!showReceiptModal && !locationModalOrder && !(cancellingOrderId && cancellingOrder)) {
      return;
    }
    const handleModalEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (showReceiptModal) {
        handleCloseReceipt();
      } else if (locationModalOrder && !isSavingLocation) {
        setLocationModalOrder(null);
      } else if (cancellingOrderId && !isCancelling) {
        closeCancellationModal();
      }
    };
    window.addEventListener("keydown", handleModalEscape);
    return () => window.removeEventListener("keydown", handleModalEscape);
  }, [
    showReceiptModal,
    locationModalOrder,
    isSavingLocation,
    cancellingOrderId,
    cancellingOrder,
    isCancelling,
    handleCloseReceipt,
    closeCancellationModal,
  ]);

  useEffect(() => {
    const rawCached = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    const cachedOrders = stripLegacySampleOrders(rawCached);
    if (cachedOrders.length !== rawCached.length) {
      storage.set(STORAGE_KEYS.orders, cachedOrders);
    }
    if (cachedOrders.length > 0) {
      setOrders(cachedOrders);
      setLoading(false);
    }

    loadOrders();
    const handleUpdate = () => {
      api.invalidateCache("user_orders");
      loadOrders();
    };
    window.addEventListener("payent_orders_updated", handleUpdate);
    window.addEventListener("payent_queue_updated", handleUpdate);

    const pollTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadOrders();
      }
    }, 20000);

    return () => {
      window.removeEventListener("payent_orders_updated", handleUpdate);
      window.removeEventListener("payent_queue_updated", handleUpdate);
      clearInterval(pollTimer);
    };
  }, [loadOrders]);

  const handleRevealSecretPin = async (orderId: string) => {
    if (revealedPins[orderId]) {
      setRevealedPins((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      return;
    }

    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) {
      toast.error("Please log in to view your Secret PIN.");
      return;
    }

    setLoadingPinOrderId(orderId);
    try {
      const res = await api.getRenterSecretPin(currentToken, orderId);
      if (res && res.renterSecretPin) {
        setRevealedPins((prev) => ({
          ...prev,
          [orderId]: {
            pin: res.renterSecretPin,
            instructions: res.instructions,
          },
        }));
        toast.success("Renter Secret PIN revealed.");
      } else {
        toast.error("PIN is not available yet for this booking.");
      }
    } catch (err: unknown) {
      console.warn("PIN fetch notice:", err);
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to retrieve Renter Secret PIN.");
    } finally {
      setLoadingPinOrderId(null);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    if (isCancelling || !selectedReason) {
      if (!selectedReason) {
        toast.error("Please select a cancellation reason.");
      }
      return;
    }
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) {
      toast.error("Please sign in to cancel this booking.");
      return;
    }
    const cleanExplanation = cancellationExplanation.trim().slice(0, 500);
    const nowIso = new Date().toISOString();
    setIsCancelling(true);
    api
      .cancelOrder(currentToken, orderId, {
        reason: selectedReason,
        notes: cleanExplanation,
        explanation: cleanExplanation,
      })
      .then(() => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.productId === orderId || (o as any).product_id === orderId
              ? {
                  ...o,
                  status: "cancelled" as const,
                  cancelledAt: nowIso,
                  cancelled_at: nowIso,
                  cancellationReason: selectedReason,
                  cancellation_reason: selectedReason,
                  cancellationExplanation: cleanExplanation,
                  cancellation_explanation: cleanExplanation,
                }
              : o
          )
        );
        toast.success(`Booking #${orderId} has been cancelled successfully.`);
        window.dispatchEvent(
          new CustomEvent("payent_queue_updated", {
            detail: {
              bookingId: orderId,
              status: "cancelled",
              cancelled_at: nowIso,
              reason: selectedReason,
              explanation: cleanExplanation,
            },
          })
        );
        window.dispatchEvent(new CustomEvent("payent_orders_updated", { detail: { bookingId: orderId, status: "cancelled" } }));
        window.dispatchEvent(new CustomEvent("payent_booking_updated", { detail: { bookingId: orderId, status: "cancelled" } }));
        closeCancellationModal();
      })
      .catch((err) => {
        toast.error(err.message || "Failed to cancel order.");
      })
      .finally(() => {
        setIsCancelling(false);
      });
  };

  // Compute filter counts
  const filterCounts = useMemo(() => {
    let pending = 0;
    let ongoing = 0;
    let cancelled = 0;
    let completed = 0;

    for (const o of orders) {
      if (isCancelledBooking(o)) {
        cancelled++;
      } else if (isCompletedBooking(o)) {
        completed++;
      } else if (isPendingBooking(o)) {
        pending++;
      } else {
        ongoing++;
      }
    }

    return {
      all: orders.length,
      pending,
      ongoing,
      cancelled,
      completed,
    };
  }, [orders]);

  // Filter & sort bookings list
  const filteredOrders = useMemo(() => {
    const list = orders.filter((o) => {
      let matchesStatus = true;
      switch (activeFilter) {
        case "pending":
          matchesStatus = isPendingBooking(o);
          break;
        case "ongoing":
          matchesStatus = isOngoingBooking(o);
          break;
        case "cancelled":
          matchesStatus = isCancelledBooking(o);
          break;
        case "completed":
          matchesStatus = isCompletedBooking(o);
          break;
        case "all":
        default:
          matchesStatus = true;
      }
      if (!matchesStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = String(o.productTitle || (o as any).product_title || "").toLowerCase();
        const id = String(o.id || "").toLowerCase();
        return title.includes(q) || id.includes(q);
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "amount_high") {
        return Number(b.total || 0) - Number(a.total || 0);
      }
      if (sortBy === "amount_low") {
        return Number(a.total || 0) - Number(b.total || 0);
      }
      const timeA = new Date(a.createdAt || (a as any).created_at || a.startDate || 0).getTime();
      const timeB = new Date(b.createdAt || (b as any).created_at || b.startDate || 0).getTime();
      if (sortBy === "oldest") {
        return timeA - timeB;
      }
      return timeB - timeA;
    });
  }, [orders, activeFilter, searchQuery, sortBy]);

  const FILTER_TABS: { key: BookingFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: filterCounts.all },
    { key: "pending", label: "Pending", count: filterCounts.pending },
    { key: "ongoing", label: "Ongoing", count: filterCounts.ongoing },
    { key: "cancelled", label: "Cancelled", count: filterCounts.cancelled },
    { key: "completed", label: "Completed", count: filterCounts.completed },
  ];

  return (
    <DashboardLayout showSidebar={false}>
      <div className="w-full space-y-4 sm:space-y-5 text-neutral-900 dark:text-white">
        {/* Top Breadcrumb / Navigation & Escrow Guarantee Row */}
        <div className="flex flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/categories" })}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#1E1E1E] hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>100% Escrow Protected • Zero-Risk Guarantee</span>
          </div>
        </div>

        {/* Page Header Row (Compact & Streamlined) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-neutral-200/70 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <Package className="h-6 w-6 stroke-[1.75] text-neutral-800 dark:text-white shrink-0" />
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white font-display">
                My Rental Bookings
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300">
                {orders.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
              Manage your rentals, track deliveries and view booking history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: "/categories" })}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-white text-xs font-medium transition-colors shrink-0 w-fit cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
          >
            <Store className="h-3.5 w-3.5 stroke-[1.75]" />
            <span>Browse Marketplace</span>
          </button>
        </div>

        {/* Four Summary KPI Metric Cards (Compact Monochrome Surface + Crisp Active Ring) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Total Bookings */}
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`p-3 sm:p-3.5 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
              activeFilter === "all"
                ? "border-neutral-950 dark:border-white bg-neutral-100/80 dark:bg-white/[0.08] ring-1 ring-neutral-950 dark:ring-white/30"
                : "border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#1E1E1E] hover:border-neutral-300 dark:hover:border-white/20 shadow-xs"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200/70 dark:border-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
                <Package className="h-4 w-4 stroke-[1.75]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Total Bookings</div>
                <div className="text-xl sm:text-2xl font-semibold tabular-nums text-neutral-950 dark:text-white mt-0.5">{filterCounts.all}</div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">All-time rentals</div>
              </div>
            </div>
          </button>

          {/* Card 2: Active & Ongoing */}
          <button
            type="button"
            onClick={() => setActiveFilter("ongoing")}
            className={`p-3 sm:p-3.5 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
              activeFilter === "ongoing"
                ? "border-neutral-950 dark:border-white bg-neutral-100/80 dark:bg-white/[0.08] ring-1 ring-neutral-950 dark:ring-white/30"
                : "border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#1E1E1E] hover:border-neutral-300 dark:hover:border-white/20 shadow-xs"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200/70 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                <Calendar className="h-4 w-4 stroke-[1.75]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Active & Ongoing</span>
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-400" aria-hidden="true"></span>
                </div>
                <div className="text-xl sm:text-2xl font-semibold tabular-nums text-neutral-950 dark:text-white mt-0.5">{filterCounts.ongoing}</div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">Currently rented</div>
              </div>
            </div>
          </button>

          {/* Card 3: Pending Action */}
          <button
            type="button"
            onClick={() => setActiveFilter("pending")}
            className={`p-3 sm:p-3.5 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
              activeFilter === "pending"
                ? "border-neutral-950 dark:border-white bg-neutral-100/80 dark:bg-white/[0.08] ring-1 ring-neutral-950 dark:ring-white/30"
                : "border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#1E1E1E] hover:border-neutral-300 dark:hover:border-white/20 shadow-xs"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200/70 dark:border-white/10 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                <Clock className="h-4 w-4 stroke-[1.75]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Pending Action</span>
                  <span className="h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-400" aria-hidden="true"></span>
                </div>
                <div className="text-xl sm:text-2xl font-semibold tabular-nums text-neutral-950 dark:text-white mt-0.5">{filterCounts.pending}</div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">Awaiting response</div>
              </div>
            </div>
          </button>

          {/* Card 4: Past Bookings */}
          <button
            type="button"
            onClick={() => {
              if (activeFilter === "cancelled") {
                setActiveFilter(filterCounts.completed > 0 ? "completed" : "all");
              } else if (activeFilter === "completed") {
                setActiveFilter(filterCounts.cancelled > 0 ? "cancelled" : "all");
              } else {
                setActiveFilter(filterCounts.completed > 0 ? "completed" : filterCounts.cancelled > 0 ? "cancelled" : "completed");
              }
            }}
            className={`p-3 sm:p-3.5 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
              activeFilter === "cancelled" || activeFilter === "completed"
                ? "border-neutral-950 dark:border-white bg-neutral-100/80 dark:bg-white/[0.08] ring-1 ring-neutral-950 dark:ring-white/30"
                : "border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#1E1E1E] hover:border-neutral-300 dark:hover:border-white/20 shadow-xs"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200/70 dark:border-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
                <CheckCircle2 className="h-4 w-4 stroke-[1.75]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Past Bookings</div>
                <div className="text-xl sm:text-2xl font-semibold tabular-nums text-neutral-950 dark:text-white mt-0.5">
                  {filterCounts.completed + filterCounts.cancelled}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 truncate tabular-nums">
                  Cancelled • {filterCounts.cancelled} | Done • {filterCounts.completed}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Filter Tabs Bar, Search & Sort Toolbar (Compact) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-0.5">
          {/* Filter Tabs Bar */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-nowrap shrink-0 py-0.5">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
                    isActive
                      ? "border border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] tabular-nums ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-neutral-950/15 dark:text-neutral-950"
                        : "bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gear or order ID..."
                aria-label="Search gear or order ID"
                className="w-full pl-8 pr-7 py-1.5 rounded-full text-xs bg-white dark:bg-[#1E1E1E] border border-neutral-200/90 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-neutral-950 dark:focus:border-white shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-950 dark:hover:text-white p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative shrink-0">
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500 pointer-events-none" aria-hidden="true" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort bookings"
                className="appearance-none pl-7 pr-6 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#1E1E1E] border border-neutral-200/90 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer focus:outline-hidden focus:border-neutral-950 dark:focus:border-white shadow-xs"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Highest Price</option>
                <option value="amount_low">Lowest Price</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Payment History Navigation Button */}
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/payments", search: { q: "", status: "all" } })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#1E1E1E] border border-neutral-200/90 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer shadow-xs transition-colors shrink-0"
              title="View all payments & receipts"
            >
              <CreditCard className="h-3 w-3 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              <span>Payment History</span>
            </button>
          </div>
        </div>

        {/* Non-blocking sync warning if cached orders exist but refresh failed */}
        {refreshError && orders.length > 0 && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Showing locally cached orders. Live sync failed: {refreshError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                api.invalidateCache("user_orders");
                loadOrders();
              }}
              className="font-semibold underline hover:no-underline cursor-pointer"
            >
              Retry sync
            </button>
          </div>
        )}

        {/* Bookings Content */}
        {loading ? (
          <LoadingState type="list" count={4} />
        ) : error ? (
          <ErrorState
            title="Unable to load orders"
            error={error}
            onRetry={() => {
              api.invalidateCache("user_orders");
              loadOrders();
            }}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="You haven't booked any tech gear rentals yet. Explore the marketplace to find gear."
            icon={Package}
            actionLabel="Browse Marketplace"
            onAction={() => navigate({ to: "/categories" })}
          />
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6 sm:p-8 text-center space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-white/5 flex items-center justify-center mx-auto text-neutral-400">
              <Filter className="h-5 w-5 stroke-[1.75]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {searchQuery
                  ? `No bookings match "${searchQuery}"`
                  : activeFilter === "cancelled"
                  ? "No cancelled bookings found."
                  : activeFilter === "pending"
                  ? "No pending bookings found."
                  : activeFilter === "ongoing"
                  ? "No ongoing rentals found."
                  : activeFilter === "completed"
                  ? "No completed bookings found."
                  : "No bookings found."}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
                {searchQuery
                  ? "Try searching by a different product title, keyword, or order ID reference."
                  : activeFilter === "cancelled"
                  ? "You do not have any cancelled bookings in your history."
                  : `There are currently no bookings with status "${activeFilter}".`}
              </p>
            </div>
            {searchQuery ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold rounded-full border-neutral-300 dark:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/10"
              >
                Clear Search
              </Button>
            ) : (
              activeFilter !== "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  className="text-xs font-semibold rounded-full border-neutral-300 dark:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/10"
                >
                  View All Bookings ({orders.length})
                </Button>
              )
            )}
          </div>
        ) : (
          /* Bookings List Cards (Compact & Theme Adaptive) */
          <div className="space-y-2.5">
            {filteredOrders.map((o) => {
              const isCancelled = isCancelledBooking(o);
              const isCompleted = isCompletedBooking(o);
              const isPending = isPendingBooking(o);
              const badge = getStatusBadge(o.status, isCancelled);
              const orderDates = getOrderDates(o);
              const isCardExpanded = Boolean(
                expandedBookingId !== null && String(expandedBookingId) === String(o.id)
              );

              return (
                <div
                  key={o.id}
                  id={`booking-card-${o.id}`}
                  className="rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#1E1E1E] hover:border-neutral-300 dark:hover:border-white/20 transition-colors p-3.5 sm:p-4 text-left shadow-xs"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    {/* Left + Middle: Thumbnail + Info */}
                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                      {/* Compact Thumbnail */}
                      <div className="w-18 h-16 sm:w-20 sm:h-18 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/70 dark:border-white/10 shrink-0 flex items-center justify-center p-0.5">
                        {o.productImage || (o as any).product_image ? (
                          <img
                            src={getOptimizedImageUrl(o.productImage || (o as any).product_image, "thumb")}
                            alt={o.productTitle || "Product"}
                            loading="lazy"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-6 w-6 stroke-[1.75] text-neutral-400 dark:text-neutral-500 opacity-60" />
                        )}
                      </div>

                      {/* Middle Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-semibold text-sm sm:text-base text-neutral-950 dark:text-white font-display truncate">
                          {o.productTitle || (o as any).product_title || "Gear Rental"}
                        </h3>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                            #{o.id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(String(o.id));
                              toast.success(`Order #${o.id} copied to clipboard`);
                            }}
                            aria-label={`Copy Order #${o.id}`}
                            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer p-0.5"
                            title="Copy Order ID"
                          >
                            <Copy className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300">
                            {getOrderCategory(o)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-neutral-600 dark:text-neutral-400 pt-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-neutral-500 dark:text-neutral-400 shrink-0" aria-hidden="true" />
                            <span>Booked: {orderDates.bookedOnText}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-neutral-500 dark:text-neutral-400 shrink-0" aria-hidden="true" />
                            <span>{orderDates.rentalText}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Status badge, Rental total, View Details */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 sm:gap-2.5 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-white/5">
                      {/* Status Badges: Booking & Payment Status */}
                      <div className="flex flex-wrap items-center md:justify-end gap-1.5">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            <span>Cancelled</span>
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-white/90 border border-neutral-200 dark:border-white/20">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            <span>Completed</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>{badge.label}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600 dark:bg-emerald-400" aria-hidden="true"></span>
                            <span>{badge.label}</span>
                          </span>
                        )}

                        {/* Authoritative Payment Status Badge */}
                        {(() => {
                          const paySt = String(o.paymentStatus || (o as any).payment_status || "unpaid").toLowerCase();
                          const refSt = String((o as any).refundStatus || (o as any).refund_status || "").toLowerCase();

                          if (refSt === "refunded" || paySt === "refunded") {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                                <RotateCcw className="h-2.5 w-2.5" />
                                <span>Refunded</span>
                              </span>
                            );
                          }
                          if (refSt === "pending_review" || refSt === "refund_pending" || refSt === "processing") {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                                <Clock className="h-2.5 w-2.5" />
                                <span>Refund Processing</span>
                              </span>
                            );
                          }
                          if (paySt === "paid" || paySt === "successful") {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                <span>Paid • Escrow Secured</span>
                              </span>
                            );
                          }
                          if (paySt === "processing" || paySt === "pending") {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="h-2.5 w-2.5" />
                                <span>Payment Processing</span>
                              </span>
                            );
                          }
                          if (paySt === "failed") {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                <XCircle className="h-2.5 w-2.5" />
                                <span>Payment Failed</span>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              <Lock className="h-2.5 w-2.5" />
                              <span>Payment Required</span>
                            </span>
                          );
                        })()}
                      </div>

                      {/* Rental Total */}
                      <div className="text-right">
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Rental Total</div>
                        <div className="text-lg sm:text-xl font-semibold tabular-nums text-neutral-950 dark:text-white">
                          ₹{Number(o.total || 0).toLocaleString("en-IN")}
                        </div>
                      </div>

                      {/* View Details Button */}
                      <button
                        type="button"
                        onClick={() => toggleBookingDetails(o.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-neutral-200/90 dark:border-white/15 bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-white text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                      >
                        <span>{isCardExpanded ? "Close" : "View Details"}</span>
                        <ChevronRight
                          className={`h-3 w-3 stroke-[1.75] transition-transform duration-200 ${
                            isCardExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Accordion Expanded Details */}
                  {isCardExpanded && (
                    <div
                      id={`booking-details-${o.id}`}
                      className="space-y-4 pt-4 mt-3 border-t border-neutral-200/70 dark:border-white/10"
                    >
                      {/* Close Details Top Bar */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/70 dark:border-white/10">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                          Booking Details & Operations
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeBookingDetails();
                          }}
                          className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-semibold cursor-pointer transition-colors"
                        >
                          <X className="h-3 w-3 stroke-[1.75]" />
                          <span>Hide Details</span>
                        </button>
                      </div>

                      {/* Lifecycle Step Progress Tracker */}
                      <BookingProgressTracker status={o.status} isCancelled={isCancelled} />

                      {/* Cancelled Booking Banner (if cancelled) */}
                      {isCancelled && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                          <Ban className="h-4 w-4 stroke-[1.75] text-red-500 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-left text-xs">
                            <div className="font-semibold text-red-600 dark:text-red-400">
                              {(o as any).cancelled_by === "LENDER" || (o as any).cancelledBy === "LENDER"
                                ? "Booking Cancelled by Lender"
                                : "Booking Cancelled"}
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-[11px]">
                              {(o as any).cancelled_by === "LENDER" || (o as any).cancelledBy === "LENDER"
                                ? "The lender was unable to fulfill this rental request. Any payments or deposits have been released back to you."
                                : "This booking has been cancelled. Active milestone handovers and operations are permanently closed."}
                            </p>
                            {((o as any).cancellationReason || (o as any).cancellation_reason) && (
                              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                                Reason: {String((o as any).cancellationReason || (o as any).cancellation_reason).replace(/_/g, " ")}
                              </p>
                            )}
                            {((o as any).cancellationExplanation || (o as any).cancellation_explanation) && (
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                                Note: &ldquo;{(o as any).cancellationExplanation || (o as any).cancellation_explanation}&rdquo;
                              </p>
                            )}
                            {((o as any).refund_status || (o as any).refundStatus) && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold capitalize">
                                Refund Status: {String((o as any).refund_status || (o as any).refundStatus).replace(/_/g, " ").toLowerCase()}
                              </p>
                            )}
                            {((o as any).cancelledAt || (o as any).cancelled_at) && (
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono">
                                Cancelled on: {formatBookingDateTime((o as any).cancelledAt || (o as any).cancelled_at) || String((o as any).cancelledAt || (o as any).cancelled_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Full Booking Details Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Product & Schedule Card (Left 2 cols) */}
                        <div className="lg:col-span-2 rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] p-4 space-y-3.5 text-left">
                          <div className="flex items-center gap-2 pb-2 border-b border-neutral-200/60 dark:border-white/10">
                            <div className="h-6 w-6 rounded-md bg-neutral-100 dark:bg-white/5 border border-neutral-200/70 dark:border-white/10 grid place-items-center text-neutral-700 dark:text-neutral-200">
                              <Package className="h-3.5 w-3.5 stroke-[1.75]" />
                            </div>
                            <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                              Product & Rental Details
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start gap-3">
                            {o.productImage || (o as any).product_image ? (
                              <img
                                src={getOptimizedImageUrl(o.productImage || (o as any).product_image, "card")}
                                alt=""
                                loading="lazy"
                                className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl object-cover border border-neutral-200/80 dark:border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-neutral-400 shrink-0">
                                <Package className="h-6 w-6 stroke-[1.75] opacity-60" />
                              </div>
                            )}

                            <div className="space-y-1 min-w-0 flex-1">
                              <h2 className="text-base font-semibold text-neutral-900 dark:text-white leading-snug">
                                {o.productTitle || (o as any).product_title || "Gear Rental"}
                              </h2>
                              <div className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono">
                                Booking Reference #{o.id}
                              </div>

                              {o.category && (
                                <div className="pt-0.5">
                                  {!o.pickedUpAt &&
                                  !(o as any).picked_up_at &&
                                  !["cancelled", "rejected", "failed", "completed"].includes(o.status) ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                                      <Lock className="w-3 h-3 stroke-[1.75]" aria-hidden="true" />
                                      {o.category}: Awaiting Handover (Locked)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                      <CheckCircle className="w-3 h-3 stroke-[1.75]" aria-hidden="true" />
                                      {o.category}: Handover Complete (Unlocked)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Rental Details & Payment/Escrow Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-neutral-200/60 dark:border-white/10 text-xs">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/5 space-y-0.5">
                              <div className="text-neutral-600 dark:text-neutral-400 text-[11px] font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3 stroke-[1.75]" aria-hidden="true" />
                                <span>Booking Placed</span>
                              </div>
                              <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                                {orderDates.bookedOnText}
                              </div>
                              <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                                Asia/Kolkata official timestamp
                              </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/5 space-y-0.5">
                              <div className="text-neutral-600 dark:text-neutral-400 text-[11px] font-medium flex items-center gap-1">
                                <Calendar className="h-3 w-3 stroke-[1.75]" aria-hidden="true" />
                                <span>Rental Duration</span>
                              </div>
                              <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                                {orderDates.rentalText}
                              </div>
                              {((o as any).timeSlot || (o as any).time_slot) && (
                                <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-white capitalize">
                                  <Clock className="h-3 w-3 stroke-[1.75]" />
                                  {String((o as any).timeSlot || (o as any).time_slot).replace(/_/g, " ").toLowerCase()}
                                </div>
                              )}
                            </div>

                            <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/5 space-y-0.5">
                              <div className="text-neutral-600 dark:text-neutral-400 text-[11px] font-medium flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 stroke-[1.75] text-emerald-600 dark:text-emerald-400" />
                                <span>Total Payment</span>
                              </div>
                              <div className="text-base font-semibold tabular-nums text-neutral-900 dark:text-white">
                                ₹{Number(o.total || 0).toLocaleString("en-IN")}
                              </div>
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 stroke-[1.75]" />
                                <span>Escrow Secured</span>
                              </div>
                            </div>
                          </div>

                          {/* Location & Fulfillment Details */}
                          {(() => {
                            const method = (
                              o.deliveryMethod ||
                              (o as any).delivery_method ||
                              "delivery"
                            ).toLowerCase();
                            const address =
                              o.deliveryAddress ||
                              (o as any).delivery_address ||
                              (method === "pickup"
                                ? o.pickupLocation || (o as any).pickup_location || ""
                                : o.customLocation || (o as any).custom_location || "");
                            const directions =
                              o.locationDirections || (o as any).location_directions || "";
                            const mapUrl =
                              o.mapUrl ||
                              (o as any).map_url ||
                              (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");
                            const changeReq =
                              o.locationChangeRequest || (o as any).location_change_request;
                            const isChangePending = changeReq && (changeReq.status === "pending" || !changeReq.status);

                            return (
                              <div className="p-3 rounded-lg bg-white dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                      method === "delivery"
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                        : method === "pickup"
                                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                    }`}
                                  >
                                    {method === "delivery" ? <Truck className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                    <span>
                                      {method === "delivery"
                                        ? "Doorstep Delivery"
                                        : method === "pickup"
                                        ? "Owner Pickup"
                                        : "Custom Meetup"}
                                    </span>
                                  </span>

                                  <div className="flex items-center gap-2">
                                    {address && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyAddress(address);
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors"
                                        title="Copy location address"
                                      >
                                        <Copy className="h-3 w-3" />
                                        <span>Copy</span>
                                      </button>
                                    )}

                                    {mapUrl && (
                                      <a
                                        href={mapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        <span>Map</span>
                                      </a>
                                    )}

                                    {!isCancelled && o.status !== "completed" && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenLocationModal(o);
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-white font-medium cursor-pointer transition-colors"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                        <span>{isChangePending ? "View Request" : "Change"}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {address ? (
                                  <div className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-snug">
                                    <span className="font-semibold text-neutral-600 dark:text-neutral-400">Location: </span>
                                    <span>{address}</span>
                                    {directions && (
                                      <span className="text-[11px] text-neutral-600 dark:text-neutral-400 block mt-0.5">
                                        Directions: {directions}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-1 font-medium">
                                    <AlertTriangle className="h-3 w-3 stroke-[1.75] text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                                    <span>Location not provided</span>
                                  </p>
                                )}

                                {changeReq && (
                                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 stroke-[1.75] shrink-0 mt-0.5 text-amber-600" />
                                    <div>
                                      <span className="font-semibold">
                                        Change Request ({changeReq.status || "Pending"}):{" "}
                                      </span>
                                      <span>
                                        {changeReq.requestedMethod?.toUpperCase()} to{" "}
                                        {changeReq.requestedAddress || changeReq.requestedPickupLocation || changeReq.requestedCustomLocation}
                                      </span>
                                      {changeReq.reason && (
                                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                                          Reason: {changeReq.reason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Handover PIN & Quick Actions Column (Right 1 col) */}
                        <div className="space-y-3">
                          {/* Equipment Handover PIN Card */}
                          {!isCancelled && (
                            <div className="rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] p-3.5 space-y-3 text-left">
                              <div className="flex items-center gap-2 pb-2 border-b border-neutral-200/60 dark:border-white/10">
                                <div className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                                  <Lock className="h-3.5 w-3.5 stroke-[1.75]" />
                                </div>
                                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                                  Equipment Handover PIN
                                </span>
                              </div>

                              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                Present this secure OTP to the lender during equipment handover or return verification.
                              </p>

                              <div className="pt-0.5">
                                {revealedPins[o.id] ? (
                                  <SecretPinDisplay
                                    pin={revealedPins[o.id].pin}
                                    title="Handover Verification PIN"
                                    description={revealedPins[o.id].instructions}
                                    onHide={() => {
                                      void handleRevealSecretPin(o.id);
                                    }}
                                    compact={true}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRevealSecretPin(o.id);
                                    }}
                                    disabled={loadingPinOrderId === o.id}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 dark:border-white/20 bg-white dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-900 dark:text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                                  >
                                    <KeyRound className="h-3.5 w-3.5 stroke-[1.75] text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
                                    <span>{loadingPinOrderId === o.id ? "Retrieving PIN..." : "Reveal Secret PIN"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Quick Actions Card */}
                          <div className="rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] p-3.5 space-y-3 text-left">
                            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200/60 dark:border-white/10">
                              <div className="h-6 w-6 rounded-md bg-neutral-100 dark:bg-white/5 border border-neutral-200/70 dark:border-white/10 grid place-items-center text-neutral-700 dark:text-neutral-200">
                                <SlidersHorizontal className="h-3.5 w-3.5 stroke-[1.75]" />
                              </div>
                              <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                                Quick Actions
                              </span>
                            </div>

                            <div className="flex flex-col gap-2">
                              {/* Payment-specific Primary Actions */}
                              {(() => {
                                const paySt = String(o.paymentStatus || (o as any).payment_status || "unpaid").toLowerCase();
                                if (!isCancelled) {
                                  if (paySt === "unpaid") {
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate({ to: "/payment", search: { orderId: o.id } as any });
                                        }}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 font-semibold text-xs shadow-xs transition-colors cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                                      >
                                        <Lock className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                                        <span>Pay Now • ₹{Number(o.total || 0).toLocaleString("en-IN")}</span>
                                      </button>
                                    );
                                  }
                                  if (paySt === "failed") {
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate({ to: "/payment", search: { orderId: o.id } as any });
                                        }}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5 stroke-[1.75]" />
                                        <span>Retry Payment</span>
                                      </button>
                                    );
                                  }
                                  if (paySt === "processing" || paySt === "pending") {
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCheckOrderPaymentStatus(o.id);
                                        }}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 stroke-[1.75]" />
                                        <span>Check Payment Status</span>
                                      </button>
                                    );
                                  }
                                  if (paySt === "paid" || paySt === "successful") {
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenReceipt(o);
                                        }}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200/90 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                                      >
                                        <Receipt className="h-3.5 w-3.5 stroke-[1.75] text-neutral-500 dark:text-neutral-400" />
                                        <span>View Receipt</span>
                                      </button>
                                    );
                                  }
                                }
                                return null;
                              })()}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({ to: `/delivery/${o.id}` });
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs shadow-xs hover:opacity-90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                              >
                                <Truck className="h-3.5 w-3.5 stroke-[1.75]" />
                                <span>Track Delivery</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({ to: "/messages", search: { bookingId: o.id } as any });
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200/90 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
                              >
                                <MessageSquare className="h-3.5 w-3.5 stroke-[1.75] text-neutral-500 dark:text-neutral-400" />
                                <span>Chat with Lender</span>
                              </button>

                              {isEligibleForCancellation(o) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCancellationModal(o.id);
                                  }}
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <Ban className="h-3 w-3" />
                                  <span>Cancel Booking</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Rental Queue Container */}
                      <div className="w-full">
                        <LiveRentalQueue
                          key={`queue-order-${o.id}`}
                          orderId={o.id}
                          currentStatus={o.status}
                          role="renter"
                          startDate={o.startDate || (o as any).start_date}
                          endDate={o.endDate || (o as any).end_date}
                          timeSlot={(o as any).timeSlot || (o as any).time_slot}
                          createdAt={o.createdAt || (o as any).created_at}
                          requestDate={o.createdAt || (o as any).created_at}
                          confirmedAt={
                            o.confirmedAt ||
                            (o as any).confirmed_at ||
                            o.createdAt ||
                            (o as any).created_at
                          }
                          readyForPickupAt={
                            o.readyForPickupAt || (o as any).ready_for_pickup_at
                          }
                          pickedUpAt={o.pickedUpAt || (o as any).picked_up_at}
                          returnInitiatedAt={
                            o.returnInitiatedAt || (o as any).return_initiated_at
                          }
                          handedBackAt={o.handedBackAt || (o as any).handed_back_at}
                          awaitingInspectionAt={
                            o.awaitingInspectionAt || (o as any).awaiting_inspection_at
                          }
                          completedAt={o.completedAt || (o as any).completed_at}
                          cancelledAt={(o as any).cancelledAt || (o as any).cancelled_at}
                          cancellationReason={
                            (o as any).cancellationReason || (o as any).cancellation_reason
                          }
                          queueNotes={o.queueNotes || (o as any).queue_notes}
                          onStatusUpdated={(newStatus, updatedTimestamps) => {
                            setOrders((prev) =>
                              prev.map((item) =>
                                item.id === o.id
                                  ? {
                                      ...item,
                                      status: newStatus as any,
                                      ...updatedTimestamps,
                                    }
                                  : item
                              )
                            );
                          }}
                        />
                      </div>

                      {/* Bottom Close Details Button */}
                      <div className="pt-1.5 flex justify-end border-t border-neutral-200/70 dark:border-white/10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeBookingDetails();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200/90 dark:border-white/15 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          <span>Close Details</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Compact Dock Clearance Buffer */}
        <div className="h-16 sm:h-20 pointer-events-none" aria-hidden="true" />
      </div>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {cancellingOrderId && cancellingOrder && (
          <div key="cancel-modal" className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={closeCancellationModal}
              className="fixed inset-0 bg-black/60 dark:bg-[#050709]/85 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-modal-title"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="relative w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#1E1E1E] shadow-2xl z-10 text-left my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200/80 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 grid place-items-center">
                    <Ban className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="cancel-modal-title" className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-tight">
                      Cancel Rental Booking
                    </h3>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono mt-0.5">
                      Order #{cancellingOrder.id} • {cancellingOrder.productTitle || (cancellingOrder as any).product_title || "Rental Gear"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeCancellationModal}
                  disabled={isCancelling}
                  className="h-8 w-8 rounded-lg grid place-items-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close cancellation dialog"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Combined Body: Reason Selection & Review */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 sm:p-5 overflow-y-auto">
                {/* Left Column: Reasons Selection (7 cols) */}
                <div className="md:col-span-7 space-y-2.5">
                  <div className="space-y-0.5">
                    <p id="cancel-reasons-label" className="text-xs font-bold text-neutral-900 dark:text-white block">
                      Why do you want to cancel this booking?
                    </p>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      Select one primary reason below to proceed.
                    </p>
                  </div>

                  {/* Compact Radio Selection List */}
                  <div className="space-y-1.5" role="radiogroup" aria-labelledby="cancel-reasons-label">
                    {CANCELLATION_REASONS.map((reason, idx) => {
                      const isSelected = selectedReason === reason;
                      return (
                        <div
                          key={`reason-${idx}`}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => setSelectedReason(reason)}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              setSelectedReason(reason);
                            }
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
                            isSelected
                              ? "border-neutral-950 dark:border-white bg-neutral-100 dark:bg-white/10 text-neutral-950 dark:text-white shadow-xs font-semibold"
                              : "border-neutral-200/80 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-white/20 hover:bg-neutral-100/50 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <div
                            className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white"
                                : "border-neutral-400 dark:border-white/30 bg-transparent"
                            }`}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-neutral-950" />}
                          </div>
                          <span className="flex-1 leading-snug">{reason}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional Text Area for 'Other reason.' */}
                  {selectedReason === "Other reason." && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 pt-0.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <label htmlFor="cancel-explanation-input" className="font-semibold text-neutral-700 dark:text-neutral-300">
                          Additional explanation (optional):
                        </label>
                        <span
                          className={`tabular-nums text-[11px] ${
                            cancellationExplanation.length >= 480
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : "text-neutral-600 dark:text-neutral-400"
                          }`}
                        >
                          {cancellationExplanation.length}/500
                        </span>
                      </div>
                      <textarea
                        id="cancel-explanation-input"
                        rows={2}
                        maxLength={500}
                        value={cancellationExplanation}
                        onChange={(e) => setCancellationExplanation(e.target.value)}
                        placeholder="Help us understand your reason for cancellation..."
                        className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 dark:focus:ring-white/30 focus:border-neutral-950 dark:focus:border-white resize-none transition-colors"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Right Column: Review & Refund Terms (5 cols) */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-3">
                  {/* Booking Summary Box */}
                  <div className="rounded-xl border border-neutral-200/90 dark:border-white/10 bg-neutral-50/60 dark:bg-white/[0.02] p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      {cancellingOrder.productImage || (cancellingOrder as any).product_image ? (
                        <img
                          src={getOptimizedImageUrl(
                            cancellingOrder.productImage || (cancellingOrder as any).product_image,
                            "thumb"
                          )}
                          alt={
                            cancellingOrder.productTitle ||
                            (cancellingOrder as any).product_title ||
                            "Rental Gear"
                          }
                          className="w-11 h-11 rounded-lg object-cover bg-neutral-100 dark:bg-white/5 shrink-0 border border-neutral-200/80 dark:border-white/10"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-neutral-100 dark:bg-white/5 shrink-0 border border-neutral-200/80 dark:border-white/10 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                          <Package className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                          {cancellingOrder.productTitle || (cancellingOrder as any).product_title || "Rental Gear"}
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium truncate">
                          {cancellingOrder.startDate || (cancellingOrder as any).start_date || "—"} – {cancellingOrder.endDate || (cancellingOrder as any).end_date || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-200/70 dark:border-white/10 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                        <span>Cancellation Fee:</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">₹0 (Free)</span>
                      </div>
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-neutral-800 dark:text-neutral-200">Expected Refund:</span>
                        <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">
                          ₹{Number(cancellingOrder.total || 0).toLocaleString("en-IN")} (100%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Refund Policy and Escrow Guarantee Note */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-1.5 text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                      <span>100% Escrow Protected</span>
                    </div>
                    <p className="text-[11px]">
                      The full rental total will be refunded to your original payment method in 3–5 business days. Holds on this gear will be released back to the lender.
                    </p>
                  </div>

                  {/* Selected Reason Status Box */}
                  <div className="rounded-xl border border-neutral-200/70 dark:border-white/10 p-2.5 bg-neutral-50/50 dark:bg-white/[0.02]">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold block mb-1">
                      Selected Reason
                    </span>
                    {selectedReason ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold">
                        <CheckCircle2 className="h-3 w-3 shrink-0 stroke-[1.75]" aria-hidden="true" />
                        <span className="truncate">{selectedReason}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        Please choose a reason on the left to proceed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Action Bar */}
              <div className="px-5 py-3 border-t border-neutral-200/80 dark:border-white/10 flex items-center justify-between gap-3 bg-neutral-50/60 dark:bg-white/[0.02] shrink-0">
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  {!selectedReason ? (
                    <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>Select a reason to confirm</span>
                    </span>
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>Ready to confirm cancellation</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCancelling}
                    onClick={closeCancellationModal}
                    className="text-xs px-3 py-1.5 h-auto text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/10 inline-flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>Keep My Booking</span>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={!selectedReason || isCancelling}
                    onClick={() => {
                      if (cancellingOrderId) {
                        handleCancelOrder(cancellingOrderId);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-1.5 h-auto shadow-xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                  >
                    <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{isCancelling ? "Processing..." : "Confirm Cancellation"}</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Location Edit / Change-Request Modal */}
        {locationModalOrder && (
          <div key="location-modal" className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setLocationModalOrder(null)}
              className="fixed inset-0 bg-black/60 dark:bg-[#050709]/85 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="location-modal-title"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1E1E1E] p-5 sm:p-6 shadow-2xl z-10 space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-neutral-200/70 dark:border-white/10 pb-2.5">
                <div>
                  <h3 id="location-modal-title" className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
                    <span>
                      {!["requested", "pending"].includes(String(locationModalOrder.status).toLowerCase())
                        ? "Request Location Change"
                        : "Update Booking Location"}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                    Order #{locationModalOrder.id} • {locationModalOrder.productTitle || "Gear Rental"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocationModalOrder(null)}
                  aria-label="Close location modal"
                  className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-3">
                <div>
                  <span id="fulfillment-method-label" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Fulfillment Method
                  </span>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="fulfillment-method-label">
                    <button
                      type="button"
                      aria-pressed={editMethod === "delivery"}
                      onClick={() => setEditMethod("delivery")}
                      className={`p-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
                        editMethod === "delivery"
                          ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                          : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:text-white"
                      }`}
                    >
                      Delivery
                    </button>
                    <button
                      type="button"
                      aria-pressed={editMethod === "pickup"}
                      onClick={() => setEditMethod("pickup")}
                      className={`p-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
                        editMethod === "pickup"
                          ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                          : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:text-white"
                      }`}
                    >
                      Pickup
                    </button>
                    <button
                      type="button"
                      aria-pressed={editMethod === "custom"}
                      onClick={() => setEditMethod("custom")}
                      className={`p-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white ${
                        editMethod === "custom"
                          ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950"
                          : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:text-white"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="order-location-address" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    {editMethod === "delivery" ? "Delivery Address" : editMethod === "pickup" ? "Pickup Hub" : "Custom Meetup Address"}
                  </label>
                  <input
                    id="order-location-address"
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Enter complete street address..."
                    className="w-full px-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-neutral-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label htmlFor="order-location-directions" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Directions or Notes (Optional)
                  </label>
                  <input
                    id="order-location-directions"
                    type="text"
                    value={editDirections}
                    onChange={(e) => setEditDirections(e.target.value)}
                    placeholder="Nearby landmark, gate code..."
                    className="w-full px-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-neutral-950 dark:focus:border-white"
                  />
                </div>

                {!["requested", "pending"].includes(String(locationModalOrder.status).toLowerCase()) && (
                  <div>
                    <label htmlFor="order-location-reason" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Reason for Location Change Request *
                    </label>
                    <input
                      id="order-location-reason"
                      type="text"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="e.g., Shoot relocated to new studio location"
                      className="w-full px-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-neutral-950 dark:focus:border-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-neutral-200/70 dark:border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocationModalOrder(null)}
                  disabled={isSavingLocation}
                  className="text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Cancel</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveLocation}
                  disabled={isSavingLocation}
                  className="bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 text-xs font-bold px-3.5 py-1.5 inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{isSavingLocation ? "Saving..." : "Update Location"}</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceiptModal && (
          <div key="receipt-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="receipt-modal-title"
              className="w-full max-w-md p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 stroke-[1.75] text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
                  <h3 id="receipt-modal-title" className="text-base font-semibold text-neutral-900 dark:text-white">
                    Official Rental Receipt
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseReceipt}
                  aria-label="Close receipt modal"
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                </button>
              </div>

              {receiptLoading ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-700 dark:text-neutral-300" />
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Retrieving official receipt...</p>
                </div>
              ) : receiptError || !receiptData ? (
                <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3 text-center">
                  <AlertTriangle className="h-6 w-6 stroke-[1.75] text-red-600 dark:text-red-400 mx-auto" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Receipt unavailable
                    </p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300">
                      {receiptError || "Official receipt data could not be loaded for this booking."}
                    </p>
                  </div>
                  {receiptOrder && (
                    <button
                      type="button"
                      onClick={() => handleOpenReceipt(receiptOrder)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <RefreshCw className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Receipt No:</span>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {receiptData.receipt_number || "Pending"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Order Reference:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      #{receiptData.order_id || receiptOrder?.id}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Transaction ID:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                      {receiptData.transaction_id || receiptOrder?.razorpayPaymentId || "Pending"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Item:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                      {receiptData.product_title || receiptOrder?.productTitle || (receiptOrder as any)?.product_title}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Payment Status:</span>
                    <span
                      className={cn(
                        "font-semibold capitalize",
                        String(receiptData.payment_status || "").toLowerCase() === "paid" ||
                          String(receiptData.payment_status || "").toLowerCase() === "successful"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {String(receiptData.payment_status || receiptOrder?.paymentStatus || "Unknown").toLowerCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <span className="font-semibold text-neutral-900 dark:text-white">Amount:</span>
                    <span className="font-semibold tabular-nums text-base text-neutral-900 dark:text-white">
                      ₹{Number(receiptData.total_amount ?? receiptOrder?.total ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={receiptLoading || Boolean(receiptError) || !receiptData}
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Print / Save Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseReceipt}
                  className="py-2 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
