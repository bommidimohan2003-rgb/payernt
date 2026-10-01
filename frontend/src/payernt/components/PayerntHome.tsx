import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Package,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Camera,
  Laptop,
  Bike,
  Wrench,
  Activity,
  Wallet,
  ChevronRight,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Settings,
  User,
  Check,
  HelpCircle,
  BarChart3,
  Radio,
  Mic,
  Gamepad2,
  Monitor,
  Menu,
  X,
  MessageSquare,
  ChevronLeft,
  LayoutDashboard,
  CheckCircle,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

// Icon mapper for gear categories
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
    t.includes("lumix")
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
    t.includes("thinkpad")
  ) {
    return Laptop;
  }
  if (cat.includes("audio") || cat.includes("mic") || cat.includes("sound") || t.includes("shure") || t.includes("rode")) {
    return Mic;
  }
  if (cat.includes("gaming") || cat.includes("console") || t.includes("playstation") || t.includes("xbox")) {
    return Gamepad2;
  }
  if (cat.includes("display") || cat.includes("monitor") || cat.includes("screen")) {
    return Monitor;
  }
  if (cat.includes("bike") || cat.includes("cycle")) {
    return Bike;
  }
  if (cat.includes("vehicle") || cat.includes("drone") || cat.includes("mobility")) {
    return Radio;
  }
  if (cat.includes("tool") || cat.includes("equipment")) {
    return Wrench;
  }
  return Package;
}

// Animated count-up component for KPI numbers (respects reduced-motion)
function AnimatedNumber({ value, isCurrency = false }: { value: number; isCurrency?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDisplayValue(value);
      return;
    }
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 750;
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeProgress * value);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [value]);

  if (isCurrency) {
    return <span>₹{displayValue.toLocaleString("en-IN")}</span>;
  }
  return <span>{displayValue < 10 ? `0${displayValue}` : displayValue}</span>;
}

