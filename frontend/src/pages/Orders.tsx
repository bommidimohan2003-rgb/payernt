import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Package, Truck, MessageSquare, KeyRound, AlertTriangle, Clock, Lock, CheckCircle } from "lucide-react";
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
  const navigate = useNavigate();

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
    api
      .cancelOrder(currentToken, orderId)
      .then(() => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.productId === orderId || o.product_id === orderId
              ? { ...o, status: "cancelled" as const }
              : o,
          ),
        );
        toast.success("Order cancelled successfully.");
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
                  {o.status !== "cancelled" && (
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
                  )}
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
      </AnimatePresence>
    </DashboardLayout>
  );
}
