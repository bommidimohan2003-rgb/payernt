import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  IndianRupee,
  PackageCheck,
  Truck,
  RotateCcw,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  BadgeCheck,
  Info,
  ChevronRight,
  KeyRound,
  Lock,
  X,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { rentalSecurityService } from "@/services/rentalSecurityService";
import type { RentalRequest, RentalRequestStatus } from "../types";

interface RentalRequestsProps {
  requests: RentalRequest[];
  onRequestAction: (requestId: string, action: "accept" | "reject") => void;
  onAdvanceLifecycle: (requestId: string, nextStatus: RentalRequestStatus) => void;
  onNavigateToWallet: () => void;
}

const LIFECYCLE_STEPS: { key: RentalRequestStatus; label: string; desc: string }[] = [
  { key: "requested", label: "Requested", desc: "Awaiting approval" },
  { key: "accepted", label: "Accepted", desc: "Prepare for pickup" },
  { key: "handover", label: "Handover", desc: "Inspect & handover" },
  { key: "active", label: "Active Rental", desc: "Currently with renter" },
  { key: "returned", label: "Returned", desc: "Inspect return" },
  { key: "completed", label: "Completed", desc: "Wallet credited" },
];

function getLifecycleStepIndex(status: RentalRequestStatus): number {
  switch (status) {
    case "requested":
      return 0;
    case "accepted":
      return 1;
    case "handover":
      return 2;
    case "active":
    case "return_initiated":
      return 3;
    case "returned":
      return 4;
    case "completed":
      return 5;
    case "rejected":
      return -1;
    default:
      return 0;
  }
}

