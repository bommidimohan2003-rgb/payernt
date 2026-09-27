import React from "react";
import {
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
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
  Sparkle,
} from "lucide-react";
import { motion } from "framer-motion";
import type { PayerntProduct, RentalRequest, EarningTransaction } from "../types";

interface PayerntHomeProps {
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
  onNavigate: (tab: "home" | "products" | "requests" | "wallet" | "profile" | "list") => void;
  onSelectProductForManage?: (productId: string) => void;
}

export function PayerntHome({
  stats,
  products,
  rentalRequests,
  earningsTransactions,
  onNavigate,
  onSelectProductForManage,
}: PayerntHomeProps) {
  const verifiedProducts = products.filter((p) => p.verificationStatus === "verified" || p.verificationStatus === "approved");
  const underReviewProducts = products.filter(
    (p) => p.verificationStatus === "under_review" || p.verificationStatus === "submitted"
  );
  const pendingRequests = rentalRequests.filter((r) => r.status === "requested");

  return (
    <div className="space-y-8 text-left pb-16">
      {/* HERO / WELCOME BANNER */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-secondary/40 p-6 sm:p-10 md:p-12 shadow-sm">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>paye₹nt Lender Control Studio</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground font-display leading-[1.1]">
            Turn your gear into <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-primary/80 bg-clip-text text-transparent">
              predictable earnings.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl font-normal">
            List equipment in 2 minutes, get automated KYC verification, host secure rentals with ₹50,000 protection, and receive instant wallet payouts.
          </p>

          {/* Action Hub */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("list")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background px-6 py-3.5 text-sm font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>List New Equipment</span>
            </button>

            <button
              onClick={() => onNavigate("wallet")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground px-5 py-3.5 text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer"
            >
              <Wallet className="h-4 w-4 text-emerald-500" />
              <span>Open User Wallet</span>
            </button>
          </div>
        </div>

        {/* 3 Step Flow Micro-Rail */}
        <div className="relative z-10 mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/60 pt-6">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-secondary/20 border border-border/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
              01
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">10-Step Studio Listing</p>
              <p className="text-[11px] text-muted-foreground">Photos, specs, and daily rates</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-2xl bg-secondary/20 border border-border/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-bold text-xs">
              02
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Admin Verification</p>
              <p className="text-[11px] text-muted-foreground">Authenticity & serial checks</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-2xl bg-secondary/20 border border-border/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-xs">
              03
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">100% Wallet Credits</p>
              <p className="text-[11px] text-muted-foreground">Direct withdrawal to your bank</p>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO METRICS SECTION */}
      <section className="space-y-3 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Lender Portfolio & Financial Overview
          </h2>
          <button
            onClick={() => onNavigate("wallet")}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Manage User Wallet</span> <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Stat 1: Total Listed Gear */}
          <div
            onClick={() => onNavigate("products")}
            className="group p-4 rounded-2xl border border-border/80 bg-card hover:border-foreground/30 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Your Gear</span>
              <Package className="h-4 w-4 group-hover:text-foreground transition-colors" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground font-display">
              {String(stats.totalProductsCount).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {stats.activeProductsCount} active listings
            </div>
          </div>

          {/* Stat 2: In Review */}
          <div
            onClick={() => onNavigate("products")}
            className="group p-4 rounded-2xl border border-border/80 bg-card hover:border-amber-500/50 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">In Review</span>
              <FileCheck2 className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground font-display">
              {String(stats.underVerificationCount).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Under verification
            </div>
          </div>

          {/* Stat 3: Active Rentals */}
          <div
            onClick={() => onNavigate("requests")}
            className="group p-4 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/50 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground font-display">
              {String(stats.activeRentalsCount).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Gear with borrowers
            </div>
          </div>

          {/* Stat 4: Pending Requests */}
          <div
            onClick={() => onNavigate("requests")}
            className="group p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Requests</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground font-display">
              {String(stats.pendingRequestsCount).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[11px] text-primary font-medium">
              {stats.pendingRequestsCount > 0 ? "Action required" : "All responded"}
            </div>
          </div>

          {/* Stat 5: Total Wallet Yield */}
          <div
            onClick={() => onNavigate("wallet")}
            className="group p-4 rounded-2xl border border-border/80 bg-card hover:border-foreground/30 active:scale-[0.98] transition-all cursor-pointer shadow-xs col-span-2 sm:col-span-1 lg:col-span-1"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Earned</span>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-display">
              ₹{stats.totalEarnings.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Lifetime wallet yield
            </div>
          </div>

          {/* Stat 6: Escrow Pending */}
          <div
            onClick={() => onNavigate("wallet")}
            className="group p-4 rounded-2xl border border-border/80 bg-card hover:border-foreground/30 active:scale-[0.98] transition-all cursor-pointer shadow-xs col-span-2 sm:col-span-1 lg:col-span-1"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground font-display">
              ₹{stats.pendingEarnings.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              In active escrow
            </div>
          </div>
        </div>
      </section>

      {/* TWO COLUMN WORKSPACE: RECENT ACTIVITY & TOP GEAR INVENTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        {/* Left Column: Quick Action & Pending Requests (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Pending Requests Alert Card if any */}
          {pendingRequests.length > 0 && (
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
                  <h3 className="font-bold text-sm text-foreground">
                    Action Required: {pendingRequests.length} Pending Rental Request
                    {pendingRequests.length > 1 ? "s" : ""}
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate("requests")}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Review All
                </button>
              </div>

              <div className="space-y-2.5">
                {pendingRequests.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-card text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={req.productImage}
                        alt={req.productTitle}
                        className="h-12 w-12 rounded-xl object-cover bg-secondary shrink-0 border border-border"
                      />
                      <div>
                        <p className="font-bold text-foreground line-clamp-1">{req.productTitle}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Renter: <span className="text-foreground font-semibold">{req.renter.name}</span> • {req.totalDays} Days ({req.startDate} to {req.endDate})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                      <span className="font-bold text-sm text-foreground">
                        ₹{req.grossRental.toLocaleString("en-IN")}
                      </span>
                      <button
                        onClick={() => onNavigate("requests")}
                        className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Respond
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listed Products Snapshot */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground font-display">Your Listed Gear</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  High-yield tech gear actively hosted on Payent
                </p>
              </div>
              <button
                onClick={() => onNavigate("products")}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                View All ({products.length}) <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-border/80 bg-secondary/10 space-y-2">
                <Package className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="font-bold text-xs text-foreground">No Gear Listed Yet</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  List your cameras, laptops, drones, or tech gear to start receiving rental requests and earning daily yields.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.primaryImage || "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=100"}
                        alt={p.title}
                        className="h-12 w-12 rounded-xl object-cover bg-secondary shrink-0 border border-border/60"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {p.category}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              p.verificationStatus === "verified" || p.verificationStatus === "approved"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : p.verificationStatus === "under_review" || p.verificationStatus === "submitted"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                          >
                            {p.verificationStatus === "verified" || p.verificationStatus === "approved"
                              ? "Verified"
                              : p.verificationStatus === "under_review" || p.verificationStatus === "submitted"
                              ? "Under Review"
                              : p.verificationStatus}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-foreground truncate mt-0.5">{p.title}</h4>
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
                ))}
              </div>
            )}

            <button
              onClick={() => onNavigate("list")}
              className="w-full py-3 rounded-2xl border border-dashed border-border hover:border-primary/50 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Another Gear to Portfolio</span>
            </button>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed & Protection Guarantee (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Trust & Insurance Card */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
              <h4 className="font-extrabold text-sm sm:text-base text-foreground">
                ₹50,000 Lender Protection
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every equipment rental on Payent is backed by our verified borrower identity protocol and comprehensive damage escrow protection.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-semibold text-foreground">
              <div className="p-2.5 rounded-xl bg-card border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">KYC Checked</span>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Escrow Hold</span>
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-sm text-foreground">Recent Rental Activity</h3>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Live Log
              </span>
            </div>

            <div className="space-y-3.5">
              {earningsTransactions.length === 0 ? (
                <div className="text-center py-6 px-3 rounded-2xl border border-dashed border-border/70 bg-secondary/10 space-y-1">
                  <p className="font-bold text-xs text-foreground">No recent rental activity</p>
                  <p className="text-[11px] text-muted-foreground">
                    Rental logs and settlement payouts will appear here in real-time.
                  </p>
                </div>
              ) : (
                earningsTransactions.slice(0, 3).map((tx) => (
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
              className="w-full text-center text-xs font-semibold text-primary hover:underline pt-2 cursor-pointer block"
            >
              View Full Transaction History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayerntHome;
