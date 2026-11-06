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
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
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
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const hasNavigatedRef = useRef(false);

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

  const {
    register,
    handleSubmit,
    watch,
    getValues,
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

  const handleCheckUser = async () => {
    const { fullName, phone, email } = getValues();
    const cleanName = (fullName || "").trim();
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      toast.error("Please enter your full name before checking.");
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number before checking.");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address before checking.");
      return;
    }

    setIsChecking(true);
    try {
      const res = await payrentApi.checkRegistration({
        name: cleanName,
        mobile: cleanPhone,
        email: cleanEmail,
        targetAccountType: "pay₹ent",
      });

      if (res.targetAccountExists) {
        toast.error("Your pay₹ent account already exists. Please login instead.");
        return;
      }

      if (res.found) {
        toast.success("Existing verified identity found. You can proceed with registration.");
      } else {
        toast.info("No prior account found. Please complete your registration.");
      }
    } catch {
      toast.error("Unable to check details. Please proceed with registration.");
    } finally {
      setIsChecking(false);
    }
  };

  const pw = watch("password") ?? "";
  const hasMinLen = pw.length >= 8;
  const hasUppercase = /[A-Z]/.test(pw);
  const hasLowercase = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pw);
  const isPasswordValid = hasMinLen && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const watchIsAdmin = watch("isAdmin") ?? false;
  const watchTerms = watch("terms") ?? false;

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
    try {
      const adminCode =
        showAdminOption && data.isAdmin ? data.adminCode : undefined;
      const panUpper = data.panNumber ? data.panNumber.toUpperCase().trim() : undefined;
      const cleanPhone = data.phone.replace(/\D/g, "");

      // Address, Pincode and KYC documents are omitted from initial customer registration
      // (completed in dedicated PAN KYC flow post-registration).
      const res = await api.registerVerify(
        data.email,
        cleanPhone,
        "DIRECT",
        data.password,
        data.fullName,
        adminCode,
        undefined, // address removed
        "India",
        undefined, // pincode removed
        undefined,
        panUpper,
      );

      if (!res?.success) {
        const errorMsg = res?.error || res?.message || "Failed to create account.";
        const lower = errorMsg.toLowerCase();
        if (lower.includes("email") || lower.includes("exists")) {
          setError("email", { type: "server", message: errorMsg });
        } else if (lower.includes("phone") || lower.includes("mobile")) {
          setError("phone", { type: "server", message: errorMsg });
        } else if (lower.includes("pan") && data.panNumber) {
          setError("panNumber", { type: "server", message: errorMsg });
        } else if (
          lower.includes("password") ||
          lower.includes("breach") ||
          lower.includes("character") ||
          lower.includes("common") ||
          lower.includes("safer")
        ) {
          setError("password", { type: "server", message: errorMsg });
        } else if (lower.includes("admin")) {
          setError("adminCode", { type: "server", message: errorMsg });
        } else {
          setErrorState(errorMsg);
        }
        toast.error(errorMsg);
        return;
      }

      const userObj = res.user || res.account || {};
      const accountId = userObj.accountId || `PAYRENT_USER_${data.email}`;
      const panMasked = userObj.panMasked || (panUpper ? `XXXXX${panUpper.slice(5)}` : undefined);
      const createdRole = userObj.role || (data.isAdmin ? "admin" : "customer");

      if (createdRole === "admin" && res.token) {
        const createdUser: UserType = {
          id: userObj.id || userObj.email || data.email,
          accountId,
          accountType: "pay₹ent",
          fullName: userObj.fullName || userObj.name || data.fullName,
          email: userObj.email || data.email,
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
        toast.success("Admin account created successfully!");
        navigate({ to: "/admin/dashboard" });
        return;
      }

      // Normal Payrent Customer Registration -> Route to Account Pending / Review
      toast.success("Account created successfully! Submitted for review.");
      navigate({
        to: "/account-pending",
        search: { type: "payrent", email: data.email } as any,
      });
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ?? "Failed to create account.";
      const lower = msg.toLowerCase();
      if (lower.includes("email") || lower.includes("exists")) {
        setError("email", { type: "server", message: msg });
      } else if (lower.includes("phone")) {
        setError("phone", { type: "server", message: msg });
      } else if (lower.includes("pan")) {
        setError("panNumber", { type: "server", message: "Enter a valid PAN number." });
      } else if (
        lower.includes("password") ||
        lower.includes("breach") ||
        lower.includes("character") ||
        lower.includes("common") ||
        lower.includes("safer")
      ) {
        setError("password", { type: "server", message: msg });
      } else if (lower.includes("admin")) {
        setError("adminCode", { type: "server", message: msg });
      } else {
        setErrorState(msg);
      }
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-left">
      {/* 1. Full Name */}
      <Input
        label="Full Name"
        autoComplete="name"
        icon={<User className="h-4 w-4" />}
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      {/* 2. Mobile Number & Check button */}
      <div>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              label="Mobile Number"
              type="tel"
              autoComplete="tel"
              icon={<Phone className="h-4 w-4" />}
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>
          <button
            type="button"
            onClick={handleCheckUser}
            disabled={isChecking}
            className="mt-1.5 h-10.5 sm:h-11 px-3.5 rounded-xl border border-neutral-400/80 dark:border-neutral-600 bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="Check existing account records"
          >
            {isChecking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span>Check</span>
            )}
          </button>
        </div>
      </div>

      {/* 3. Email Address */}
      <Input
        label="Email Address"
        type="email"
        autoComplete="email"
        icon={<Mail className="h-4 w-4" />}
        error={errors.email?.message}
        {...register("email")}
      />

      {/* Password & Confirm Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Password"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          icon={<Lock className="h-4 w-4" />}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="p-1 -mr-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors shrink-0 flex items-center justify-center"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
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
          icon={<Lock className="h-4 w-4" />}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowConfirmPw((v) => !v)}
              className="p-1 -mr-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors shrink-0 flex items-center justify-center"
              aria-label={showConfirmPw ? "Hide password" : "Show password"}
            >
              {showConfirmPw ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          error={errors.confirm?.message}
          {...register("confirm")}
        />
      </div>

      {/* Password Requirements Guidance */}
      {pw.length > 0 && !isPasswordValid && (
        <div className="p-2.5 rounded-xl bg-secondary/80 border border-border/80 text-[11px] space-y-1 text-muted-foreground">
          <p className="font-semibold text-foreground">Password requirements:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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
        <div className="space-y-2 p-3 rounded-xl bg-secondary border border-border">
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
              {...register("adminCode")}
            />
          )}
        </div>
      )}

      {/* Global Server Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Terms & Conditions Checkbox with Animated Circle Tick */}
      <div className="pt-2">
        <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none group">
          <input
            type="checkbox"
            className="sr-only"
            {...register("terms")}
          />
          <AnimatedCircleCheck checked={!!watchTerms} />
          <span className="text-muted-foreground text-[11px] leading-tight group-hover:text-foreground transition-colors">
            I accept the{" "}
            <Link to="/privacy" target="_blank" className="text-foreground hover:underline font-bold">
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

      {/* Primary Action Button: Create Payrent Account */}
      <Button
        type="submit"
        className="w-full font-extrabold h-10.5 sm:h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Creating Payrent Account...</span>
          </div>
        ) : (
          <>
            <span>Create Payrent Account</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      {/* Switch to Login Link */}
      <div className="pt-2 text-center">
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
