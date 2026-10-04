import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useAuth } from "@/hooks/useAuth";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { toast } from "sonner";
import type { User } from "@/types";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);

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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { remember: true },
  });

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

    if (currentUser?.role === "admin" || currentUser?.role === "superadmin") {
      const userToken = storage.get<string | null>(STORAGE_KEYS.token, null);
      if (userToken) {
        localStorage.setItem("payent:admin:token", userToken);
      }
      localStorage.setItem(
        "payent:admin:current_user",
        JSON.stringify({
          id: currentUser.id,
          fullName: currentUser.fullName,
          email: currentUser.email,
          role: "admin",
          status: "active",
          verified: true,
        }),
      );
      window.dispatchEvent(new Event("payent:admin:profile-updated"));
      navigate({ to: "/admin/dashboard" });
      return;
    }

    if (redirectUrl && redirectUrl.startsWith("/")) {
      navigate({ to: redirectUrl as any });
    } else if (pendingProductId) {
      navigate({ to: `/product/${pendingProductId}` as any });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email address"
        type="email"
        placeholder="you@work.com"
        icon={<Mail className="h-4 w-4" />}
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type={showPw ? "text" : "password"}
        placeholder="••••••••"
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

      <div className="flex items-center justify-between text-xs sm:text-sm">
        <label className="inline-flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <input
            type="checkbox"
            className="rounded border-border text-foreground focus:ring-foreground"
            {...register("remember")}
          />
          Remember me
        </label>
        <button
          type="button"
          onClick={() => navigate({ to: "/forgot-password", search: { token: "" } as any })}
          className="text-foreground hover:underline font-bold text-xs cursor-pointer"
        >
          Forgot password?
        </button>
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <Button
        type="submit"
        className="w-full font-extrabold h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        <span>{isSubmitting ? "Signing in..." : "Sign In to Payent"}</span>
        {!isSubmitting && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  );
}
