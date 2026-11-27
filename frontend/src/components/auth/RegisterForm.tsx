import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ClipboardPaste,
} from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { AnimatedCircleCheck } from "@/components/common/AnimatedCircleCheck";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import { payrentApi } from "@/services/payrentApi";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { toast } from "sonner";
import type { User as UserType } from "@/types";

const schema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name (at least 2 letters)")
      .max(100),
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .email("Enter a valid email address")
      .max(255),
    panNumber: z.string().optional(),
    phone: z
      .string()
      .trim()
      .min(10, "Enter a valid 10-digit mobile number")
      .max(20),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters")
      .refine((p) => /[A-Z]/.test(p), "Password must contain at least one uppercase letter")
      .refine((p) => /[a-z]/.test(p), "Password must contain at least one lowercase letter")
      .refine((p) => /[0-9]/.test(p), "Password must contain at least one number")
      .refine((p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(p), "Password must contain at least one special character"),
    confirm: z.string().min(1, "Please confirm your password"),
    terms: z.literal(true, {
      errorMap: () => ({ message: "Please accept the Terms & Privacy Policy" }),
    }),
    isAdmin: z.boolean().optional(),
    adminCode: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  })
  .refine((d) => !d.isAdmin || (d.adminCode && d.adminCode.trim().length > 0), {
    path: ["adminCode"],
    message: "Admin setup code is required",
  });

type FormValues = z.infer<typeof schema>;

function isValidInternalRedirect(url: string | null | undefined, currentPath: string): url is string {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return false;
  if (url.startsWith("/login") || url.startsWith("/register")) return false;
  if (url === currentPath) return false;
  return true;
}

