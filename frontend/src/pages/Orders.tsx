import { useEffect, useState, useCallback, useMemo } from "react";
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
  Navigation,
  X,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Ban,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Filter,
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

export type BookingFilter = "all" | "pending" | "ongoing" | "cancelled" | "completed";

const INITIAL_SAMPLE_ORDER: Order = {
  id: "ord-fx3-cinema-782",
  productId: "prod-sony-fx3",
  productTitle: "Sony FX3 Cinema Camera Kit",
  productImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
  startDate: "2026-10-26",
  endDate: "2026-10-29",
  total: 10500,
  status: "confirmed" as any,
  confirmedAt: "2026-10-26T10:15:00.000Z",
  createdAt: "2026-10-26T10:15:00.000Z",
  created_at: "2026-10-26T10:15:00.000Z",
  deliveryMethod: "delivery",
  deliveryAddress: "Flat 402, Green Glen Layout, Bellandur, Bengaluru, Karnataka 560103",
  locationDirections: "Near Central Mall, gate buzzer #402",
  latitude: 12.926,
  longitude: 77.6762,
  mapUrl: "https://www.google.com/maps/search/?api=1&query=12.926,77.6762",
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
  // All active, confirmed, in-preparation, ready for pickup, or in-transit milestones
  return true;
};

/**
 * Human-readable status badge helper
 */
