import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Edit3,
  X,
  User,
  Phone,
  MapPin,
  Compass,
  FileText,
  ShieldCheck,
  Loader2,
  Sun,
  Moon,
  LogIn,
} from "lucide-react";
import { LogoIcon } from "@/components/common/LogoIcon";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import { payerntApi } from "@/payernt/payerntApiService";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

export default function AccountPending() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();

  // Route search params
  const searchParams = useSearch({ from: "/account-pending" }) as {
    type?: string;
    email?: string;
  };

  const rawType = (searchParams.type || "").toLowerCase();
  const isPayernt =
    rawType.includes("payernt") ||
    rawType.includes("vendor") ||
    rawType.includes("lender");

  const accountTypeLabel = isPayernt ? "Payernt" : "Payrent";
  const loginRoute = isPayernt ? "/payernt/auth" : "/login";

  const targetEmail =
    searchParams.email ||
    user?.email ||
    (typeof window !== "undefined"
      ? (() => {
          try {
            const acc = localStorage.getItem("paye₹nt_account") || localStorage.getItem("pay₹ent_account");
            if (acc) return JSON.parse(acc)?.email;
          } catch {}
          return "";
        })()
      : "");

  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"PENDING_REVIEW" | "APPROVED" | "REJECTED">(
    user?.status === "approved" || user?.status === "active"
      ? "APPROVED"
      : user?.status === "rejected"
        ? "REJECTED"
        : "PENDING_REVIEW"
  );
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Edit / Resubmit Modal State
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);
  const [resubmitName, setResubmitName] = useState(user?.fullName || "");
  const [resubmitPhone, setResubmitPhone] = useState(user?.phone || "");
  const [resubmitAddress, setResubmitAddress] = useState(user?.address || "");
  const [resubmitPincode, setResubmitPincode] = useState(user?.pincode || "");
  const [resubmitAadhaar, setResubmitAadhaar] = useState("");
  const [resubmitPan, setResubmitPan] = useState(user?.panNumber || "");
  const [isSubmittingResubmit, setIsSubmittingResubmit] = useState(false);

  const checkStatus = useCallback(
    async (isManual = false) => {
      const token = storage.get<string | null>(STORAGE_KEYS.token, null);
      if (!token && !targetEmail) return;

      if (isManual) setChecking(true);
      try {
        const res = await api.getAuthStatus(
          token,
          targetEmail,
          isPayernt ? "payernt" : "payrent"
        );
        setLastChecked(new Date());

        if (res && res.status) {
          const raw = String(res.status).toUpperCase();
          if (raw === "APPROVED" || raw === "ACTIVE" || res.is_approved) {
            setStatus("APPROVED");
            toast.success("Account Approved! Opening your login portal...");
            
            // Auto redirect to respective login portal
            setTimeout(() => {
              if (isPayernt) {
                (navigate as any)({
                  to: "/payernt/auth",
                  search: targetEmail ? { email: targetEmail } : undefined,
                });
              } else {
                (navigate as any)({
                  to: "/login",
                  search: targetEmail ? { email: targetEmail } : undefined,
                });
              }
            }, 1200);
          } else if (raw === "REJECTED" || raw === "DECLINED") {
            setStatus("REJECTED");
            if (res.rejectionReason) {
              setRejectionReason(res.rejectionReason);
            }
          } else {
            setStatus("PENDING_REVIEW");
            if (isManual) {
              toast.info("Your account is currently under administrative review.");
            }
          }
        }
      } catch (err) {
        console.warn("Status check notice:", err);
      } finally {
        if (isManual) setChecking(false);
      }
    },
    [isPayernt, targetEmail, navigate]
  );

  // Fast real-time polling, window focus, visibility, cross-tab events
  useEffect(() => {
    // 1. Initial check
    checkStatus(false);

    // 2. Fast background poll (every 2.5s while pending)
    const interval = setInterval(() => {
      checkStatus(false);
    }, 2500);

    // 3. Focus & Visibility event handlers
    const handleFocus = () => checkStatus(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkStatus(false);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "payent_approved_event" || e.key === "payent:admin:user_approved") {
        checkStatus(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    // 4. BroadcastChannel for instant cross-tab sync
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("payent-account-approval");
        channel.onmessage = () => {
          checkStatus(false);
        };
      }
    } catch {
      // Channel fallback
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
      if (channel) {
        channel.close();
      }
    };
  }, [checkStatus]);

  // Handle Edit & Resubmit Submission
  const handleResubmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail) {
      toast.error("Email address missing. Please return to login.");
      return;
    }
    if (!resubmitName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (resubmitPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    if (resubmitAddress.trim().length < 5) {
      toast.error("Please enter complete street address.");
      return;
    }
    if (resubmitPincode.replace(/\D/g, "").length !== 6) {
      toast.error("Please enter valid 6-digit PIN code.");
      return;
    }

    if (isPayernt && resubmitAadhaar.replace(/\D/g, "").length !== 12) {
      toast.error("Please enter valid 12-digit Aadhaar number.");
      return;
    }

    if (!isPayernt && resubmitPan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(resubmitPan.trim().toUpperCase())) {
      toast.error("Please enter valid PAN number format (e.g. ABCDE1234F).");
      return;
    }

    setIsSubmittingResubmit(true);
    try {
      if (isPayernt) {
        const res = await payerntApi.resubmit({
          name: resubmitName.trim(),
          email: targetEmail,
          phoneNumber: resubmitPhone.replace(/\D/g, ""),
          address: resubmitAddress.trim(),
          pincode: resubmitPincode.replace(/\D/g, ""),
          aadhaarNumber: resubmitAadhaar.replace(/\D/g, ""),
        });
        if (res.success) {
          toast.success("Details updated and resubmitted for Admin review!");
          setStatus("PENDING_REVIEW");
          setIsResubmitOpen(false);
          setRejectionReason(null);
        } else {
          toast.error(res.error || "Failed to resubmit details.");
        }
      } else {
        const res = await api.resubmitAccount({
          fullName: resubmitName.trim(),
          email: targetEmail,
          phone: resubmitPhone.replace(/\D/g, ""),
          address: resubmitAddress.trim(),
          pincode: resubmitPincode.replace(/\D/g, ""),
          panNumber: resubmitPan.trim().toUpperCase(),
          accountType: "Payrent",
        });
        if (res.success) {
          toast.success("Details updated and resubmitted for Admin review!");
          setStatus("PENDING_REVIEW");
          setIsResubmitOpen(false);
          setRejectionReason(null);
        } else {
          toast.error(res.message || "Failed to resubmit details.");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to resubmit details. Try again.");
    } finally {
      setIsSubmittingResubmit(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none transition-colors duration-200">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Navigation */}
      <header className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-border/70">
        <Link to="/" className="flex items-center gap-2 group">
          <LogoIcon showTagline={true} />
        </Link>

        <div className="flex items-center gap-2.5">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary text-foreground transition-all cursor-pointer shadow-2xs"
            aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-foreground/80 hover:-rotate-12 transition-transform" />
            )}
          </button>

          <Link
            to={loginRoute as any}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-foreground/30 font-medium"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </Link>
        </div>
      </header>

      {/* Main Account Under Review Container */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-8 text-center flex flex-col items-center">
        {/* State Icon */}
        <div className="relative mb-6 flex items-center justify-center">
          {status === "APPROVED" ? (
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-sm">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>
          ) : status === "REJECTED" ? (
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shadow-sm">
              <AlertCircle className="w-8 h-8 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground shadow-sm">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>
          )}
        </div>

        {/* Headline */}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase mb-3 font-display">
          {status === "APPROVED"
            ? "Account Approved"
            : status === "REJECTED"
              ? "Account Not Approved"
              : "Account Under Review"}
        </h1>

        {/* Narrative Copy */}
        <div className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed space-y-1.5 mb-8">
          {status === "APPROVED" ? (
            <>
              <p>Your account has been reviewed and approved.</p>
              <p>You can now log in and access your workspace.</p>
            </>
          ) : status === "REJECTED" ? (
            <>
              <p>We were unable to approve your submitted information.</p>
              <p>Please review the feedback below, correct your details, and resubmit.</p>
            </>
          ) : (
            <>
              <p>Your account has been created successfully.</p>
              <p>Our Admin team is currently reviewing your submitted information.</p>
              <p>You will be able to access your account after the review is completed.</p>
            </>
          )}
        </div>

        {/* Rejection Reason Notice (If Rejected) */}
        {status === "REJECTED" && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 text-left shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  Admin Feedback
                </span>
                <p className="text-xs text-red-950 dark:text-red-200 leading-relaxed font-medium">
                  {rejectionReason || "Address information needs correction or identity documents require update."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Card Display */}
        <div className="w-full bg-card border border-border/80 rounded-2xl p-5 mb-8 shadow-xs text-center space-y-4">
          {/* Account Type */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Account Type
            </span>
            <span className="text-base font-bold text-foreground block">
              {accountTypeLabel}
            </span>
          </div>

          <div className="h-px bg-border/60 w-3/4 mx-auto" />

          {/* Status */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Status
            </span>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold">
              {status === "APPROVED" ? (
                <span className="text-emerald-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Approved
                </span>
              ) : status === "REJECTED" ? (
                <span className="text-red-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Rejected
                </span>
              ) : (
                <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Under Review
                </span>
              )}
            </div>
          </div>

          {targetEmail && (
            <>
              <div className="h-px bg-border/60 w-3/4 mx-auto" />
              <div className="text-[11px] font-mono text-muted-foreground truncate px-2">
                {targetEmail}
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          {status === "REJECTED" ? (
            <>
              <button
                type="button"
                onClick={() => setIsResubmitOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit & Resubmit Details</span>
              </button>

              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-foreground font-semibold text-xs hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Gateway</span>
              </Link>
            </>
          ) : status === "APPROVED" ? (
            <Link
              to={loginRoute as any}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all shadow-sm cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Proceed to Login</span>
            </Link>
          ) : (
            <>
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Gateway</span>
              </Link>

              <button
                type="button"
                onClick={() => checkStatus(true)}
                disabled={checking}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-foreground font-semibold text-xs hover:bg-secondary/80 border border-border transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", checking && "animate-spin")} />
                <span>{checking ? "Checking..." : "Refresh Status"}</span>
              </button>
            </>
          )}
        </div>

        {/* Auto-check notice */}
        <p className="mt-6 text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Status auto-refreshes periodically • Last checked {lastChecked.toLocaleTimeString()}</span>
        </p>
      </main>

      {/* Edit & Resubmit Modal Dialog */}
      <AnimatePresence>
        {isResubmitOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl relative text-left"
            >
              <button
                type="button"
                onClick={() => setIsResubmitOpen(false)}
                className="absolute right-5 top-5 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 mb-5">
                <h2 className="text-lg font-bold tracking-tight text-foreground font-display">
                  Edit & Resubmit Details
                </h2>
                <p className="text-xs text-muted-foreground">
                  Update your information for {accountTypeLabel} account review.
                </p>
              </div>

              <form onSubmit={handleResubmitSubmit} className="space-y-3.5">
                {/* 1. Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={resubmitName}
                      onChange={(e) => setResubmitName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* 2. Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={resubmitPhone}
                      onChange={(e) => setResubmitPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* 3. Address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Complete Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <textarea
                      rows={2}
                      value={resubmitAddress}
                      onChange={(e) => setResubmitAddress(e.target.value)}
                      placeholder="House No, Street, Area, City"
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                  </div>
                </div>

                {/* 4. Pincode */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Pincode</label>
                  <div className="relative">
                    <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      maxLength={6}
                      value={resubmitPincode}
                      onChange={(e) => setResubmitPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit pincode"
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* Identity Number: Aadhaar (for Payernt) or PAN (for Payrent) */}
                {isPayernt ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Aadhaar Number (12 digits)</label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        maxLength={12}
                        value={resubmitAadhaar}
                        onChange={(e) => setResubmitAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        placeholder="12-digit Aadhaar number"
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">PAN Number (10 characters)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        maxLength={10}
                        value={resubmitPan}
                        onChange={(e) => setResubmitPan(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                        placeholder="ABCDE1234F"
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2 text-xs font-mono uppercase text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsResubmitOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingResubmit}
                    className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingResubmit ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Resubmit for Review</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto pt-6 border-t border-border/70 text-center">
        <p className="text-xs text-muted-foreground">
          paYent Security Guard • Verified peer-to-peer equipment rentals
        </p>
      </footer>
    </div>
  );
}
