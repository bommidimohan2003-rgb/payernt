import React from "react";
import {
  Wallet,
  BarChart3,
  Package,
  Calendar,
  ChevronRight,
  Plus,
  MessageSquare,
  Zap,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/i18n";
import type {
  PayerntProduct,
  RentalRequest,
  EarningTransaction,
  UserWallet,
  LenderProfile,
  LenderNotification,
  PayerntAccount,
  DemoUser,
  PayerntMessage,
} from "../types";

export interface PayerntHomeProps {
  stats: {
    totalProductsCount: number;
    activeProductsCount: number;
    underVerificationCount: number;
    activeRentalsCount: number;
    pendingRequestsCount: number;
    totalEarnings: number;
    pendingEarnings: number;
  };
  products: PayerntProduct[];
  rentalRequests: RentalRequest[];
  earningsTransactions: EarningTransaction[];
  wallet?: UserWallet;
  profile?: LenderProfile;
  notifications?: LenderNotification[];
  messages?: PayerntMessage[];
  unreadMessagesCount?: number;
  activeAccount?: PayerntAccount | null;
  activeUser?: DemoUser;
  recentActivities?: Array<{ id: string; title: string; timestamp: string; amount?: string }>;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onNavigate: (tab: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages" | "analytics") => void;
  onSelectProductForManage?: (productId: string) => void;
  onLogout?: () => void;
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onMarkMessageRead?: (id: string) => void;
}

export function PayerntHome({
  stats,
  products = [],
  rentalRequests = [],
  earningsTransactions = [],
  wallet,
  profile,
  activeAccount,
  activeUser,
  recentActivities: propRecentActivities,
  isLoading = false,
  error = null,
  onRefresh,
  onNavigate,
  onSelectProductForManage,
}: PayerntHomeProps) {
  // Extract user's display name
  const { tCommon, tPayernt } = useLanguage();
  const rawName =
    activeAccount?.name ||
    activeUser?.fullName ||
    activeUser?.name ||
    profile?.fullName ||
    "Mohan";
  const firstName = rawName.trim().split(" ")[0] || "Mohan";

  // Dynamic greeting based on time of day
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? tPayernt.goodMorning
      : currentHour < 18
      ? tPayernt.goodAfternoon
      : tPayernt.goodEvening;

  // Formatted date string (e.g. "Wed, 01 Oct 2025")
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  // Real backend metrics
  const pendingListings =
    stats?.underVerificationCount ??
    products.filter(
      (p) =>
        p.status === "under_review" ||
        p.status === "pending" ||
        p.status === "pending_admin_review" ||
        p.status === "pending_confirmation" ||
        p.verificationStatus === "under_review"
    ).length;
  const availableBalance = wallet?.availableBalance ?? 0;
  const totalEarnings = stats?.totalEarnings ?? (wallet?.totalReceived ?? wallet?.availableBalance ?? 0);
  const activeProducts =
    stats?.activeProductsCount ??
    products.filter((p) => p.status === "active" || p.status === "approved").length;
  const activeRentals =
    stats?.activeRentalsCount ??
    rentalRequests.filter((r) => r.status === "approved" || r.status === "active").length;

  // Upcoming 1-2 bookings (real data only)
  const upcomingBookings = rentalRequests
    .filter((r) => r.status === "approved" || r.status === "pending" || r.status === "active")
    .slice(0, 3);

  // Products preview (first 2-3 items)
  const previewProducts = products.slice(0, 3);

  // Recent 3-4 activities from real backend/audit data
  const recentActivities =
    propRecentActivities && propRecentActivities.length > 0
      ? propRecentActivities.slice(0, 4)
      : [
          ...earningsTransactions.map((tx) => ({
            id: `tx-${tx.id}`,
            title: tx.description || "Payment received",
            timestamp: tx.timestamp || "Recent",
            amount: tx.amount ? `+₹${tx.amount.toLocaleString("en-IN")}` : undefined,
          })),
          ...rentalRequests.map((req) => ({
            id: `req-${req.id}`,
            title: `Booking: ${req.productTitle || "Tech Gear"}`,
            timestamp: req.requestDate || req.startDate || "Recent",
            amount: req.netEarnings ? `₹${req.netEarnings.toLocaleString("en-IN")}` : undefined,
          })),
        ].slice(0, 4);


  return (
    <div className="w-full">
      {/* ========================================================= */}
      {/* 1. MOBILE LAYOUT (< lg): Preserved 100% untouched touch UX */}
      {/* ========================================================= */}
      <div className="block lg:hidden w-full max-w-4xl mx-auto space-y-3.5 sm:space-y-4 px-0">
        {/* Optional Live Server Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs font-medium">
            <span>Unable to sync live server data.</span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black font-bold text-[11px] active:scale-95 transition-all"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Mobile Greeting */}
        <div className="pt-1 pb-1">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {greeting}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight font-display mt-0.5">
            {firstName}
          </h1>
        </div>

        {/* Mobile 2x2 Metric Grid: Balance, Earnings, Listings, Rentals */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: Balance */}
          <button
            type="button"
            onClick={() => onNavigate("wallet")}
            className="p-4 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-md flex flex-col justify-between text-left transition-all active:scale-[0.98] cursor-pointer min-h-[102px] group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {tPayernt.availableBalance}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="mt-2">
              {isLoading ? (
                <div className="h-7 w-20 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                  ₹{availableBalance.toLocaleString("en-IN")}
                </p>
              )}
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-0.5 truncate">
                {tPayernt.walletFunds}
              </p>
            </div>
          </button>

          {/* Card 2: Earnings */}
          <button
            type="button"
            onClick={() => onNavigate("analytics")}
            className="p-4 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-md flex flex-col justify-between text-left transition-all active:scale-[0.98] cursor-pointer min-h-[102px] group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {tPayernt.totalEarnings}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="mt-2">
              {isLoading ? (
                <div className="h-7 w-20 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                  ₹{totalEarnings.toLocaleString("en-IN")}
                </p>
              )}
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-0.5 truncate">
                {tPayernt.totalIncomeEarned}
              </p>
            </div>
          </button>

          {/* Card 3: Listings */}
          <button
            type="button"
            onClick={() => onNavigate("products")}
            className="p-4 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-md flex flex-col justify-between text-left transition-all active:scale-[0.98] cursor-pointer min-h-[102px] group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {tPayernt.listings}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="mt-2">
              {isLoading ? (
                <div className="h-7 w-12 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                  {String(activeProducts).padStart(2, "0")}
                </p>
              )}
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-0.5 truncate">
                {tPayernt.gearListed}
              </p>
            </div>
          </button>

          {/* Card 4: Rentals */}
          <button
            type="button"
            onClick={() => onNavigate("requests")}
            className="p-4 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-md flex flex-col justify-between text-left transition-all active:scale-[0.98] cursor-pointer min-h-[102px] group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {tPayernt.activeRentals}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="mt-2">
              {isLoading ? (
                <div className="h-7 w-12 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                  {String(activeRentals).padStart(2, "0")}
                </p>
              )}
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-0.5 truncate">
                {tPayernt.activeBookings}
              </p>
            </div>
          </button>
        </div>

        {/* Mobile Upcoming Bookings */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-900 dark:text-white font-display">
              Upcoming Bookings
            </span>
            <button
              type="button"
              onClick={() => onNavigate("requests")}
              className="flex items-center gap-0.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              aria-label="View all upcoming bookings"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2 py-2">
              <div className="p-3 rounded-xl bg-neutral-100/60 dark:bg-white/[0.04] animate-pulse space-y-1.5">
                <div className="h-3.5 w-32 bg-neutral-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-20 bg-neutral-200 dark:bg-white/10 rounded" />
              </div>
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar className="h-7 w-7 text-neutral-400 dark:text-neutral-500 mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                No upcoming bookings
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingBookings.slice(0, 2).map((b) => (
                <div
                  key={b.id}
                  onClick={() => onNavigate("requests")}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] hover:bg-neutral-100/80 dark:hover:bg-white/[0.06] border border-neutral-200/60 dark:border-white/5 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {b.productTitle}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {b.startDate} → {b.endDate}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white shrink-0">
                    ₹{(b.totalPrice ?? (b as any).total ?? (b as any).amount ?? b.dailyRate * 3)?.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Mobile Your Products */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-900 dark:text-white font-display">
              Your Products
            </span>
            <button
              type="button"
              onClick={() => onNavigate("products")}
              className="flex items-center gap-0.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              aria-label="View all products"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2 py-2">
              <div className="p-3 rounded-xl bg-neutral-100/60 dark:bg-white/[0.04] animate-pulse space-y-1.5">
                <div className="h-3.5 w-32 bg-neutral-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-16 bg-neutral-200 dark:bg-white/10 rounded" />
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">
                No listings yet
              </p>
              <button
                type="button"
                onClick={() => onNavigate("list")}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer min-h-[44px]"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Add Product</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {previewProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() =>
                    onSelectProductForManage
                      ? onSelectProductForManage(p.id)
                      : onNavigate("products")
                  }
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] hover:bg-neutral-100/80 dark:hover:bg-white/[0.06] border border-neutral-200/60 dark:border-white/5 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="p-2 rounded-lg bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 shrink-0">
                      <Package className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {p.title}
                      </p>
                      <span className="text-[10px] uppercase font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider">
                        {p.status || "Active"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white shrink-0">
                    ₹{(p.dailyRate ?? p.daily_rate ?? (p as any).pricePerDay ?? p.price ?? p.pricing?.daily ?? 0)}/d
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Mobile Wallet Summary */}
        <button
          type="button"
          onClick={() => onNavigate("wallet")}
          className="w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-md flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer group"
        >
          <div>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Wallet
            </span>
            <p className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display mt-0.5">
              ₹{availableBalance.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 block">
              Available
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white">
            <span>View</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </button>

        {/* Mobile Quick Actions */}
        <div className="pt-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2.5 px-0.5">
            {tPayernt.quickActions}
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => onNavigate("list")}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04] shadow-xs active:scale-95 transition-all min-h-[50px] cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black shrink-0">
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                {tPayernt.addProduct}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("requests")}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04] shadow-xs active:scale-95 transition-all min-h-[50px] cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-neutral-100 text-neutral-800 dark:bg-white/[0.06] dark:text-neutral-200 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                {tCommon.bookings}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("wallet")}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04] shadow-xs active:scale-95 transition-all min-h-[50px] cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-neutral-100 text-neutral-800 dark:bg-white/[0.06] dark:text-neutral-200 shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                {tCommon.wallet}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("messages")}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04] shadow-xs active:scale-95 transition-all min-h-[50px] cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-neutral-100 text-neutral-800 dark:bg-white/[0.06] dark:text-neutral-200 shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                {tCommon.messages}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("analytics")}
              className="col-span-2 flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] text-left hover:bg-neutral-50 dark:hover:bg-white/[0.04] shadow-xs active:scale-95 transition-all min-h-[50px] cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-neutral-100 text-neutral-800 dark:bg-white/[0.06] dark:text-neutral-200 shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                {tCommon.analytics}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Recent Activity */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10141d] border border-neutral-200/90 dark:border-white/[0.08] shadow-xs dark:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-white font-display">
              {tPayernt.recentActivity}
            </span>
            <button
              type="button"
              onClick={() => onNavigate("analytics")}
              className="flex items-center gap-0.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="h-7 w-7 text-neutral-400 dark:text-neutral-500 mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {tPayernt.noRecentActivity}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate pr-2">
                    {act.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {act.amount && (
                      <span className="font-bold text-neutral-900 dark:text-neutral-200">
                        {act.amount}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                      {act.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LARGE SCREEN LAYOUT (lg:block): Exact Match of Mockup  */}
      {/* ========================================================= */}
      <div className="hidden lg:block w-full">
        {/* Main Outer Container Card */}
        <div className="relative rounded-3xl bg-white dark:bg-[#0c0f16] border border-neutral-200/90 dark:border-white/[0.08] p-7 lg:p-9 shadow-xl dark:shadow-2xl overflow-hidden text-neutral-900 dark:text-white transition-colors duration-200">
          {/* Subtle Organic Gloss Wave Overlay */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-neutral-500/[0.03] dark:from-white/[0.04] to-transparent pointer-events-none" />

          {/* Optional Live Server Error Banner */}
          {error && (
            <div className="relative z-10 mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs font-medium">
              <span>Unable to sync latest live metrics with server. Showing cached data.</span>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-3 py-1 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  Retry Live Sync
                </button>
              )}
            </div>
          )}

          {/* 1. Header: Greeting (Left) & Status/Date (Right) */}
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-neutral-500 dark:text-neutral-300 font-display tracking-tight">
                {greeting}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-3xl lg:text-4xl font-black text-neutral-900 dark:text-white font-display tracking-tight">
                  {firstName}
                </h1>
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-900 dark:bg-white inline-block shrink-0 mt-1" />
              </div>
              <div className="w-14 h-[3px] bg-neutral-300 dark:bg-neutral-500 rounded-full mt-2.5" />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* 2. Top 4 Metric Cards in One Line (4 Cols) */}
          <div className="relative z-10 grid grid-cols-4 gap-4 mt-8">
            {/* Metric 1: Available Balance */}
            <button
              type="button"
              onClick={() => onNavigate("wallet")}
              className="group p-5 rounded-2xl bg-neutral-50/90 hover:bg-neutral-100/90 border-neutral-200/90 dark:bg-[#10141d]/90 dark:hover:bg-[#141924] dark:border-white/[0.07] border flex flex-col justify-between shadow-sm dark:shadow-lg text-left transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 text-neutral-700 group-hover:text-black dark:text-neutral-200 dark:group-hover:text-white transition-colors shrink-0">
                      <Wallet className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-tight truncate">
                        {tPayernt.availableBalance}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate">
                        {tPayernt.walletFunds}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>

                <div className="mt-4">
                  {isLoading ? (
                    <div className="h-8 w-24 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
                  ) : (
                    <span className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                      ₹{availableBalance.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-[3px] w-full bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden mt-5">
                <div className="h-full bg-neutral-800 dark:bg-white/80 rounded-full w-2/5" />
              </div>
            </button>

            {/* Metric 2: Total Earnings */}
            <button
              type="button"
              onClick={() => onNavigate("analytics")}
              className="group p-5 rounded-2xl bg-neutral-50/90 hover:bg-neutral-100/90 border-neutral-200/90 dark:bg-[#10141d]/90 dark:hover:bg-[#141924] dark:border-white/[0.07] border flex flex-col justify-between shadow-sm dark:shadow-lg text-left transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 text-neutral-700 group-hover:text-black dark:text-neutral-200 dark:group-hover:text-white transition-colors shrink-0">
                      <BarChart3 className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-tight truncate">
                        {tPayernt.totalEarnings}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate">
                        {tPayernt.totalIncomeEarned}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>

                <div className="mt-4">
                  {isLoading ? (
                    <div className="h-8 w-24 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
                  ) : (
                    <span className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                      ₹{totalEarnings.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-[3px] w-full bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden mt-5">
                <div className="h-full bg-neutral-800 dark:bg-white/80 rounded-full w-1/2" />
              </div>
            </button>

            {/* Metric 3: Active Listings */}
            <button
              type="button"
              onClick={() => onNavigate("products")}
              className="group p-5 rounded-2xl bg-neutral-50/90 hover:bg-neutral-100/90 border-neutral-200/90 dark:bg-[#10141d]/90 dark:hover:bg-[#141924] dark:border-white/[0.07] border flex flex-col justify-between shadow-sm dark:shadow-lg text-left transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 text-neutral-700 group-hover:text-black dark:text-neutral-200 dark:group-hover:text-white transition-colors shrink-0">
                      <Package className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-tight truncate">
                        {tPayernt.listings}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate">
                        {tPayernt.gearListed}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>

                <div className="mt-4">
                  {isLoading ? (
                    <div className="h-8 w-14 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
                  ) : (
                    <span className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                      {String(activeProducts).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-[3px] w-full bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden mt-5">
                <div className="h-full bg-neutral-800 dark:bg-white/80 rounded-full w-3/5" />
              </div>
            </button>

            {/* Metric 4: Active Rentals */}
            <button
              type="button"
              onClick={() => onNavigate("requests")}
              className="group p-5 rounded-2xl bg-neutral-50/90 hover:bg-neutral-100/90 border-neutral-200/90 dark:bg-[#10141d]/90 dark:hover:bg-[#141924] dark:border-white/[0.07] border flex flex-col justify-between shadow-sm dark:shadow-lg text-left transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 text-neutral-700 group-hover:text-black dark:text-neutral-200 dark:group-hover:text-white transition-colors shrink-0">
                      <Calendar className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-tight truncate">
                        {tPayernt.activeRentals}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate">
                        {tPayernt.activeBookings}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>

                <div className="mt-4">
                  {isLoading ? (
                    <div className="h-8 w-14 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
                  ) : (
                    <span className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                      {String(activeRentals).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-[3px] w-full bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden mt-5">
                <div className="h-full bg-neutral-800 dark:bg-white/80 rounded-full w-1/3" />
              </div>
            </button>
          </div>

          {/* 3. Middle Section: Upcoming Bookings (8 Cols) & Your Products (4 Cols) */}
          <div className="relative z-10 grid grid-cols-12 gap-5 mt-5">
            {/* Upcoming Bookings (Wide Card - 8 Cols) */}
            <div className="col-span-8 p-6 rounded-2xl bg-neutral-50/90 border-neutral-200/90 dark:bg-[#10141d]/90 dark:border-white/[0.07] border flex flex-col justify-between shadow-sm dark:shadow-lg min-h-[220px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-200 font-display">
                    Upcoming Bookings
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("requests")}
                  className="h-7 w-7 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/15 dark:border-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="View All Bookings"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-2.5 my-auto py-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] animate-pulse space-y-2 border border-neutral-200/80 dark:border-white/5">
                    <div className="h-3.5 w-48 bg-neutral-200 dark:bg-white/10 rounded" />
                    <div className="h-2.5 w-28 bg-neutral-200 dark:bg-white/10 rounded" />
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] animate-pulse space-y-2 border border-neutral-200/80 dark:border-white/5">
                    <div className="h-3.5 w-40 bg-neutral-200 dark:bg-white/10 rounded" />
                    <div className="h-2.5 w-24 bg-neutral-200 dark:bg-white/10 rounded" />
                  </div>
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <Calendar className="h-9 w-9 text-neutral-400 dark:text-neutral-500 stroke-[1.4]" />
                  <div className="w-20 h-[2.5px] bg-neutral-300 dark:bg-neutral-700 rounded-full mt-4" />
                  <div className="w-12 h-[2.5px] bg-neutral-200 dark:bg-neutral-800 rounded-full mt-2" />
                </div>
              ) : (
                <div className="space-y-2.5 my-auto py-3">
                  {upcomingBookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onNavigate("requests")}
                      className="p-3 rounded-xl bg-white dark:bg-white/[0.03] hover:bg-neutral-100/80 dark:hover:bg-white/[0.06] border border-neutral-200/80 dark:border-white/5 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-sm">
                          {b.productTitle}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {b.startDate} → {b.endDate}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        ₹{(b.totalPrice ?? (b as any).total ?? (b as any).amount ?? b.dailyRate * 3)?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Your Products (Compact Card - 4 Cols) */}
            <div className="col-span-4 p-6 rounded-2xl bg-neutral-50/90 border-neutral-200/90 dark:bg-[#10141d]/90 dark:border-white/[0.07] border flex flex-col justify-between shadow-sm dark:shadow-lg min-h-[220px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200">
                    <Package className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-200 font-display">
                    Your Products
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("products")}
                  className="h-7 w-7 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/15 dark:border-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="View All Products"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex flex-col justify-between flex-1 pt-3 space-y-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] animate-pulse space-y-2 border border-neutral-200/80 dark:border-white/5">
                    <div className="h-3.5 w-32 bg-neutral-200 dark:bg-white/10 rounded" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] animate-pulse space-y-2 border border-neutral-200/80 dark:border-white/5">
                    <div className="h-3.5 w-36 bg-neutral-200 dark:bg-white/10 rounded" />
                  </div>
                </div>
              ) : previewProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <Package className="h-9 w-9 text-neutral-400 dark:text-neutral-500 stroke-[1.4]" />
                  <div className="w-14 h-[2.5px] bg-neutral-300 dark:bg-neutral-700 rounded-full mt-4 mb-6" />
                  <button
                    type="button"
                    onClick={() => onNavigate("list")}
                    className="w-full py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Add Product</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col justify-between flex-1 pt-3">
                  <div className="space-y-2">
                    {previewProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() =>
                          onSelectProductForManage
                            ? onSelectProductForManage(p.id)
                            : onNavigate("products")
                        }
                        className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] hover:bg-neutral-100/80 dark:hover:bg-white/[0.06] border border-neutral-200/80 dark:border-white/5 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[150px]">
                          {p.title}
                        </span>
                        <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                          ₹{(p.dailyRate ?? p.daily_rate ?? (p as any).pricePerDay ?? p.price ?? p.pricing?.daily ?? 0)}/d
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate("list")}
                    className="w-full mt-3 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Add Product</span>
                  </button>
                </div>
              )}
            </div>
          </div>


          {/* 4. Lower Row: Quick Actions (8 Cols) & Wallet Card (4 Cols) */}
          <div className="relative z-10 grid grid-cols-12 gap-5 mt-5">
            {/* Quick Action Tiles (6 Tiles - 8 Cols) */}
            <div className="col-span-8 grid grid-cols-6 gap-3">
              {/* 1. Add Product Tile (Elevated Soft Highlight) */}
              <button
                type="button"
                onClick={() => onNavigate("list")}
                className="flex items-center justify-center h-20 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-300/80 text-neutral-900 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] dark:border-white/15 dark:text-white shadow-xs dark:shadow-md transition-all active:scale-95 cursor-pointer group"
                title="Add Product"
              >
                <div className="h-10 w-10 rounded-full bg-white dark:bg-white/[0.15] border border-neutral-300 dark:border-white/20 flex items-center justify-center text-neutral-900 dark:text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
                </div>
              </button>

              {/* 2. Products Tile */}
              <button
                type="button"
                onClick={() => onNavigate("products")}
                className="flex items-center justify-center h-20 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/90 text-neutral-700 hover:text-black dark:bg-[#10141d]/90 dark:hover:bg-white/[0.08] dark:border-white/[0.07] dark:text-neutral-300 dark:hover:text-white shadow-xs dark:shadow-lg transition-all active:scale-95 cursor-pointer group"
                title="Your Products"
              >
                <Package className="h-5 w-5 stroke-[1.8] group-hover:scale-105 transition-transform" />
              </button>

              {/* 3. Bookings Tile */}
              <button
                type="button"
                onClick={() => onNavigate("requests")}
                className="flex items-center justify-center h-20 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/90 text-neutral-700 hover:text-black dark:bg-[#10141d]/90 dark:hover:bg-white/[0.08] dark:border-white/[0.07] dark:text-neutral-300 dark:hover:text-white shadow-xs dark:shadow-lg transition-all active:scale-95 cursor-pointer group"
                title="Bookings"
              >
                <Calendar className="h-5 w-5 stroke-[1.8] group-hover:scale-105 transition-transform" />
              </button>

              {/* 4. Wallet Tile */}
              <button
                type="button"
                onClick={() => onNavigate("wallet")}
                className="flex items-center justify-center h-20 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/90 text-neutral-700 hover:text-black dark:bg-[#10141d]/90 dark:hover:bg-white/[0.08] dark:border-white/[0.07] dark:text-neutral-300 dark:hover:text-white shadow-xs dark:shadow-lg transition-all active:scale-95 cursor-pointer group"
                title="Wallet"
              >
                <Wallet className="h-5 w-5 stroke-[1.8] group-hover:scale-105 transition-transform" />
              </button>

              {/* 5. Messages Tile */}
              <button
                type="button"
                onClick={() => onNavigate("messages")}
                className="flex items-center justify-center h-20 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/90 text-neutral-700 hover:text-black dark:bg-[#10141d]/90 dark:hover:bg-white/[0.08] dark:border-white/[0.07] dark:text-neutral-300 dark:hover:text-white shadow-xs dark:shadow-lg transition-all active:scale-95 cursor-pointer group"
                title="Messages"
              >
                <MessageSquare className="h-5 w-5 stroke-[1.8] group-hover:scale-105 transition-transform" />
              </button>

              {/* 6. Analytics Tile */}
              <button
                type="button"
                onClick={() => onNavigate("analytics")}
                className="flex items-center justify-center h-20 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/90 text-neutral-700 hover:text-black dark:bg-[#10141d]/90 dark:hover:bg-white/[0.08] dark:border-white/[0.07] dark:text-neutral-300 dark:hover:text-white shadow-xs dark:shadow-lg transition-all active:scale-95 cursor-pointer group"
                title="Analytics"
              >
                <BarChart3 className="h-5 w-5 stroke-[1.8] group-hover:scale-105 transition-transform" />
              </button>
            </div>

            {/* Wallet Summary Card (4 Cols) */}
            <div
              onClick={() => onNavigate("wallet")}
              className="col-span-4 p-5 rounded-2xl bg-neutral-50/90 hover:bg-neutral-100/90 border-neutral-200/90 dark:bg-[#10141d]/90 dark:hover:bg-[#141924] dark:border-white/[0.07] border flex flex-col justify-between shadow-sm dark:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 text-neutral-700 group-hover:text-black dark:text-neutral-200 dark:group-hover:text-white transition-colors">
                    <Wallet className="h-5 w-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Wallet</p>
                    <p className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-display">
                      ₹{availableBalance.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="h-7 w-7 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-white/[0.06] dark:group-hover:bg-white/15 dark:border-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="h-[3px] flex-1 bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden mr-3">
                  <div className="h-full bg-neutral-800 dark:bg-white/70 rounded-full w-2/3" />
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-800 dark:group-hover:text-neutral-300 transition-colors" />
              </div>
            </div>
          </div>

          {/* 5. Bottom Card: Recent Activity (Full Width) */}
          <div className="relative z-10 mt-5 p-6 rounded-2xl bg-neutral-50/90 border-neutral-200/90 dark:bg-[#10141d]/90 dark:border-white/[0.07] border shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200">
                  <Zap className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-200 font-display">
                  Recent Activity
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("analytics")}
                className="h-7 w-7 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/15 dark:border-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="View All Activity"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Clock className="h-9 w-9 text-neutral-400 dark:text-neutral-500 stroke-[1.4]" />
                <div className="w-20 h-[2.5px] bg-neutral-300 dark:bg-neutral-700 rounded-full mt-4" />
                <div className="w-12 h-[2.5px] bg-neutral-200 dark:bg-neutral-800 rounded-full mt-2" />
              </div>
            ) : (
              <div className="divide-y divide-neutral-200/80 dark:divide-white/5 mt-3">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-md">
                      {act.title}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      {act.amount && (
                        <span className="font-bold text-neutral-900 dark:text-neutral-300">{act.amount}</span>
                      )}
                      <span className="text-[11px] text-neutral-500">{act.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayerntHome;
