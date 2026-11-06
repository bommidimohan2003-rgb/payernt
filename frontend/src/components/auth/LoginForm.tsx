import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { AnimatedCircleCheck } from "@/components/common/AnimatedCircleCheck";
import { useAuth } from "@/hooks/useAuth";
import { storage, STORAGE_KEYS } from "@/utils/storage";
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
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);

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

    // CRITICAL LOOP GUARD: If the user arrived at /login with a redirect parameter
    // (e.g. ?redirect=/dashboard or ?redirect=/admin), they were redirected here because
    // their existing session was invalid or unauthorized. NEVER auto-navigate back to the
    // rejected URL on mount! That causes an infinite ping-pong freeze ("Page Unresponsive").
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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { remember: true },
  });

  const watchRemember = watch("remember");

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

    if (isAdmin && loggedInUser) {
      const userToken = storage.get<string | null>(STORAGE_KEYS.token, null);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
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
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing in to Payrent...</span>
          </div>
        ) : (
          <>
            <span>Sign in to Payrent</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

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
    </form>
  );
}
