import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Package, Truck, MessageSquare, KeyRound, AlertTriangle, Clock, Lock, CheckCircle, MapPin, Copy, ExternalLink, Edit3, Navigation, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/common/Button";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import { rentalSecurityService } from "@/services/rentalSecurityService";
import type { Order } from "@/types";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { useNavigate } from "@tanstack/react-router";
import { getOptimizedImageUrl } from "@/utils/images";
import { SecretPinDisplay } from "@/components/common/SecretPinDisplay";
import { LiveRentalQueue } from "@/components/rental/LiveRentalQueue";

const INITIAL_SAMPLE_ORDER: Order = {
  id: "ord-fx3-cinema-782",
  productId: "prod-sony-fx3",
  productTitle: "Sony FX3 Cinema Camera Kit",
  productImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
  startDate: "2026-10-26",
  endDate: "2026-10-29",
  total: 10500,
  status: "confirmed" as any,
  confirmedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  deliveryMethod: "delivery",
  deliveryAddress: "Flat 402, Green Glen Layout, Bellandur, Bengaluru, Karnataka 560103",
  locationDirections: "Near Central Mall, gate buzzer #402",
  latitude: 12.926,
  longitude: 77.6762,
  mapUrl: "https://www.google.com/maps/search/?api=1&query=12.926,77.6762",
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [revealedPins, setRevealedPins] = useState<Record<string, { pin: string; instructions?: string }>>({});
  const [loadingPinOrderId, setLoadingPinOrderId] = useState<string | null>(null);

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
    const address = order.deliveryAddress || (order as any).delivery_address ||
      (method === "pickup" ? (order.pickupLocation || (order as any).pickup_location || "") : (order.customLocation || (order as any).custom_location || ""));
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
        pickupLocation: editMethod === "pickup" ? (editAddress.trim() || "Lender Verified Hub") : "",
        customLocation: editMethod === "custom" ? editAddress.trim() : "",
        locationDirections: editDirections.trim(),
        reason: editReason.trim(),
      };

      const res = await api.updateOrderLocation(token, locationModalOrder.id, payload);
      toast.success(res.message || (isAccepted ? "Location change request submitted for lender approval." : "Booking location updated successfully!"));

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
            o.id === orderId || o.productId === orderId || o.product_id === orderId
              ? {
                  ...o,
                  status: "cancelled" as const,
                  cancelledAt: nowIso,
                  cancelled_at: nowIso,
                }
              : o,
          ),
        );
        toast.success("Order cancelled successfully.");
        // Notify any active queue components or listeners
        window.dispatchEvent(
          new CustomEvent("payent_queue_updated", {
            detail: { bookingId: orderId, status: "cancelled", cancelled_at: nowIso },
          }),
        );
      })
      .catch((err) => {
        toast.error(err.message || "Failed to cancel order.");
      })
      .finally(() => setCancellingOrderId(null));
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display flex items-center gap-2.5 text-[#F5F5F5] tracking-tight">
            <Package className="h-7 w-7 text-[#A1A1AA]" />
            <span>Orders & Bookings</span>
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#A1A1AA]">
            Track, manage, and coordinate all your gear rentals and handover PIN credentials in real time.
          </p>
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingState type="list" count={4} />
          ) : error ? (
            <ErrorState
              title="Unable to load orders"
              error={error}
              onRetry={loadOrders}
            />
          ) : orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="You haven't booked any tech gear rentals yet. Explore the marketplace to find gear!"
              icon={Package}
              actionLabel="Browse Marketplace"
              onAction={() => navigate({ to: "/categories" })}
            />
          ) : (
            <div className="rounded-3xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] overflow-hidden shadow-sm">
              <div className="hidden md:grid grid-cols-[70px_1fr_130px_100px_110px_180px] gap-4 p-4 border-b border-black/5 dark:border-[#A1A1AA]/15 text-xs uppercase text-[#A1A1AA] font-bold">
                <div>Item</div>
                <div>Details</div>
                <div>Rental Dates</div>
                <div>Total</div>
                <div>Status</div>
                <div className="text-right">Live Actions</div>
              </div>
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-1 md:grid-cols-[70px_1fr_130px_100px_110px_180px] gap-4 p-4 sm:p-5 items-start md:items-center border-b border-black/5 dark:border-[#A1A1AA]/15 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {o.productImage || o.product_image ? (
                    <img
                      src={getOptimizedImageUrl(o.productImage || o.product_image, 'thumb')}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 rounded-xl object-cover border border-black/10 dark:border-[#A1A1AA]/20 shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl border border-black/10 dark:border-[#A1A1AA]/20 bg-secondary/30 flex items-center justify-center text-muted-foreground/50 shrink-0">
                      <Package className="h-6 w-6 opacity-60" />
                    </div>
                  )}
                  <div className="min-w-0 space-y-1.5">
                    <div className="font-bold text-sm text-neutral-950 dark:text-[#F5F5F5] leading-snug">
                      {o.productTitle || o.product_title || "Gear Rental"}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-[#A1A1AA] font-mono">
                      Booking #{o.id}
                    </div>

                    {/* Category Restriction Status Indicator */}
                    {o.category && (
                      <div className="pt-0.5">
                        {(!o.pickedUpAt && !o.picked_up_at && !["cancelled", "rejected", "failed", "completed"].includes(o.status)) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Lock className="w-2.5 h-2.5" />
                            {o.category}: Awaiting Delivery (Locked)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle className="w-2.5 h-2.5" />
                            {o.category}: Delivery Confirmed (Unlocked)
                          </span>
                        )}
                      </div>
                    )}

                    {/* 4-Digit Renter Secret PIN UI */}
                    <div className="pt-1">
                      {revealedPins[o.id] ? (
                        <SecretPinDisplay
                          pin={revealedPins[o.id].pin}
                          type="renter"
                          title="Renter Secret PIN"
                          subtitle="Provide to owner at equipment handover."
                          onHide={() => handleRevealSecretPin(o.id)}
                          compact={true}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevealSecretPin(o.id)}
                          disabled={loadingPinOrderId === o.id || o.status === "cancelled"}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-black/10 dark:border-[#A1A1AA]/30 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-800 dark:text-[#F5F5F5] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-[#A1A1AA]" />
                          <span>{loadingPinOrderId === o.id ? "Retrieving..." : "Reveal Secret PIN"}</span>
                        </button>
                      )}
                    </div>

                    {/* Booking Location & Fulfillment Details */}
                    {(() => {
                      const method = (o.deliveryMethod || (o as any).delivery_method || "delivery").toLowerCase();
                      const address = o.deliveryAddress || (o as any).delivery_address ||
                        (method === "pickup" ? (o.pickupLocation || (o as any).pickup_location || "Lender Verified Hub") : (o.customLocation || (o as any).custom_location || ""));
                      const directions = o.locationDirections || (o as any).location_directions || "";
                      const mapUrl = o.mapUrl || (o as any).map_url || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");
                      const changeReq = o.locationChangeRequest || (o as any).location_change_request;
                      const isChangePending = changeReq && (changeReq.status === "pending" || !changeReq.status);

                      return (
                        <div className="pt-2 space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              method === "delivery"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : method === "pickup"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}>
                              {method === "delivery" ? <Truck className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}
                              <span>{method === "delivery" ? "Doorstep Delivery" : method === "pickup" ? "Owner Pickup" : "Custom Meetup"}</span>
                            </span>

                            {address && (
                              <button
                                type="button"
                                onClick={() => handleCopyAddress(address)}
                                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-[#A1A1AA] hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors"
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
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Map</span>
                              </a>
                            )}

                            {o.status !== "cancelled" && o.status !== "completed" && (
                              <button
                                type="button"
                                onClick={() => handleOpenLocationModal(o)}
                                className="inline-flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-primary font-medium cursor-pointer transition-colors"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>{isChangePending ? "View Change Request" : "Change Location"}</span>
                              </button>
                            )}
                          </div>

                          {address ? (
                            <div className="text-neutral-700 dark:text-neutral-300 leading-snug">
                              <span className="font-medium text-neutral-500 dark:text-[#A1A1AA]">Location: </span>
                              <span>{address}</span>
                              {directions && (
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 italic block">
                                  Directions: {directions}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Address pending. Please set your delivery location.</span>
                            </div>
                          )}

                          {/* Pending Change Request Alert */}
                          {isChangePending && (
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
                              <div className="font-bold flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Location change pending lender approval</span>
                              </div>
                              <div className="truncate">
                                Requested: {changeReq.deliveryAddress || changeReq.customLocation || changeReq.pickupLocation}
                              </div>
                              {changeReq.reason && <div className="italic">"{changeReq.reason}"</div>}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-[#A1A1AA] space-y-1">
                    <div>
                      {o.startDate || o.start_date || "Today"} {o.endDate && o.endDate !== o.startDate ? `– ${o.endDate}` : ""}
                    </div>
                    {((o as any).timeSlot || (o as any).time_slot) && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-primary/10 text-primary uppercase">
                        <Clock className="h-2.5 w-2.5" />
                        {((o as any).timeSlot || (o as any).time_slot).replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <div className="font-black text-sm font-mono text-neutral-950 dark:text-[#F5F5F5]">
                    ₹{o.total}
                  </div>
                  <div className="flex flex-col gap-1 items-start">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider w-fit border ${
                        o.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : o.status === "pending"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : o.status === "cancelled"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                              : "bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-[#A1A1AA] border-neutral-200 dark:border-white/10"
                      }`}
                    >
                      {o.status}
                    </span>
                    {o.status === "cancelled" && ((o as any).cancellationReason || (o as any).cancellation_reason) && (
                      <span className="text-[10px] text-red-500 dark:text-red-400 font-medium leading-tight">
                        Reason: {String((o as any).cancellationReason || (o as any).cancellation_reason).replace(/_/g, " ")}
                      </span>
                    )}
                    {(o.status === "active" || o.status === "pending") && (
                      <button
                        onClick={() => setCancellingOrderId(o.id)}
                        className="text-[10px] text-red-500 dark:text-red-400 hover:underline font-semibold mt-1 cursor-pointer"
                      >
                        Cancel Rental
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row md:flex-col gap-1.5 w-full">
                    <button
                      onClick={() => navigate({ to: `/delivery/${o.id}` })}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-[#F5F5F5] text-white dark:text-[#050709] font-bold text-xs shadow-sm hover:opacity-95 dark:hover:bg-white transition-all cursor-pointer"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>Track Delivery</span>
                    </button>
                    <button
                      onClick={() => navigate({ to: "/messages", search: { bookingId: o.id } as any })}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-[#A1A1AA]/30 bg-transparent text-neutral-900 dark:text-[#F5F5F5] font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[#A1A1AA]" />
                      <span>Chat with Lender</span>
                    </button>
                  </div>

                  {/* Synchronized Live Rental Queue with 8 milestones and persistent timer */}
                  <div className="col-span-full pt-2">
                    <LiveRentalQueue
                      orderId={o.id}
                      currentStatus={o.status}
                      role="renter"
                      startDate={o.startDate || o.start_date}
                      endDate={o.endDate || o.end_date}
                      timeSlot={(o as any).timeSlot || (o as any).time_slot}
                      confirmedAt={o.confirmedAt || o.confirmed_at || o.createdAt || (o as any).created_at}
                      readyForPickupAt={o.readyForPickupAt || o.ready_for_pickup_at}
                      pickedUpAt={o.pickedUpAt || o.picked_up_at}
                      returnInitiatedAt={o.returnInitiatedAt || o.return_initiated_at}
                      handedBackAt={o.handedBackAt || o.handed_back_at}
                      awaitingInspectionAt={o.awaitingInspectionAt || o.awaiting_inspection_at}
                      completedAt={o.completedAt || o.completed_at}
                      cancelledAt={(o as any).cancelledAt || (o as any).cancelled_at}
                      cancellationReason={(o as any).cancellationReason || (o as any).cancellation_reason}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
                  Are you sure you want to cancel this gear rental? Once
                  cancelled, the reservation holds will be released back to the
                  lender. This action cannot be undone.
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