export function RegisterForm() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirm: "",
      terms: false as any,
    },
  });

  const pw = watch("password") ?? "";
  const hasMinLen = pw.length >= 8;
  const hasUppercase = /[A-Z]/.test(pw);
  const hasLowercase = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pw);
  const isPasswordValid = hasMinLen && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const watchIsAdmin = watch("isAdmin") ?? false;
  const watchTerms = watch("terms") ?? false;

  const [step, setStep] = useState<"details" | "otp">("details");
  const [pendingData, setPendingData] = useState<FormValues | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Read OTP and Email parameters from URL (e.g. from transactional email verification links)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlOtp = (params.get("otp") || params.get("code") || "").trim();
      const urlEmail = (params.get("email") || "").trim();

      if (urlEmail) {
        setValue("email", urlEmail);
      }

      if (urlOtp && /^\d{6}$/.test(urlOtp)) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(urlOtp).catch(() => {});
        }

        const savedPending = sessionStorage.getItem("payent:pending_reg_data");
        if (savedPending) {
          try {
            const parsed = JSON.parse(savedPending);
            setPendingData(parsed);
            setStep("otp");
            setOtpDigits(urlOtp.split(""));
            setOtpError(null);
            toast.success(`Verification code ${urlOtp} auto-filled and copied to clipboard!`);
            return;
          } catch {}
        }

        // Store preloaded OTP to auto-apply once registration details are submitted
        sessionStorage.setItem("payent:pending_reg_otp", urlOtp);
        toast.success(`Verification code ${urlOtp} copied to clipboard! Complete form to verify.`);
      }
    } catch {}
  }, [setValue]);

  useEffect(() => {
    if (hasNavigatedRef.current) return;

    const isSignedOut =
      typeof window !== "undefined" &&
      localStorage.getItem("payent:signed_out") === "true";
    const token =
      typeof window !== "undefined"
        ? storage.get<string | null>(STORAGE_KEYS.token, null)
        : null;

    if (!ready || !user || !token || isSignedOut) return;

    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const redirectUrl =
      searchParams?.get("redirect") ||
      searchParams?.get("returnUrl");

    // CRITICAL LOOP GUARD: If user arrived with a redirect query param, stay on register form
    if (redirectUrl) {
      return;
    }

    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    hasNavigatedRef.current = true;

    if (user.role === "admin" && currentPath !== "/admin/dashboard") {
      navigate({ to: "/admin/dashboard", replace: true });
    } else if (currentPath !== "/categories") {
      navigate({ to: "/categories", replace: true });
    }
  }, [ready, user, navigate]);

  const showAdminOption = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of params.entries()) {
      if (
        key.trim().toLowerCase() === "admin" &&
        value.trim().toLowerCase() === "true"
      ) {
        return true;
      }
    }
    return false;
  }, []);

  const onSubmit = async (data: FormValues) => {
    setErrorState(null);
    setOtpError(null);
    const cleanPhone = data.phone.replace(/\D/g, "");
    const cleanEmail = data.email.trim().toLowerCase();

    try {
      // 1. Dispatch Email Verification OTP via SMTP / Backend
      const reqRes = await api.registerRequest(cleanEmail, cleanPhone);
      if (!reqRes?.success) {
        const errorMsg = reqRes?.error || reqRes?.message || "Failed to dispatch verification code.";
        const lower = errorMsg.toLowerCase();
        if (lower.includes("email") || lower.includes("exists")) {
          setError("email", { type: "server", message: errorMsg });
        } else if (lower.includes("phone") || lower.includes("mobile")) {
          setError("phone", { type: "server", message: errorMsg });
        } else {
          setErrorState(errorMsg);
        }
        toast.error(errorMsg);
        return;
      }

      // 2. Transition to OTP Verification Step
      try {
        sessionStorage.setItem("payent:pending_reg_data", JSON.stringify(data));
      } catch {}
      setPendingData(data);
      setStep("otp");

      // Check if an OTP was pre-loaded via email link
      const preloadedOtp = typeof window !== "undefined" ? sessionStorage.getItem("payent:pending_reg_otp") : null;
      if (preloadedOtp && /^\d{6}$/.test(preloadedOtp)) {
        setOtpDigits(preloadedOtp.split(""));
        sessionStorage.removeItem("payent:pending_reg_otp");
      } else {
        setOtpDigits(["", "", "", "", "", ""]);
      }

      setResendCooldown(60);
      toast.success(`Verification code sent to ${cleanEmail}`);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      const msg = err?.message || "Failed to dispatch verification code. Please check your connection.";
      setErrorState(msg);
      toast.error(msg);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    if (!pendingData) return;
    const code = (codeToVerify || otpDigits.join("")).trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setOtpError("Please enter all 6 numeric digits of your verification code.");
      return;
    }

    setOtpError(null);
    setIsVerifyingOtp(true);
    try {
      const adminCode = showAdminOption && pendingData.isAdmin ? pendingData.adminCode : undefined;
      const panUpper = pendingData.panNumber ? pendingData.panNumber.toUpperCase().trim() : undefined;
      const cleanPhone = pendingData.phone.replace(/\D/g, "");
      const cleanEmail = pendingData.email.trim().toLowerCase();

      const res = await api.registerVerify(
        cleanEmail,
        cleanPhone,
        code,
        pendingData.password,
        pendingData.fullName,
        adminCode,
        undefined, // address removed
        "India",
        undefined, // pincode removed
        undefined,
        panUpper,
      );

      if (!res?.success) {
        const errorMsg = res?.error || res?.message || "Invalid or expired verification code.";
        setOtpError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const userObj = res.user || res.account || {};
      const accountId = userObj.accountId || `PAYRENT_USER_${cleanEmail}`;
      const panMasked = userObj.panMasked || (panUpper ? `XXXXX${panUpper.slice(5)}` : undefined);
      const createdRole = userObj.role || (pendingData.isAdmin ? "admin" : "customer");

      if (createdRole === "admin" && res.token) {
        const createdUser: UserType = {
          id: userObj.id || userObj.email || cleanEmail,
          accountId,
          accountType: "pay₹ent",
          fullName: userObj.fullName || userObj.name || pendingData.fullName,
          email: userObj.email || cleanEmail,
          phone: cleanPhone,
          panNumber: panUpper,
          panMasked,
          role: "admin",
          status: "active",
          country: "India",
        };
        storage.set(STORAGE_KEYS.token, res.token);
        storage.set(STORAGE_KEYS.currentUser, createdUser);
        localStorage.setItem("payent:admin:token", res.token);
        localStorage.setItem("payent:admin:current_user", JSON.stringify(createdUser));
        toast.success("Admin account created and verified successfully!");
        navigate({ to: "/admin/dashboard" });
        return;
      }

      // Normal Payrent Customer Registration -> Route to Account Pending / Review
      // Record registration consent under DPDP Act 2023 & Indian IT Rules
      api.submitConsent({
        userIdOrSession: accountId || `user_${cleanEmail}`,
        consentType: "REGISTRATION_TERMS",
        preferences: {
          terms_version: "2026.1",
          privacy_version: "2026.1",
          accepted_at: new Date().toISOString(),
        },
        userEmail: cleanEmail,
      }).catch(() => {});

      toast.success("Email verified and account registered successfully!");
      navigate({
        to: "/account-pending",
        search: { type: "payrent", email: cleanEmail } as any,
      });
    } catch (err: any) {
      const msg = err?.message || "Failed to verify registration code.";
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingData || resendCooldown > 0 || isResendingOtp) return;
    setIsResendingOtp(true);
    setOtpError(null);
    try {
      const cleanPhone = pendingData.phone.replace(/\D/g, "");
      const cleanEmail = pendingData.email.trim().toLowerCase();
      const res = await api.registerRequest(cleanEmail, cleanPhone);
      if (res?.success) {
        setResendCooldown(60);
        toast.success("A fresh verification code has been dispatched to your email!");
      } else {
        const msg = res?.error || res?.message || "Failed to resend verification code.";
        setOtpError(msg);
        toast.error(msg);
      }
    } catch {
      toast.error("Unable to resend verification code. Please check your network.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = numericChar;
    setOtpDigits(updated);
    setOtpError(null);

    if (numericChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (numericChar && index === 5) {
      const fullCode = updated.join("");
      if (fullCode.length === 6) {
        handleVerifyOtp(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setOtpDigits(updated);
    setOtpError(null);
    const targetIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[targetIndex]?.focus();

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.info("Please press Ctrl+V / Cmd+V in the box to paste.");
        return;
      }
      const text = await navigator.clipboard.readText();
      const clean = text.replace(/\D/g, "").slice(0, 6);
      if (!clean) {
        toast.error("No numeric verification code found in clipboard.");
        return;
      }
      const updated = ["", "", "", "", "", ""];
      for (let i = 0; i < clean.length; i++) updated[i] = clean[i];
      setOtpDigits(updated);
      setOtpError(null);
      toast.success(`Pasted code ${clean}`);
      const targetIndex = Math.min(clean.length, 5);
      otpInputRefs.current[targetIndex]?.focus();
      if (clean.length === 6) {
        handleVerifyOtp(clean);
      }
    } catch {
      toast.info("Please press Ctrl+V / Cmd+V in the box to paste.");
    }
  };

  const [validationFailed, setValidationFailed] = useState(false);
  const onInvalid = () => {
    setValidationFailed(true);
    setTimeout(() => setValidationFailed(false), 2000);
  };

  if (step === "otp") {
    return (
      <div className="space-y-4 text-left">
        {/* Target Email Check & Change */}
        <div className="p-3 rounded-xl bg-secondary/40 border border-border/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 text-left">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Code sent to</p>
              <p className="text-xs font-bold text-foreground truncate">{pendingData?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setOtpError(null);
            }}
            className="text-xs font-semibold text-primary hover:underline shrink-0 cursor-pointer"
          >
            Change
          </button>
        </div>

        {/* 6-Digit OTP Input Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-medium text-muted-foreground">
              Enter 6-digit verification code
            </label>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer transition-colors"
              title="Paste 6-digit code from clipboard"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span>Paste code</span>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpInputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isVerifyingOtp}
                aria-label={`Digit ${i + 1} of verification code`}
                className={`h-12 w-11 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-mono font-extrabold rounded-xl border bg-card text-foreground transition-all focus:outline-none focus:ring-2 disabled:opacity-50 ${
                  otpError
                    ? "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
                    : "border-border/80 focus:border-primary focus:ring-primary/20"
                }`}
              />
            ))}
          </div>

          {otpError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center flex items-center justify-center gap-1.5">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}
        </div>

        {/* Primary Action Button: Verify & Complete Registration */}
        <Button
          type="button"
          onClick={() => handleVerifyOtp()}
          disabled={isVerifyingOtp || otpDigits.join("").length < 6}
          loading={isVerifyingOtp}
          className="w-full font-extrabold h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isVerifyingOtp ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying code...</span>
            </div>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Verify & complete registration</span>
            </>
          )}
        </Button>

        {/* Resend & Timer */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-[11px] text-muted-foreground">Code valid for 5 minutes</span>

          <div>
            {resendCooldown > 0 ? (
              <span className="text-muted-foreground font-medium text-[11px]">
                Resend in <strong className="font-mono text-foreground">{resendCooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResendingOtp}
                className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {isResendingOtp ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    <span>Resend code</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-2.5 text-left">
      {/* 1. Full Name & Mobile Number in 2-col grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Input
          label="Full Name"
          autoComplete="name"
          icon={<User className="h-4.5 w-4.5 stroke-[1.6]" />}
          error={errors.fullName?.message}
          inputWrapperClassName="h-10 sm:h-10.5 px-3.5 sm:px-4"
          {...register("fullName")}
        />

        <Input
          label="Mobile Number"
          type="tel"
          autoComplete="tel"
          icon={<Phone className="h-4.5 w-4.5 stroke-[1.6]" />}
          error={errors.phone?.message}
          inputWrapperClassName="h-10 sm:h-10.5 px-3.5 sm:px-4"
          {...register("phone")}
        />
      </div>

      {/* 2. Email Address */}
      <Input
        label="Email Address"
        type="email"
        autoComplete="email"
        icon={<Mail className="h-4.5 w-4.5 stroke-[1.6]" />}
        error={errors.email?.message}
        inputWrapperClassName="h-10 sm:h-10.5 px-3.5 sm:px-4"
        {...register("email")}
      />

      {/* 3. Password & Confirm Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Input
          label="Password"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          icon={<Lock className="h-4.5 w-4.5 stroke-[1.6]" />}
          inputWrapperClassName="h-10 sm:h-10.5 px-3.5 sm:px-4"
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="p-1 -mr-1 text-muted-foreground/80 dark:text-[#BDBDBD] hover:text-foreground dark:hover:text-white cursor-pointer focus:outline-none transition-colors shrink-0 flex items-center justify-center"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? (
                <EyeOff className="h-4.5 w-4.5 stroke-[1.6]" />
              ) : (
                <Eye className="h-4.5 w-4.5 stroke-[1.6]" />
              )}
            </button>
          }
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label="Confirm Password"
          type={showConfirmPw ? "text" : "password"}
          autoComplete="new-password"
          icon={<Lock className="h-4.5 w-4.5 stroke-[1.6]" />}
          inputWrapperClassName="h-10 sm:h-10.5 px-3.5 sm:px-4"
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowConfirmPw((v) => !v)}
              className="p-1 -mr-1 text-muted-foreground/80 dark:text-[#BDBDBD] hover:text-foreground dark:hover:text-white cursor-pointer focus:outline-none transition-colors shrink-0 flex items-center justify-center"
              aria-label={showConfirmPw ? "Hide password" : "Show password"}
            >
              {showConfirmPw ? (
                <EyeOff className="h-4.5 w-4.5 stroke-[1.6]" />
              ) : (
                <Eye className="h-4.5 w-4.5 stroke-[1.6]" />
              )}
            </button>
          }
          error={errors.confirm?.message}
          {...register("confirm")}
        />
      </div>

      {/* Password Requirements Guidance */}
      {pw.length > 0 && !isPasswordValid && (
        <div className="p-2 rounded-lg bg-secondary/80 border border-border/80 text-[10px] space-y-0.5 text-muted-foreground">
          <p className="font-semibold text-foreground">Password requirements:</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <span className={hasMinLen ? "text-emerald-500 font-medium" : ""}>
              • 8+ characters
            </span>
            <span className={hasUppercase ? "text-emerald-500 font-medium" : ""}>
              • Uppercase letter
            </span>
            <span className={hasLowercase ? "text-emerald-500 font-medium" : ""}>
              • Lowercase letter
            </span>
            <span className={hasNumber && hasSpecial ? "text-emerald-500 font-medium" : ""}>
              • Number & symbol
            </span>
          </div>
        </div>
      )}

      {/* Secret admin setup toggle if ?admin=true */}
      {showAdminOption && (
        <div className="space-y-1.5 p-2.5 rounded-xl bg-secondary border border-border">
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-foreground">
            <input
              type="checkbox"
              className="rounded border-border text-primary focus:ring-primary"
              {...register("isAdmin")}
            />
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Register as site administrator</span>
          </label>

          {watchIsAdmin && (
            <Input
              label="Admin Setup Code"
              icon={<Lock className="h-4 w-4" />}
              error={errors.adminCode?.message}
              inputWrapperClassName="h-10 sm:h-10.5 px-3.5 sm:px-4"
              {...register("adminCode")}
            />
          )}
        </div>
      )}

      {/* Global Server Error Message */}
      {error && (
        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Terms & Conditions Checkbox with Animated Circle Tick */}
      <div className="pt-1">
        <label htmlFor="register-terms" className="flex items-center gap-2.5 text-xs cursor-pointer select-none group">
          <input
            id="register-terms"
            type="checkbox"
            className="sr-only focus:not-sr-only focus:inline-block focus:w-4 focus:h-4 focus:mr-1"
            {...register("terms")}
          />
          <AnimatedCircleCheck checked={!!watchTerms} />
          <span className="text-muted-foreground text-[11px] leading-tight group-hover:text-foreground transition-colors">
            I accept the{" "}
            <Link to="/terms" target="_blank" className="text-foreground hover:underline font-bold">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className="text-foreground hover:underline font-bold">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p className="mt-1 text-xs text-destructive font-medium">
            {errors.terms.message}
          </p>
        )}
      </div>

      {/* Primary Action Button: Get Verification Code */}
      <Button
        type="submit"
        className="w-full font-extrabold h-10 sm:h-10.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-1.5"
        loading={isSubmitting}
        isError={Boolean(error) || validationFailed}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Sending Verification Code...</span>
          </div>
        ) : (
          <>
            <ArrowRight className="h-4 w-4 shrink-0" />
            <span>Continue to Email Verification</span>
          </>
        )}
      </Button>

      {/* Switch to Login Link */}
      <div className="pt-1 text-center">
        <p className="text-xs text-muted-foreground">
          Already have a Payrent account?{" "}
          <Link
            to="/login"
            className="font-bold text-foreground hover:underline cursor-pointer"
          >
            Sign in to Payrent
          </Link>
        </p>
      </div>
    </form>
  );
}
