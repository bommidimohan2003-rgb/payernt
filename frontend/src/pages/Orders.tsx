import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Package, Truck, MessageSquare, KeyRound } from "lucide-react";
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

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(() => {
    return storage.get<Order[]>(STORAGE_KEYS.orders, []);
  });
  const [loading, setLoading] = useState(() => {
    const cached = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    return cached.length === 0;
  });
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const token = storage.get<string | null>(STORAGE_KEYS.token, null);
  const navigate = useNavigate();

  const loadOrders = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    api
      .getOrders(token)
      .then((data) => {
        setOrders(data);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        setError("Failed to fetch your active order history.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCancelOrder = (orderId: string) => {
    if (!token) return;
    api
      .cancelOrder(token, orderId)
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Package className="h-7 w-7 text-primary" /> Orders
        </h1>
        <p className="mt-2 text-muted-foreground">
          Track, manage, and coordinate all your gear rentals in real time.
        </p>

        <div className="mt-8">
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
            <div className="card-premium overflow-hidden">
              <div className="hidden md:grid grid-cols-[70px_1fr_130px_100px_110px_180px] gap-4 p-4 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
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
                  className="grid grid-cols-1 md:grid-cols-[70px_1fr_130px_100px_110px_180px] gap-4 p-4 items-center border-b border-border last:border-0 hover:bg-secondary/15 transition-colors"
                >
                  {o.productImage || o.product_image ? (
                    <img
                      src={getOptimizedImageUrl(o.productImage || o.product_image, 'thumb')}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl border border-border bg-secondary/30 flex items-center justify-center text-muted-foreground/50">
                      <Package className="h-6 w-6 opacity-60" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-foreground leading-snug">{o.productTitle || o.product_title || "Gear Rental"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Booking #{o.id}</div>
                    {(() => {
                      const sec = rentalSecurityService.getSecurityRecord(o.id);
                      if (sec && sec.renterSecretPin) {
                        return (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold" title="Provide this PIN to the lender during device handover">
                            <KeyRound className="h-3 w-3" />
                            <span>Renter PIN: {sec.renterSecretPin}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.startDate || o.start_date || "Today"} – {o.endDate || o.end_date || "Tomorrow"}
                  </div>
                  <div className="font-bold text-foreground">₹{o.total}</div>
                  <div className="flex flex-col gap-1 items-start">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider w-fit border ${o.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : o.status === "pending"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : o.status === "cancelled"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-secondary text-muted-foreground border-border"
                        }`}
                    >
                      {o.status}
                    </span>
                    {(o.status === "active" || o.status === "pending") && (
                      <button
                        onClick={() => setCancellingOrderId(o.id)}
                        className="text-[10px] text-destructive hover:underline font-semibold mt-1"
                      >
                        Cancel Rental
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row md:flex-col gap-1.5 w-full">
                    <button
                      onClick={() => navigate({ to: `/delivery/${o.id}` })}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95 transition-all cursor-pointer"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>Track Delivery</span>
                    </button>
                    <button
                      onClick={() => navigate({ to: "/messages", search: { bookingId: o.id } as any })}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-secondary transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      <span>Chat with Lender</span>
                    </button>
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
              className="fixed inset-0 bg-background/85 backdrop-blur-md"
            />
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-xl z-10"
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-foreground">
                  Cancel Gear Rental
                </h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to cancel this gear rental? Once
                  cancelled, the reservation holds will be released back to the
                  lender. This action cannot be undone.
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setCancellingOrderId(null)}
                >
                  Keep Rental
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleCancelOrder(cancellingOrderId);
                    setCancellingOrderId(null);
                  }}
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
