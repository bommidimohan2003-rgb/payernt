import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { AnimatedCircleCheck } from "@/components/common/AnimatedCircleCheck";
import { useAuth } from "@/hooks/useAuth";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { api } from "@/utils/api";
import { toast } from "sonner";
import type { User } from "@/types";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function isValidInternalRedirect(url: string | null | undefined, currentPath: string): url is string {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return false;
  if (url.startsWith("/login") || url.startsWith("/register")) return false;
  if (url === currentPath) return false;
  return true;
}

export function LoginForm() {
  const { user, ready, login, loginWithOtp } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Mode: "password" or "otp"
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // Password Login State
  const [showPw, setShowPw] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);

  // Email OTP State
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    // Prevent multiple executions / navigation bounce loops
    if (hasNavigatedRef.current) return;

    // Only auto-redirect if auth initialization is ready, user is active with a real token,
    // and the user did not explicitly sign out
    const isSignedOut =
      typeof window !== "undefined" &&
      localStorage.getItem("payent:signed_out") === "true";
    const token =
      typeof window !== "undefined"
        ? storage.get<string | null>(STORAGE_KEYS.token, null)
        : null;

    if (!ready || !user || !token || isSignedOut) {
      return;
    }

    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const redirectUrl =
      searchParams?.get("redirect") ||
      searchParams?.get("returnUrl");

    if (redirectUrl) {
      return;
    }

    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    const hasAdminToken = typeof window !== "undefined" && !!localStorage.getItem("payent:admin:token");
    const isAdmin = user.role === "admin" || (user as any).role === "superadmin";

    // Auto-redirect only once for cleanly authenticated users who directly navigated to /login
    hasNavigatedRef.current = true;

    if (isAdmin && hasAdminToken && currentPath !== "/admin/dashboard") {
      navigate({ to: "/admin/dashboard", replace: true });
    } else if (!isAdmin && currentPath !== "/dashboard") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [ready, user, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { remember: true },
  });

  const watchRemember = watch("remember");

  const handleLoginSuccess = (res: any, email: string) => {
    toast.success("Signed in successfully!");

    const currentUser = storage.get<User | null>(
      STORAGE_KEYS.currentUser,
      null,
    );

    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const redirectUrl =
      searchParams?.get("redirect") ||
      searchParams?.get("returnUrl") ||
      (typeof window !== "undefined"
        ? localStorage.getItem("pay₹ent_pending_product_redirect")
        : null);
    const pendingProductId =
      typeof window !== "undefined"
        ? localStorage.getItem("pendingProductId")
        : null;

    if (typeof window !== "undefined") {
      localStorage.removeItem("pay₹ent_pending_product_redirect");
      localStorage.removeItem("pendingProductId");
    }

    const loggedInUser = (res as any).user || currentUser;
    const isAdmin = loggedInUser?.role === "admin" || (loggedInUser as any)?.role === "superadmin";
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

    const userToken = storage.get<string | null>(STORAGE_KEYS.token, null);

    // Accelerate post-login loading: Seed cache from compound bootstrap payload and prefetch in parallel
    const bootstrap = (res as any)?.bootstrap;
    if (bootstrap && loggedInUser?.email) {
      if (typeof bootstrap.cartCount === "number") {
        queryClient.setQueryData(["cart", loggedInUser.email], (prev: any) => ({
          items: prev?.items || [],
          count: bootstrap.cartCount,
          subtotal: prev?.subtotal || 0,
          tax: prev?.tax || 0,
          total: prev?.total || 0,
        }));
      }
      if (typeof bootstrap.unreadNotificationsCount === "number") {
        queryClient.setQueryData(["notifications", "unread-count", "PAYRENT"], bootstrap.unreadNotificationsCount);
      }
    }

    if (userToken && loggedInUser?.email) {
      api.prefetchAuthenticatedRoutes(userToken);
      queryClient.prefetchQuery({
        queryKey: ["cart", loggedInUser.email],
        queryFn: () => api.getCart(),
        staleTime: 1000 * 30,
      });
    }

    if (isAdmin && loggedInUser) {
      if (userToken) {
        localStorage.setItem("payent:admin:token", userToken);
      }
      localStorage.setItem(
        "payent:admin:current_user",
        JSON.stringify({
          id: loggedInUser.id,
          fullName: loggedInUser.fullName,
          email: loggedInUser.email,
          role: "admin",
          avatar: loggedInUser.profilePhotoUrl || loggedInUser.profile_photo_url || loggedInUser.avatar || "",
          profilePhotoUrl: loggedInUser.profilePhotoUrl || loggedInUser.profile_photo_url || loggedInUser.avatar || "",
          profile_photo_url: loggedInUser.profilePhotoUrl || loggedInUser.profile_photo_url || loggedInUser.avatar || "",
          createdAt: new Date().toISOString(),
        }),
      );
      localStorage.removeItem("payent:admin:logged_out");
      localStorage.removeItem("payent:signed_out");
      window.dispatchEvent(new Event("payent:admin:profile-updated"));

      if (isValidInternalRedirect(redirectUrl, currentPath) && redirectUrl.startsWith("/admin")) {
        navigate({ to: redirectUrl as any });
      } else {
        navigate({ to: "/admin/dashboard" });
      }
      return;
    }

    const effectiveRedirect = isValidInternalRedirect(redirectUrl, currentPath)
      ? (redirectUrl.startsWith("/admin") ? null : redirectUrl)
      : null;

    if (effectiveRedirect) {
      navigate({ to: effectiveRedirect as any });
    } else if (pendingProductId && `/product/${pendingProductId}` !== currentPath) {
      navigate({ to: `/product/${pendingProductId}` as any });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  const onSubmit = async (data: FormValues) => {
    setErrorState(null);
    const res = await login(data.email, data.password);
    if (!res.ok) {
      const msg = res.error ?? "Invalid email or password.";
      const lower = msg.toLowerCase();
      if (
        lower.includes("under review") ||
        lower.includes("not approved") ||
        lower.includes("pending") ||
        lower.includes("rejected") ||
        (res as any)?.status === "PENDING_REVIEW" ||
        (res as any)?.status === "REJECTED"
      ) {
        toast.info(msg);
        navigate({
          to: "/account-pending",
          search: { type: "payrent", email: data.email } as any,
        });
        return;
      }
      if (msg.toLowerCase().includes("password")) {
        setError("password", { type: "server", message: msg });
      } else if (
        msg.toLowerCase().includes("email") ||
        msg.toLowerCase().includes("user")
      ) {
        setError("email", { type: "server", message: msg });
      } else {
        setErrorState(msg);
      }
      return;
    }

    handleLoginSuccess(res, data.email);
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOtpError(null);
    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setOtpError("Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await api.loginOtpRequest(cleanEmail);
      if (res?.success) {
        setOtpStep("verify");
        setOtpDigits(["", "", "", "", "", ""]);
        setResendCooldown(60);
        toast.success(`Login verification code sent to ${cleanEmail}`);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        const errorMsg = res?.error || res?.message || "Failed to send login code.";
        setOtpError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to dispatch verification code.";
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpDigits.join("")).trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setOtpError("Please enter all 6 numeric digits of your login code.");
      return;
    }

    setOtpError(null);
    setIsVerifyingOtp(true);
    try {
      const cleanEmail = otpEmail.trim().toLowerCase();
      const res = await loginWithOtp(cleanEmail, code);
      if (!res.ok) {
        const msg = res.error ?? "Invalid or expired verification code.";
        const lower = msg.toLowerCase();
        if (
          lower.includes("under review") ||
          lower.includes("not approved") ||
          lower.includes("pending") ||
          lower.includes("rejected") ||
          (res as any)?.status === "PENDING_REVIEW" ||
          (res as any)?.status === "REJECTED"
        ) {
          toast.info(msg);
          navigate({
            to: "/account-pending",
            search: { type: "payrent", email: cleanEmail } as any,
          });
          return;
        }
        setOtpError(msg);
        toast.error(msg);
        return;
      }

      handleLoginSuccess(res, cleanEmail);
    } catch (err: any) {
      const msg = err?.message || "Verification failed. Please try again.";
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      const cleanEmail = otpEmail.trim().toLowerCase();
      const res = await api.loginOtpRequest(cleanEmail);
      if (res?.success) {
        setResendCooldown(60);
        toast.success("A fresh login code has been sent to your email!");
      } else {
        const msg = res?.error || res?.message || "Failed to resend code.";
        setOtpError(msg);
        toast.error(msg);
      }
    } catch {
      toast.error("Unable to resend code. Please check your connection.");
    } finally {
      setIsSendingOtp(false);
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

  const [validationFailed, setValidationFailed] = useState(false);
  const onInvalid = () => {
    setValidationFailed(true);
    setTimeout(() => setValidationFailed(false), 2000);
  };

  return (
    <div className="space-y-4 text-left">
      {authMode === "password" ? (
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          {/* Email Address Field with Persistent Label */}
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            icon={<Mail className="h-5 w-5 stroke-[1.6]" />}
            error={errors.email?.message}
            {...register("email")}
          />

          {/* Password Field with Persistent Label & Show/Hide */}
          <Input
            label="Password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            icon={<Lock className="h-5 w-5 stroke-[1.6]" />}
            rightAdornment={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="p-1.5 -mr-1 text-muted-foreground/80 dark:text-[#BDBDBD] hover:text-foreground dark:hover:text-white cursor-pointer focus:outline-none transition-colors shrink-0 flex items-center justify-center"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <EyeOff className="h-5 w-5 stroke-[1.6]" />
                ) : (
                  <Eye className="h-5 w-5 stroke-[1.6]" />
                )}
              </button>
            }
            error={errors.password?.message}
            {...register("password")}
          />

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none group">
              <input
                type="checkbox"
                className="sr-only"
                {...register("remember")}
              />
              <AnimatedCircleCheck checked={!!watchRemember} size={18} />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => navigate({ to: "/forgot-password", search: { token: "" } as any })}
              className="text-foreground hover:underline font-bold text-xs cursor-pointer focus:outline-none"
            >
              Forgot password?
            </button>
          </div>

          {/* Global Server Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Primary Action Button: Sign in to Payrent */}
          <Button
            type="submit"
            className="w-full font-extrabold h-10.5 sm:h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
            loading={isSubmitting}
            isError={Boolean(error) || validationFailed}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in to Payrent...</span>
              </div>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 shrink-0" />
                <span>Sign in to Payrent</span>
              </>
            )}
          </Button>

          {/* OR Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/70 dark:border-[#2D2D2D]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card dark:bg-[#1E1E1E] px-3 text-muted-foreground font-semibold tracking-wider text-[11px]">
                Or
              </span>
            </div>
          </div>

          {/* Alternative: Email OTP Login Button */}
          <button
            type="button"
            onClick={() => {
              const currentEmail = getValues("email");
              if (currentEmail) setOtpEmail(currentEmail);
              setAuthMode("otp");
              setOtpStep("request");
              setErrorState(null);
              setOtpError(null);
            }}
            className="w-full font-bold h-10.5 sm:h-11 rounded-xl border border-border/80 dark:border-neutral-700/80 bg-secondary/50 hover:bg-secondary dark:bg-[#252525] dark:hover:bg-[#2A2A2A] text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 text-xs sm:text-sm"
          >
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <span>Sign in with Email OTP</span>
          </button>
        </form>
      ) : (
        /* Email OTP Section */
        otpStep === "request" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your registered email address to receive a secure 6-digit login verification code.
              </p>
            </div>

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              value={otpEmail}
              onChange={(e) => {
                setOtpEmail(e.target.value);
                setOtpError(null);
              }}
              icon={<Mail className="h-5 w-5 stroke-[1.6]" />}
              error={otpError || undefined}
              required
            />

            {otpError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {otpError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSendingOtp}
              loading={isSendingOtp}
              className="w-full font-extrabold h-10.5 sm:h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSendingOtp ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Login Code...</span>
                </div>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  <span>Send Login Code</span>
                </>
              )}
            </Button>

            {/* OR Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/70 dark:border-[#2D2D2D]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card dark:bg-[#1E1E1E] px-3 text-muted-foreground font-semibold tracking-wider text-[11px]">
                  Or
                </span>
              </div>
            </div>

            {/* Alternative: Password Login Button */}
            <button
              type="button"
              onClick={() => {
                if (otpEmail) setValue("email", otpEmail);
                setAuthMode("password");
                setErrorState(null);
                setOtpError(null);
              }}
              className="w-full font-bold h-10.5 sm:h-11 rounded-xl border border-border/80 dark:border-neutral-700/80 bg-secondary/50 hover:bg-secondary dark:bg-[#252525] dark:hover:bg-[#2A2A2A] text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 text-xs sm:text-sm"
            >
              <Lock className="h-4 w-4 text-primary shrink-0" />
              <span>Sign in with Password</span>
            </button>
          </form>
        ) : (
          /* OTP Verification Step */
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter the 6-digit login code sent to{" "}
                <span className="font-bold text-foreground">{otpEmail}</span>
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("request");
                    setOtpError(null);
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Change email address</span>
                </button>
              </div>
            </div>

            {/* 6 Digit Input Group */}
            <div className="space-y-3">
              <label className="block text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Enter 6-Digit Code
              </label>
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
                    aria-label={`Digit ${i + 1} of login code`}
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

            {/* Verify CTA */}
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
                  <span>Verifying Code...</span>
                </div>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Verify & Sign In</span>
                </>
              )}
            </Button>

            {/* Resend & Back */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setOtpStep("request");
                  setOtpError(null);
                }}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <div>
                {resendCooldown > 0 ? (
                  <span className="text-muted-foreground font-medium text-[11px]">
                    Resend in <strong className="font-mono text-foreground">{resendCooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSendingOtp}
                    className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        <span>Resend Code</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/60 text-[11px] text-muted-foreground text-center">
              <span>Code is valid for 5 minutes. Check spam or junk folder if not received.</span>
            </div>

            {/* OR Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/70 dark:border-[#2D2D2D]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card dark:bg-[#1E1E1E] px-3 text-muted-foreground font-semibold tracking-wider text-[11px]">
                  Or
                </span>
              </div>
            </div>

            {/* Alternative: Password Login Button */}
            <button
              type="button"
              onClick={() => {
                if (otpEmail) setValue("email", otpEmail);
                setAuthMode("password");
                setErrorState(null);
                setOtpError(null);
              }}
              className="w-full font-bold h-10.5 sm:h-11 rounded-xl border border-border/80 dark:border-neutral-700/80 bg-secondary/50 hover:bg-secondary dark:bg-[#252525] dark:hover:bg-[#2A2A2A] text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 text-xs sm:text-sm"
            >
              <Lock className="h-4 w-4 text-primary shrink-0" />
              <span>Sign in with Password</span>
            </button>
          </div>
        )
      )}

      {/* Switch to Register Link */}
      <div className="pt-2 text-center">
        <p className="text-xs text-muted-foreground">
          Don't have a Payrent account?{" "}
          <Link
            to="/register"
            className="font-bold text-foreground hover:underline cursor-pointer"
          >
            Create Payrent Account
          </Link>
        </p>
      </div>
    </div>
  );
}
