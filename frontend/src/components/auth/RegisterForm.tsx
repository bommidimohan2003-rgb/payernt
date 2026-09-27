import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Building2,
  Compass,
  Sparkles,
  Loader2,
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
      .min(1, "Email is required")
      .email("Enter a valid email address")
      .max(255),
    panNumber: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "PAN Number is required")
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Enter a valid PAN number."),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number (at least 7 digits)")
      .max(20),
    address: z
      .string()
      .trim()
      .min(5, "Enter complete street address (at least 5 characters)"),
    city: z.string().trim().optional(),
    pincode: z.string().trim().min(6, "Enter valid 6-digit PIN code").max(10),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirm: z.string().min(1, "Please confirm your password"),
    terms: z.literal(true, {
      errorMap: () => ({ message: "Please accept the Terms & Privacy Policy" }),
    }),
    isAdmin: z.boolean().optional(),
    adminCode: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  })
  .refine((d) => !d.isAdmin || (d.adminCode && d.adminCode.trim().length > 0), {
    path: ["adminCode"],
    message: "Admin setup code is required",
  });

type FormValues = z.infer<typeof schema>;

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function RegisterForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
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

      if (redirectUrl && redirectUrl.startsWith("/")) {
        navigate({ to: redirectUrl as any });
      } else if (pendingProductId) {
        navigate({ to: `/product/${pendingProductId}` as any });
      } else if (user.role === "admin") {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({ to: "/categories" });
      }
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
    const cleanPhone = (phone || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      toast.error("Please enter your full name before checking.");
      return;
    }
    if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 10) {
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

      if (res.found && res.prefill) {
        toast.success("Existing account found. Your details have been filled.");
        if (res.prefill.address) setValue("address", res.prefill.address, { shouldValidate: true });
        if (res.prefill.pincode) setValue("pincode", res.prefill.pincode, { shouldValidate: true });
        if (res.prefill.city) setValue("city", res.prefill.city, { shouldValidate: true });
      } else {
        toast.info("No existing account found. Please continue registration.");
      }
    } catch {
      toast.error("Unable to check your details. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const pw = watch("password") ?? "";
  const watchIsAdmin = watch("isAdmin") ?? false;
  const level = useMemo(() => strength(pw), [pw]);
  const labels = ["Weak", "Fair", "Good", "Strong", "Excellent"];

  const showAdminOption = useMemo(() => {
    if (typeof window !== "undefined") return false;
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
      const panUpper = data.panNumber.toUpperCase().trim();
      const res = await api.registerVerify(
        data.email,
        data.phone,
        "DIRECT",
        data.password,
        data.fullName,
        adminCode,
        data.address,
        data.city || "India",
        data.pincode,
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
        } else if (lower.includes("pan")) {
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
      const panMasked = userObj.panMasked || `XXXXX${panUpper.slice(5)}`;
      const createdUser: UserType = {
        id: userObj.id || userObj.email || data.email,
        accountId,
        accountType: "pay₹ent",
        fullName: userObj.fullName || userObj.name || data.fullName,
        email: userObj.email || data.email,
        phone: userObj.phone || data.phone,
        address: userObj.address || data.address,
        city: userObj.city || data.city || "India",
        pincode: userObj.pincode || data.pincode,
        panNumber: panUpper,
        panMasked,
        role: userObj.role || "customer",
        status: userObj.status || "active",
        country: "India",
      };

      const authToken = res.token;
      if (authToken) {
        storage.set(STORAGE_KEYS.token, authToken);
      }
      storage.set(STORAGE_KEYS.currentUser, createdUser);
      if (res.refreshToken) {
        storage.set(STORAGE_KEYS.refreshToken, res.refreshToken);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "pay₹ent_session",
          JSON.stringify({
            accountId,
            accountType: "pay₹ent",
            email: createdUser.email,
            name: createdUser.fullName,
            loggedInAt: new Date().toISOString(),
          })
        );
        localStorage.setItem("pay₹ent_account", JSON.stringify(createdUser));
        window.dispatchEvent(new CustomEvent("payent:storage_change"));
      }

      toast.success("Account created successfully!");

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

      if (redirectUrl && redirectUrl.startsWith("/")) {
        navigate({ to: redirectUrl as any });
      } else if (pendingProductId) {
        navigate({ to: `/product/${pendingProductId}` as any });
      } else if (createdUser.role === "admin") {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({ to: "/categories" });
      }
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
      {/* 1. Name */}
      <Input
        label="Name"
        placeholder="Your full name"
        icon={<User className="h-4 w-4" />}
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      {/* 2. Mobile Number */}
      <Input
        label="Mobile Number"
        placeholder="+91 98765 43210"
        icon={<Phone className="h-4 w-4" />}
        error={errors.phone?.message}
        {...register("phone")}
      />

      {/* 3. Email Address */}
      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        icon={<Mail className="h-4 w-4" />}
        error={errors.email?.message}
        {...register("email")}
      />

      {/* CHECK Button */}
      <div className="pt-1 pb-1">
        <button
          type="button"
          onClick={handleCheckUser}
          disabled={isChecking}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Checking Shared Database...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>CHECK</span>
            </>
          )}
        </button>
      </div>

      {/* 4. PAN Number (Indian format validation: ABCDE1234F) */}
      <Input
        label="PAN Number"
        placeholder="ABCDE1234F"
        icon={<ShieldCheck className="h-4 w-4" />}
        error={errors.panNumber?.message}
        maxLength={10}
        style={{ textTransform: "uppercase" }}
        {...register("panNumber", {
          onChange: (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/\s+/g, "");
          },
        })}
      />

      {/* 5. User Address */}
      <Input
        label="User Address"
        placeholder="Street address, house number, area"
        icon={<MapPin className="h-4 w-4" />}
        error={errors.address?.message}
        {...register("address")}
      />

      {/* 6. Pincode */}
      <Input
        label="Pincode"
        placeholder="500081"
        icon={<Compass className="h-4 w-4" />}
        error={errors.pincode?.message}
        maxLength={6}
        {...register("pincode")}
      />

      {/* 7. Password & 8. Confirm Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Password"
          type={showPw ? "text" : "password"}
          placeholder="At least 8 characters"
          icon={<Lock className="h-4 w-4" />}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
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
          type={showPw ? "text" : "password"}
          placeholder="Repeat password"
          icon={<Lock className="h-4 w-4" />}
          error={errors.confirm?.message}
          {...register("confirm")}
        />
      </div>

      {/* Password Strength Indicator */}
      {pw && (
        <div className="space-y-1 p-2.5 rounded-xl bg-secondary/50 border border-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              Password Security:
            </span>
            <span className="font-bold text-foreground">{labels[level]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${(level / 4) * 100}%`,
                backgroundColor:
                  level < 2
                    ? "#E63946"
                    : level < 3
                      ? "#F59E0B"
                      : level < 4
                        ? "#3B82F6"
                        : "#10B981",
              }}
            />
          </div>
        </div>
      )}

      {showAdminOption && (
        <div className="space-y-2 p-2.5 rounded-xl bg-secondary border border-border">
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
              placeholder="Enter admin key"
              icon={<Lock className="h-4 w-4" />}
              error={errors.adminCode?.message}
              {...register("adminCode")}
            />
          )}
        </div>
      )}

      {/* Terms & Create Account Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border text-primary focus:ring-primary"
            {...register("terms")}
          />
          <span className="text-muted-foreground text-[11px]">
            I accept the{" "}
            <a href="#" className="text-foreground hover:underline font-bold">
              Terms
            </a>{" "}
            &{" "}
            <a href="#" className="text-foreground hover:underline font-bold">
              Privacy Policy
            </a>
          </span>
        </label>

        <Button
          type="submit"
          className="w-full sm:w-auto px-7 font-extrabold h-11 text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          <span>
            {isSubmitting ? "Creating..." : "Create Account"}
          </span>
          {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {errors.terms && (
        <p className="text-xs text-destructive font-medium">
          {errors.terms.message}
        </p>
      )}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </form>
  );
}

