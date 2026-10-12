import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  ExternalLink,
  Calendar,
  IndianRupee,
  User,
  Package,
  Layers,
  ArrowRight,
  Plus,
  Equal,
  Lock,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  pinVerificationService,
  PinVerificationResult,
  PinVerificationHistoryItem,
} from "../services/pinVerification";

export default function PinVerification() {
  const [activeTab, setActiveTab] = useState<"verify" | "history">("verify");

  // 8 Digit PIN Inputs state (array of 8 characters)
  const [pinDigits, setPinDigits] = useState<string[]>(Array(8).fill(""));
  const [isMasked, setIsMasked] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<PinVerificationResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<PinVerificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistory, setTotalHistory] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (activeTab === "verify") {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [activeTab]);

  // Load history when tab is clicked
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await pinVerificationService.getHistory(historyPage, 20, historySearch);
      setHistoryItems(res.items || []);
      setTotalHistory(res.total || 0);
    } catch {
      toast.error("Failed to load verification history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historySearch]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Digit Input Handlers
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned && value !== "") return;

    const newDigits = [...pinDigits];

    if (cleaned.length > 1) {
      // If user typed multiple digits or pasted into single input
      handlePasteString(cleaned, index);
      return;
    }

    newDigits[index] = cleaned;
    setPinDigits(newDigits);
    setLastError(null);

    // Auto-advance focus if digit was entered
    if (cleaned && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!pinDigits[index] && index > 0) {
        // Empty box backspace moves to previous box
        const newDigits = [...pinDigits];
        newDigits[index - 1] = "";
        setPinDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...pinDigits];
        newDigits[index] = "";
        setPinDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 7) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && pinDigits.join("").length === 8) {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    handlePasteString(pastedData, 0);
  };

  const handlePasteString = (str: string, startIndex: number = 0) => {
    const numericOnly = str.replace(/\D/g, "");
    if (!numericOnly) return;

    const newDigits = [...pinDigits];
    let writeIdx = startIndex;
    for (let i = 0; i < numericOnly.length && writeIdx < 8; i++) {
      newDigits[writeIdx] = numericOnly[i];
      writeIdx++;
    }
    setPinDigits(newDigits);
    setLastError(null);

    // Focus last filled or next empty
    const nextEmpty = newDigits.findIndex((d) => d === "");
    if (nextEmpty !== -1) {
      inputRefs.current[nextEmpty]?.focus();
    } else {
      inputRefs.current[7]?.focus();
    }
  };

  const handleClear = () => {
    setPinDigits(Array(8).fill(""));
    setVerificationResult(null);
    setLastError(null);
    inputRefs.current[0]?.focus();
  };

  const fullPin = pinDigits.join("");
  const isPinComplete = fullPin.length === 8;

  const handleVerify = async () => {
    if (!isPinComplete) {
      toast.error("Please enter all 8 digits of the Secret PIN.");
      return;
    }

    try {
      setVerifying(true);
      setLastError(null);
      const result = await pinVerificationService.verifyPin(fullPin);
      setVerificationResult(result);
      toast.success("PIN Verified Successfully! Product and booking details retrieved.");
      // Clear PIN inputs after verification for security
      setPinDigits(Array(8).fill(""));
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Verification failed. Invalid 8-digit Secret PIN.";
      setLastError(msg);
      toast.error(msg);
      setVerificationResult(null);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(161,161,170,0.18)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-white/10 text-white">
              <KeyRound className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
              8-Digit PIN Verification
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Verify product security PIN (Vendor 4-digit + Renter 4-digit) to inspect authorized product and booking status.
          </p>
        </div>

        {/* Top Action Tabs */}
        <div className="flex items-center p-1 rounded-lg bg-[#10151B] border border-[rgba(161,161,170,0.18)] shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("verify")}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "verify"
                ? "bg-white text-black shadow-xs"
                : "text-[#A1A1AA] hover:text-[#F5F5F5]"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Verify PIN
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "history"
                ? "bg-white text-black shadow-xs"
                : "text-[#A1A1AA] hover:text-[#F5F5F5]"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Verification History
          </button>
        </div>
      </div>

      {activeTab === "verify" ? (
        <div className="space-y-6">
          {/* Main PIN Entry Card */}
          <div className="p-6 md:p-8 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)] shadow-lg relative overflow-hidden">
            <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#F5F5F5] mb-4">
                <KeyRound className="h-6 w-6" />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-[#F5F5F5] mb-1">
                Enter 8-Digit Secret PIN
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-md mb-6">
                Enter the complete 8-digit PIN to verify product status, details, ownership, and booking authorization.
              </p>

              {/* 8 Single-digit Input Boxes */}
              <div className="w-full flex items-center justify-center gap-2 sm:gap-3 mb-6">
                {pinDigits.map((digit, idx) => (
                  <div key={idx} className="relative flex items-center justify-center">
                    {/* Visual Divider between Vendor PIN (first 4) and Renter PIN (last 4) */}
                    {idx === 4 && (
                      <span className="hidden sm:inline-block w-2 text-zinc-600 font-bold -ml-1 mr-2 select-none">
                        •
                      </span>
                    )}
                    <input
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type={isMasked ? "password" : "text"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      disabled={verifying}
                      className={cn(
                        "w-10 h-12 sm:w-12 sm:h-14 rounded-lg bg-[#050709] border text-center text-lg sm:text-xl font-mono font-bold text-[#F5F5F5] transition-all focus:outline-none",
                        digit
                          ? "border-white/40 bg-white/[0.04]"
                          : "border-[rgba(161,161,170,0.18)] hover:border-white/20",
                        "focus:border-white focus:ring-1 focus:ring-white/30"
                      )}
                      aria-label={`Digit ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>

              {/* Input Helper Controls */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setIsMasked(!isMasked)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium text-[#A1A1AA] hover:text-[#F5F5F5] bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isMasked ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {isMasked ? "Show Digits" : "Mask Digits"}
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 rounded text-[11px] font-medium text-[#A1A1AA] hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </button>
              </div>

              {/* Error Message if any */}
              {lastError && (
                <div className="w-full max-w-md p-3 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{lastError}</span>
                </div>
              )}

              {/* Verify Button */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!isPinComplete || verifying}
                  className={cn(
                    "w-full sm:w-auto px-8 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md",
                    isPinComplete && !verifying
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-white/20 text-zinc-400 cursor-not-allowed"
                  )}
                >
                  {verifying ? (
                    <>
                      <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Verifying 8-Digit PIN...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify PIN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Explanatory Card: "How 8-Digit PIN Works" */}
          <div className="p-6 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)]">
            <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-4">
              How 8-Digit PIN Works
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
              {/* Box 1: Vendor PIN */}
              <div className="md:col-span-2 p-4 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] flex items-start gap-3">
                <div className="p-2 rounded-md bg-white/10 text-white shrink-0 mt-0.5">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                    First 4 Digits
                  </div>
                  <div className="text-sm font-semibold text-[#F5F5F5]">
                    Vendor 4-digit Secret PIN
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                    Product security credential in system
                  </p>
                </div>
              </div>

              {/* Separator Plus */}
              <div className="flex justify-center text-[#A1A1AA]">
                <div className="p-1.5 rounded-full bg-white/5 border border-white/10">
                  <Plus className="h-4 w-4" />
                </div>
              </div>

              {/* Box 2: Renter PIN */}
              <div className="md:col-span-2 p-4 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] flex items-start gap-3">
                <div className="p-2 rounded-md bg-white/10 text-white shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                    Last 4 Digits
                  </div>
                  <div className="text-sm font-semibold text-[#F5F5F5]">
                    Renter 4-digit Secret PIN
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                    Rental booking confirmation code
                  </p>
                </div>
              </div>
            </div>

            {/* Equals Summary */}
            <div className="mt-3 p-3.5 rounded-lg bg-[#171C23] border border-[rgba(161,161,170,0.18)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-[#F5F5F5]">
                  Combined 8-Digit PIN = Authorized verification of product & rental context
                </span>
              </div>
              <span className="text-[11px] text-[#A1A1AA] font-mono hidden sm:inline-block">
                Preserves leading zeros & zero-disclosure security
              </span>
            </div>
          </div>

          {/* Verification Result Section (Panel 15) */}
          {verificationResult && (
            <div className="p-6 rounded-xl bg-[#10151B] border border-emerald-500/30 space-y-6 animate-in fade-in-50 duration-300">
              {/* Success Banner */}
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400">
                      PIN Verified Successfully!
                    </h3>
                    <p className="text-xs text-[#A1A1AA]">
                      Product and booking details retrieved from authoritative record.
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#A1A1AA] font-mono">
                  Verified on {new Date(verificationResult.verifiedAt).toLocaleString()}
                </div>
              </div>

              {/* Product & Rental Overview Card */}
              <div className="p-5 rounded-xl bg-[#050709] border border-[rgba(161,161,170,0.18)] grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Product Thumbnail & Title */}
                <div className="lg:col-span-7 flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-24 h-24 rounded-lg bg-[#171C23] border border-[rgba(161,161,170,0.18)] overflow-hidden shrink-0 flex items-center justify-center">
                    {verificationResult.product.image ? (
                      <img
                        src={verificationResult.product.image}
                        alt={verificationResult.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-zinc-500" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-[#F5F5F5]">
                        {verificationResult.product.name}
                      </h4>
                      {/* Product Status Badge */}
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          verificationResult.product.status.toLowerCase() === "active" ||
                            verificationResult.product.status.toLowerCase() === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : verificationResult.product.status.toLowerCase() === "pending"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}
                      >
                        {verificationResult.product.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#A1A1AA] font-mono">
                      Product ID: #{verificationResult.product.id}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[rgba(161,161,170,0.18)] text-xs">
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] uppercase">Category</span>
                        <div className="font-semibold text-[#F5F5F5]">
                          {verificationResult.product.category}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] uppercase">Price/Day</span>
                        <div className="font-semibold text-[#F5F5F5]">
                          ₹ {verificationResult.product.dailyRate.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] uppercase">Deposit</span>
                        <div className="font-semibold text-[#F5F5F5]">
                          ₹ {verificationResult.product.securityDeposit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Renter Details Card */}
                <div className="lg:col-span-5 p-4 rounded-lg bg-[#10151B] border border-[rgba(161,161,170,0.18)] flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Renter (Current Booking)</span>
                      <span className="font-mono text-zinc-400">#{verificationResult.booking.id}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#F5F5F5]">
                        {verificationResult.renter.name}
                      </div>
                      <div className="text-xs text-[#A1A1AA] font-mono">
                        {verificationResult.renter.phone}
                      </div>
                      <div className="text-xs text-[#A1A1AA]">
                        {verificationResult.renter.email}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[rgba(161,161,170,0.18)] flex items-center justify-between text-xs mt-3">
                    <span className="text-[#A1A1AA]">Vendor:</span>
                    <span className="font-medium text-[#F5F5F5]">
                      {verificationResult.product.vendor.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Row & Navigation Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-xs">
                    <span className="text-[#A1A1AA]">Product Status:</span>
                    <span className="font-bold text-emerald-400">
                      {verificationResult.product.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-xs">
                    <span className="text-[#A1A1AA]">Booking Status:</span>
                    <span className="font-bold text-zinc-300">
                      {verificationResult.booking.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Link
                    to="/admin/products"
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-[#F5F5F5] text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Package className="h-3.5 w-3.5" />
                    View Product
                  </Link>

                  <Link
                    to="/admin/bookings"
                    className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    View Booking
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Verification History Tab */
        <div className="p-6 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-[#F5F5F5]">
              PIN Verification Audit Log
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-xs text-[#F5F5F5] placeholder:text-zinc-500 focus:outline-none focus:border-white/40"
                />
              </div>

              <button
                onClick={fetchHistory}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-[#F5F5F5] border border-white/10 transition-colors cursor-pointer"
                title="Refresh log"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* History Data Table */}
          <div className="rounded-lg border border-[rgba(161,161,170,0.18)] overflow-x-auto">
            <table className="w-full text-left text-xs text-[#F5F5F5]">
              <thead className="bg-[#050709] border-b border-[rgba(161,161,170,0.18)] text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Verification ID</th>
                  <th className="px-4 py-3">Masked PIN</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Renter</th>
                  <th className="px-4 py-3">Actor / Admin</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(161,161,170,0.18)] bg-[#10151B]">
                {historyLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      Loading verification history...
                    </td>
                  </tr>
                ) : historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      No PIN verification records found.
                    </td>
                  </tr>
                ) : (
                  historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-zinc-400">
                        {item.id}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">
                        {item.maskedPin}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            item.outcome === "MATCHED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          )}
                        >
                          {item.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        {item.bookingId}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {item.renterName}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {item.adminName}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
