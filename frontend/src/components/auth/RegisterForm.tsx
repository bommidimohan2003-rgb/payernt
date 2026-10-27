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
import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (user) {
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

      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      if (isValidInternalRedirect(redirectUrl, currentPath)) {
        navigate({ to: redirectUrl as any });
      } else if (pendingProductId && `/product/${pendingProductId}` !== currentPath) {
        navigate({ to: `/product/${pendingProductId}` as any });
      } else if (user.role === "admin" && currentPath !== "/admin/dashboard") {
        navigate({ to: "/admin/dashboard" });
      } else if (currentPath !== "/categories") {
        navigate({ to: "/categories" });
      }
    }
  }, [user, navigate]);

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
      {/* 1. Full Name */}
      <Input
        label="Full Name"
        placeholder="e.g. Rahul Sharma"
        autoComplete="name"
        icon={<User className="h-4 w-4" />}
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      {/* 2. Mobile Number & Check button */}
      <div className="space-y-1.5">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="9876543210"
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
            className="h-12 px-3.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
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
        placeholder="rahul@example.com"
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
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
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
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowConfirmPw((v) => !v)}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
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
          <div className="grid grid-cols-2 gap-1">
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
              placeholder="Enter admin authorization key"
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

      {/* Terms & Conditions Checkbox */}
      <div className="pt-2">
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            className="rounded border-border text-foreground focus:ring-foreground h-4 w-4 cursor-pointer"
            {...register("terms")}
          />
          <span className="text-muted-foreground text-[11px] leading-tight">
            I accept the{" "}
            <a href="#" className="text-foreground hover:underline font-bold">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-foreground hover:underline font-bold">
              Privacy Policy
            </a>
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
        className="w-full font-extrabold h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
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
