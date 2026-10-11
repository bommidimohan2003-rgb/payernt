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
    <div className="min-h-screen flex items-center justify-center bg-background hero-gradient relative overflow-hidden px-4">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-accent/20 rounded-full blur-[110px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-md z-10"
      >
        {/* Card */}
        <div className="glass bg-card/65 rounded-3xl p-8 shadow-2xl border border-border/80 relative space-y-6">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center">
            <span className="font-sans font-black tracking-tight text-3xl text-foreground mb-2">
              PAYENT
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
              Admin Portal
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
              {mode === "login" ? "Welcome Back" : "Register Admin Account"}
            </h1>
            <p className="text-xs font-semibold text-muted-foreground mt-1.5">
              {mode === "login"
                ? "Access the Payent Admin Control Panel"
                : "Create or promote an administrator account for Payent"}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex w-full bg-secondary/60 p-1 rounded-2xl mt-5 border border-border/60">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setServerError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === "login"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === "register"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
                <label className="text-xs font-bold text-muted-foreground tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="admin@payent.in"
                    {...loginForm.register("email")}
                    className="w-full bg-secondary/50 text-foreground text-xs rounded-xl pl-10 pr-4 py-3.5 border border-border/80 focus:outline-none focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-[10px] font-bold text-destructive pl-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground tracking-wide">
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate({ to: "/forgot-password", search: { token: "" } as any });
                    }}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                    className="w-full bg-secondary/50 text-foreground text-xs rounded-xl pl-10 pr-10 py-3.5 border border-border/80 focus:outline-none focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-[10px] font-bold text-destructive pl-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  {...loginForm.register("rememberMe")}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 accent-primary"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 text-xs font-semibold text-muted-foreground select-none"
                >
                  Remember me for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-bold py-3.5 px-4 rounded-xl text-xs mt-3 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <form
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground tracking-wide">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Your full name"
                    {...registerForm.register("fullName")}
                    className="w-full bg-secondary/50 text-foreground text-xs rounded-xl pl-10 pr-4 py-3.5 border border-border/80 focus:outline-none focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
                {registerForm.formState.errors.fullName && (
                  <p className="text-[10px] font-bold text-destructive pl-1">
                    {registerForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground tracking-wide">
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="admin@payent.in"
                    {...registerForm.register("email")}
                    className="w-full bg-secondary/50 text-foreground text-xs rounded-xl pl-10 pr-4 py-3.5 border border-border/80 focus:outline-none focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-[10px] font-bold text-destructive pl-1">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...registerForm.register("password")}
                    className="w-full bg-secondary/50 text-foreground text-xs rounded-xl pl-10 pr-10 py-3.5 border border-border/80 focus:outline-none focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-[10px] font-bold text-destructive pl-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground tracking-wide flex items-center justify-between">
                  <span>Admin Security Code</span>
                  <span className="text-[10px] font-normal text-muted-foreground/80">
                    Default: PAYENT-ADMIN-2026
                  </span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="PAYENT-ADMIN-2026"
                    {...registerForm.register("adminCode")}
                    className="w-full bg-secondary/50 text-foreground text-xs rounded-xl pl-10 pr-4 py-3.5 border border-border/80 focus:outline-none focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/80 border border-border flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-foreground select-none">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 accent-primary"
                  />
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Register as site administrator</span>
                </label>
                <p className="text-[10px] text-muted-foreground pl-6">
                  Grants full administrative privileges over listings, users,
                  orders, and platform analytics.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-90 font-bold py-3.5 px-4 rounded-xl text-xs mt-3 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Registering Admin...</span>
                  </>
                ) : (
                  <>
                    <span>Create Admin Account</span>
                    <ArrowRight className="h-4 w-4" />
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
