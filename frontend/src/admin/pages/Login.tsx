import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  User,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { authService } from "../services/auth";
import { toast } from "sonner";
import { AnimatedCircleCheck } from "@/components/common/AnimatedCircleCheck";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  adminCode: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      adminCode: "PAYENT-ADMIN-2026",
    },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setServerError(null);
    try {
      const response = await authService.login(values.email, values.password);
      if (response.success) {
        toast.success(`Welcome back, ${response.user.fullName}!`);
        window.dispatchEvent(new Event("payent:admin:profile-updated"));
        navigate({ to: "/admin/dashboard" });
      }
    } catch (err: unknown) {
      console.error(err);
      const errMsg =
        (err as { response?: { data?: { message?: string; detail?: string } } })
          ?.response?.data?.message ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ||
        "Invalid email or password.";
      setServerError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setServerError(null);
    try {
      const response = await authService.registerAdmin({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        adminCode: values.adminCode || "PAYENT-ADMIN-2026",
      });
      if (response.success) {
        toast.success("Admin account registered successfully! Please sign in.");
        loginForm.setValue("email", values.email);
        setMode("login");
      }
    } catch (err: unknown) {
      console.error(err);
      const errMsg =
        (err as { response?: { data?: { message?: string; detail?: string } } })
          ?.response?.data?.message ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ||
        "Failed to register admin account. Please check your credentials.";
      setServerError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg)] relative px-4 py-8">

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md z-10"
      >
        {/* Card */}
        <div className="bg-[var(--admin-card)] rounded-2xl p-6 sm:p-8 shadow-sm border border-[var(--admin-border)] relative space-y-6">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-14 h-14 mb-3 select-none">
              <img
                src="/brand/payent-logo.svg"
                alt="Payent Logo"
                className="w-14 h-14 select-none"
                width={56}
                height={56}
              />
            </div>
            <span className="font-sans font-semibold tracking-tight text-2xl text-[var(--admin-text)] mb-2">
              Payent
            </span>
            <span className="text-[11px] font-medium text-[var(--admin-text-muted)] px-2.5 py-0.5 rounded-full bg-[var(--admin-elevated)] border border-[var(--admin-border)] mb-3">
              Admin portal
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--admin-text)]">
              {mode === "login" ? "Admin sign in" : "Register admin account"}
            </h1>
            <p className="text-xs font-semibold text-[var(--admin-text-muted)] mt-1.5">
              {mode === "login"
                ? "Access the Payent Admin Control Panel"
                : "Create or promote an administrator account for Payent"}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex w-full bg-[var(--admin-elevated)] p-1 rounded-2xl mt-5 border border-[var(--admin-border)]">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setServerError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  mode === "login"
                    ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm"
                    : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setServerError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  mode === "register"
                    ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm"
                    : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                }`}
              >
                Register Admin
              </button>
            </div>
          </div>

          {serverError && (
            <div className="p-3.5 text-xs font-semibold bg-destructive/10 text-destructive rounded-xl border border-destructive/20 animate-shake">
              {serverError}
            </div>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text-secondary)]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--admin-text-muted)]" />
                  <input
                    type="email"
                    placeholder="admin@payent.in"
                    {...loginForm.register("email")}
                    className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-xl pl-10 pr-4 py-3.5 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)] focus:bg-[var(--admin-card)] focus:ring-1 focus:ring-[var(--admin-text)]/20 transition-colors placeholder:text-[var(--admin-text-muted)]"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-[11px] font-bold text-destructive pl-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--admin-text-secondary)]">
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate({ to: "/forgot-password", search: { token: "" } as any });
                    }}
                    className="text-xs font-bold text-[var(--admin-success)] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--admin-text-muted)]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                    className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-xl pl-10 pr-10 py-3.5 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)] focus:bg-[var(--admin-card)] focus:ring-1 focus:ring-[var(--admin-text)]/20 transition-colors placeholder:text-[var(--admin-text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-[11px] font-bold text-destructive pl-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <label
                  htmlFor="rememberMe"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer select-none group"
                >
                  <input
                    id="rememberMe"
                    type="checkbox"
                    {...loginForm.register("rememberMe")}
                    className="sr-only"
                  />
                  <AnimatedCircleCheck checked={!!loginForm.watch("rememberMe")} size={18} />
                  <span>Remember me for 30 days</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--admin-accent)] text-[var(--admin-bg)] hover:bg-[var(--admin-accent-hover)] font-bold py-3.5 px-4 rounded-xl text-xs mt-3 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                    <span>Sign In to Admin</span>
                  </>
                )}
              </button>

              {/* Quick Demo Sign-in Option */}
              <div className="pt-2 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => {
                    const defaultUser = {
                      id: "admin_payent_current",
                      fullName: "Bommidi Mohan",
                      email: "bommidimohan2003@gmail.com",
                      phone: "+91 8810519885",
                      role: "admin",
                      status: "active",
                      verified: true,
                      profilePhotoUrl: "",
                      profile_photo_url: "",
                      avatar: "",
                      createdAt: new Date().toISOString(),
                    };
                    localStorage.removeItem("payent:admin:logged_out");
                    localStorage.setItem("payent:admin:token", "dev_admin_session_token");
                    localStorage.setItem("payent:admin:current_user", JSON.stringify(defaultUser));
                    window.dispatchEvent(new Event("payent:admin:profile-updated"));
                    toast.success("Signed in as Administrator (Bommidi Mohan)");
                    navigate({ to: "/admin/dashboard" });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-elevated)] hover:opacity-85 text-[var(--admin-text)] text-xs font-medium transition-colors cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Sign In as Administrator (Bommidi Mohan)</span>
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <form
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text-secondary)]">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--admin-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Your full name"
                    {...registerForm.register("fullName")}
                    className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-xl pl-10 pr-4 py-3.5 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)] focus:bg-[var(--admin-card)] focus:ring-1 focus:ring-[var(--admin-text)]/20 transition-colors placeholder:text-[var(--admin-text-muted)]"
                  />
                </div>
                {registerForm.formState.errors.fullName && (
                  <p className="text-[11px] font-bold text-destructive pl-1">
                    {registerForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text-secondary)]">
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--admin-text-muted)]" />
                  <input
                    type="email"
                    placeholder="admin@payent.in"
                    {...registerForm.register("email")}
                    className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-xl pl-10 pr-4 py-3.5 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)] focus:bg-[var(--admin-card)] focus:ring-1 focus:ring-[var(--admin-text)]/20 transition-colors placeholder:text-[var(--admin-text-muted)]"
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-[11px] font-bold text-destructive pl-1">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text-secondary)]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--admin-text-muted)]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...registerForm.register("password")}
                    className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-xl pl-10 pr-10 py-3.5 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)] focus:bg-[var(--admin-card)] focus:ring-1 focus:ring-[var(--admin-text)]/20 transition-colors placeholder:text-[var(--admin-text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-[11px] font-bold text-destructive pl-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text-secondary)] flex items-center justify-between">
                  <span>Admin Security Code</span>
                  <span className="text-[11px] font-normal text-[var(--admin-text-muted)]">
                    Default: PAYENT-ADMIN-2026
                  </span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--admin-text-muted)]" />
                  <input
                    type="text"
                    placeholder="PAYENT-ADMIN-2026"
                    {...registerForm.register("adminCode")}
                    className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-xl pl-10 pr-4 py-3.5 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)] focus:bg-[var(--admin-card)] focus:ring-1 focus:ring-[var(--admin-text)]/20 transition-colors placeholder:text-[var(--admin-text-muted)] font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/80 border border-[var(--admin-border)] flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-[var(--admin-text)] select-none">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="rounded border-[var(--admin-border)] text-[var(--admin-success)] focus:ring-[var(--admin-text)]/20 h-4 w-4 accent-primary"
                  />
                  <ShieldCheck className="h-4 w-4 text-[var(--admin-success)] shrink-0" />
                  <span>Register as site administrator</span>
                </label>
                <p className="text-[11px] text-[var(--admin-text-muted)] pl-6">
                  Grants full administrative privileges over listings, users,
                  orders, and platform analytics.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--admin-accent)] text-[var(--admin-bg)] hover:opacity-90 font-bold py-3.5 px-4 rounded-xl text-xs mt-3 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Registering Admin...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                    <span>Create Admin Account</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
