import React, { useState, useMemo } from "react";
import {
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  Package,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Eye,
  Camera,
  Laptop,
  Bike,
  Wrench,
  Activity,
  Layers,
  FileCheck2,
  Wallet,
  Coins,
  ChevronRight,
  Shield,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Settings,
  User,
  Check,
  RotateCcw,
  HelpCircle,
  BarChart3,
  SlidersHorizontal,
  Radio,
  Mic,
  Gamepad2,
  Monitor,
  Car,
  Filter,
  ArrowUpRight,
  Lock,
  RefreshCw,
  Sliders,
  Menu,
  X,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type {
  PayerntProduct,
  RentalRequest,
  EarningTransaction,
  UserWallet,
  LenderProfile,
  LenderNotification,
  PayerntAccount,
  DemoUser,
} from "../types";
import { useTheme } from "@/hooks/useTheme";
import { PayerntGlobalSearch } from "./PayerntGlobalSearch";

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
  onNavigate: (tab: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages") => void;
  onSelectProductForManage?: (productId: string) => void;
  onLogout?: () => void;
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onMarkMessageRead?: (id: string) => void;
}

// Icon mapper for gear categories (NO IMAGES)
function getCategoryIcon(category?: string, title?: string) {
  const cat = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (
    cat.includes("camera") ||
    cat.includes("photo") ||
    cat.includes("lens") ||
    t.includes("camera") ||
    t.includes("sony") ||
    t.includes("canon") ||
    t.includes("nikon") ||
    t.includes("fuji") ||
    t.includes("lumix") ||
    t.includes("bmpcc")
  ) {
    return Camera;
  }
  if (
    cat.includes("laptop") ||
    cat.includes("computer") ||
    cat.includes("pc") ||
    t.includes("macbook") ||
    t.includes("laptop") ||
    t.includes("vivobook") ||
    t.includes("thinkpad") ||
    t.includes("dell") ||
    t.includes("asus")
  ) {
    return Laptop;
  }
  if (
    cat.includes("drone") ||
    cat.includes("aerial") ||
    t.includes("drone") ||
    t.includes("dji") ||
    t.includes("mavic")
  ) {
    return Radio;
  }
  if (
    cat.includes("audio") ||
    cat.includes("sound") ||
    cat.includes("mic") ||
    t.includes("mic") ||
    t.includes("shure") ||
    t.includes("headphone") ||
    t.includes("speaker") ||
    t.includes("rode")
  ) {
    return Mic;
  }
  if (
    cat.includes("game") ||
    cat.includes("gaming") ||
    cat.includes("vr") ||
    t.includes("steam") ||
    t.includes("quest") ||
    t.includes("playstation") ||
    t.includes("xbox") ||
    t.includes("nintendo")
  ) {
    return Gamepad2;
  }
  if (
    cat.includes("bike") ||
    cat.includes("cycle") ||
    cat.includes("vehicle") ||
    cat.includes("car") ||
    t.includes("bike") ||
    t.includes("scooter") ||
    t.includes("car")
  ) {
    return Bike;
  }
  if (
    cat.includes("tool") ||
    cat.includes("hardware") ||
    cat.includes("drill") ||
    t.includes("tool") ||
    t.includes("drill") ||
    t.includes("wrench")
  ) {
    return Wrench;
  }
  if (
    cat.includes("electronic") ||
    cat.includes("monitor") ||
    cat.includes("tv") ||
    cat.includes("display") ||
    t.includes("monitor") ||
    t.includes("screen")
  ) {
    return Monitor;
  }
  return Package;
}

// Generate CSS avatar initials
function getInitials(name?: string, fallback = "LD"): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PayerntHome({
  stats,
  products,
  rentalRequests,
  earningsTransactions,
  wallet,
  profile,
  notifications = [],
  messages = [],
  unreadMessagesCount = 0,
  activeAccount,
  activeUser,
  onNavigate,
  onSelectProductForManage,
  onLogout,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onMarkMessageRead,
}: PayerntHomeProps) {
  const { theme, toggle: toggleTheme } = useTheme();

  // Dashboard filter & UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "30d" | "7d">("all");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string>("home");

  // Account information
  const accountName =
    activeAccount?.name || activeUser?.fullName || activeUser?.name || "Lender";
  const userInitials = getInitials(accountName, "LD");
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Filter listings based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.location?.city || "").toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // Filter booking requests based on search query
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return rentalRequests;
    const q = searchQuery.toLowerCase().trim();
    return rentalRequests.filter(
      (r) =>
        r.productTitle.toLowerCase().includes(q) ||
        r.renter.name.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rentalRequests, searchQuery]);

  // Real financial metrics calculation based on timeFilter
  const financialData = useMemo(() => {
    const totalEarned = stats.totalEarnings;
    const availableBalance = wallet?.availableBalance ?? stats.totalEarnings;
    const pendingPayout = wallet?.pendingBalance ?? stats.pendingEarnings;
    const activeEscrow = stats.pendingEarnings;
    const totalWithdrawn = wallet?.totalWithdrawn ?? 0;

    return {
      totalEarned,
      availableBalance,
      pendingPayout,
      activeEscrow,
      totalWithdrawn,
    };
  }, [stats, wallet]);

  // Category distribution calculation from real products
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([category, count]) => ({
      category,
      count,
      Icon: getCategoryIcon(category),
    }));
  }, [products]);

  // Earnings chart series data from real transactions
  const chartData = useMemo(() => {
    if (!earningsTransactions || earningsTransactions.length === 0) {
      return [];
    }

    // Group transactions by date
    const grouped: Record<string, number> = {};
    earningsTransactions.forEach((tx) => {
      const dateStr = tx.payoutDate ? tx.payoutDate.slice(0, 10) : "Recent";
      grouped[dateStr] = (grouped[dateStr] || 0) + (tx.netPayout || 0);
    });

    const entries = Object.entries(grouped).map(([date, amount]) => ({
      date: date.length > 5 ? date.slice(5) : date,
      amount,
    }));

    return entries.length > 0 ? entries : [];
  }, [earningsTransactions]);

  // Handle Retry
  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* ERROR STATE */}
      {hasError && (
        <div className="p-8 text-center max-w-lg mx-auto my-12 rounded-3xl border border-destructive/30 bg-destructive/5 space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h3 className="text-lg font-bold text-foreground font-display">
            Unable to load your dashboard
          </h3>
          <p className="text-xs text-muted-foreground">
            We encountered a network error while retrieving your lending portfolio. Please try again.
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {!hasError && (
        <div className="flex flex-1 w-full mx-auto relative min-h-screen">
          {/* ======================================================== */}
          {/* DESKTOP LEFT SIDEBAR (FIXED VIEWPORT PINNED)             */}
          {/* ======================================================== */}
          <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border/70 bg-card/95 backdrop-blur-md p-4 space-y-6 fixed top-0 left-0 bottom-0 h-screen overflow-y-auto select-none z-30">
            {/* Sidebar Brand Header */}
            <div className="flex items-center justify-between px-2 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background font-black text-lg tracking-tight shadow-sm">
                  ₹
                </div>
                <div>
                  <div className="font-black text-lg text-foreground tracking-tight leading-none font-display">
                    paYent
                  </div>
                  <div className="inline-block mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] uppercase tracking-wider border border-emerald-500/20">
                    Lender
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 space-y-1">
              <button
                onClick={() => {
                  setActiveNavId("home");
                  onNavigate("home");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  activeNavId === "home"
                    ? "bg-secondary text-foreground font-bold border-l-2 border-emerald-500 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package
                    className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${
                      activeNavId === "home" ? "text-emerald-500" : "text-muted-foreground"
                    }`}
                  />
                  <span>Home</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveNavId("products");
                  onNavigate("products");
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  <span>My Listings</span>
                </div>
                {products.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-foreground border border-border">
                    {String(products.length).padStart(2, "0")}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveNavId("list");
                  onNavigate("list");
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Plus className="h-4 w-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                  <span>Create Listing</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveNavId("requests");
                  onNavigate("requests");
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  <span>Bookings</span>
                </div>
                {stats.pendingRequestsCount > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {stats.pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveNavId("wallet");
                  onNavigate("wallet");
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  <span>Wallet</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveNavId("messages");
                  onNavigate("messages");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  activeNavId === "messages"
                    ? "bg-secondary text-foreground font-bold border-l-2 border-emerald-500 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  <span>Messages</span>
                </div>
                {unreadMessagesCount > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[10px] shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    {unreadMessagesCount > 9 ? "9+" : `0${unreadMessagesCount}`}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isNotifOpen
                    ? "bg-secondary text-foreground font-bold border-l-2 border-emerald-500 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  <span>Notifications</span>
                </div>
                {unreadNotifCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[10px] shadow-xs">
                    {unreadNotifCount > 9 ? "9+" : `0${unreadNotifCount}`}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById("analytics-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  <span>Analytics</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onNavigate("profile");
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  <span>Help & Support</span>
                </div>
              </button>
            </nav>

            {/* Sidebar Bottom Account Area (NO IMAGE - CSS INITIALS) */}
            <div className="pt-4 border-t border-border/70 space-y-3">
              <div
                onClick={() => onNavigate("profile")}
                className="flex items-center gap-3 p-2 rounded-2xl bg-secondary/40 hover:bg-secondary transition-colors cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-xs shadow-2xs">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-bold text-xs text-foreground truncate">{accountName}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">Lender Account</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold text-muted-foreground">
                <button
                  onClick={() => onNavigate("profile")}
                  className="py-1.5 px-2 rounded-lg hover:text-foreground hover:bg-secondary/60 text-center transition-colors cursor-pointer"
                >
                  Profile
                </button>
                <button
                  onClick={() => onNavigate("profile")}
                  className="py-1.5 px-2 rounded-lg hover:text-foreground hover:bg-secondary/60 text-center transition-colors cursor-pointer"
                >
                  Settings
                </button>
                <button
                  onClick={onLogout}
                  className="py-1.5 px-2 rounded-lg hover:text-destructive hover:bg-destructive/10 text-center transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* ======================================================== */}
          {/* MAIN DASHBOARD CONTENT AREA                              */}
          {/* ======================================================== */}
          <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pl-64 w-full">
            {/* TOP COMMAND BAR */}
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-4 sm:px-8 backdrop-blur-xl transition-all">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                  className="lg:hidden p-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary cursor-pointer"
                  aria-label="Toggle navigation"
                >
                  {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>

                <div className="text-left">
                  <h1 className="text-base sm:text-lg font-black text-foreground font-display leading-tight">
                    Dashboard
                  </h1>
                  <p className="text-[11px] text-muted-foreground hidden sm:block">
                    Your lending activity at a glance.
                  </p>
                </div>
              </div>

              {/* Global Page Navigation Search (Desktop & Tablet) */}
              <div className="mx-4 hidden md:block w-full max-w-xs sm:max-w-md">
                <PayerntGlobalSearch
                  onNavigate={onNavigate}
                  unreadMessagesCount={unreadMessagesCount}
                />
              </div>

              {/* Top Right Action Icons */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Notification Bell with Popover */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="relative p-2 rounded-xl border border-border/80 bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-white">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popover */}
                  <AnimatePresence>
                    {isNotifOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsNotifOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card p-4 shadow-xl z-50 text-left space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-xs text-foreground font-display">
                                Notifications
                              </h3>
                              {unreadNotifCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[9px]">
                                  {unreadNotifCount} new
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {notifications.length > 0 && onMarkAllNotificationsRead && (
                                <button
                                  onClick={onMarkAllNotificationsRead}
                                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                                >
                                  Mark all read
                                </button>
                              )}
                              <button
                                onClick={() => setIsNotifOpen(false)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {notifications.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              No notifications
                            </p>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={() => onMarkNotificationRead?.(n.id)}
                                className={`p-2.5 rounded-xl border transition-colors cursor-pointer text-xs ${
                                  n.read
                                    ? "bg-secondary/20 border-border/40 text-muted-foreground"
                                    : "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                                }`}
                              >
                                <p className="font-bold text-foreground text-[11px]">{n.title}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl border border-border/80 bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                {/* Initials Avatar Pill */}
                <button
                  onClick={() => onNavigate("profile")}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-[10px]">
                    {userInitials}
                  </div>
                  <span className="hidden sm:inline font-bold text-xs max-w-[100px] truncate">
                    {accountName}
                  </span>
                </button>
              </div>
            </header>

            {/* MOBILE SIDEBAR DRAWER */}
            <AnimatePresence>
              {isMobileSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl p-6 flex flex-col space-y-6 text-left"
                >
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background font-black text-sm">
                        ₹
                      </div>
                      <span className="font-bold text-base text-foreground font-display">
                        paYent Lender
                      </span>
                    </div>
                    <button
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="p-2 rounded-xl border border-border text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <nav className="flex-1 space-y-2">
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        onNavigate("home");
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary font-bold text-sm text-foreground"
                    >
                      <Package className="h-4 w-4 text-emerald-500" />
                      <span>Home</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        onNavigate("products");
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary text-sm text-muted-foreground hover:text-foreground"
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="h-4 w-4" />
                        <span>My Listings</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-secondary">
                        {products.length}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        onNavigate("list");
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-4 w-4 text-emerald-500" />
                      <span>Create Listing</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        onNavigate("requests");
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary text-sm text-muted-foreground hover:text-foreground"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4" />
                        <span>Bookings</span>
                      </div>
                      {stats.pendingRequestsCount > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary text-primary-foreground">
                          {stats.pendingRequestsCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        onNavigate("wallet");
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Wallet className="h-4 w-4" />
                      <span>Wallet & Earnings</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        onNavigate("messages");
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary text-sm text-muted-foreground hover:text-foreground"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4" />
                        <span>Messages</span>
                      </div>
                      {unreadMessagesCount > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500 text-white">
                          {unreadMessagesCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        setIsNotifOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary text-sm text-muted-foreground hover:text-foreground"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                      </div>
                      {unreadNotifCount > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500 text-white">
                          {unreadNotifCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        onNavigate("profile");
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary text-sm text-muted-foreground hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile & Settings</span>
                    </button>
                  </nav>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-xs">
                        {userInitials}
                      </div>
                      <span className="font-bold text-xs text-foreground">{accountName}</span>
                    </div>
                    <button
                      onClick={onLogout}
                      className="text-xs font-bold text-destructive hover:underline"
                    >
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MAIN DASHBOARD BODY */}
            <main className="px-4 sm:px-8 pt-6 sm:pt-8 space-y-8 text-left max-w-7xl mx-auto w-full">
              {/* ======================================================== */}
              {/* 1. HERO SECTION (NO IMAGES - TYPOGRAPHY & ABSTRACT CSS)  */}
              {/* ======================================================== */}
              <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-secondary/30 p-5 sm:p-7 md:p-8 shadow-xs">
                {/* Abstract geometric background grid & glows */}
                <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/10 blur-[90px]" />
                <div className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-[90px]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.04),transparent_50%)]" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left Column: Headline & Action Hub */}
                  <div className="max-w-2xl space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 backdrop-blur-md">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Lender Command Center</span>
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground font-display leading-tight">
                      Turn your gear into <br className="hidden sm:inline" />
                      <span className="bg-gradient-to-r from-foreground via-foreground/90 to-emerald-500 bg-clip-text text-transparent">
                        predictable earnings.
                      </span>
                    </h2>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl font-normal">
                      List your equipment, manage rentals, and track your earnings from one place.
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => onNavigate("list")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[3]" />
                        <span>+ Create New Listing</span>
                      </button>

                      <button
                        onClick={() => onNavigate("wallet")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Open Wallet</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Hero Quick Metrics Rail (Real Data Only) */}
                  <div className="grid grid-cols-2 gap-2.5 w-full lg:w-72 shrink-0">
                    <div className="p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card/80 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Active Listings
                      </p>
                      <p className="mt-0.5 text-xl font-black text-foreground font-display">
                        {String(stats.activeProductsCount).padStart(2, "0")}
                      </p>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card/80 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pending Review
                      </p>
                      <p className="mt-0.5 text-xl font-black text-amber-600 dark:text-amber-400 font-display">
                        {String(stats.underVerificationCount).padStart(2, "0")}
                      </p>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card/80 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Total Earned
                      </p>
                      <p className="mt-0.5 text-lg font-black text-emerald-600 dark:text-emerald-400 font-display">
                        ₹{stats.totalEarnings.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card/80 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pending Amount
                      </p>
                      <p className="mt-0.5 text-lg font-black text-blue-600 dark:text-blue-400 font-display">
                        ₹{stats.pendingEarnings.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ======================================================== */}
              {/* 2. FINANCIAL OVERVIEW COMMAND CENTER                     */}
              {/* ======================================================== */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-foreground font-display">
                      Financial Overview
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Real-time wallet balance, escrow reserves, and payout summaries.
                    </p>
                  </div>

                  {/* Optional Time Range Filter */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/40 border border-border/80 text-xs self-start sm:self-auto">
                    <button
                      onClick={() => setTimeFilter("7d")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        timeFilter === "7d"
                          ? "bg-card text-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Last 7 days
                    </button>
                    <button
                      onClick={() => setTimeFilter("30d")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        timeFilter === "30d"
                          ? "bg-card text-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Last 30 days
                    </button>
                    <button
                      onClick={() => setTimeFilter("all")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        timeFilter === "all"
                          ? "bg-card text-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All time
                    </button>
                  </div>
                </div>

                {/* 5 Financial Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* Card 1: Total Earned */}
                  <div
                    onClick={() => onNavigate("wallet")}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/40 active:scale-[0.98] transition-all cursor-pointer shadow-xs text-left"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Earned</span>
                      <IndianRupee className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display truncate">
                      ₹{financialData.totalEarned.toLocaleString("en-IN")}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Lifetime yield</p>
                  </div>

                  {/* Card 2: Available Balance */}
                  <div
                    onClick={() => onNavigate("wallet")}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/40 active:scale-[0.98] transition-all cursor-pointer shadow-xs text-left"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Available Balance</span>
                      <Wallet className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-foreground font-display truncate">
                      ₹{financialData.availableBalance.toLocaleString("en-IN")}
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Ready for withdrawal
                    </p>
                  </div>

                  {/* Card 3: Pending Payout */}
                  <div
                    onClick={() => onNavigate("wallet")}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-blue-500/40 active:scale-[0.98] transition-all cursor-pointer shadow-xs text-left"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pending Payout</span>
                      <Clock className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-foreground font-display truncate">
                      ₹{financialData.pendingPayout.toLocaleString("en-IN")}
                    </div>
                    <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      In payout cycle
                    </p>
                  </div>

                  {/* Card 4: Active Escrow */}
                  <div
                    onClick={() => onNavigate("wallet")}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-purple-500/40 active:scale-[0.98] transition-all cursor-pointer shadow-xs text-left"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Active Escrow</span>
                      <Shield className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-foreground font-display truncate">
                      ₹{financialData.activeEscrow.toLocaleString("en-IN")}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Security hold</p>
                  </div>

                  {/* Card 5: Total Withdrawn */}
                  <div
                    onClick={() => onNavigate("wallet")}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-foreground/30 active:scale-[0.98] transition-all cursor-pointer shadow-xs text-left col-span-2 sm:col-span-1 lg:col-span-1"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Withdrawn</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-foreground font-display truncate">
                      ₹{financialData.totalWithdrawn.toLocaleString("en-IN")}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Direct to bank</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => onNavigate("wallet")}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Wallet & Banking</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </section>

              {/* ======================================================== */}
              {/* 4. TWO-COLUMN WORKSPACE: LISTINGS & TRUST/STATUS         */}
              {/* ======================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                {/* Left Column (7 cols): Listed Equipment */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Listed Equipment Section (NO IMAGES - CATEGORY ICONS) */}
                  <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-base text-foreground font-display">
                          Your Listed Equipment
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Category icon visuals with real daily rental yield and verification state.
                        </p>
                      </div>
                      <button
                        onClick={() => onNavigate("products")}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>View All ({products.length})</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Zero State if no products */}
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/80 bg-secondary/10 space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary mx-auto text-muted-foreground">
                          <Package className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-sm text-foreground">No equipment listed yet.</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          List your cameras, laptops, drones, or tools to start receiving rental requests and earning daily yields.
                        </p>
                        <button
                          onClick={() => onNavigate("list")}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create your first listing</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredProducts.slice(0, 5).map((p) => {
                          const ItemIcon = getCategoryIcon(p.category, p.title);
                          const isApproved =
                            p.verificationStatus === "verified" || p.verificationStatus === "approved";
                          const isUnderReview =
                            p.verificationStatus === "under_review" ||
                            p.verificationStatus === "submitted";

                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                {/* NO IMAGE - Category Icon Tile */}
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border/70 text-foreground">
                                  <ItemIcon className="h-6 w-6 text-emerald-500" />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      {p.category || "Gear"}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                        isApproved
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                          : isUnderReview
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                          : "bg-destructive/10 text-destructive border-destructive/20"
                                      }`}
                                    >
                                      {isApproved ? "Approved" : isUnderReview ? "Under Review" : p.verificationStatus}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-xs sm:text-sm text-foreground truncate mt-0.5">
                                    {p.title}
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground">
                                    ₹{p.pricing?.daily || p.price || 0}/day • {p.location?.city || "Direct Location"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => onNavigate("products")}
                                  className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary active:scale-[0.98] transition-all cursor-pointer"
                                >
                                  Manage
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      onClick={() => onNavigate("list")}
                      className="w-full py-3 rounded-2xl border border-dashed border-border hover:border-emerald-500/50 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Create New Listing</span>
                    </button>
                  </div>

                  {/* Booking Requests Snapshot */}
                  <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-base text-foreground font-display">
                          Booking Requests
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Borrower reservations awaiting your confirmation or handover.
                        </p>
                      </div>
                      <button
                        onClick={() => onNavigate("requests")}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Review All ({rentalRequests.length})</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {filteredRequests.length === 0 ? (
                      <div className="text-center py-6 px-3 rounded-2xl border border-dashed border-border/70 bg-secondary/10 space-y-1">
                        <p className="font-bold text-xs text-foreground">No active booking requests</p>
                        <p className="text-[11px] text-muted-foreground">
                          When users request your gear, bookings will appear here instantly.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredRequests.slice(0, 3).map((req) => {
                          const ReqIcon = getCategoryIcon(req.category, req.productTitle);
                          const renterInitials = getInitials(req.renter?.name, "RN");

                          return (
                            <div
                              key={req.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/70 bg-secondary/20 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                {/* NO IMAGE - Category Icon */}
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-foreground">
                                  <ReqIcon className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div>
                                  <p className="font-bold text-foreground line-clamp-1">{req.productTitle}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Renter: <span className="font-semibold text-foreground">{req.renter?.name}</span> • {req.totalDays} Days ({req.startDate} to {req.endDate})
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                                <span className="font-bold text-sm text-foreground">
                                  ₹{req.grossRental.toLocaleString("en-IN")}
                                </span>
                                <button
                                  onClick={() => onNavigate("requests")}
                                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
                                >
                                  {req.status === "requested" ? "Respond" : "View"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (5 cols): Protection, Activity, Category Insights */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Lender Protection / Trust Status (NO IMAGES - DATA ONLY) */}
                  <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-6 w-6" />
                      <h4 className="font-extrabold text-sm sm:text-base text-foreground font-display">
                        Lender Protection & Trust
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Lending on paYent is fortified with multi-factor borrower verification, active escrow deposit holding, and PIN-secured handoffs.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] font-semibold text-foreground">
                      <div className="p-2.5 rounded-xl bg-card border border-emerald-500/20 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Identity Verification</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-emerald-500/20 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Escrow Protection</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-emerald-500/20 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">PIN Security Gate</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-emerald-500/20 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Lender Account: Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Timeline */}
                  <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <h3 className="font-bold text-sm text-foreground font-display">
                        Recent Activity
                      </h3>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Live Event Log
                      </span>
                    </div>

                    <div className="space-y-3">
                      {earningsTransactions.length === 0 ? (
                        <div className="text-center py-6 px-3 rounded-2xl border border-dashed border-border/70 bg-secondary/10 space-y-1">
                          <p className="font-bold text-xs text-foreground">No recent activity</p>
                          <p className="text-[11px] text-muted-foreground">
                            Rental logs and wallet payouts will appear here in real-time.
                          </p>
                        </div>
                      ) : (
                        earningsTransactions.slice(0, 4).map((tx) => (
                          <div key={tx.id} className="flex items-start gap-3 text-xs">
                            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                              <IndianRupee className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="font-bold text-foreground truncate">{tx.productTitle}</p>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                                  +₹{tx.netPayout.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Completed rental by {tx.renterName} • {tx.rentalPeriod}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => onNavigate("wallet")}
                      className="w-full text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-2 cursor-pointer block"
                    >
                      View Full Transaction History →
                    </button>
                  </div>

                  {/* Category Performance Breakdown */}
                  {categoryDistribution.length > 0 && (
                    <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-3.5 shadow-xs">
                      <h3 className="font-bold text-sm text-foreground font-display">
                        Top Categories
                      </h3>
                      <div className="space-y-2">
                        {categoryDistribution.map(({ category, count, Icon }) => (
                          <div
                            key={category}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/50 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 text-emerald-500" />
                              <span className="font-semibold text-foreground">{category}</span>
                            </div>
                            <span className="font-bold text-muted-foreground">
                              {String(count).padStart(2, "0")} listing{count > 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ======================================================== */}
              {/* 5. ANALYTICS & EARNINGS INSIGHT (RECHARTS / DATA CHART)  */}
              {/* ======================================================== */}
              <section id="analytics-section" className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground font-display">
                      Earnings Analytics
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Visual yield distribution from your completed rental bookings.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Total: ₹{stats.totalEarnings.toLocaleString("en-IN")}
                  </span>
                </div>

                {chartData.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/80 bg-secondary/10 space-y-2">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="font-bold text-sm text-foreground">₹0</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Your earnings will appear here after your first completed rental.
                    </p>
                  </div>
                ) : (
                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip
                          formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Net Earnings"]}
                          contentStyle={{
                            backgroundColor: "#18181b",
                            borderColor: "#27272a",
                            borderRadius: "0.75rem",
                            fontSize: "12px",
                            color: "#ffffff",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorEarnings)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayerntHome;
