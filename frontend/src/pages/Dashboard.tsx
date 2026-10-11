import { useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bell,
  Heart,
  Package,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Camera,
  MessageSquare,
  User,
  PlusCircle,
  AlertCircle,
  XCircle,
  Store,
  Compass,
  KeyRound,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { Order, Product, Notification } from "@/types";
import { Button } from "@/components/common/Button";
import { getOptimizedImageUrl } from "@/utils/images";

export default function Dashboard() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const { ids } = useWishlist();

  const [orders, setOrders] = useState<Order[]>([]);
  const [myListings, setMyListings] = useState<Product[]>([]);
  const [alertsList, setAlertsList] = useState<Notification[]>([]);
  const [publicProducts, setPublicProducts] = useState<Product[]>([]);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [revealedPins, setRevealedPins] = useState<Record<string, { pin: string; instructions?: string }>>({});
  const [loadingPinOrderId, setLoadingPinOrderId] = useState<string | null>(null);



  const fetchDashboardData = useCallback(() => {
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!currentToken) {
      setLoadingOrders(false);
      return;
    }

    Promise.allSettled([
      api.getOrders(currentToken),
      api.getCustomProducts(currentToken),
      api.getNotifications(currentToken),
      api.getPublicProducts(),
    ]).then(([ordersRes, listingsRes, alertsRes, publicRes]) => {
      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        const localOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
        const backendOrderIds = new Set(ordersRes.value.map((o) => o.id));
        const missingLocal = localOrders.filter((o) => !backendOrderIds.has(o.id));
        const combinedOrders = [...ordersRes.value, ...missingLocal];
        setOrders(combinedOrders);
      }
      if (listingsRes.status === "fulfilled" && Array.isArray(listingsRes.value)) {
        setMyListings(listingsRes.value);
      }
      if (alertsRes.status === "fulfilled" && Array.isArray(alertsRes.value)) {
        setAlertsList(alertsRes.value);
      }
      if (publicRes.status === "fulfilled" && Array.isArray(publicRes.value)) {
        setPublicProducts(publicRes.value);
      }
    }).finally(() => {
      setLoadingOrders(false);
    });
  }, []);

  useEffect(() => {
    // Populate cached storage data on client mount for smooth hydration
    const cachedOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
    if (cachedOrders.length > 0) {
      setOrders(cachedOrders);
      setLoadingOrders(false);
    }
    const cachedListings = storage.get<Product[]>(STORAGE_KEYS.customProducts, []);
    if (cachedListings.length > 0) setMyListings(cachedListings);
    const cachedAlerts = storage.get<Notification[]>(STORAGE_KEYS.notifications, []);
    if (cachedAlerts.length > 0) setAlertsList(cachedAlerts);
    const cachedPublic = storage.get<Product[]>("public_custom_products", []);
    if (cachedPublic.length > 0) setPublicProducts(cachedPublic);

    fetchDashboardData();
    const handleOrdersUpdated = () => {
      api.invalidateCache("user_orders");
      fetchDashboardData();
    };
    window.addEventListener("payent_orders_updated", handleOrdersUpdated);
    return () => {
      window.removeEventListener("payent_orders_updated", handleOrdersUpdated);
    };
  }, [fetchDashboardData]);

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
    setCancellingOrderId(orderId);
    api
      .cancelOrder(currentToken, orderId)
      .then(() => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" as const } : o,
          ),
        );
        toast.success("Order cancelled successfully!");
      })
      .catch((err) => toast.error(err.message || "Failed to cancel order."))
      .finally(() => setCancellingOrderId(null));
  };

  // Real Real-time Computed Values (Strictly ZERO fake numbers)
  const activeRentalsCount = useMemo(
    () => orders.filter((o) => o.status === "active" || o.status === "pending").length,
    [orders],
  );

  const completedRentalsCount = useMemo(
    () => orders.filter((o) => (o.status as string) === "completed" || (o.status as string) === "delivered").length,
    [orders],
  );

  const totalSpent = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [orders],
  );

  const unreadAlertsCount = useMemo(
    () => alertsList.filter((n) => !n.read).length,
    [alertsList],
  );

  const wishlistItems = useMemo(
    () => publicProducts.filter((p) => ids.includes(p.id)).slice(0, 3),
    [publicProducts, ids],
  );

  // Profile Completeness Engine
  const profileStatus = useMemo(() => {
    if (!user) return { percentage: 0, missing: [] };
    const checks = [
      { key: "fullName", label: "Full Name", valid: Boolean(user.fullName && user.fullName.length > 2) },
      { key: "phone", label: "Phone Number", valid: Boolean(user.phone && user.phone.length >= 10) },
      { key: "city", label: "City & Region", valid: Boolean(user.city) },
      { key: "address", label: "Delivery Address", valid: Boolean(user.address) },
      { key: "avatar", label: "Profile Photo", valid: Boolean(user.avatar || user.profilePhotoUrl) },
    ];
    const completed = checks.filter((c) => c.valid).length;
    const percentage = Math.round((completed / checks.length) * 100);
    const missing = checks.filter((c) => !c.valid).map((c) => c.label);
    return { percentage, missing };
  }, [user]);

  const isLender = user?.role === "lender" || user?.role === "admin" || myListings.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        {/* 1. WELCOME & COMMAND HEADER */}
        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0D151D] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md border border-white/10 shrink-0">
                {user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "P"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white tracking-tight">
                    Welcome back, {user?.fullName?.split(" ")[0] || "Creator"}
                  </h1>
                  {user?.isVerified || (user as any)?.verified || user?.status === "approved" || user?.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Renter
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      Review Pending
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-[#AAB3BC]">
                  Your creator command center for equipment bookings, saved gear, and project rentals.
                </p>
              </div>
            </div>

            {/* Quick Command Shortcuts */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/browse"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#161616] text-[#FFFFFF] hover:bg-[#292929] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] dark:hover:bg-[#FFFFFF] text-xs font-bold transition-all shadow-sm"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore Gear</span>
              </Link>
              <Link
                to="/orders"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-black/10 dark:border-white/15 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 text-xs font-bold transition-all"
              >
                <Package className="w-3.5 h-3.5" />
                <span>My Bookings</span>
              </Link>
              <Link
                to="/wishlist"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/5 text-xs font-bold transition-all"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Saved Wishlist ({ids.length})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. REAL METRICS KPI GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
              <Package className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-neutral-950 dark:text-white font-mono">
              {activeRentalsCount}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-[#8D98A3] mt-0.5">
              Active Rentals
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-neutral-100 dark:bg-white/5 text-neutral-800 dark:text-neutral-200 mb-3">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-neutral-950 dark:text-white font-mono">
              ₹{totalSpent.toLocaleString("en-IN")}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-[#8D98A3] mt-0.5">
              Total Spent
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3">
              <Heart className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-neutral-950 dark:text-white font-mono">
              {ids.length}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-[#8D98A3] mt-0.5">
              Saved Gear Items
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3">
              <Bell className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-neutral-950 dark:text-white font-mono">
              {alertsList.length}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-[#8D98A3] mt-0.5">
              System Notifications
            </div>
          </motion.div>
        </div>

        {/* 3. MAIN DASHBOARD CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLS: ACTIVE RENTALS & RECENT ORDERS */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0D151D] p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
                <div>
                  <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                    Rental Bookings ({orders.length})
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-[#8D98A3] mt-0.5">
                    Your active shoots, equipment handoffs, and order history
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: "/orders" })}
                  className="text-xs font-bold"
                >
                  View all ({orders.length})
                </Button>
              </div>

              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Loading your rental bookings...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-white/5 mx-auto grid place-items-center text-neutral-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-neutral-900 dark:text-white text-sm">
                    No equipment rentals yet
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-[#8D98A3] max-w-sm mx-auto">
                    Explore cinema cameras, drones, and studio workstations for your upcoming production shoot.
                  </p>
                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#161616] text-white dark:bg-[#F2F0EA] dark:text-[#161616] text-xs font-bold shadow-sm mt-2"
                  >
                    <span>Browse Equipment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {orders.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02] hover:bg-neutral-100/60 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {o.productImage || o.product_image ? (
                          <img
                            src={getOptimizedImageUrl(
                              o.productImage || o.product_image,
                              'thumb'
                            )}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-14 w-14 rounded-xl object-cover border border-black/10 dark:border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-xl border border-black/10 dark:border-white/10 bg-secondary/30 flex items-center justify-center text-muted-foreground/50 shrink-0">
                            <Package className="h-6 w-6 opacity-60" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-neutral-950 dark:text-white truncate">
                            {o.productTitle || o.product_title || "Cinema Gear Rental"}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-[#8D98A3] mt-0.5">
                            {o.startDate || o.start_date || "Today"} → {o.endDate || o.end_date || "Upcoming"}
                          </div>
                          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                            ID: #{o.id}
                          </div>

                          {/* Reveal Secret PIN Button / Revealed State */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {revealedPins[o.id] ? (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
                                <KeyRound className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-[11px] font-medium">Secret PIN:</span>
                                <span className="font-mono text-sm font-black tracking-widest bg-amber-500/20 px-2 py-0.5 rounded-md text-foreground">
                                  {revealedPins[o.id].pin}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRevealSecretPin(o.id)}
                                  className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer ml-1"
                                >
                                  Hide
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRevealSecretPin(o.id)}
                                disabled={loadingPinOrderId === o.id || o.status === "cancelled"}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                                <span>{loadingPinOrderId === o.id ? "Retrieving PIN..." : "Reveal Secret PIN"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="font-black text-sm text-neutral-900 dark:text-white font-mono">
                          ₹{Number(o.total || 0).toLocaleString("en-IN")}
                        </div>

                        <div className="flex items-center gap-2">
                          {(o.status === "active" || o.status === "pending") && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(o.id)}
                              disabled={cancellingOrderId === o.id}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {cancellingOrderId === o.id ? "Cancelling..." : "Cancel"}
                            </button>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              o.status === "active"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : o.status === "pending"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : o.status === "cancelled"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                    : "bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/10"
                            }`}
                          >
                            {o.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLS: PROFILE COMPLETION + LENDER STUDIO + WISHLIST */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Completeness Card */}
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0D151D] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Profile Completeness
                  </h3>
                </div>
                <span className="text-xs font-mono font-black text-neutral-900 dark:text-white">
                  {profileStatus.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${profileStatus.percentage}%` }}
                />
              </div>

              {profileStatus.missing.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Complete remaining items for faster booking verification:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profileStatus.missing.map((item) => (
                      <span
                        key={item}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                      >
                        + {item}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/profile"
                    className="block text-center mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-2 border-t border-black/5 dark:border-white/5"
                  >
                    Complete Profile Now →
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Profile 100% verified & complete</span>
                </div>
              )}
            </div>

            {/* Messages & Owner Inquiries Widget */}
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0D151D] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-500" />
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Direct Messages & Inquiries
                  </h3>
                </div>
                <Link
                  to="/messages"
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Inbox →
                </Link>
              </div>

              <p className="text-xs text-neutral-500 dark:text-[#8D98A3] leading-relaxed">
                Chat directly with verified equipment owners to coordinate pickup timing, gear accessories, and return inspections.
              </p>

              <Link
                to="/messages"
                className="w-full h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Messenger Inbox</span>
              </Link>
            </div>

            {/* Wishlist Preview */}
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0D151D] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Saved Gear ({ids.length})
                  </h3>
                </div>
                <Link
                  to="/wishlist"
                  className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:underline"
                >
                  View all →
                </Link>
              </div>

              {wishlistItems.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-[#8D98A3] py-2">
                  No saved gear yet. Tap the heart on any product to save it for upcoming projects.
                </p>
              ) : (
                <div className="space-y-3">
                  {wishlistItems.map((item) => (
                    <Link
                      key={item.id}
                      to="/product/$id"
                      params={{ id: item.id }}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors group"
                    >
                      <img
                        src={getOptimizedImageUrl(item.image, 'thumb')}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-10 rounded-lg object-cover border border-black/5 dark:border-white/5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          ₹{item.price}/day • {item.category}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
