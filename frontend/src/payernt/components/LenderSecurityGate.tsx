import React, { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Clock,
  Sparkles,
  ShieldAlert,
  Fingerprint,
  Check,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { lenderSecurityService } from "../securityService";

interface LenderSecurityGateProps {
  onVerifiedSuccess: () => void;
  onCancel: () => void;
}

type SecurityStep = "pin-create" | "pin-confirm" | "mobile" | "otp" | "success";

export function LenderSecurityGate({
  onVerifiedSuccess,
  onCancel,
}: LenderSecurityGateProps) {
  const [step, setStep] = useState<SecurityStep>("pin-create");
  const shouldReduceMotion = useReducedMotion();

  // PIN states (4 digits)
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Mobile state
  const [countryCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileError, setMobileError] = useState<string | null>(null);

  // OTP states (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [demoOtp, setDemoOtp] = useState<string>("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(120);
  const [resendCooldownSec, setResendCooldownSec] = useState<number>(30);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Input refs for automatic focus handling
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus the first field whenever step transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === "pin-create") {
        pinInputRefs.current[0]?.focus();
      } else if (step === "pin-confirm") {
        confirmPinInputRefs.current[0]?.focus();
      } else if (step === "mobile") {
        mobileInputRef.current?.focus();
      } else if (step === "otp") {
        otpInputRefs.current[0]?.focus();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [step]);

  // Expiration & Resend countdown timers for OTP step
  useEffect(() => {
    if (step !== "otp") return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, otpExpiresAt - now);
      const remainingSec = Math.ceil(remainingMs / 1000);
      setTimeLeftSec(remainingSec);

      setResendCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step, otpExpiresAt]);

  // Format MM:SS for countdown
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // HANDLERS: PIN CREATION & CONFIRMATION
  // -------------------------------------------------------------
  const handlePinChange = (index: number, val: string, isConfirm = false) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setPinError(null);

    if (isConfirm) {
      const updated = [...confirmPinDigits];
      updated[index] = digit;
      setConfirmPinDigits(updated);

      if (digit && index < 3) {
        confirmPinInputRefs.current[index + 1]?.focus();
      }
    } else {
      const updated = [...pinDigits];
      updated[index] = digit;
      setPinDigits(updated);

      if (digit && index < 3) {
        pinInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    isConfirm = false
  ) => {
    const currentList = isConfirm ? confirmPinDigits : pinDigits;
    const refs = isConfirm ? confirmPinInputRefs : pinInputRefs;

    if (e.key === "Backspace" && !currentList[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePinCreateContinue = () => {
    const pin = pinDigits.join("");
    if (pin.length !== 4) {
      setPinError("Enter a 4-digit PIN.");
      toast.error("Enter a 4-digit PIN.");
      return;
    }
    setPinError(null);
    setStep("pin-confirm");
  };

  const handlePinConfirmSubmit = () => {
    const pin = pinDigits.join("");
    const confirmPin = confirmPinDigits.join("");

    if (confirmPin.length !== 4) {
      setPinError("Enter all 4 digits to confirm your PIN.");
      return;
    }

    const res = lenderSecurityService.setAndConfirmPin(pin, confirmPin);
    if (!res.valid) {
      setPinError(res.error || "PINs do not match. Try again.");
      toast.error(res.error || "PINs do not match. Try again.");
      setConfirmPinDigits(["", "", "", ""]);
      confirmPinInputRefs.current[0]?.focus();
      return;
    }

    setPinError(null);
    toast.success("Host PIN verified successfully!");
    setStep("mobile");
  };

  // -------------------------------------------------------------
  // HANDLERS: MOBILE NUMBER & OTP GENERATION
  // -------------------------------------------------------------
  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = mobileNumber.replace(/\D/g, "");

    if (cleanNumber.length !== 10) {
      setMobileError("Please enter a valid 10-digit mobile number.");
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    setMobileError(null);

    // Generate mock OTP via frontend service
    const { otp, expiresAt } = lenderSecurityService.generateMockOtp(cleanNumber);
    setDemoOtp(otp);
    setOtpExpiresAt(expiresAt);
    setTimeLeftSec(120);
    setResendCooldownSec(30);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError(null);

    toast.success(`Verification code sent to +91 ${cleanNumber}`);
    setStep("otp");
  };

  // -------------------------------------------------------------
  // HANDLERS: OTP INPUT & VERIFICATION
  // -------------------------------------------------------------
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setOtpError(null);

    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);

    const focusIdx = Math.min(5, pastedData.length);
    otpInputRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = () => {
    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length !== 6) {
      setOtpError("Enter all 6 digits of the verification code.");
      return;
    }

    setIsVerifyingOtp(true);

    setTimeout(() => {
      setIsVerifyingOtp(false);
      const res = lenderSecurityService.verifyOtp(enteredOtp);

      if (!res.valid) {
        setOtpError(res.error || "Incorrect verification code. Try again.");
        toast.error(res.error || "Incorrect verification code. Try again.");
        return;
      }

      setOtpError(null);
      setStep("success");
      toast.success("Host authentication verified!");

      // Transition smoothly into the product listing wizard
      setTimeout(() => {
        onVerifiedSuccess();
      }, 800);
    }, 350);
  };

  const handleResendOtp = () => {
    if (resendCooldownSec > 0) return;

    const { otp, expiresAt } = lenderSecurityService.generateMockOtp(mobileNumber);
    setDemoOtp(otp);
    setOtpExpiresAt(expiresAt);
    setTimeLeftSec(120);
    setResendCooldownSec(30);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError(null);

    toast.info("A new verification code has been generated.");
    otpInputRefs.current[0]?.focus();
  };

  const handleAutoFillDemoOtp = () => {
    if (!demoOtp) return;
    const digits = demoOtp.split("").slice(0, 6);
    setOtpDigits(digits);
    setOtpError(null);
    toast.success("Demo OTP auto-filled!");
  };

  return (
    <div className="max-w-md mx-auto w-full px-4 py-8 sm:py-12">
      {/* Top Security Header */}
      <div className="text-center mb-6 space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Payent Security Clearance</span>
        </div>
        <h2 className="text-lg font-extrabold text-foreground font-display">
          Host Authentication Gate
        </h2>
        <p className="text-xs text-muted-foreground">
          Confirm your lender credentials before managing marketplace inventory.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ========================================================= */}
        {/* STAGE 1: CREATE 4-DIGIT SECRET PIN                        */}
        {/* ========================================================= */}
        {step === "pin-create" && (
          <motion.div
            key="pin-create"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-xl text-center relative overflow-hidden"
          >
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <KeyRound className="h-8 w-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground font-display">
                Create your Host PIN
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Set a 4-digit host PIN to protect your equipment listings and payout details.
              </p>
            </div>

            {/* 4-Digit Input Boxes */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    pinInputRefs.current[idx] = el;
                  }}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value, false)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e, false)}
                  className="h-14 w-14 rounded-2xl border border-border bg-secondary/40 text-center text-2xl font-black text-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  aria-label={`PIN Digit ${idx + 1}`}
                />
              ))}
            </div>

            {/* Toggle show/hide PIN */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
              >
                {showPin ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Hide PIN</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>Show PIN</span>
                  </>
                )}
              </button>
            </div>

            {pinError && (
              <p className="text-xs font-semibold text-destructive animate-in fade-in">
                {pinError}
              </p>
            )}

            {/* Security Notice */}
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3.5 text-[11px] text-muted-foreground text-center">
              Your PIN is encrypted locally. Never share your host PIN with borrowers.
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-2xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePinCreateContinue}
                disabled={pinDigits.join("").length !== 4}
                className="flex-1 py-3 px-4 rounded-2xl bg-foreground text-background text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-98"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STAGE 2: CONFIRM 4-DIGIT SECRET PIN                      */}
        {/* ========================================================= */}
        {step === "pin-confirm" && (
          <motion.div
            key="pin-confirm"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-xl text-center relative overflow-hidden"
          >
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <Lock className="h-8 w-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground font-display">
                Confirm your Host PIN
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Re-enter the same 4 digits to confirm your host security code.
              </p>
            </div>

            {/* 4-Digit Confirm Input Boxes */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {confirmPinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    confirmPinInputRefs.current[idx] = el;
                  }}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value, true)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e, true)}
                  className="h-14 w-14 rounded-2xl border border-border bg-secondary/40 text-center text-2xl font-black text-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  aria-label={`Confirm PIN Digit ${idx + 1}`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs font-semibold text-destructive animate-in fade-in">
                {pinError}
              </p>
            )}

            {/* Security Notice */}
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3.5 text-[11px] text-muted-foreground text-center">
              Make sure both PIN inputs match identically.
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("pin-create");
                  setConfirmPinDigits(["", "", "", ""]);
                  setPinError(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handlePinConfirmSubmit}
                disabled={confirmPinDigits.join("").length !== 4}
                className="flex-1 py-3 px-4 rounded-2xl bg-foreground text-background text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-98"
              >
                <span>Confirm PIN</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STAGE 3: MOBILE NUMBER VERIFICATION                      */}
        {/* ========================================================= */}
        {step === "mobile" && (
          <motion.div
            key="mobile"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-xl text-center relative overflow-hidden"
          >
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <Smartphone className="h-8 w-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground font-display">
                Verify Mobile Number
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                We'll send a 6-digit OTP to authenticate your host session.
              </p>
            </div>

            <form onSubmit={handleMobileSubmit} className="space-y-4 pt-1">
              <div className="text-left space-y-1.5">
                <label className="text-xs font-bold text-foreground">Registered Mobile Number</label>
                <div className="flex items-center rounded-2xl border border-border bg-secondary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden shadow-inner">
                  <span className="px-4 py-3.5 text-xs font-bold text-muted-foreground border-r border-border bg-secondary/60">
                    {countryCode}
                  </span>
                  <input
                    ref={mobileInputRef}
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileError(null);
                      setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                    }}
                    className="flex-1 bg-transparent px-4 py-3.5 text-sm font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
              </div>

              {mobileError && (
                <p className="text-xs font-semibold text-destructive animate-in fade-in">
                  {mobileError}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={mobileNumber.length !== 10}
                  className="w-full py-3.5 px-4 rounded-2xl bg-foreground text-background text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Request OTP Code</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STAGE 4: ENTER VERIFICATION CODE (OTP)                   */}
        {/* ========================================================= */}
        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-xl text-center relative overflow-hidden"
          >
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-xs">
                <ShieldCheck className="h-8 w-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground font-display">
                Enter OTP Verification
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Enter the 6-digit code sent to +91 {mobileNumber}
              </p>
            </div>

            {/* Development Mode Helper Badge */}
            {demoOtp && (
              <button
                type="button"
                onClick={handleAutoFillDemoOtp}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border text-xs font-mono text-muted-foreground cursor-pointer transition-all active:scale-98"
                title="Click to auto-fill demo OTP"
              >
                <span>Demo OTP:</span>
                <strong className="text-foreground tracking-widest">{demoOtp}</strong>
                <span className="text-[10px] text-primary font-sans font-bold bg-primary/10 px-2 py-0.5 rounded-md ml-1">
                  Click to Auto-fill
                </span>
              </button>
            )}

            {/* 6-Digit OTP Boxes */}
            <div
              className="flex items-center justify-center gap-2 sm:gap-2.5 pt-1"
              onPaste={handleOtpPaste}
            >
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="h-13 w-11 sm:h-14 sm:w-12 rounded-2xl border border-border bg-secondary/40 text-center text-xl font-black text-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  aria-label={`OTP Digit ${idx + 1}`}
                />
              ))}
            </div>

            {/* Expiration and Resend Row */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <div className="flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {timeLeftSec > 0 ? (
                    `Expires in ${formatTimer(timeLeftSec)}`
                  ) : (
                    <span className="text-destructive font-bold">Code expired</span>
                  )}
                </span>
              </div>

              <div>
                {resendCooldownSec > 0 ? (
                  <span className="text-muted-foreground/80 font-mono">
                    Resend in {resendCooldownSec}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Resend OTP</span>
                  </button>
                )}
              </div>
            </div>

            {otpError && (
              <p className="text-xs font-semibold text-destructive animate-in fade-in">
                {otpError}
              </p>
            )}

            {/* Verification Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpDigits.join("").length !== 6 || timeLeftSec === 0 || isVerifyingOtp}
                className="w-full py-3.5 px-4 rounded-2xl bg-foreground text-background text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying Host Credentials...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify & Access Listing Form</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STAGE 5: VERIFICATION SUCCESS ANIMATION                   */}
        {/* ========================================================= */}
        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-emerald-500/30 bg-card p-8 sm:p-10 space-y-4 shadow-2xl text-center"
          >
            <div className="h-18 w-18 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Security Access Verified
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground font-display">
                Host Access Authorized
              </h3>
              <p className="text-xs text-muted-foreground">
                Launching 10-step studio listing wizard...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LenderSecurityGate;