// Miniature Sparkline for KPI cards
function MiniSparkline({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 64;
  const height = 18;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible opacity-70 group-hover:opacity-100 transition-opacity">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export const PayerntHome: React.FC<PayerntHomeProps> = ({
  stats,
  products = [],
  rentalRequests = [],
  earningsTransactions = [],
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
}) => {
  const { theme, setTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [productFilter, setProductFilter] = useState<"ALL" | "AVAILABLE" | "RENTED" | "PENDING">("ALL");

  // Global / shortcut for search when not in an input
  useEffect(() => {
    const handleSlashKey = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA");
      if (e.key === "/" && !isInput && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleSlashKey);
    return () => window.removeEventListener("keydown", handleSlashKey);
  }, [isSearchOpen]);

  // Authenticated Lender Name (Derived strictly from real session)
  const ownerName = activeAccount?.name || profile?.name || activeUser?.name || "Product Owner";
  const firstName = ownerName.split(" ")[0];

  // Financial values computed strictly from real backend datastore
  const availableBalance = wallet?.availableBalance ?? (stats.totalEarnings - (wallet?.withdrawnAmount ?? 0));
  const pendingBalance = wallet?.pendingEarnings ?? stats.pendingEarnings ?? 0;
  const totalReceived = wallet?.totalEarned ?? stats.totalEarnings ?? 0;
  const totalWithdrawn = wallet?.withdrawnAmount ?? 0;

  // Real product state groupings
  const activeProducts = useMemo(() => {
    return products.filter((p) => {
      const v = (p.verificationStatus || "").toLowerCase();
      const a = (p.availabilityStatus || "").toLowerCase();
      return (v === "approved" || v === "verified") && a === "available";
    });
  }, [products]);

  const rentedProducts = useMemo(() => {
    return products.filter((p) => {
      const a = (p.availabilityStatus || "").toLowerCase();
      return a === "rented";
    });
  }, [products]);

  const inReviewProducts = useMemo(() => {
    return products.filter((p) => {
      const v = (p.verificationStatus || "").toLowerCase();
      return v === "submitted" || v === "under_review" || v === "draft" || v === "needs_correction";
    });
  }, [products]);

  const displayedProducts = useMemo(() => {
    if (productFilter === "AVAILABLE") return activeProducts;
    if (productFilter === "RENTED") return rentedProducts;
    if (productFilter === "PENDING") return inReviewProducts;
    return products;
  }, [productFilter, products, activeProducts, rentedProducts, inReviewProducts]);

  const activeRentals = useMemo(() => {
    return rentalRequests.filter((r) => {
      const s = (r.status || "").toLowerCase();
      return s === "active" || s === "handover" || s === "accepted" || s === "return_initiated";
    });
  }, [rentalRequests]);

  const upcomingBookings = useMemo(() => {
    return rentalRequests
      .filter((r) => {
        const s = (r.status || "").toLowerCase();
        return s === "accepted" || s === "requested" || s === "active";
      })
      .slice(0, 4);
  }, [rentalRequests]);

  const unreadAdminMessages = useMemo(() => {
    return messages.filter((m) => !m.read && m.status !== "ARCHIVED");
  }, [messages]);

  // Dynamic Greeting based on real time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Today formatted technical date string
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const day = d.getDate() < 10 ? `0${d.getDate()}` : `${d.getDate()}`;
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  // Action Center Items (Calculated strictly from genuine pending conditions)
  const actionItems = useMemo(() => {
    const items: Array<{
      id: string;
      tier: "HIGH" | "MEDIUM" | "LOW";
      issue: string;
      description: string;
      actionText: string;
      onAction: () => void;
    }> = [];

    // Corrections needed on products (High Priority)
    products
      .filter((p) => (p.verificationStatus || "").toLowerCase() === "needs_correction")
      .forEach((p) => {
        items.push({
          id: `corr-${p.id}`,
          tier: "HIGH",
          issue: "Product revision required",
          description: `${p.title}: Admin requested updated proof or specs.`,
          actionText: "REVIEW PRODUCT →",
          onAction: () => (onSelectProductForManage ? onSelectProductForManage(p.id) : onNavigate("products")),
        });
      });

    // Unread Admin Messages (Low/Info)
    if (unreadAdminMessages.length > 0) {
      const first = unreadAdminMessages[0];
      items.push({
        id: `msg-${first.id}`,
        tier: "LOW",
        issue: "Admin inquiry received",
        description: first.title || first.content || "Platform admin message regarding your listings.",
        actionText: "VIEW MESSAGE →",
        onAction: () => {
          if (onMarkMessageRead) onMarkMessageRead(first.id);
          onNavigate("messages");
        },
      });
    }

    // Pending incoming bookings requiring lender response (Medium)
    const pendingReqs = rentalRequests.filter((r) => (r.status || "").toLowerCase() === "requested");
    if (pendingReqs.length > 0) {
      items.push({
        id: "pending-reqs",
        tier: "MEDIUM",
        issue: "Booking confirmation pending",
        description: `${pendingReqs.length} incoming rental reservation${pendingReqs.length > 1 ? "s" : ""} awaiting your response.`,
        actionText: "MANAGE BOOKINGS →",
        onAction: () => onNavigate("requests"),
      });
    }

    // Pending bank account setup if available balance is present without bank (Medium)
    if (wallet && (!wallet.bankAccounts || wallet.bankAccounts.length === 0) && availableBalance > 0) {
      items.push({
        id: "bank-setup",
        tier: "MEDIUM",
        issue: "Bank account verification",
        description: "Add a verified bank account to enable direct payouts.",
        actionText: "SET UP ACCOUNT →",
        onAction: () => onNavigate("wallet"),
      });
    }

    return items;
  }, [products, unreadAdminMessages, rentalRequests, wallet, availableBalance, onNavigate, onSelectProductForManage, onMarkMessageRead]);

  // Real Performance Chart Data (Monthly aggregated points from actual transactions & bookings)
  const performanceChartData = useMemo(() => {
    if (earningsTransactions.length === 0 && rentalRequests.length === 0) {
      return [
        { label: "W1", earnings: 0, bookings: 0 },
        { label: "W2", earnings: 0, bookings: 0 },
        { label: "W3", earnings: 0, bookings: 0 },
        { label: "W4", earnings: 0, bookings: 0 },
      ];
    }

    const points: { [key: string]: { label: string; earnings: number; bookings: number } } = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const today = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${months[d.getMonth()]}`;
      points[key] = { label: key, earnings: 0, bookings: 0 };
    }

    earningsTransactions.forEach((tx) => {
      const d = tx.payoutDate ? new Date(tx.payoutDate) : new Date();
      const m = months[d.getMonth()];
      if (points[m]) {
        points[m].earnings += tx.netPayout || 0;
      }
    });

    rentalRequests.forEach((req) => {
      const d = req.requestDate ? new Date(req.requestDate) : new Date();
      const m = months[d.getMonth()];
      if (points[m]) {
        points[m].bookings += 1;
        if (!points[m].earnings) points[m].earnings += req.netEarnings || req.grossRental || 0;
      }
    });

    return Object.values(points);
  }, [earningsTransactions, rentalRequests]);

  // Sparkline data arrays extracted from real chart points
  const earningsSparkline = useMemo(() => performanceChartData.map((p) => p.earnings), [performanceChartData]);
  const bookingsSparkline = useMemo(() => performanceChartData.map((p) => p.bookings), [performanceChartData]);

  // Real Recent Activity Timeline with Date Grouping
  const recentActivityEvents = useMemo(() => {
    const list: Array<{
      id: string;
      type: "booking" | "product" | "payment" | "message";
      title: string;
      detail: string;
      timeAgo: string;
      dateFormatted: string;
      timeFormatted: string;
      dateObj: Date;
    }> = [];

    const now = new Date();
    const getTimeAgo = (d: Date) => {
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays}d ago`;
    };

    const formatDate = (d: Date) => {
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const day = d.getDate() < 10 ? `0${d.getDate()}` : `${d.getDate()}`;
      return `${day} ${months[d.getMonth()]}`;
    };

    const formatTime = (d: Date) => {
      const hrs = d.getHours() < 10 ? `0${d.getHours()}` : `${d.getHours()}`;
      const mins = d.getMinutes() < 10 ? `0${d.getMinutes()}` : `${d.getMinutes()}`;
      return `${hrs}:${mins}`;
    };

    rentalRequests.slice(0, 5).forEach((req) => {
      const d = req.requestDate ? new Date(req.requestDate) : new Date();
      let title = "Booking received";
      if (req.status === "accepted") title = "Booking confirmed";
      if (req.status === "active") title = "Rental in progress";
      if (req.status === "completed") title = "Rental completed";

      list.push({
        id: `req-${req.id}`,
        type: "booking",
        title,
        detail: `${req.productTitle} • ₹${(req.netEarnings || req.grossRental).toLocaleString("en-IN")}`,
        timeAgo: getTimeAgo(d),
        dateFormatted: formatDate(d),
        timeFormatted: formatTime(d),
        dateObj: d,
      });
    });

    products.slice(0, 4).forEach((prod) => {
      const d = prod.createdAt ? new Date(prod.createdAt) : new Date();
      let title = "Listing submitted";
      if (prod.verificationStatus === "approved" || prod.verificationStatus === "verified") {
        title = "Product approved";
      } else if (prod.verificationStatus === "needs_correction") {
        title = "Revision requested";
      }

      list.push({
        id: `prod-${prod.id}`,
        type: "product",
        title,
        detail: prod.title,
        timeAgo: getTimeAgo(d),
        dateFormatted: formatDate(d),
        timeFormatted: formatTime(d),
        dateObj: d,
      });
    });

    earningsTransactions.slice(0, 3).forEach((tx) => {
      const d = tx.payoutDate ? new Date(tx.payoutDate) : new Date();
      list.push({
        id: `tx-${tx.id}`,
        type: "payment",
        title: tx.payoutStatus === "settled" ? "Payment released" : "Payment pending",
        detail: `₹${(tx.netPayout || 0).toLocaleString("en-IN")} for ${tx.productTitle}`,
        timeAgo: getTimeAgo(d),
        dateFormatted: formatDate(d),
        timeFormatted: formatTime(d),
        dateObj: d,
      });
    });

    return list.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()).slice(0, 6);
  }, [rentalRequests, products, earningsTransactions]);

  // Grouped Activity by date category
  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: typeof recentActivityEvents } = {
      TODAY: [],
      YESTERDAY: [],
      PREVIOUS: [],
    };

    const now = new Date();
    recentActivityEvents.forEach((evt) => {
      const diffDays = Math.floor((now.getTime() - evt.dateObj.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0 && now.getDate() === evt.dateObj.getDate()) {
        groups.TODAY.push(evt);
      } else if (diffDays <= 1) {
        groups.YESTERDAY.push(evt);
      } else {
        groups.PREVIOUS.push(evt);
      }
    });

    return groups;
  }, [recentActivityEvents]);

  // Booking countdown calculation from actual dates
  const getBookingCountdown = (startDateStr?: string) => {
    if (!startDateStr) return null;
    const start = new Date(startDateStr);
    const now = new Date();
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((startDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "STARTS TODAY";
    if (diffDays === 1) return "STARTS TOMORROW";
    if (diffDays > 1 && diffDays <= 7) return `STARTS IN ${diffDays} DAYS`;
    if (diffDays < 0) return "IN PROGRESS";
    return null;
  };

  // Balance Composition Bar
  const totalBalanceScope = (availableBalance + pendingBalance + totalWithdrawn) || 1;
  const availableRatio = Math.min(Math.max((availableBalance / totalBalanceScope) * 100, availableBalance > 0 ? 8 : 0), 100);
  const pendingRatio = Math.min(Math.max((pendingBalance / totalBalanceScope) * 100, pendingBalance > 0 ? 5 : 0), 100);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased font-sans selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT AREA
      ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 z-10">

        {/* Dashboard Main Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-8 flex flex-col space-y-8">
          {/* ───────────────────────────────────────────────────────────
              A. PREMIUM DASHBOARD HEADER & REAL DATE METADATA
          ──────────────────────────────────────────────────────────── */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 font-bold">
                PAYE₹NT / LENDER / OVERVIEW
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {greeting}, {firstName}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Here's what's happening with your rental business today.
              </p>
            </div>

            {/* Technical Date & Status Stamp */}
            <div className="flex flex-col sm:items-end space-y-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-card/70 text-xs font-medium text-muted-foreground self-start sm:self-auto shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    actionItems.length > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className="font-mono text-[11px]">
                  {actionItems.length > 0
                    ? `${actionItems.length} ITEM${actionItems.length > 1 ? "S" : ""} REQUIRE ACTION`
                    : "ALL SYSTEMS NORMAL"}
                </span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/70 tracking-wider hidden sm:block">
                TODAY • {todayFormatted}
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────
              B. THIN DASHBOARD STATUS BAR
          ──────────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-4 rounded-lg border border-border/70 bg-card/40 backdrop-blur-xs text-[11px] font-mono select-none shadow-2xs">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="tracking-wide text-[10px] sm:text-[11px]">SYSTEM OPERATIONAL</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-muted-foreground text-[10px] sm:text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="text-foreground font-bold font-mono">{products.length < 10 ? `0${products.length}` : products.length}</span>
                <span>ACTIVE LISTINGS</span>
              </span>
              <span className="text-border/60">/</span>
              <span className="flex items-center gap-1.5">
                <span className="text-foreground font-bold font-mono">{activeRentals.length < 10 ? `0${activeRentals.length}` : activeRentals.length}</span>
                <span>ACTIVE RENTALS</span>
              </span>
              <span className="text-border/60">/</span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold font-mono">₹{availableBalance.toLocaleString("en-IN")}</span>
                <span>AVAILABLE</span>
              </span>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────
              C. KPI CARDS (01 / OVERVIEW — WITH NUMBER COUNT-UP ANIMATION)
          ──────────────────────────────────────────────────────────── */}
          <section className="flex flex-col space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold">
              01 / OVERVIEW
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* KPI 1: Available Balance */}
              <div
                onClick={() => onNavigate("wallet")}
                className="group p-5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Subtle top indicator line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 group-hover:bg-primary transition-colors" />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    AVAILABLE BALANCE
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-semibold text-foreground font-mono tracking-tight group-hover:-translate-y-0.5 transition-transform duration-200">
                    <AnimatedNumber value={availableBalance} isCurrency />
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <span>Available to withdraw</span>
                    <MiniSparkline data={earningsSparkline} color="var(--primary)" />
                  </div>
                </div>
              </div>

              {/* KPI 2: Total Earnings */}
              <div
                onClick={() => onNavigate("wallet")}
                className="group p-5 rounded-xl border border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    TOTAL EARNINGS
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-semibold text-foreground font-mono tracking-tight group-hover:-translate-y-0.5 transition-transform duration-200">
                    <AnimatedNumber value={totalReceived} isCurrency />
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <span>All-time settled revenue</span>
                    <MiniSparkline data={earningsSparkline} color="#10b981" />
                  </div>
                </div>
              </div>

              {/* KPI 3: Active Listings */}
              <div
                onClick={() => onNavigate("products")}
                className="group p-5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 group-hover:bg-primary transition-colors" />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    ACTIVE LISTINGS
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-semibold text-foreground font-mono tracking-tight group-hover:-translate-y-0.5 transition-transform duration-200">
                    <AnimatedNumber value={products.length} />
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <span>{activeProducts.length} verified &amp; available</span>
                  </div>
                </div>
              </div>

              {/* KPI 4: Active Rentals */}
              <div
                onClick={() => onNavigate("requests")}
                className="group p-5 rounded-xl border border-border/80 bg-card hover:border-blue-500/40 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    ACTIVE RENTALS
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-semibold text-foreground font-mono tracking-tight group-hover:-translate-y-0.5 transition-transform duration-200">
                    <AnimatedNumber value={activeRentals.length} />
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <span>Currently in customer lease</span>
                    <MiniSparkline data={bookingsSparkline} color="#3b82f6" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────
              D. UPCOMING BOOKINGS (02 / BOOKINGS)
          ──────────────────────────────────────────────────────────── */}
          <section className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold">
                  02 / BOOKINGS
                </div>
                <h2 className="text-base font-semibold text-foreground tracking-tight mt-0.5">
                  UPCOMING RESERVATIONS ({upcomingBookings.length < 10 ? `0${upcomingBookings.length}` : upcomingBookings.length})
                </h2>
              </div>
              <button
                onClick={() => onNavigate("requests")}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all bookings</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border/80 bg-card shadow-2xs">
              {upcomingBookings.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                  <Calendar className="w-7 h-7 text-muted-foreground/40" />
                  <span className="text-xs font-medium text-foreground">No upcoming bookings scheduled</span>
                  <span className="text-[11px] text-muted-foreground max-w-sm">
                    Incoming and approved customer rental reservations will appear here with scheduled dates.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {upcomingBookings.map((b) => {
                    const countdown = getBookingCountdown(b.startDate);

                    return (
                      <div
                        key={b.id}
                        onClick={() => onNavigate("requests")}
                        className="group p-4 rounded-lg border border-border/70 hover:border-primary/40 bg-card/60 hover:bg-muted/30 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground overflow-hidden border border-border/60 group-hover:scale-105 transition-transform">
                            {b.productImage ? (
                              <img src={b.productImage} alt={b.productTitle} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {b.productTitle}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono truncate">
                              {b.startDate} &mdash; {b.endDate}
                            </span>
                            {countdown && (
                              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                {countdown}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                            {b.status}
                          </span>
                          <span className="font-semibold text-foreground font-mono">
                            ₹{(b.netEarnings || b.grossRental).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────
              E. YOUR PRODUCTS (03 / INVENTORY — WITH LOCAL CATEGORY FILTER)
          ──────────────────────────────────────────────────────────── */}
          <section className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold">
                  03 / INVENTORY
                </div>
                <h2 className="text-base font-semibold text-foreground tracking-tight mt-0.5">
                  YOUR PRODUCTS ({products.length} LISTINGS)
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {/* Local Filter Tabs */}
                <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg border border-border/80 bg-muted/60 text-xs font-mono">
                  {(["ALL", "AVAILABLE", "RENTED", "PENDING"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setProductFilter(f)}
                      className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer text-[10px] font-semibold ${
                        productFilter === f
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => onNavigate("list")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Listing</span>
                </button>

                <button
                  onClick={() => onNavigate("products")}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Product Cards Grid with Indexing, Cover Overlay, & Availability Line */}
            {displayedProducts.length === 0 ? (
              <div className="p-10 border border-dashed border-border rounded-xl bg-card/60 flex flex-col items-center justify-center text-center space-y-3">
                <Package className="w-10 h-10 text-muted-foreground/40" />
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-semibold text-foreground">No matching listings found</span>
                  <span className="text-xs text-muted-foreground max-w-sm">
                    {productFilter !== "ALL"
                      ? `No products currently match the "${productFilter}" filter.`
                      : "Start by adding your first rentable equipment."}
                  </span>
                </div>
                {productFilter !== "ALL" ? (
                  <button
                    onClick={() => setProductFilter("ALL")}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-muted cursor-pointer"
                  >
                    Reset Filter
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate("list")}
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    + Create Your First Listing
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayedProducts.slice(0, 4).map((product, idx) => {
                  const Icon = getCategoryIcon(product.category, product.title);
                  const status = (product.verificationStatus || "").toLowerCase();
                  const availability = (product.availabilityStatus || "").toLowerCase();

                  let statusText = "AVAILABLE";
                  let statusColor = "bg-emerald-500";
                  if (status === "submitted" || status === "under_review") {
                    statusText = "PENDING REVIEW";
                    statusColor = "bg-amber-500";
                  } else if (status === "needs_correction") {
                    statusText = "REVISION REQUIRED";
                    statusColor = "bg-rose-500";
                  } else if (availability === "rented") {
                    statusText = "RENTED";
                    statusColor = "bg-blue-500";
                  }

                  const dailyRate = product.pricing?.daily || product.price || 0;
                  const itemNumber = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (onSelectProductForManage) onSelectProductForManage(product.id);
                        onNavigate("products");
                      }}
                      className="group rounded-xl border border-border/80 bg-card overflow-hidden hover:border-primary/50 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col relative"
                    >
                      {/* Product Image Frame with Hover Overlay */}
                      <div className="h-44 bg-muted/40 relative flex items-center justify-center overflow-hidden border-b border-border/80">
                        {product.primaryImage ? (
                          <img
                            src={product.primaryImage}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 text-muted-foreground/40">
                            <Icon className="w-12 h-12" />
                          </div>
                        )}

                        {/* Card Index Marker */}
                        <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-xs font-mono text-[9px] text-muted-foreground font-semibold border border-border/60">
                          {itemNumber}
                        </div>

                        {/* Status Chip */}
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-background/90 backdrop-blur-xs border border-border/80 text-[9px] font-mono font-semibold text-foreground flex items-center gap-1.5 shadow-2xs">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                          <span>{statusText}</span>
                        </div>

                        {/* Subtle Fade-in Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <span className="px-3 py-1.5 rounded-lg bg-background/90 text-foreground text-xs font-semibold shadow-md flex items-center gap-1">
                            <span>VIEW PRODUCT</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>

                      {/* Product Card Details */}
                      <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">
                            {product.category || "Gear"}
                          </span>
                          <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {product.title}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/80">
                          <span className="text-xs font-semibold text-foreground font-mono">
                            ₹{dailyRate.toLocaleString("en-IN")}
                            <span className="text-[10px] text-muted-foreground font-normal"> / day</span>
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                            <span>VIEW</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Availability Status Line */}
                      <div className={`h-1 w-full ${statusColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ───────────────────────────────────────────────────────────
              F. ACTION CENTER & WALLET SNAPSHOT (04 / ATTENTION & FINANCIALS)
          ──────────────────────────────────────────────────────────── */}
          <section className="flex flex-col space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold">
              04 / ATTENTION &amp; FINANCIALS
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Action Center (7-8 cols) */}
              <div className="lg:col-span-7 xl:col-span-8 p-6 rounded-xl border border-border/80 bg-card flex flex-col space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground tracking-tight">ACTION CENTER</h2>
                    <p className="text-xs text-muted-foreground">Items requiring your response or verification</p>
                  </div>
                </div>

                {actionItems.length === 0 ? (
                  <div className="py-8 px-4 rounded-lg bg-muted/30 border border-border/80 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">ALL CAUGHT UP</span>
                      <span className="text-xs text-muted-foreground">No pending action required right now.</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-border/80">
                    {actionItems.map((item) => (
                      <div
                        key={item.id}
                        className="group py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:translate-x-1 transition-transform duration-150"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider shrink-0 border ${
                              item.tier === "HIGH"
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : item.tier === "MEDIUM"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            }`}
                          >
                            {item.tier}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">{item.issue}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        </div>

                        <button
                          onClick={item.onAction}
                          className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/60 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/40 transition-colors self-start sm:self-auto shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{item.actionText}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Wallet Snapshot (4-5 cols) with Balance Composition & Security Indicator */}
              <div className="lg:col-span-5 xl:col-span-4 p-6 rounded-xl border border-border/80 bg-card flex flex-col justify-between space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground tracking-tight">WALLET SNAPSHOT</h2>
                    <p className="text-xs text-muted-foreground">Liquidity &amp; Escrow balance composition</p>
                  </div>
                  <button
                    onClick={() => onNavigate("wallet")}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View wallet</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3 py-1">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/80 text-xs">
                    <span className="text-muted-foreground">Available to Withdraw</span>
                    <span className="font-semibold text-foreground font-mono">
                      ₹{availableBalance.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Balance Composition Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex border border-border/60">
                      <div style={{ width: `${availableRatio}%` }} className="h-full bg-primary transition-all duration-300" title={`Available: ₹${availableBalance}`} />
                      <div style={{ width: `${pendingRatio}%` }} className="h-full bg-amber-500 transition-all duration-300" title={`Pending: ₹${pendingBalance}`} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/70">
                      <span>AVAILABLE</span>
                      <span>PENDING ESCROW</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-border/80 text-xs">
                    <span className="text-muted-foreground">Pending in Escrow</span>
                    <span className="font-semibold text-foreground font-mono">
                      ₹{pendingBalance.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 text-xs">
                    <span className="text-muted-foreground">Total Withdrawn</span>
                    <span className="font-semibold text-foreground font-mono">
                      ₹{totalWithdrawn.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Bank Security Indicator */}
                  <div
                    onClick={() => onNavigate("wallet")}
                    className="flex items-center justify-between pt-2 border-t border-border/70 text-xs cursor-pointer hover:bg-muted/40 p-1 rounded transition-colors"
                  >
                    <span className="text-muted-foreground font-mono uppercase text-[10px]">BANK ACCOUNT</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${wallet?.bankAccounts && wallet.bankAccounts.length > 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className={wallet?.bankAccounts && wallet.bankAccounts.length > 0 ? "text-emerald-500 font-semibold font-mono text-[10px]" : "text-amber-500 font-semibold font-mono text-[10px]"}>
                        {wallet?.bankAccounts && wallet.bankAccounts.length > 0 ? "CONNECTED" : "NOT CONFIGURED"}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate("wallet")}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <span>Open Wallet</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────
              G. RECENT ACTIVITY (05 / AUDIT TRAIL — DATE GROUPED TIMELINE)
          ──────────────────────────────────────────────────────────── */}
          <section className="flex flex-col space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold">
              05 / AUDIT TRAIL
            </div>

            <div className="p-6 rounded-xl border border-border/80 bg-card flex flex-col space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground tracking-tight">RECENT ACTIVITY</h2>
                  <p className="text-xs text-muted-foreground">Chronological record of verified operations</p>
                </div>
              </div>

              {recentActivityEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">No recent activity logged.</p>
              ) : (
                <div className="space-y-4">
                  {/* Today Group */}
                  {groupedActivities.TODAY.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 font-bold block">
                        TODAY
                      </span>
                      <div className="divide-y divide-border/80">
                        {groupedActivities.TODAY.map((evt) => (
                          <div key={evt.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-muted-foreground/80 w-12 shrink-0">
                                {evt.timeFormatted}
                              </span>
                              <div className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                                {evt.type === "product" ? <Package className="w-3.5 h-3.5" /> : evt.type === "booking" ? <Calendar className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-foreground">{evt.title}</span>
                                <span className="text-muted-foreground">&bull; {evt.detail}</span>
                              </div>
                            </div>
                            <span className="text-muted-foreground/70 font-mono text-[11px] self-end sm:self-auto shrink-0">
                              {evt.timeAgo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Yesterday Group */}
                  {groupedActivities.YESTERDAY.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 font-bold block">
                        YESTERDAY
                      </span>
                      <div className="divide-y divide-border/80">
                        {groupedActivities.YESTERDAY.map((evt) => (
                          <div key={evt.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-muted-foreground/80 w-12 shrink-0">
                                {evt.timeFormatted}
                              </span>
                              <div className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                                {evt.type === "product" ? <Package className="w-3.5 h-3.5" /> : evt.type === "booking" ? <Calendar className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-foreground">{evt.title}</span>
                                <span className="text-muted-foreground">&bull; {evt.detail}</span>
                              </div>
                            </div>
                            <span className="text-muted-foreground/70 font-mono text-[11px] self-end sm:self-auto shrink-0">
                              {evt.timeAgo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Days Group */}
                  {groupedActivities.PREVIOUS.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 font-bold block">
                        EARLIER
                      </span>
                      <div className="divide-y divide-border/80">
                        {groupedActivities.PREVIOUS.map((evt) => (
                          <div key={evt.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-muted-foreground/80 w-14 shrink-0">
                                {evt.dateFormatted}
                              </span>
                              <div className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                                {evt.type === "product" ? <Package className="w-3.5 h-3.5" /> : evt.type === "booking" ? <Calendar className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-foreground">{evt.title}</span>
                                <span className="text-muted-foreground">&bull; {evt.detail}</span>
                              </div>
                            </div>
                            <span className="text-muted-foreground/70 font-mono text-[11px] self-end sm:self-auto shrink-0">
                              {evt.timeAgo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────
              H. QUICK ACTIONS BAR (06 / ACTIONS)
          ──────────────────────────────────────────────────────────── */}
          <section className="flex flex-col space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 font-semibold">
              06 / ACTIONS
            </div>

            <div className="p-6 rounded-xl border border-border/80 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex flex-col space-y-0.5">
                <h3 className="text-sm font-semibold text-foreground">Quick Shortcuts</h3>
                <p className="text-xs text-muted-foreground">Fast navigation shortcuts for key lending operations</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onNavigate("list")}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Listing</span>
                </button>
                <button
                  onClick={() => onNavigate("products")}
                  className="px-3.5 py-2 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  View Products
                </button>
                <button
                  onClick={() => onNavigate("requests")}
                  className="px-3.5 py-2 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  View Bookings
                </button>
                <button
                  onClick={() => onNavigate("wallet")}
                  className="px-3.5 py-2 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Open Wallet
                </button>
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────
              I. COMPACT AUTHENTICATED DASHBOARD FOOTER
          ──────────────────────────────────────────────────────────── */}
          <footer className="pt-8 pb-4 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] font-mono text-muted-foreground select-none">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground tracking-tight">paYent</span>
              <span>/</span>
              <span className="uppercase tracking-widest text-[10px]">LENDER PLATFORM</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] tracking-wider uppercase">
              <span>RENT</span>
              <span>•</span>
              <span>LEND</span>
              <span>•</span>
              <span>EMPOWER</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
              <span>DATA STATUS: <strong className="text-emerald-500 font-mono">LIVE</strong></span>
            </div>
          </footer>
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. GLOBAL SEARCH MODAL (Triggered by Search Button & ⌘K)
      ────────────────────────────────────────────────────────────── */}
      <PayerntGlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
        products={products}
        rentalRequests={rentalRequests}
        onSelectProduct={onSelectProductForManage}
        unreadMessagesCount={unreadMessagesCount}
      />



      {/* ─────────────────────────────────────────────────────────────
          5. HELP & SUPPORT MODAL
      ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isHelpOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">Lender Help &amp; Support</h3>
                <button onClick={() => setIsHelpOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  Need assistance with your gear listings or rental requests?
                </p>
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2 text-[11px]">
                  <p className="text-foreground font-semibold">1. Listing Verification</p>
                  <p>Admins review equipment specs and authenticity proof within 2-4 hours.</p>
                  <p className="text-foreground font-semibold">2. Dual-PIN Handover</p>
                  <p>Ensure you verify the customer's PIN upon pickup and provide your vendor PIN on return.</p>
                  <p className="text-foreground font-semibold">3. Direct Wallet Payouts</p>
                  <p>Earnings are credited automatically to your wallet upon confirmed return inspection.</p>
                </div>
              </div>

              <button
                onClick={() => setIsHelpOpen(false)}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          6. SETTINGS MODAL
      ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">Dashboard Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <p className="font-semibold text-foreground">Appearance Theme</p>
                    <p className="text-muted-foreground text-[11px]">Current: {theme}</p>
                  </div>
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="px-2.5 py-1 border border-border rounded-lg text-[11px] font-medium hover:bg-muted cursor-pointer"
                  >
                    Toggle
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <p className="font-semibold text-foreground">Lender Account ID</p>
                    <p className="text-muted-foreground text-[11px] font-mono">{activeAccount?.accountId || "ID_001"}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onNavigate("profile");
                    }}
                    className="px-2.5 py-1 border border-border rounded-lg text-[11px] font-medium hover:bg-muted cursor-pointer"
                  >
                    Profile
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PayerntHome;