export function RentalRequests({
  requests,
  onRequestAction,
  onAdvanceLifecycle,
  onNavigateToWallet,
}: RentalRequestsProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "completed">("all");

  // Handover Security Clearance Modal State
  const [handoverReq, setHandoverReq] = useState<RentalRequest | null>(null);
  const [enteredRenterPin, setEnteredRenterPin] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const pinInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleOpenHandoverModal = (req: RentalRequest) => {
    rentalSecurityService.getOrCreateSecurityRecord({
      bookingId: req.id,
      productId: req.productId,
      vendorId: "PAYERNT_USER_001",
      renterId: req.renter.email,
    });
    setHandoverReq(req);
    setEnteredRenterPin(["", "", "", ""]);
    setPinError(null);
    setIsVerifying(false);
    setTimeout(() => pinInputRefs.current[0]?.focus(), 150);
  };

  const handleRenterPinChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setPinError(null);
    const copy = [...enteredRenterPin];
    copy[idx] = digit;
    setEnteredRenterPin(copy);

    if (digit && idx < 3) {
      pinInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleRenterPinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !enteredRenterPin[idx] && idx > 0) {
      pinInputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyAndStartRental = () => {
    if (!handoverReq) return;
    const pin = enteredRenterPin.join("");
    if (pin.length !== 4) {
      setPinError("Please enter all 4 digits of the borrower's Renter PIN.");
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const res = rentalSecurityService.verifyRenterPin(handoverReq.id, pin);
      if (!res.valid) {
        setPinError(res.error || "Incorrect Renter PIN. Rental will NOT start.");
        toast.error(res.error || "Incorrect Renter PIN. Try again.");
        return;
      }

      // Also mark vendor side verified
      const sec = rentalSecurityService.getSecurityRecord(handoverReq.id);
      if (sec) {
        rentalSecurityService.verifyVendorPin(handoverReq.id, sec.vendorSecretPin);
      }

      onAdvanceLifecycle(handoverReq.id, "active");
      toast.success("Security PIN verified! Equipment handed over and rental is active.");
      setHandoverReq(null);
    }, 350);
  };

  const pendingCount = requests.filter((r) => r.status === "requested").length;
  const activeCount = requests.filter(
    (r) =>
      r.status === "accepted" ||
      r.status === "handover" ||
      r.status === "active" ||
      r.status === "return_initiated" ||
      r.status === "returned"
  ).length;
  const completedCount = requests.filter((r) => r.status === "completed").length;

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    if (filter === "pending") return r.status === "requested";
    if (filter === "active")
      return (
        r.status === "accepted" ||
        r.status === "handover" ||
        r.status === "active" ||
        r.status === "return_initiated" ||
        r.status === "returned"
      );
    if (filter === "completed") return r.status === "completed";
    return true;
  });

  const getStatusBadge = (status: RentalRequestStatus) => {
    switch (status) {
      case "requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse">
            <Clock className="h-3.5 w-3.5" /> Action Required: Awaiting Decision
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <PackageCheck className="h-3.5 w-3.5" /> Accepted • Ready For Handover
          </span>
        );
      case "handover":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
            <Truck className="h-3.5 w-3.5" /> Handover in Progress
          </span>
        );
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Active Ongoing Rental
          </span>
        );
      case "return_initiated":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/25">
            <RotateCcw className="h-3.5 w-3.5" /> Return Transit Initiated
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 border border-teal-500/25">
            <CheckCircle2 className="h-3.5 w-3.5" /> Item Returned • Inspect Condition
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed & Wallet Credited
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/25">
            <XCircle className="h-3.5 w-3.5" /> Declined Request
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-left pb-16 max-w-6xl mx-auto">
      {/* Header Banner with Concentric Radii */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-linear-to-br from-card via-card to-secondary/30 relative overflow-hidden shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Rental Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
              Bookings & Rental Lifecycles
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Manage incoming borrower requests, execute secure device handovers, confirm returns, and approve escrow payout settlements directly into your User Wallet.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateToWallet}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground text-background font-bold text-xs shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer"
            >
              <span>Go to User Wallet</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Protection Assurance Strip */}
        <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>All rentals backed by ₹50,000 Lender Protection & Verified Escrow</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>100% Net Payout</span>
            <span>•</span>
            <span>Zero Lender Commission</span>
            <span>•</span>
            <span>Direct Wallet Credit</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "all", label: "All Bookings", count: requests.length },
          { id: "pending", label: "Awaiting Action", count: pendingCount, highlight: pendingCount > 0 },
          { id: "active", label: "Active & In Progress", count: activeCount },
          { id: "completed", label: "Completed & Settled", count: completedCount },
        ].map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border flex items-center gap-2 active:scale-98 ${
                isActive
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-card text-muted-foreground border-border/80 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive
                    ? "bg-background/20 text-background"
                    : tab.highlight
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4 bg-card/50">
          <div className="h-16 w-16 rounded-3xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground font-display">No Bookings in this View</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When verified tech creators book your listed gear, rental requests will appear with full escrow verification here.
            </p>
          </div>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
            >
              View All Bookings
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRequests.map((req) => {
            const currentStepIdx = getLifecycleStepIndex(req.status);
            const isDeclined = req.status === "rejected";

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                key={req.id}
                className="rounded-3xl border border-border/80 bg-card p-6 sm:p-7 space-y-6 shadow-xs hover:border-foreground/20 hover:shadow-md transition-all"
              >
                {/* Card Top Row: Product Identity & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                  <div className="flex items-start sm:items-center gap-4">
                    <img
                      src={req.productImage}
                      alt={req.productTitle}
                      className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl object-cover bg-secondary border border-border shrink-0 shadow-xs"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[10px] font-extrabold uppercase tracking-wider">
                          {req.category}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          ID: <strong className="text-foreground">#{req.id}</strong>
                        </span>
                      </div>
                      <h3 className="font-bold text-base sm:text-lg text-foreground font-display line-clamp-1">
                        {req.productTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Booked on {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                    <div>{getStatusBadge(req.status)}</div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span>
                        Escrow: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Funded & Held</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Lifecycle Progress Rail */}
                {!isDeclined && (
                  <div className="p-4 rounded-2xl border border-border/60 bg-secondary/30 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span className="uppercase tracking-wider text-[10px]">Rental Lifecycle Tracker</span>
                      <span className="text-foreground font-mono text-[11px]">
                        Step {currentStepIdx + 1} of {LIFECYCLE_STEPS.length}
                      </span>
                    </div>

                    {/* Progress Dots / Bar */}
                    <div className="grid grid-cols-6 gap-2">
                      {LIFECYCLE_STEPS.map((step, idx) => {
                        const isDone = currentStepIdx > idx;
                        const isCurrent = currentStepIdx === idx;
                        return (
                          <div key={step.key} className="space-y-1.5 text-center">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isDone
                                  ? "bg-emerald-500"
                                  : isCurrent
                                  ? "bg-primary animate-pulse"
                                  : "bg-border"
                              }`}
                            />
                            <div className="hidden sm:block">
                              <p
                                className={`text-[10px] font-bold truncate ${
                                  isCurrent
                                    ? "text-foreground font-black"
                                    : isDone
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground/60"
                                }`}
                              >
                                {step.label}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Card Middle 3-Column Info Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Borrower Profile */}
                  <div className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Verified Borrower
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="h-3 w-3" /> KYC Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={req.renter.avatar}
                        alt={req.renter.name}
                        className="h-10 w-10 rounded-full object-cover border border-border shadow-xs"
                      />
                      <div>
                        <p className="font-bold text-foreground text-sm">{req.renter.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="text-amber-500 font-bold">★ {req.renter.rating}</span>
                          <span>•</span>
                          <span>{req.renter.completedRentals} past rentals</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium">{req.renter.phone}</span>
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium truncate">{req.renter.email}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{req.renter.city}</span>
                      </p>
                    </div>
                  </div>

                  {/* Column 2: Schedule & Duration */}
                  <div className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Rental Schedule
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-foreground font-display">{req.totalDays}</span>
                        <span className="text-xs text-muted-foreground font-semibold">Days Total</span>
                      </div>
                      <div className="p-2 rounded-xl bg-secondary/50 border border-border/60 text-[11px] space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start:</span>
                          <span className="font-bold text-foreground">{req.startDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Return:</span>
                          <span className="font-bold text-foreground">{req.endDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-border/50 flex justify-between text-[11px] text-muted-foreground">
                      <span>Daily Base Rate:</span>
                      <span className="font-semibold text-foreground">₹{req.dailyRate} / day</span>
                    </div>
                  </div>

                  {/* Column 3: Financial Settlement & Escrow */}
                  <div className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Financial Summary
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">Total Payout:</span>
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display">
                          ₹{req.grossRental.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                        <span>Escrow Deposit:</span>
                        <span className="font-semibold text-foreground">
                          ₹{req.securityDeposit.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Payent Platform Fee:</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10">0% (₹0 Deducted)</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls & Lifecycle Triggers */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-border/60">
                  {/* 1. When PENDING: Accept / Reject Buttons */}
                  {req.status === "requested" && (
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          onRequestAction(req.id, "accept");
                          toast.success(`Booking approved for ${req.renter.name}! Prepare equipment for handover.`);
                        }}
                        className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-foreground text-background font-bold text-xs shadow-md hover:opacity-90 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Accept & Confirm Booking</span>
                      </button>
                      <button
                        onClick={() => {
                          onRequestAction(req.id, "reject");
                          toast.info("Rental request declined.");
                        }}
                        className="px-4 py-3 rounded-2xl border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {/* 2. When ACCEPTED: Handover Action */}
                  {req.status === "accepted" && (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleOpenHandoverModal(req)}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-90 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Truck className="h-4 w-4" />
                        <span>Confirm Handover to Borrower (Start Rental)</span>
                      </button>
                    </div>
                  )}

                  {/* 3. When ACTIVE: Return Initiation */}
                  {req.status === "active" && (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          onAdvanceLifecycle(req.id, "returned");
                          toast.success("Return marked as received. Ready for post-rental inspection.");
                        }}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-border text-foreground hover:bg-secondary font-bold text-xs cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-xs"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Receive Return from Borrower (Inspect Condition)</span>
                      </button>
                    </div>
                  )}

                  {/* 4. When RETURNED: Inspection & Settlement to Wallet */}
                  {req.status === "returned" && (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          onAdvanceLifecycle(req.id, "completed");
                          toast.success(
                            `Inspection passed! ₹${req.grossRental.toLocaleString("en-IN")} credited to your User Wallet.`
                          );
                        }}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Approve Inspection & Credit Payout (₹{req.grossRental.toLocaleString("en-IN")})</span>
                      </button>
                    </div>
                  )}

                  {/* 5. When COMPLETED: Settled Note */}
                  {req.status === "completed" && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>₹{req.grossRental.toLocaleString("en-IN")} credited to User Wallet Balance</span>
                    </div>
                  )}

                  {/* 6. When REJECTED */}
                  {req.status === "rejected" && (
                    <div className="text-xs text-muted-foreground">
                      This rental request was declined.
                    </div>
                  )}

                  {/* Right side escrow note */}
                  <div className="text-[11px] text-muted-foreground ml-auto hidden sm:block">
                    Zero Fees • Instant Settlement
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* HANDOVER SECURITY CLEARANCE MODAL                         */}
      {/* ========================================================= */}
      <AnimatePresence>
        {handoverReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHandoverReq(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-2xl text-center z-10"
            >
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                  <KeyRound className="h-6 w-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setHandoverReq(null)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Handover Security Clearance</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Authorize Equipment Handover
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verify the borrower's identity and match credentials before releasing "{handoverReq.productTitle}".
                </p>
              </div>

              {/* Step A: Vendor's Product Secret PIN (Originating from product) */}
              {(() => {
                const sec = rentalSecurityService.getSecurityRecord(handoverReq.id);
                const vendorPin = sec?.vendorSecretPin || "5831";
                return (
                  <div className="p-3.5 rounded-2xl border border-border/80 bg-secondary/30 text-left flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Your Product Vendor PIN
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5 block">
                        Attached to your product listing
                      </span>
                    </div>
                    <span className="font-mono text-xl font-black text-foreground tracking-widest bg-card px-3 py-1.5 rounded-xl border border-border">
                      {vendorPin}
                    </span>
                  </div>
                );
              })()}

              {/* Step B: Borrower's Renter PIN Input */}
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">
                    Enter Borrower's 4-Digit Renter PIN *
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Ask {handoverReq.renter.name} for the 4-digit PIN generated on their booking confirmation screen.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-1">
                  {enteredRenterPin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        pinInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleRenterPinChange(idx, e.target.value)}
                      onKeyDown={(e) => handleRenterPinKeyDown(idx, e)}
                      className="w-12 h-14 text-center font-mono text-2xl font-black rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
                    />
                  ))}
                </div>

                {pinError && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in fade-in">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setHandoverReq(null)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndStartRental}
                  disabled={enteredRenterPin.join("").length !== 4 || isVerifying}
                  className="flex-1 py-3 px-4 rounded-2xl bg-foreground text-background text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verify & Start Rental</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RentalRequests;
