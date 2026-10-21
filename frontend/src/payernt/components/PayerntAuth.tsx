import React, { useState } from "react";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  Loader2,
  DollarSign,
  Shield,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate, Link } from "@tanstack/react-router";
import type { PayerntAccount } from "../types";
import { payerntApi } from "../payerntApiService";
import { useTheme } from "@/hooks/useTheme";

interface PayerntAuthProps {
  onAuthSuccess: (account: PayerntAccount) => void;
  initialMode?: "login" | "register";
}

export function PayerntAuth({
  onAuthSuccess,
  initialMode = "login",
}: PayerntAuthProps) {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // --- LOGIN STATES ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- REGISTER STATES (Address & Pincode omitted per requirement) ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<{
    name?: string;
    email?: string;
    aadhaar?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckUser = async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanEmail = email.trim().toLowerCase();

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
      const res = await payerntApi.checkRegistration({
        name: cleanName,
        mobile: cleanPhone,
        email: cleanEmail,
        targetAccountType: "paye₹nt",
      });

      if (res.targetAccountExists) {
        toast.error("Your Payernt account already exists. Please login instead.");
        return;
      }

      if (res.found) {
        toast.success("Existing verified identity found. You can proceed with registration.");
      } else {
        toast.info("No prior account found. Please continue registration.");
      }
    } catch {
      toast.error("Unable to check your details. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  // --- DYNAMIC PASSWORD REQUIREMENTS EVALUATION ---
  const hasMinLen = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password);
  const isPasswordValid = hasMinLen && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  // --- LOGIN SUBMIT ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; password?: string; general?: string } = {};

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!loginPassword) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }

    setLoginErrors({});
    setIsLoggingIn(true);

    payerntApi
      .login({ email: cleanEmail, password: loginPassword })
      .then((res) => {
        setIsLoggingIn(false);
        if (res.success && res.account) {
          toast.success(`Welcome back, ${res.account.name}!`);
          onAuthSuccess(res.account);
        } else if (res.status === "PENDING_REVIEW" || res.status === "REJECTED") {
          toast.info(res.error || "Your Payernt account is under administrative review.");
          navigate({
            to: "/account-pending",
            search: { type: "payernt", email: cleanEmail } as any,
          });
        } else {
          const msg = res.error || "Invalid email or password.";
          setLoginErrors({ general: msg });
          toast.error(msg);
        }
      })
      .catch((err) => {
        setIsLoggingIn(false);
        if (err?.status === "PENDING_REVIEW" || err?.status === "REJECTED" || err?.accountStatus) {
          toast.info(err?.message || "Your Payernt account is under administrative review.");
          navigate({
            to: "/account-pending",
            search: { type: "payernt", email: cleanEmail } as any,
          });
          return;
        }
        const msg = err?.message || "Failed to sign in. Please try again.";
        setLoginErrors({ general: msg });
        toast.error(msg);
      });
  };

  // --- REGISTER SUBMIT ---
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof registerErrors = {};

    // 1. Name validation
    const cleanName = name.trim();
    if (!cleanName) {
      errors.name = "Full Name is required.";
    } else if (cleanName.length < 2) {
      errors.name = "Please enter a valid full name (at least 2 letters).";
    }

    // 2. Email validation
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      errors.email = "Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    // 3. Aadhaar validation (12 digits numbers only)
    const cleanAadhaar = aadhaar.replace(/\s+/g, "");
    if (!cleanAadhaar) {
      errors.aadhaar = "Aadhaar Number is required.";
    } else if (!/^\d{12}$/.test(cleanAadhaar)) {
      errors.aadhaar = "Aadhaar Number must be exactly 12 numeric digits.";
    }

    // 4. Phone validation (10 digits Indian mobile)
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      errors.phone = "Mobile Number is required.";
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      errors.phone = "Mobile Number must be exactly 10 digits.";
    }

    // 5. Password validation
    if (!password) {
      errors.password = "Password is required.";
    } else if (!isPasswordValid) {
      errors.password = "Password must meet all requirements.";
    }

    // 6. Confirm Password validation
    if (!confirmPassword) {
      errors.confirmPassword = "Confirm Password is required.";
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    // 7. Terms validation
    if (!termsAccepted) {
      errors.terms = "Please accept the Terms of Service & Privacy Policy.";
    }

    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      toast.error("Please correct the highlighted fields before submitting.");
      return;
    }

    setRegisterErrors({});
    setIsRegistering(true);

    // Note: address and pincode are omitted per requirement (collected during product listing)
    payerntApi
      .register({
        name: cleanName,
        email: cleanEmail,
        aadhaarNumber: cleanAadhaar,
        phoneNumber: cleanPhone,
        address: "",
        pincode: "",
        password,
        confirmPassword,
      })
      .then((res) => {
        setIsRegistering(false);
        if (res.success) {
          toast.success("Payernt account created successfully! Submitted for Admin review.");
          navigate({
            to: "/account-pending",
            search: { type: "payernt", email: cleanEmail } as any,
          });
        } else {
          const msg = res.error || "Failed to create account.";
          toast.error(msg);
        }
      })
      .catch((err) => {
        setIsRegistering(false);
        toast.error(err?.message || "Registration failed. Try again.");
      });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
      {/* Top Header Navigation */}
      <header className="w-full border-b border-border/80 bg-background/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="group flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Return to Selection Gateway"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Experience Selection</span>
            <span className="sm:hidden">Back</span>
          </button>

          {/* Brand Center */}
          <Link
            to="/"
            className="flex items-center gap-2.5 focus:outline-none select-none cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-black text-sm tracking-tight shadow-xs font-display">
              P
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold tracking-tight text-base sm:text-lg text-foreground leading-none font-display">
                Payent
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none mt-0.5">
                Payernt Platform
              </span>
            </div>
          </Link>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card hover:bg-secondary text-foreground transition-all cursor-pointer shadow-2xs"
            aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 text-foreground/80 hover:-rotate-12 transition-transform" />
            )}
          </button>
        </div>
      </header>

      {/* Subtle geometric ambient background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[340px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[140px] opacity-70" />
        <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[300px] bg-accent/5 dark:bg-emerald-500/10 rounded-full blur-[120px] opacity-50" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Main Two-Column Composition on Desktop / Single-Column on Mobile */}
      <main className="flex-1 w-full max-w-6xl mx-auto flex items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:py-12 z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Section — Brand and Introduction */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:space-y-8 text-left">
            {/* Brand Logo & Role Identity */}
            <div className="space-y-4">
              <Link
                to="/"
                className="inline-flex items-center gap-3 group select-none cursor-pointer focus:outline-none"
                aria-label="Payent Home"
              >
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 dark:bg-white p-0.5 shadow-md transition-transform group-hover:scale-105">
                  <img
                    src="/brand/payent-logo-icon.webp"
                    alt="Payent"
                    className="h-full w-full object-contain rounded-[14px]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className="font-display font-black text-white dark:text-neutral-950 text-lg">
                    P
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black tracking-tight text-2xl text-foreground leading-none">
                    Payent
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mt-1">
                    Payernt Platform
                  </span>
                </div>
              </Link>

              {/* Role Identification Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border/80 text-foreground text-xs font-bold tracking-wide shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Payernt • Product Owner Platform</span>
              </div>
            </div>

            {/* Headline & Supporting Text */}
            <div className="space-y-2.5">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-foreground tracking-tight font-display leading-[1.15]">
                Welcome, Payernt
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed max-w-md">
                List your products and earn by renting them out.
              </p>
            </div>

            {/* Geometric Fine-Line Feature Badges (Desktop visible) */}
            <div className="hidden lg:flex flex-col space-y-3.5 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/50 dark:bg-card/40 border border-border/60">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">High Yield Passive Earnings</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Monetize idle cinema gear, studio lighting, drones & computing rigs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/50 dark:bg-card/40 border border-border/60">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Verified Borrowers Only</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Mandatory Aadhaar, PAN & identity screening before equipment handover.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/50 dark:bg-card/40 border border-border/60">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Protected Escrow Settlements</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Guaranteed direct bank payouts with complete earnings transparency.
                  </p>
                </div>
              </div>
            </div>

            {/* Fine Bottom Accent Divider */}
            <div className="pt-2 border-t border-border/50 hidden lg:flex items-center gap-4 text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ₹5 Lakhs Damage Protection
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Direct Bank Transfer
              </span>
            </div>
          </div>

          {/* Right Section — Authentication Form Card */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-xl card-premium p-6 sm:p-8 shadow-2xl border border-border/80 bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl space-y-5 transition-all duration-300">
              {/* Header Switcher Tabs: Sign In / Create Account */}
              <div className="flex items-center rounded-2xl bg-secondary/80 p-1.5 border border-border/80">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setLoginErrors({});
                  }}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 text-center cursor-pointer ${
                    mode === "login"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setRegisterErrors({});
                  }}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 text-center cursor-pointer ${
                    mode === "register"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form Heading on Mobile (when left column collapses) */}
              <div className="lg:hidden space-y-1 text-center sm:text-left pb-1">
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
                  {mode === "login" ? "Sign In to Payernt" : "Create Payernt Account"}
                </h2>
                <p className="text-xs text-muted-foreground font-normal">
                  {mode === "login"
                    ? "Enter your credentials to manage your product listings."
                    : "Register to list your equipment and start earning."}
                </p>
              </div>

              {/* Form Content Switched by Mode */}
              <AnimatePresence mode="wait">
                {mode === "login" ? (
                  <motion.div
                    key="payernt-login"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 text-left"
                  >
                    {/* General Error Notice */}
                    {loginErrors.general && (
                      <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>{loginErrors.general}</span>
                      </div>
                    )}

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      {/* Email Address */}
                      <div className="w-full">
                        <label
                          htmlFor="payernt-login-email"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Email address
                        </label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border bg-card px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                            loginErrors.email ? "border-destructive focus-within:ring-destructive/30" : ""
                          }`}
                        >
                          <span className="text-muted-foreground">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            id="payernt-login-email"
                            type="email"
                            autoComplete="email"
                            value={loginEmail}
                            onChange={(e) => {
                              setLoginEmail(e.target.value);
                              if (loginErrors.email) setLoginErrors((prev) => ({ ...prev, email: undefined }));
                            }}
                            placeholder="owner@example.com"
                            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                          />
                        </div>
                        {loginErrors.email && (
                          <p className="mt-1.5 text-xs text-destructive">{loginErrors.email}</p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="w-full">
                        <label
                          htmlFor="payernt-login-password"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Password
                        </label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border bg-card px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                            loginErrors.password ? "border-destructive focus-within:ring-destructive/30" : ""
                          }`}
                        >
                          <span className="text-muted-foreground">
                            <Lock className="h-4 w-4" />
                          </span>
                          <input
                            id="payernt-login-password"
                            type={showLoginPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              if (loginErrors.password) setLoginErrors((prev) => ({ ...prev, password: undefined }));
                            }}
                            placeholder="••••••••"
                            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors"
                            aria-label={showLoginPassword ? "Hide password" : "Show password"}
                          >
                            {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {loginErrors.password && (
                          <p className="mt-1.5 text-xs text-destructive">{loginErrors.password}</p>
                        )}
                      </div>

                      {/* Remember Me & Forgot Password Row */}
                      <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded border-border text-foreground focus:ring-foreground h-4 w-4 cursor-pointer"
                          />
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

                      {/* Primary Button: Sign in to Payernt */}
                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full font-extrabold h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                      >
                        {isLoggingIn ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Signing in to Payernt...</span>
                          </div>
                        ) : (
                          <>
                            <span>Sign in to Payernt</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Switch Link to Register */}
                    <div className="pt-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        Don't have a Payernt account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("register");
                            setLoginErrors({});
                          }}
                          className="font-bold text-foreground hover:underline cursor-pointer"
                        >
                          Create Payernt Account
                        </button>
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="payernt-register"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 text-left"
                  >
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      {/* 1. Full Name */}
                      <div className="w-full">
                        <label
                          htmlFor="payernt-register-name"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Full Name <span className="text-destructive">*</span>
                        </label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border bg-card px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                            registerErrors.name ? "border-destructive focus-within:ring-destructive/30" : ""
                          }`}
                        >
                          <span className="text-muted-foreground">
                            <User className="h-4 w-4" />
                          </span>
                          <input
                            id="payernt-register-name"
                            type="text"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              if (registerErrors.name) setRegisterErrors((prev) => ({ ...prev, name: undefined }));
                            }}
                            placeholder="e.g. Mohan Bommidi"
                            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                          />
                        </div>
                        {registerErrors.name && (
                          <p className="mt-1.5 text-xs text-destructive">{registerErrors.name}</p>
                        )}
                      </div>

                      {/* 2. Mobile Number & Check button */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="payernt-register-phone"
                          className="block text-sm font-medium text-foreground"
                        >
                          Mobile Number <span className="text-destructive">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex-1 flex items-center gap-2 rounded-xl border bg-card px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                              registerErrors.phone ? "border-destructive focus-within:ring-destructive/30" : ""
                            }`}
                          >
                            <span className="text-xs font-bold text-muted-foreground select-none">
                              +91
                            </span>
                            <input
                              id="payernt-register-phone"
                              type="tel"
                              maxLength={10}
                              autoComplete="tel"
                              value={phone}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                setPhone(val);
                                if (registerErrors.phone) setRegisterErrors((prev) => ({ ...prev, phone: undefined }));
                              }}
                              placeholder="9876543210"
                              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
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
                        {registerErrors.phone && (
                          <p className="mt-1.5 text-xs text-destructive">{registerErrors.phone}</p>
                        )}
                      </div>

                      {/* 3. Email Address */}
                      <div className="w-full">
                        <label
                          htmlFor="payernt-register-email"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Email Address <span className="text-destructive">*</span>
                        </label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border bg-card px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                            registerErrors.email ? "border-destructive focus-within:ring-destructive/30" : ""
                          }`}
                        >
                          <span className="text-muted-foreground">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            id="payernt-register-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (registerErrors.email) setRegisterErrors((prev) => ({ ...prev, email: undefined }));
                            }}
                            placeholder="mohan@example.com"
                            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                          />
                        </div>
                        {registerErrors.email && (
                          <p className="mt-1.5 text-xs text-destructive">{registerErrors.email}</p>
                        )}
                      </div>

                      {/* 4. Aadhaar Number (12 numeric digits) */}
                      <div className="w-full">
                        <label
                          htmlFor="payernt-register-aadhaar"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Aadhaar Number <span className="text-destructive">*</span>
                        </label>
                        <div
                          className={`flex items-center gap-2 rounded-xl border bg-card px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                            registerErrors.aadhaar ? "border-destructive focus-within:ring-destructive/30" : ""
                          }`}
                        >
                          <span className="text-muted-foreground">
                            <FileText className="h-4 w-4" />
                          </span>
                          <input
                            id="payernt-register-aadhaar"
                            type="text"
                            maxLength={12}
                            value={aadhaar}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                              setAadhaar(val);
                              if (registerErrors.aadhaar) setRegisterErrors((prev) => ({ ...prev, aadhaar: undefined }));
                            }}
                            placeholder="12-digit Aadhaar Number"
                            className="flex-1 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground text-foreground"
                          />
                        </div>
                        {registerErrors.aadhaar && (
                          <p className="mt-1.5 text-xs text-destructive">{registerErrors.aadhaar}</p>
                        )}
                      </div>

                      {/* 5. Password & 6. Confirm Password */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Password */}
                        <div className="w-full">
                          <label
                            htmlFor="payernt-register-password"
                            className="mb-1.5 block text-sm font-medium text-foreground"
                          >
                            Password <span className="text-destructive">*</span>
                          </label>
                          <div
                            className={`flex items-center gap-2 rounded-xl border bg-card px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                              registerErrors.password ? "border-destructive focus-within:ring-destructive/30" : ""
                            }`}
                          >
                            <span className="text-muted-foreground">
                              <Lock className="h-4 w-4" />
                            </span>
                            <input
                              id="payernt-register-password"
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                if (registerErrors.password) setRegisterErrors((prev) => ({ ...prev, password: undefined }));
                              }}
                              placeholder="••••••••"
                              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {registerErrors.password && (
                            <p className="mt-1.5 text-xs text-destructive">{registerErrors.password}</p>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div className="w-full">
                          <label
                            htmlFor="payernt-register-confirm"
                            className="mb-1.5 block text-sm font-medium text-foreground"
                          >
                            Confirm Password <span className="text-destructive">*</span>
                          </label>
                          <div
                            className={`flex items-center gap-2 rounded-xl border bg-card px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                              registerErrors.confirmPassword ? "border-destructive focus-within:ring-destructive/30" : ""
                            }`}
                          >
                            <span className="text-muted-foreground">
                              <Lock className="h-4 w-4" />
                            </span>
                            <input
                              id="payernt-register-confirm"
                              type={showConfirmPassword ? "text" : "password"}
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (registerErrors.confirmPassword) setRegisterErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                              }}
                              placeholder="••••••••"
                              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors"
                              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {registerErrors.confirmPassword && (
                            <p className="mt-1.5 text-xs text-destructive">{registerErrors.confirmPassword}</p>
                          )}
                        </div>
                      </div>

                      {/* Password Requirements Guidance */}
                      {password.length > 0 && !isPasswordValid && (
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

                      {/* Terms & Conditions Checkbox */}
                      <div className="pt-2">
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if (registerErrors.terms) setRegisterErrors((prev) => ({ ...prev, terms: undefined }));
                            }}
                            className="rounded border-border text-foreground focus:ring-foreground h-4 w-4 cursor-pointer"
                          />
                          <span className="text-muted-foreground text-[11px] leading-tight">
                            I accept the{" "}
                            <a href="#" className="text-foreground hover:underline font-bold">
                              Lender Terms
                            </a>{" "}
                            and{" "}
                            <a href="#" className="text-foreground hover:underline font-bold">
                              Equipment Policy
                            </a>
                          </span>
                        </label>
                        {registerErrors.terms && (
                          <p className="mt-1 text-xs text-destructive font-medium">
                            {registerErrors.terms}
                          </p>
                        )}
                      </div>

                      {/* Primary Action Button: Create Payernt Account */}
                      <button
                        type="submit"
                        disabled={isRegistering}
                        className="w-full font-extrabold h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                      >
                        {isRegistering ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Creating Payernt Account...</span>
                          </div>
                        ) : (
                          <>
                            <span>Create Payernt Account</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Switch to Login Link */}
                    <div className="pt-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        Already have a Payernt account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("login");
                            setRegisterErrors({});
                          }}
                          className="font-bold text-foreground hover:underline cursor-pointer"
                        >
                          Sign in to Payernt
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Security Footnote */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  256-Bit SSL Encrypted
                </span>
                <span>Protected Escrow</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/60 py-4 text-center text-[11px] text-muted-foreground">
        <span>Payent Payernt Product Owner Platform • Protected by End-to-End Encryption</span>
      </footer>
    </div>
  );
}
