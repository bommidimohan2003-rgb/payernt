import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Mail,
  Phone,
  Plus,
  Trash2,
  User as UserIcon,
  Shield,
  Activity,
  IndianRupee,
  Info,
  Power,
  PackageCheck,
  ExternalLink,
  Truck,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import { Button } from "@/components/common/Button";
import type { Product, Order } from "@/types";
import { LiveRentalQueue } from "@/components/rental/LiveRentalQueue";

interface LenderOrder extends Order {
  renter: {
    name: string;
    email: string;
    phone: string;
  };
}

export default function LenderPortal() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"listings" | "bookings">(
    "listings",
  );
  const [listings, setListings] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<LenderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const token = storage.get<string | null>(STORAGE_KEYS.token, null);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login" });
  }, [ready, user, navigate]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [fetchedListings, fetchedBookings] = await Promise.all([
        api.getCustomProducts(token),
        api.getLenderOrders(token),
      ]);
      setListings(fetchedListings);
      setBookings(fetchedBookings as unknown as LenderOrder[]);
    } catch (err) {
      console.error("Failed to load lender portal data:", err);
      toast.error("Failed to load listings or bookings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener("payent_orders_updated", handleUpdate);
    window.addEventListener("payent_queue_updated", handleUpdate);

    // Periodic live sync for active rentals across renter/lender tabs
    const pollTimer = setInterval(() => {
      fetchData();
    }, 6000);

    return () => {
      window.removeEventListener("payent_orders_updated", handleUpdate);
      window.removeEventListener("payent_queue_updated", handleUpdate);
      clearInterval(pollTimer);
    };
  }, [fetchData]);

  const handleToggleAvailability = async (productId: string) => {
    if (!token) return;
    try {
      const res = await api.toggleCustomProductAvailability(token, productId);
      setListings((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, available: res.available } : p,
        ),
      );
      toast.success(
        res.available
          ? "Listing is now active and rentable!"
          : "Listing paused. It won't accept new bookings.",
      );
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to toggle availability.";
      toast.error(errMsg);
    }
  };

  const handleDeleteListing = async (productId: string) => {
    if (!token) {
      toast.error("Authentication required.");
      return;
    }
    try {
      await api.deleteCustomProduct(token, productId);
      setListings((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Listing deleted successfully from database.");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to delete product";
      console.warn("Backend delete notice:", err);
      toast.error(errMsg);
    }
    setConfirmDeleteId(null);
    window.dispatchEvent(new CustomEvent("payent_products_updated"));
  };

  // Calculations for Stats
  const activeListingsCount = listings.filter((l) => l.available).length;
  const activeBookings = bookings.filter(
    (b) => b.status === "active" || b.status === "pending",
  );
  const totalEarnings = bookings
    .filter((b) => b.status === "completed" || b.status === "active")
    .reduce((sum, b) => sum + b.total, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Lender Portal
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your gear listings and view incoming rental bookings.
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: "/become-lender" })}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add New Gear
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium p-5 flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{listings.length}</div>
              <div className="text-sm text-muted-foreground">
                Total Listings ({activeListingsCount} active)
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card-premium p-5 flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center shrink-0">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeBookings.length}</div>
              <div className="text-sm text-muted-foreground">
                Active Rentals
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-premium p-5 flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center shrink-0">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                ₹{totalEarnings.toLocaleString("en-IN")}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Earnings
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("listings")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "listings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            My Listed Gear ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "bookings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Received Bookings ({bookings.length})
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="h-64 grid place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "listings" ? (
              <motion.div
                key="listings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {listings.length === 0 ? (
                  <div className="card-premium p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <Info className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm">
                      You haven't listed any tech gear yet.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate({ to: "/become-lender" })}
                      className="mt-2"
                    >
                      List Your First Gear
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listings.map((p) => (
                      <div
                        key={p.id}
                        className="card-premium p-4 flex gap-4 items-start relative group"
                      >
                        <div className="h-24 w-24 rounded-xl overflow-hidden bg-secondary shrink-0">
                          <img
                            src={p.image}
                            alt={p.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                                {p.category}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                  p.available
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {p.available ? "Active" : "Paused"}
                              </span>
                            </div>
                            <h3 className="font-semibold text-base mt-1 truncate pr-8">
                              {p.title}
                            </h3>
                            <p className="text-sm font-bold text-foreground mt-1">
                              ₹{p.price}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                / day
                              </span>
                            </p>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button
                              variant={p.available ? "outline" : "primary"}
                              size="sm"
                              onClick={() => handleToggleAvailability(p.id)}
                              leftIcon={<Power className="h-3 w-3" />}
                              className="text-xs h-8"
                            >
                              {p.available ? "Pause" : "Activate"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDeleteId(p.id)}
                              leftIcon={<Trash2 className="h-3 w-3" />}
                              className="text-xs h-8"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="bookings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {bookings.length === 0 ? (
                  <div className="card-premium p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm">
                      No bookings have been placed on your gear yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="card-premium p-5 flex flex-col gap-4"
                      >
                        <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between w-full">
                          {/* Rented Gear Details */}
                          <div className="flex gap-4 items-center">
                            <img
                              src={booking.productImage}
                              alt={booking.productTitle}
                              className="h-16 w-16 rounded-xl object-cover shrink-0"
                            />
                            <div>
                              <h3 className="font-semibold text-base leading-snug">
                                {booking.productTitle}
                              </h3>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                    booking.status === "active" ||
                                    booking.status === "completed"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : booking.status === "pending"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                        : "bg-destructive/10 text-destructive border-destructive/20"
                                  }`}
                                >
                                  {booking.status}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Order #{booking.id}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Renter Contact details */}
                          <div className="card-premium p-3 bg-secondary/30 flex flex-col gap-1.5 text-xs w-full md:w-auto md:min-w-[200px]">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                              Renter Information
                            </span>
                            <div className="flex items-center gap-2 text-foreground font-medium">
                              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              {booking.renter.name}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              <a
                                href={`mailto:${booking.renter.email}`}
                                className="hover:underline"
                              >
                                {booking.renter.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              <a
                                href={`tel:${booking.renter.phone}`}
                                className="hover:underline"
                              >
                                {booking.renter.phone}
                              </a>
                            </div>
                          </div>

                          {/* Dates & Earnings */}
                          <div className="flex justify-between md:flex-col md:text-right gap-2 w-full md:w-auto">
                            <div>
                              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">
                                Rental Period
                              </span>
                              <span className="text-sm font-medium">
                                {booking.startDate} – {booking.endDate}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">
                                Your Earnings
                              </span>
                              <span className="text-base font-bold text-foreground">
                                ₹{booking.total.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          {/* Live Delivery Tracking & Chat Actions */}
                          <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                            <button
                              onClick={() => navigate({ to: `/delivery/${booking.id}` })}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95 transition-all cursor-pointer flex-1 md:flex-initial"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Manage Delivery</span>
                            </button>
                            <button
                              onClick={() => navigate({ to: "/messages", search: { bookingId: booking.id } as any })}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-secondary transition-all cursor-pointer flex-1 md:flex-initial"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-primary" />
                              <span>Chat with Renter</span>
                            </button>
                          </div>
                        </div>

                        {/* Live Rental Queue with 8 milestones and synchronized persistent timer */}
                        <div className="w-full pt-3 border-t border-border">
                          <LiveRentalQueue
                            orderId={booking.id}
                            currentStatus={booking.status}
                            role="lender"
                            startDate={booking.startDate}
                            endDate={booking.endDate}
                            timeSlot={(booking as any).timeSlot || (booking as any).time_slot}
                            confirmedAt={booking.confirmedAt || booking.confirmed_at || booking.createdAt || (booking as any).created_at}
                            readyForPickupAt={booking.readyForPickupAt || booking.ready_for_pickup_at}
                            pickedUpAt={booking.pickedUpAt || booking.picked_up_at}
                            returnInitiatedAt={booking.returnInitiatedAt || booking.return_initiated_at}
                            handedBackAt={booking.handedBackAt || booking.handed_back_at}
                            awaitingInspectionAt={booking.awaitingInspectionAt || booking.awaiting_inspection_at}
                            completedAt={booking.completedAt || booking.completed_at}
                            queueNotes={booking.queueNotes || (booking as any).queue_notes}
                            onStatusUpdated={(newStatus, updatedTimestamps) => {
                              setBookings((prev) =>
                                prev.map((item) =>
                                  item.id === booking.id
                                    ? ({
                                        ...item,
                                        status: newStatus as any,
                                        ...updatedTimestamps,
                                      } as LenderOrder)
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
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmDeleteId && (
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmDeleteId(null)}
                className="fixed inset-0 bg-background/85 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl z-10"
              >
                <h3 className="text-xl font-bold">Delete Listing?</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Are you sure you want to delete this listing? This action is
                  permanent, and the item will be removed from the rental
                  catalog immediately.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteListing(confirmDeleteId)}
                  >
                    Delete Listing
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
