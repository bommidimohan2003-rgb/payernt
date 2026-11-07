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
  Calendar,
  Lock,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { BackButton } from "@/components/common/BackButton";
import { ProfilePhoto, isRealProfilePhoto } from "@/components/common/ProfilePhoto";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { Order, Product, Notification } from "@/types";
import { Button } from "@/components/common/Button";
import { getOptimizedImageUrl } from "@/utils/images";
import { SecretPinDisplay } from "@/components/common/SecretPinDisplay";
import { LiveRentalQueue } from "@/components/rental/LiveRentalQueue";
import { KycStatusBanner } from "@/components/kyc/KycStatusBanner";

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
  const [bookingFilter, setBookingFilter] = useState<"all" | "active" | "cancelled">("all");



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

  const filteredBookings = useMemo(() => {
    if (bookingFilter === "active") {
      return orders.filter((o) => o.status === "active" || o.status === "pending");
    }
    if (bookingFilter === "cancelled") {
      return orders.filter((o) => o.status === "cancelled");
    }
    return orders;
  }, [orders, bookingFilter]);

  // Profile Completeness Engine
  const profileStatus = useMemo(() => {
    if (!user) return { percentage: 0, missing: [] };
    const checks = [
      { key: "fullName", label: "Full Name", valid: Boolean(user.fullName && user.fullName.length > 2) },
      { key: "phone", label: "Phone Number", valid: Boolean(user.phone && user.phone.length >= 10) },
      { key: "city", label: "City & Region", valid: Boolean(user.city) },
      { key: "address", label: "Delivery Address", valid: Boolean(user.address) },
      { key: "profilePhoto", label: "Profile Photo", valid: isRealProfilePhoto(user.profilePhotoUrl || user.profile_photo_url || user.avatar) },
    ];
    const completed = checks.filter((c) => c.valid).length;
    const percentage = Math.round((completed / checks.length) * 100);
    const missing = checks.filter((c) => !c.valid).map((c) => c.label);
    return { percentage, missing };
  }, [user]);

  const isLender = user?.role === "lender" || user?.role === "admin" || myListings.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 w-full max-w-7xl">
        {/* ADMIN OPERATIONS CALLOUT */}
        {(user?.role === "admin" || (user as any)?.role === "superadmin" || (typeof window !== "undefined" && Boolean(localStorage.getItem("payent:admin:current_user")))) && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 dark:bg-blue-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/30">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>Payent Operations Command Center</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">ADMIN ACCESS</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Switch to the upgraded Midnight Sapphire administrative dashboard for platform telemetry, analytics, and queues.
                </p>
              </div>
            </div>
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
            >
              <span>Open Admin Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Authoritative Dual-Side KYC Status Banner */}
        <KycStatusBanner role="renter" />

        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center justify-between gap-4">
          <BackButton fallback="/categories" className="!mb-0 !py-1.5 !px-3.5 text-xs font-semibold" />
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <Link to="/" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="font-semibold text-neutral-900 dark:text-white">Creator Dashboard</span>
          </div>
        </div>

        {/* 1. WELCOME & COMMAND HERO */}
        <div className="rounded-3xl border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <ProfilePhoto
                src={user?.profilePhotoUrl || user?.profile_photo_url || user?.avatar}
                alt={user?.fullName || "User"}
                size="xl"
                shape="rounded"
                className="shadow-sm border border-neutral-200 dark:border-white/15 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white tracking-tight">
                    Welcome back, {user?.fullName?.split(" ")[0] || "Creator"}
                  </h1>
                  {user?.isVerified || (user as any)?.verified || user?.status === "approved" || user?.status === "active" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Renter
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5" />
                      Review Pending
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Your creator command center for equipment bookings, saved gear, and project rentals.
                </p>
              </div>
            </div>

            {/* Quick Command Shortcuts */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/browse"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Gear</span>
              </Link>
              <Link
                to="/orders"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-neutral-200/90 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 text-xs font-bold transition-all active:scale-95"
              >
                <Package className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span>My Bookings</span>
              </Link>
              <Link
                to="/wishlist"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-neutral-200/90 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 text-xs font-bold transition-all active:scale-95"
              >
                <Heart className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span>Saved Wishlist ({ids.length})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. REAL METRICS KPI GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/orders"
            className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 shadow-sm transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Active Rentals
              </span>
              <div className="h-9 w-9 rounded-xl grid place-items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 mb-1">
              <span className="text-3xl font-black font-mono text-neutral-950 dark:text-white tracking-tight">
                {activeRentalsCount}
              </span>
            </div>
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>View rental schedule</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-neutral-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Total Spent
              </span>
              <div className="h-9 w-9 rounded-xl grid place-items-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 mb-1">
              <span className="text-3xl font-black font-mono text-neutral-950 dark:text-white tracking-tight">
                ₹{totalSpent.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Across {completedRentalsCount + activeRentalsCount} total orders
            </div>
          </div>

          <Link
            to="/wishlist"
            className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 shadow-sm transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Saved Gear
              </span>
              <div className="h-9 w-9 rounded-xl grid place-items-center bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Heart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 mb-1">
              <span className="text-3xl font-black font-mono text-neutral-950 dark:text-white tracking-tight">
                {ids.length}
              </span>
            </div>
            <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>View saved items</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          <Link
            to="/notifications"
            className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-neutral-200/80 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 shadow-sm transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Notifications
              </span>
              <div className="h-9 w-9 rounded-xl grid place-items-center bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Bell className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 mb-1">
              <span className="text-3xl font-black font-mono text-neutral-950 dark:text-white tracking-tight">
                {alertsList.length}
              </span>
            </div>
            <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>{unreadAlertsCount > 0 ? `${unreadAlertsCount} unread updates` : "All notifications read"}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>

        {/* 3. MAIN DASHBOARD CONTENT GRID (2 COLUMNS: LEFT 8 COLS, RIGHT 4 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* LEFT 8 COLS: RENTAL BOOKINGS */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-3xl border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6 sm:p-7 shadow-sm text-left">
              {/* Clean Integrated Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-white/5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/5 grid place-items-center text-neutral-800 dark:text-neutral-200">
                      <Package className="h-4 w-4" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white tracking-tight">
                      Rental Bookings
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
                      {orders.length}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 pl-10.5">
                    Your active shoots, equipment handoffs, and order history
                  </p>
                </div>
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white transition-colors self-start sm:self-center"
                >
                  <span>View all ({orders.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 pt-3 pb-1 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setBookingFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bookingFilter === "all"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                      : "bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBookingFilter("active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bookingFilter === "active"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                      : "bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  Active ({activeRentalsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBookingFilter("cancelled")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bookingFilter === "cancelled"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                      : "bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  Cancelled ({orders.filter((o) => o.status === "cancelled").length})
                </button>
              </div>

              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Loading your rental bookings...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-white/5 mx-auto grid place-items-center text-neutral-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-neutral-900 dark:text-white text-sm">
                    {bookingFilter === "active" ? "No active rentals right now" : "No bookings found"}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                    {bookingFilter === "active"
                      ? "Explore cinema gear, drones, and microphones for your next production."
                      : "No equipment bookings matched this filter category."}
                  </p>
                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black text-xs font-bold shadow-sm mt-2 hover:opacity-95 transition-opacity"
                  >
                    <span>Browse Equipment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {filteredBookings.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] hover:bg-neutral-50 dark:hover:bg-white/[0.04] p-4 sm:p-5 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                              className="h-16 w-16 rounded-xl object-cover border border-neutral-200 dark:border-white/10 shrink-0 bg-neutral-100 dark:bg-neutral-800"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-neutral-400 shrink-0">
                              <Package className="h-6 w-6 opacity-60" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-sm sm:text-base text-neutral-950 dark:text-white truncate">
                              {o.productTitle || o.product_title || "Cinema Gear Rental"}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                              <span>{o.startDate || o.start_date || "Today"} → {o.endDate || o.end_date || "Upcoming"}</span>
                            </div>
                            <div className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 mt-1">
                              ID: #{o.id}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                          <div className="font-black text-base sm:text-lg text-neutral-950 dark:text-white font-mono">
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
                              className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                o.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : o.status === "pending"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : o.status === "cancelled"
                                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                      : "bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/10"
                              }`}
                            >
                              {o.status === "active" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                              {o.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 4-Digit Renter Secret PIN Section */}
                      {o.status === "cancelled" ? (
                        <div className="pt-3 border-t border-neutral-200/60 dark:border-white/5 flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                          <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Booking Cancelled • No handover required</span>
                        </div>
                      ) : revealedPins[o.id] ? (
                        <div className="pt-2 border-t border-neutral-200/60 dark:border-white/5">
                          <SecretPinDisplay
                            pin={revealedPins[o.id].pin}
                            type="renter"
                            title="Renter Secret PIN"
                            subtitle="Share this 4-digit code with the equipment owner at handover."
                            onHide={() => handleRevealSecretPin(o.id)}
                            compact={false}
                          />
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-neutral-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-100/60 dark:bg-white/[0.03] p-3.5 rounded-xl border border-neutral-200/60 dark:border-white/5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-white dark:bg-white/10 grid place-items-center text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/10 shrink-0">
                              <KeyRound className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-neutral-900 dark:text-white">
                                Equipment Handover PIN
                              </div>
                              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                Share this 4-digit verification code with the equipment owner at pickup
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevealSecretPin(o.id)}
                            disabled={loadingPinOrderId === o.id}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-neutral-300 dark:border-white/15 hover:bg-neutral-50 dark:hover:bg-white/15 text-neutral-900 dark:text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                            <span>{loadingPinOrderId === o.id ? "Retrieving PIN..." : "Reveal Secret PIN"}</span>
                          </button>
                        </div>
                      )}

                      {/* Live Rental Queue with 8 milestones and live timer */}
                      {o.status !== "cancelled" && (
                        <div className="pt-2">
                          <LiveRentalQueue
                            key={`dashboard-queue-${o.id}`}
                            orderId={o.id}
                            currentStatus={o.status}
                            role="renter"
                            compact={true}
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
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLS: PROFILE COMPLETION + MESSAGES + WISHLIST */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Completeness Card */}
            <div className="rounded-3xl border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/5 grid place-items-center text-neutral-800 dark:text-neutral-200">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Profile Completeness
                  </h3>
                </div>
                <span className="text-xs font-mono font-black text-neutral-900 dark:text-white px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10">
                  {profileStatus.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-500"
                  style={{ width: `${profileStatus.percentage}%` }}
                />
              </div>

              {profileStatus.missing.length > 0 ? (
                <div className="space-y-3 pt-1">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                    Complete remaining items for faster booking verification:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profileStatus.missing.map((item) => (
                      <span
                        key={item}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-white/10"
                      >
                        + {item}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/profile"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-neutral-300/80 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5 text-xs font-bold text-neutral-900 dark:text-white transition-all text-center"
                  >
                    <span>Complete Profile Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
            <div className="rounded-3xl border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/5 grid place-items-center text-neutral-800 dark:text-neutral-200">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Direct Messages
                  </h3>
                </div>
                <Link
                  to="/messages"
                  className="text-xs font-bold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>Inbox</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Chat directly with verified equipment owners to coordinate pickup timing, gear accessories, and return inspections.
              </p>

              <Link
                to="/messages"
                className="w-full h-10 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Messenger Inbox</span>
              </Link>
            </div>

            {/* Wishlist Preview */}
            <div className="rounded-3xl border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#1E1E1E] p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/5 grid place-items-center text-neutral-800 dark:text-neutral-200">
                    <Heart className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Saved Gear ({ids.length})
                  </h3>
                </div>
                <Link
                  to="/wishlist"
                  className="text-xs font-bold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {wishlistItems.length === 0 ? (
                <div className="py-4 text-center space-y-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    No saved gear yet. Tap the heart on any product to save it for upcoming projects.
                  </p>
                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-white hover:underline pt-1"
                  >
                    <span>Browse equipment</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {wishlistItems.map((item) => (
                    <Link
                      key={item.id}
                      to="/product/$id"
                      params={{ id: item.id }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 border border-transparent hover:border-neutral-200/80 dark:hover:border-white/10 transition-all group"
                    >
                      <img
                        src={getOptimizedImageUrl(item.image, 'thumb')}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-11 w-11 rounded-lg object-cover border border-neutral-200 dark:border-white/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
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
