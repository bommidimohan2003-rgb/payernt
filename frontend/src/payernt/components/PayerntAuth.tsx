import React, { useState } from "react";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  FileText,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Sun,
  Moon,
  Info,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
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
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- REGISTER STATES ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<{
    name?: string;
    email?: string;
    aadhaar?: string;
    phone?: string;
    address?: string;
    pincode?: string;
    password?: string;
    confirmPassword?: string;
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
        toast.error("Your paye₹nt account already exists. Please login instead.");
        return;
      }

      if (res.found && res.prefill) {
        toast.success("Existing account found. Your details have been filled.");
        if (res.prefill.address) setAddress(res.prefill.address);
        if (res.prefill.pincode) setPincode(res.prefill.pincode);
      } else {
        toast.info("No existing account found. Please continue registration.");
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
      errors.email = "Email Address is required.";
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
        } else {
          const msg = res.error || "Invalid email or password.";
          setLoginErrors({ general: msg });
          toast.error(msg);
        }
      })
      .catch((err) => {
        setIsLoggingIn(false);
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
      errors.name = "Please enter a valid full name.";
    }

    // 2. Email validation
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      errors.email = "Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = "Please enter a valid email address (e.g. name@example.com).";
    }

    // 3. Aadhaar validation (12 digits numbers only)
    const cleanAadhaar = aadhaar.replace(/\s+/g, "");
    if (!cleanAadhaar) {
      errors.aadhaar = "Aadhaar Number is required.";
    } else if (!/^\d{12}$/.test(cleanAadhaar)) {
      errors.aadhaar = "Aadhaar Number must be exactly 12 digits (numbers only).";
    }

    // 4. Phone validation (10 digits Indian mobile)
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      errors.phone = "Phone Number is required.";
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      errors.phone = "Phone Number must be exactly 10 digits (numbers only).";
    }

    // 5. User Address validation
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      errors.address = "User Address is required.";
    } else if (cleanAddress.length < 5) {
      errors.address = "Please enter complete street/area address.";
    }

    // 6. Pincode validation (6 digits)
    const cleanPincode = pincode.replace(/\D/g, "");
    if (!cleanPincode) {
      errors.pincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(cleanPincode)) {
      errors.pincode = "Pincode must be exactly 6 digits.";
    }

    // 7. Password validation
    if (!password) {
      errors.password = "Password is required.";
    } else if (!isPasswordValid) {
      errors.password = "Password must meet all 5 requirements listed below.";
    }

    // 8. Confirm Password validation
    if (!confirmPassword) {
      errors.confirmPassword = "Confirm Password is required.";
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      toast.error("Please correct the highlighted errors before submitting.");
      return;
    }

    setRegisterErrors({});
    setIsRegistering(true);

    payerntApi
      .register({
        name: cleanName,
        email: cleanEmail,
        aadhaarNumber: cleanAadhaar,
        phoneNumber: cleanPhone,
        address: cleanAddress,
        pincode: cleanPincode,
        password,
        confirmPassword,
      })
      .then((res) => {
        setIsRegistering(false);
        if (res.success && res.account) {
          toast.success("paye₹nt vendor account created successfully!");
          onAuthSuccess(res.account);
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
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground">
      {/* Top Header Navigation */}
      <header className="w-full border-b border-border/80 bg-background/90 backdrop-blur-xl">
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
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background font-black text-base tracking-tight shadow-xs">
              ₹
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold tracking-tight text-lg text-foreground leading-none font-display">
                paye<span className="font-black font-serif">₹</span>nt
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none mt-0.5">
                Product Owner Platform
              </span>
            </div>
          </div>

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

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl space-y-6 text-left"
              >
                {/* Header */}
                <div className="text-center space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Lender Authentication</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
                    Sign In to paye₹nt
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Access your product inventory, earnings wallet, and rental requests.
                  </p>
                </div>

                {/* General Login Error Notice */}
                {loginErrors.general && (
                  <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{loginErrors.general}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginErrors.email) setLoginErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        placeholder="owner@example.com"
                        className={`w-full rounded-2xl border bg-background pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          loginErrors.email ? "border-destructive ring-1 ring-destructive" : "border-border"
                        }`}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-[11px] font-semibold text-destructive">{loginErrors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginErrors.password) setLoginErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        placeholder="Enter your password"
                        className={`w-full rounded-2xl border bg-background pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          loginErrors.password ? "border-destructive ring-1 ring-destructive" : "border-border"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        tabIndex={-1}
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-[11px] font-semibold text-destructive">{loginErrors.password}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background py-3 text-xs sm:text-sm font-bold shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <span>Login to paye₹nt</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch to Register */}
                <div className="pt-3 border-t border-border/70 text-center space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Don't have a paye₹nt account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("register");
                        setLoginErrors({});
                      }}
                      className="font-bold text-foreground hover:underline cursor-pointer"
                    >
                      Register Now
                    </button>
                  </p>

                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl space-y-6 text-left"
              >
                {/* Header */}
                <div className="text-center space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Lender Onboarding</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
                    Create paye₹nt Account
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Register as a verified gear owner and start earning rental income.
                  </p>
                </div>

                {/* Register Form */}
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* 1. Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Full Name <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (registerErrors.name) setRegisterErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        placeholder="e.g. Mohan Bommidi"
                        className={`w-full rounded-2xl border bg-background pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          registerErrors.name ? "border-destructive ring-1 ring-destructive" : "border-border"
                        }`}
                      />
                    </div>
                    {registerErrors.name && (
                      <p className="text-[11px] font-semibold text-destructive">{registerErrors.name}</p>
                    )}
                  </div>

                  {/* 2. Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs font-bold text-muted-foreground select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setPhone(val);
                          if (registerErrors.phone) setRegisterErrors((prev) => ({ ...prev, phone: undefined }));
                        }}
                        placeholder="10-digit Mobile"
                        className={`w-full rounded-2xl border bg-background pl-12 pr-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          registerErrors.phone ? "border-destructive ring-1 ring-destructive" : "border-border"
                        }`}
                      />
                    </div>
                    {registerErrors.phone && (
                      <p className="text-[11px] font-semibold text-destructive">{registerErrors.phone}</p>
                    )}
                  </div>

                  {/* 3. Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (registerErrors.email) setRegisterErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        placeholder="e.g. mohan@example.com"
                        className={`w-full rounded-2xl border bg-background pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          registerErrors.email ? "border-destructive ring-1 ring-destructive" : "border-border"
                        }`}
                      />
                    </div>
                    {registerErrors.email && (
                      <p className="text-[11px] font-semibold text-destructive">{registerErrors.email}</p>
                    )}
                  </div>

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

                  {/* 4. Aadhaar Number */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">
                        Aadhaar Number <span className="text-destructive">*</span>
                      </label>
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        maxLength={12}
                        value={aadhaar}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                          setAadhaar(val);
                          if (registerErrors.aadhaar) setRegisterErrors((prev) => ({ ...prev, aadhaar: undefined }));
                        }}
                        placeholder="12-digit Aadhaar"
                        className={`w-full rounded-2xl border bg-background pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          registerErrors.aadhaar ? "border-destructive ring-1 ring-destructive" : "border-border"
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Frontend format check only. Not UIDAI verified.
                    </p>
                    {registerErrors.aadhaar && (
                      <p className="text-[11px] font-semibold text-destructive">{registerErrors.aadhaar}</p>
                    )}
                  </div>

                  {/* 5. User Address (Multi-line textarea) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      User Address <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (registerErrors.address) setRegisterErrors((prev) => ({ ...prev, address: undefined }));
                      }}
                      placeholder="House No, Street, Area, City, State"
                      className={`w-full rounded-2xl border bg-background px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none ${
                        registerErrors.address ? "border-destructive ring-1 ring-destructive" : "border-border"
                      }`}
                    />
                    {registerErrors.address && (
                      <p className="text-[11px] font-semibold text-destructive">{registerErrors.address}</p>
                    )}
                  </div>

                  {/* 6. Pincode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Pincode <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setPincode(val);
                          if (registerErrors.pincode) setRegisterErrors((prev) => ({ ...prev, pincode: undefined }));
                        }}
                        placeholder="6-digit Pincode (e.g. 530001)"
                        className={`w-full rounded-2xl border bg-background pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          registerErrors.pincode ? "border-destructive ring-1 ring-destructive" : "border-border"
                        }`}
                      />
                    </div>
                    {registerErrors.pincode && (
                      <p className="text-[11px] font-semibold text-destructive">{registerErrors.pincode}</p>
                    )}
                  </div>

                  {/* 7. Password & 8. Confirm Password */}
                  <div className="space-y-3 pt-1">
                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Password <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (registerErrors.password) setRegisterErrors((prev) => ({ ...prev, password: undefined }));
                          }}
                          placeholder="Create strong password"
                          className={`w-full rounded-2xl border bg-background pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                            registerErrors.password ? "border-destructive ring-1 ring-destructive" : "border-border"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {registerErrors.password && (
                        <p className="text-[11px] font-semibold text-destructive">{registerErrors.password}</p>
                      )}
                    </div>

                    {/* Dynamic Password Requirements Checklist */}
                    <div className="p-3.5 rounded-2xl border border-border/80 bg-secondary/30 space-y-1.5 text-[11px]">
                      <p className="font-bold text-foreground">Password requirements:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <div className={`flex items-center gap-1.5 ${hasMinLen ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                          {hasMinLen ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 inline-block" />}
                          <span>Minimum 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                          {hasUppercase ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 inline-block" />}
                          <span>One uppercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                          {hasLowercase ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 inline-block" />}
                          <span>One lowercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                          {hasNumber ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 inline-block" />}
                          <span>One number</span>
                        </div>
                        <div className={`flex items-center gap-1.5 sm:col-span-2 ${hasSpecial ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                          {hasSpecial ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50 inline-block" />}
                          <span>One special character (!@#$%^&*...)</span>
                        </div>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Confirm Password <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (registerErrors.confirmPassword) setRegisterErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                          }}
                          placeholder="Re-enter your password"
                          className={`w-full rounded-2xl border bg-background pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                            registerErrors.confirmPassword ? "border-destructive ring-1 ring-destructive" : "border-border"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          tabIndex={-1}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {registerErrors.confirmPassword && (
                        <p className="text-[11px] font-semibold text-destructive">{registerErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background py-3 text-xs sm:text-sm font-bold shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <span>Create paye₹nt Account</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch to Login */}
                <div className="pt-3 border-t border-border/70 text-center">
                  <p className="text-xs text-muted-foreground">
                    Already have a paye₹nt account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setRegisterErrors({});
                      }}
                      className="font-bold text-foreground hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/60 py-4 text-center text-[11px] text-muted-foreground">
        <span>paye₹nt Product Owner & Lending Platform • Protected by End-to-End Encryption</span>
      </footer>
    </div>
  );
}

export default PayerntAuth;