function getStatusBadge(status: string, isCancelled: boolean) {
  const norm = (status || "").toLowerCase().trim();
  if (isCancelled || norm === "cancelled" || norm === "canceled" || norm === "rejected" || norm === "failed") {
    return {
      label: norm === "rejected" ? "Rejected" : "Cancelled",
      classes: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    };
  }
  if (norm === "completed" || norm === "rental_completed" || norm === "returned") {
    return {
      label: "Completed",
      classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (norm === "pending" || norm === "requested" || norm === "security_pending" || norm === "awaiting_confirmation") {
    return {
      label: norm === "security_pending" ? "Security Pending" : norm === "requested" ? "Requested" : "Pending",
      classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (norm === "ready_for_pickup" || norm === "ready") {
    return {
      label: "Ready for Pickup",
      classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }
  if (norm === "picked_up") {
    return {
      label: "Picked Up",
      classes: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    };
  }
  if (norm === "rental_in_progress" || norm === "active") {
    return {
      label: "Active Rental",
      classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (norm === "return_initiated") {
    return {
      label: "Return Initiated",
      classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (norm === "handed_back" || norm === "item_handed_back") {
    return {
      label: "Handed Back",
      classes: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    };
  }
  if (norm === "awaiting_inspection" || norm === "inspection") {
    return {
      label: "Awaiting Inspection",
      classes: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    };
  }
  return {
    label: norm.replace(/_/g, " "),
    classes: "bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-[#A1A1AA] border-neutral-200 dark:border-white/10",
  };
}

/**
 * Format clean booking date for compact row/card
 */
function formatBookingDate(order: Order): string {
  const created = order.createdAt || (order as any).created_at;
  const formatted = formatBookingDateTime(created);
  if (formatted) {
    return formatted;
  }
  const start = order.startDate || order.start_date;
  const end = order.endDate || order.end_date;
  if (start) {
    if (end && end !== start) {
      return `${start} – ${end}`;
    }
    return start;
  }
  return "Recent";
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, { pin: string; instructions?: string }>>({});
  const [loadingPinOrderId, setLoadingPinOrderId] = useState<string | null>(null);

  // Filter & Selected Booking View State (Expanded Booking Card in History)
  const [activeFilter, setActiveFilter] = useState<BookingFilter>("all");
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const toggleBookingDetails = useCallback((orderId: string | number) => {
    const idStr = String(orderId);
    setExpandedBookingId((prev) => (prev !== null && String(prev) === idStr ? null : idStr));
  }, []);

  const closeBookingDetails = useCallback(() => {
    setExpandedBookingId(null);
  }, []);

  // Location Edit / Change-Request Modal State
  const [locationModalOrder, setLocationModalOrder] = useState<Order | null>(null);
  const [editMethod, setEditMethod] = useState<"delivery" | "pickup" | "custom">("delivery");
  const [editAddress, setEditAddress] = useState("");
  const [editDirections, setEditDirections] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  const navigate = useNavigate();

  const handleCopyAddress = (text: string) => {
    if (!text || text.trim() === "") {
      toast.error("No address available to copy.");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Location address copied to clipboard!");
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
            : "Booking location updated successfully!")
      );

      // Refresh orders
      loadOrders();
      setLocationModalOrder(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update booking location.");
    } finally {
      setIsSavingLocation(false);
    }
  };

  const loadOrders = useCallback(() => {
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) {
      const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, [INITIAL_SAMPLE_ORDER]);
      setOrders(localOrders.length > 0 ? localOrders : [INITIAL_SAMPLE_ORDER]);
      setLoading(false);
      return;
    }
    setErrorState(null);
    api
      .getOrders(currentToken)
      .then((data) => {
        const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, [INITIAL_SAMPLE_ORDER]);
        const backendOrderIds = new Set(data.map((o) => o.id));
        const missingLocal = localOrders.filter((o) => !backendOrderIds.has(o.id));
        setOrders([...data, ...missingLocal]);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, [INITIAL_SAMPLE_ORDER]);
        setOrders(localOrders.length > 0 ? localOrders : [INITIAL_SAMPLE_ORDER]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const cachedOrders = storage.get<Order[]>(STORAGE_KEYS.orders, [INITIAL_SAMPLE_ORDER]);
    if (cachedOrders.length > 0) {
      setOrders(cachedOrders);
      setLoading(false);
    } else {
      setOrders([INITIAL_SAMPLE_ORDER]);
      storage.set(STORAGE_KEYS.orders, [INITIAL_SAMPLE_ORDER]);
      setLoading(false);
    }

    loadOrders();
    const handleUpdate = () => {
      api.invalidateCache("user_orders");
      loadOrders();
    };
    window.addEventListener("payent_orders_updated", handleUpdate);
    window.addEventListener("payent_queue_updated", handleUpdate);

    // Periodic live sync for active rentals across renter/lender tabs
    const pollTimer = setInterval(() => {
      loadOrders();
    }, 6000);

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
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) return;
    const nowIso = new Date().toISOString();
    api
      .cancelOrder(currentToken, orderId)
      .then(() => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.productId === orderId || (o as any).product_id === orderId
              ? {
                  ...o,
                  status: "cancelled" as const,
                  cancelledAt: nowIso,
                  cancelled_at: nowIso,
                }
              : o
          )
        );
        toast.success("Order cancelled successfully.");
        // Notify any active queue components or listeners
        window.dispatchEvent(
          new CustomEvent("payent_queue_updated", {
            detail: { bookingId: orderId, status: "cancelled", cancelled_at: nowIso },
          })
        );
      })
      .catch((err) => {
        toast.error(err.message || "Failed to cancel order.");
      })
      .finally(() => setCancellingOrderId(null));
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

  // Filter bookings list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      switch (activeFilter) {
        case "pending":
          return isPendingBooking(o);
        case "ongoing":
          return isOngoingBooking(o);
        case "cancelled":
          return isCancelledBooking(o);
        case "completed":
          return isCompletedBooking(o);
        case "all":
        default:
          return true;
      }
    });
  }, [orders, activeFilter]);



  const FILTER_TABS: { key: BookingFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: filterCounts.all },
    { key: "pending", label: "Pending", count: filterCounts.pending },
    { key: "ongoing", label: "Ongoing", count: filterCounts.ongoing },
    { key: "cancelled", label: "Cancelled", count: filterCounts.cancelled },
    { key: "completed", label: "Completed", count: filterCounts.completed },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-display flex items-center gap-2.5 text-[#F5F5F5] tracking-tight">
              <Package className="h-7 w-7 text-[#A1A1AA]" />
              <span>Booking History</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#A1A1AA]">
              View, track, and manage all your gear rentals and handover PIN credentials in one place.
            </p>
          </div>

          {/* Quick Return to Marketplace */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/categories" })}
            className="w-fit text-xs font-semibold rounded-xl"
          >
            Browse Marketplace
          </Button>
        </div>

        {/* Filter Tabs Bar (Always visible at top of history) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-neutral-100 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 w-fit">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] shadow-xs"
                    : "text-neutral-600 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? "bg-white/20 dark:bg-black/15 text-inherit"
                      : "bg-black/5 dark:bg-white/10 text-neutral-500 dark:text-[#A1A1AA]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bookings Content */}
        {loading ? (
          <LoadingState type="list" count={4} />
        ) : error ? (
          <ErrorState title="Unable to load orders" error={error} onRetry={loadOrders} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="You haven't booked any tech gear rentals yet. Explore the marketplace to find gear!"
            icon={Package}
            actionLabel="Browse Marketplace"
            onAction={() => navigate({ to: "/categories" })}
          />
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] p-8 sm:p-12 text-center space-y-4 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-white/5 flex items-center justify-center mx-auto text-neutral-400">
              <Filter className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-950 dark:text-[#F5F5F5]">
                {activeFilter === "cancelled"
                  ? "No cancelled bookings found."
                  : activeFilter === "pending"
                  ? "No pending bookings found."
                  : activeFilter === "ongoing"
                  ? "No ongoing rentals found."
                  : activeFilter === "completed"
                  ? "No completed bookings found."
                  : "No bookings found."}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-[#A1A1AA] max-w-sm mx-auto">
                {activeFilter === "cancelled"
                  ? "You do not have any cancelled bookings in your history."
                  : `There are currently no bookings with status "${activeFilter}".`}
              </p>
            </div>
            {activeFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveFilter("all")}
                className="text-xs font-semibold rounded-xl"
              >
                View All Bookings ({orders.length})
              </Button>
            )}
          </div>
        ) : (
          /* Bookings List Cards (Independent inline expansion per booking) */
          <div className="space-y-4">
            {filteredOrders.map((o) => {
              const isCancelled = isCancelledBooking(o);
              const badge = getStatusBadge(o.status, isCancelled);
              const bookingDate = formatBookingDate(o);
              const isCardExpanded = Boolean(expandedBookingId !== null && String(expandedBookingId) === String(o.id));

              return (
                <div
                  key={o.id}
                  id={`booking-card-${o.id}`}
                  className={`rounded-3xl border transition-all ${
                    isCardExpanded
                      ? "border-black/20 dark:border-[#A1A1AA]/35 bg-white dark:bg-[#10151B] p-5 sm:p-7 space-y-6 shadow-sm"
                      : "border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] p-4 sm:p-4.5 shadow-xs hover:border-black/20 dark:hover:border-[#A1A1AA]/30"
                  }`}
                >
                  {/* 1. COMPACT ROW / CARD (Always visible) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Product Image + Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {o.productImage || (o as any).product_image ? (
                        <img
                          src={getOptimizedImageUrl(o.productImage || (o as any).product_image, "thumb")}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl object-cover border border-black/10 dark:border-[#A1A1AA]/20 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl border border-black/10 dark:border-[#A1A1AA]/20 bg-secondary/30 flex items-center justify-center text-muted-foreground/50 shrink-0">
                          <Package className="h-5 w-5 sm:h-6 sm:w-6 opacity-60" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <h3 className="font-bold text-sm sm:text-base text-neutral-950 dark:text-[#F5F5F5] font-display truncate">
                          {o.productTitle || (o as any).product_title || "Gear Rental"}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#A1A1AA] flex-wrap">
                          <span className="font-mono">#{o.id}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-neutral-400 dark:text-neutral-500 shrink-0" />
                            <span>
                              {formatBookingDateTime(o.createdAt || (o as any).created_at) ? (
                                <span title={`Booked On: ${formatBookingDateTime(o.createdAt || (o as any).created_at)}`}>
                                  Booked On: {formatBookingDateTime(o.createdAt || (o as any).created_at)}
                                </span>
                              ) : (
                                bookingDate
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Current Booking Status + View Details / Close Details Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.classes}`}
                      >
                        {badge.label}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleBookingDetails(o.id);
                        }}
                        aria-expanded={isCardExpanded}
                        aria-controls={`booking-details-${o.id}`}
                        aria-label={isCardExpanded ? `Close details for booking ${o.id}` : `View details for booking ${o.id}`}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isCardExpanded
                            ? "bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] border-transparent shadow-xs"
                            : "border-black/10 dark:border-[#A1A1AA]/30 bg-neutral-900/5 dark:bg-white/5 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-[#050709] text-neutral-900 dark:text-[#F5F5F5]"
                        }`}
                      >
                        <span>{isCardExpanded ? "Close Details" : "View Details"}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${isCardExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 2. FULL DETAILS CONTAINER (ONLY rendered when isCardExpanded is true!) */}
                  {isCardExpanded && (
                    <div
                      id={`booking-details-${o.id}`}
                      className="space-y-6 pt-5 border-t border-black/5 dark:border-white/5"
                    >
                      {/* Close Details Top Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                        <span className="text-xs font-bold text-neutral-500 dark:text-[#A1A1AA] uppercase tracking-wider">
                          Booking Details & Operations
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            closeBookingDetails();
                          }}
                          className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-white font-semibold cursor-pointer transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Hide Details</span>
                        </button>
                      </div>

                      {/* Cancelled Booking Banner (if cancelled) */}
                      {isCancelled && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3.5">
                          <Ban className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-bold text-sm text-red-600 dark:text-red-400">
                              Booking Cancelled
                            </div>
                            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                              This booking has been cancelled. Active milestone buttons, handover actions, and Live Rental Queue operations are permanently disabled.
                            </p>
                            {((o as any).cancellationReason || (o as any).cancellation_reason) && (
                              <p className="text-xs text-red-600 dark:text-red-400 font-medium pt-0.5">
                                Reason: {String((o as any).cancellationReason || (o as any).cancellation_reason).replace(/_/g, " ")}
                              </p>
                            )}
                            {((o as any).cancelledAt || (o as any).cancelled_at) && (
                              <p className="text-[11px] text-neutral-500 dark:text-[#A1A1AA] font-mono pt-0.5">
                                Cancelled on: {formatBookingDateTime((o as any).cancelledAt || (o as any).cancelled_at) || String((o as any).cancelledAt || (o as any).cancelled_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Full Booking Details Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Product & Schedule Card (Left 2 cols) */}
                        <div className="lg:col-span-2 rounded-3xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] p-5 sm:p-6 space-y-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            {o.productImage || (o as any).product_image ? (
                              <img
                                src={getOptimizedImageUrl(o.productImage || (o as any).product_image, "card")}
                                alt=""
                                loading="lazy"
                                className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-black/10 dark:border-[#A1A1AA]/20 shrink-0"
                              />
                            ) : (
                              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-black/10 dark:border-[#A1A1AA]/20 bg-secondary/30 flex items-center justify-center text-muted-foreground/50 shrink-0">
                                <Package className="h-8 w-8 opacity-60" />
                              </div>
                            )}

                            <div className="space-y-1.5 min-w-0 flex-1">
                              <h2 className="text-lg sm:text-xl font-bold text-neutral-950 dark:text-[#F5F5F5] leading-snug">
                                {o.productTitle || (o as any).product_title || "Gear Rental"}
                              </h2>
                              <div className="text-xs text-neutral-500 dark:text-[#A1A1AA] font-mono">
                                Booking Reference #{o.id}
                              </div>

                              {/* Category Lock Status */}
                              {o.category && (
                                <div className="pt-1">
                                  {!o.pickedUpAt &&
                                  !(o as any).picked_up_at &&
                                  !["cancelled", "rejected", "failed", "completed"].includes(o.status) ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                      <Lock className="w-3 h-3" />
                                      {o.category}: Awaiting Handover (Locked)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                      <CheckCircle className="w-3 h-3" />
                                      {o.category}: Delivery Confirmed (Unlocked)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Rental Details & Payment/Escrow Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-black/5 dark:border-white/5 text-xs">
                            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
                              <div className="text-neutral-500 dark:text-[#A1A1AA] font-medium flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>Booking Placed</span>
                              </div>
                              <div className="text-sm font-bold text-neutral-950 dark:text-[#F5F5F5]">
                                {formatBookingDateTime(o.createdAt || (o as any).created_at)
                                  ? `Booked On: ${formatBookingDateTime(o.createdAt || (o as any).created_at)}`
                                  : "Booked On: Confirmed"}
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-[#A1A1AA]">
                                Official timestamp in Asia/Kolkata
                              </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
                              <div className="text-neutral-500 dark:text-[#A1A1AA] font-medium flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Rental Duration</span>
                              </div>
                              <div className="text-sm font-bold text-neutral-950 dark:text-[#F5F5F5]">
                                {o.startDate || (o as any).start_date || "Today"}
                                {o.endDate && o.endDate !== o.startDate
                                  ? ` – ${o.endDate}`
                                  : ""}
                              </div>
                              {((o as any).timeSlot || (o as any).time_slot) && (
                                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary uppercase">
                                  <Clock className="h-3 w-3" />
                                  {String((o as any).timeSlot || (o as any).time_slot).replace(/_/g, " ")}
                                </div>
                              )}
                            </div>

                            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
                              <div className="text-neutral-500 dark:text-[#A1A1AA] font-medium flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Total Payment & Escrow</span>
                              </div>
                              <div className="text-lg font-black font-mono text-neutral-950 dark:text-[#F5F5F5]">
                                ₹{o.total}
                              </div>
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Escrow Secured Deposit</span>
                              </div>
                            </div>
                          </div>

                          {/* Booking Location & Fulfillment Details */}
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
                                ? o.pickupLocation || (o as any).pickup_location || "Lender Verified Hub"
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
                              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                      method === "delivery"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        : method === "pickup"
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
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
                                        className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-white cursor-pointer transition-colors"
                                        title="Copy location address"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Copy</span>
                                      </button>
                                    )}

                                    {mapUrl && (
                                      <a
                                        href={mapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        <span>Map</span>
                                      </a>
                                    )}

                                    {!isCancelled &&
                                      o.status !== "completed" && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenLocationModal(o);
                                          }}
                                          className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-primary font-medium cursor-pointer transition-colors"
                                        >
                                          <Edit3 className="h-3.5 w-3.5" />
                                          <span>{isChangePending ? "View Change Request" : "Change Location"}</span>
                                        </button>
                                      )}
                                  </div>
                                </div>

                                {address ? (
                                  <div className="text-xs text-neutral-700 dark:text-neutral-300 leading-snug">
                                    <span className="font-semibold text-neutral-500 dark:text-[#A1A1AA]">Location: </span>
                                    <span>{address}</span>
                                    {directions && (
                                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 italic block mt-1">
                                        Directions: {directions}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-500 dark:text-[#A1A1AA]">
                                    No address provided for this fulfillment method.
                                  </p>
                                )}

                                {changeReq && (
                                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold">
                                        Location Change Request ({changeReq.status || "Pending"}):{" "}
                                      </span>
                                      <span>
                                        {changeReq.requestedMethod?.toUpperCase()} to{" "}
                                        {changeReq.requestedAddress || changeReq.requestedPickupLocation || changeReq.requestedCustomLocation}
                                      </span>
                                      {changeReq.reason && (
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-0.5">
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
                        <div className="space-y-6">
                          {/* Equipment Handover PIN Card */}
                          {!isCancelled && (
                            <div className="rounded-3xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] p-5 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-neutral-950 dark:text-[#F5F5F5] flex items-center gap-1.5">
                                  <Lock className="h-4 w-4 text-emerald-500" />
                                  <span>Equipment Handover PIN</span>
                                </h3>
                              </div>

                              <p className="text-xs text-neutral-500 dark:text-[#A1A1AA]">
                                Present this secure OTP to the lender during equipment handover or return.
                              </p>

                              <div className="pt-1">
                                {revealedPins[o.id] ? (
                                  <SecretPinDisplay
                                    pin={revealedPins[o.id].pin}
                                    title="Handover Verification PIN"
                                    description={revealedPins[o.id].instructions}
                                    onHide={() => {
                                      void handleRevealSecretPin(o.id);
                                    }}
                                    compact={false}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRevealSecretPin(o.id);
                                    }}
                                    disabled={loadingPinOrderId === o.id}
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-black/10 dark:border-[#A1A1AA]/30 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-800 dark:text-[#F5F5F5] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    <KeyRound className="h-3.5 w-3.5 text-[#A1A1AA]" />
                                    <span>{loadingPinOrderId === o.id ? "Retrieving PIN..." : "Reveal Secret PIN"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Quick Actions Card */}
                          <div className="rounded-3xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] p-5 space-y-3 shadow-xs">
                            <h3 className="font-bold text-sm text-neutral-950 dark:text-[#F5F5F5]">Quick Actions</h3>

                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({ to: `/delivery/${o.id}` });
                                }}
                                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-900 dark:bg-[#F5F5F5] text-white dark:text-[#050709] font-bold text-xs shadow-xs hover:opacity-95 dark:hover:bg-white transition-all cursor-pointer"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                <span>Track Delivery</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({ to: "/messages", search: { bookingId: o.id } as any });
                                }}
                                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-[#A1A1AA]/30 bg-transparent text-neutral-900 dark:text-[#F5F5F5] font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-[#A1A1AA]" />
                                <span>Chat with Lender</span>
                              </button>

                              {!isCancelled &&
                                o.status !== "completed" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCancellingOrderId(o.id);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs font-semibold transition-colors cursor-pointer mt-1"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>Cancel Booking</span>
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Synchronized Live Rental Queue (Full width) */}
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
                      <div className="pt-2 flex justify-end border-t border-black/5 dark:border-white/5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            closeBookingDetails();
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-black/10 dark:border-[#A1A1AA]/30 text-xs font-bold text-neutral-700 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
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
      </div>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {cancellingOrderId && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCancellingOrderId(null)}
              className="fixed inset-0 bg-[#050709]/85 backdrop-blur-md"
            />
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] p-6 sm:p-7 shadow-2xl backdrop-blur-xl z-10"
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-neutral-950 dark:text-[#F5F5F5]">
                  Cancel Gear Rental
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-[#A1A1AA] leading-relaxed">
                  Are you sure you want to cancel this gear rental? Once cancelled, the reservation holds will be released back to the lender. This action cannot be undone.
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setCancellingOrderId(null)}
                  className="text-neutral-700 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-[#F5F5F5]"
                >
                  Keep Rental
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleCancelOrder(cancellingOrderId);
                    setCancellingOrderId(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Confirm Cancellation
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Location Edit / Change-Request Modal */}
        {locationModalOrder && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLocationModalOrder(null)}
              className="fixed inset-0 bg-[#050709]/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] p-6 sm:p-7 shadow-2xl backdrop-blur-xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-neutral-950 dark:text-[#F5F5F5] flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>
                      {!["requested", "pending"].includes(String(locationModalOrder.status).toLowerCase())
                        ? "Request Location Change"
                        : "Update Booking Location"}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-[#A1A1AA] mt-0.5">
                    Order #{locationModalOrder.id} • {locationModalOrder.productTitle || "Gear Rental"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocationModalOrder(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!["requested", "pending"].includes(String(locationModalOrder.status).toLowerCase()) ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Lender Approval Required</span>
                  </div>
                  <p>
                    Because this rental has already been accepted or is in preparation, any change in delivery or pickup location must be explicitly approved by the lender.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                  <span>Your booking is awaiting acceptance. Your location updates immediately without requiring approval.</span>
                </div>
              )}

              {/* Method Tabs */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Fulfillment Method
                </label>
                <div className="grid grid-cols-3 gap-2 bg-neutral-100 dark:bg-white/5 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditMethod("delivery")}
                    className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      editMethod === "delivery"
                        ? "bg-white dark:bg-[#1A222D] text-neutral-950 dark:text-white shadow-xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMethod("pickup")}
                    className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      editMethod === "pickup"
                        ? "bg-white dark:bg-[#1A222D] text-neutral-950 dark:text-white shadow-xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Owner Pickup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMethod("custom")}
                    className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      editMethod === "custom"
                        ? "bg-white dark:bg-[#1A222D] text-neutral-950 dark:text-white shadow-xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Custom</span>
                  </button>
                </div>
              </div>

              {/* Address / Location Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {editMethod === "delivery"
                    ? "Full Delivery Address"
                    : editMethod === "pickup"
                    ? "Preferred Pickup Hub / Area"
                    : "Custom Meeting Location"}
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder={
                    editMethod === "delivery"
                      ? "Flat / House No., Building Name, Street, Area, City, Pincode"
                      : editMethod === "pickup"
                      ? "Owner Hub or nearest landmark"
                      : "Public place, studio address, or café"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              {/* Directions / Landmark Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Additional Directions or Landmarks (Optional)
                </label>
                <input
                  type="text"
                  value={editDirections}
                  onChange={(e) => setEditDirections(e.target.value)}
                  placeholder="e.g. Near Metro Pillar 104, call security on arrival"
                  className="w-full px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Reason Input (required if accepted) */}
              {!["requested", "pending"].includes(String(locationModalOrder.status).toLowerCase()) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>Reason for Location Change</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Required</span>
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Production crew moved shooting to studio location"
                    className="w-full px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-neutral-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setLocationModalOrder(null)}
                  disabled={isSavingLocation}
                  className="text-neutral-600 dark:text-[#A1A1AA]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveLocation}
                  disabled={isSavingLocation}
                  className="bg-neutral-900 dark:bg-[#F5F5F5] text-white dark:text-[#050709] font-bold text-xs"
                >
                  {isSavingLocation
                    ? "Submitting..."
                    : !["requested", "pending"].includes(String(locationModalOrder.status).toLowerCase())
                    ? "Submit Change Request"
                    : "Save Location"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
