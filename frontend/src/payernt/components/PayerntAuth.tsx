import React, { useState, useEffect, useRef } from "react";
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
  RefreshCw,
  ClipboardPaste,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate, Link } from "@tanstack/react-router";
import { AnimatedCircleCheck } from "@/components/common/AnimatedCircleCheck";
import { AuthGearShowcase } from "@/components/auth/AuthGearShowcase";
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
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- LOGIN OTP STATES ---
  const [loginOtpStep, setLoginOtpStep] = useState<"request" | "verify">("request");
  const [loginOtpEmail, setLoginOtpEmail] = useState("");
  const [loginOtpDigits, setLoginOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
  const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState(false);
  const [loginResendCooldown, setLoginResendCooldown] = useState(0);
  const [loginOtpError, setLoginOtpError] = useState<string | null>(null);
  const loginOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // --- REGISTER STATES ---
  const [registerStep, setRegisterStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // --- REGISTER OTP STATES ---
  const [registerOtpDigits, setRegisterOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifyingRegisterOtp, setIsVerifyingRegisterOtp] = useState(false);
  const [isResendingRegisterOtp, setIsResendingRegisterOtp] = useState(false);
  const [registerResendCooldown, setRegisterResendCooldown] = useState(0);
  const [registerOtpError, setRegisterOtpError] = useState<string | null>(null);
  const registerOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (loginResendCooldown <= 0) return;
    const interval = setInterval(() => {
      setLoginResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [loginResendCooldown]);

  useEffect(() => {
    if (registerResendCooldown <= 0) return;
    const interval = setInterval(() => {
      setRegisterResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [registerResendCooldown]);

  // Read OTP and Email parameters from URL (e.g. from transactional email verification links)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlOtp = (params.get("otp") || params.get("code") || "").trim();
      const urlEmail = (params.get("email") || "").trim();
      const urlMode = (params.get("mode") || "").trim().toLowerCase();

      if (urlMode === "register") {
        setMode("register");
        if (urlEmail) setEmail(urlEmail);
      } else if (urlMode === "login") {
        setMode("login");
        if (urlEmail) {
          setLoginEmail(urlEmail);
          setLoginOtpEmail(urlEmail);
        }
      } else if (urlEmail) {
        setLoginEmail(urlEmail);
        setLoginOtpEmail(urlEmail);
        setEmail(urlEmail);
      }

      if (urlOtp && /^\d{6}$/.test(urlOtp)) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(urlOtp).catch(() => {});
        }

        if (urlMode === "register") {
          setMode("register");
          const savedPending = sessionStorage.getItem("payernt:pending_reg");
          if (savedPending) {
            try {
              const parsed = JSON.parse(savedPending);
              setName(parsed.name || "");
              setEmail(parsed.email || urlEmail || "");
              setPhone(parsed.phone || "");
              setPassword(parsed.password || "");
              setRegisterStep("otp");
              setRegisterOtpDigits(urlOtp.split(""));
              setRegisterOtpError(null);
              toast.success(`Verification code ${urlOtp} auto-filled and copied to clipboard!`);
              return;
            } catch {}
          }
          sessionStorage.setItem("payernt:pending_reg_otp", urlOtp);
          toast.success(`Verification code ${urlOtp} copied to clipboard! Complete form to verify.`);
        } else {
          // Login OTP flow
          setMode("login");
          setAuthMode("otp");
          setLoginOtpStep("verify");
          if (urlEmail) setLoginOtpEmail(urlEmail);
          setLoginOtpDigits(urlOtp.split(""));
          setLoginOtpError(null);
          toast.success(`Verification code ${urlOtp} auto-filled and copied to clipboard!`);
        }
      }
    } catch {}
  }, []);

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

  const safeString = (val: any, fallback: string = ""): string => {
    if (typeof val === "string") return val;
    if (!val) return fallback;
    if (typeof val === "object") {
      if (typeof val.message === "string") return val.message;
      if (typeof val.msg === "string") return val.msg;
      return JSON.stringify(val);
    }
    return String(val);
  };

  // --- LOGIN SUBMIT (PASSWORD) ---
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
          const role = res.account.role || (res as any).role || (res as any).user?.role;
          if (role === "admin" || role === "superadmin") {
            if (res.token) {
              localStorage.setItem("payent:admin:token", res.token);
            }
            localStorage.setItem(
              "payent:admin:current_user",
              JSON.stringify({
                id: res.account.email || res.account.accountId || (res.account as any).id,
                fullName: res.account.name || "Administrator",
                email: res.account.email,
                role: "admin",
                status: "active",
                avatar: res.account.profilePhotoUrl || res.account.profile_photo_url || res.account.avatar || "",
                profilePhotoUrl: res.account.profilePhotoUrl || res.account.profile_photo_url || res.account.avatar || "",
                profile_photo_url: res.account.profilePhotoUrl || res.account.profile_photo_url || res.account.avatar || "",
                createdAt: res.account.createdAt || (res.account as any).created_at || new Date().toISOString(),
              })
            );
            localStorage.removeItem("payent:admin:logged_out");
            localStorage.removeItem("payent:signed_out");
            localStorage.removeItem("paye₹nt_signed_out");
            window.dispatchEvent(new Event("payent:admin:profile-updated"));
            toast.success(`Welcome back, ${res.account.name} (Administrator)!`);
            navigate({ to: "/admin/dashboard" });
            return;
          }

          localStorage.removeItem("payent:signed_out");
          localStorage.removeItem("paye₹nt_signed_out");
          toast.success(`Welcome back, ${res.account.name}!`);

          // Accelerate post-login loading: Prefetch lender dashboard and products in parallel
          if ((res as any)?.bootstrap) {
            try {
              localStorage.setItem("paye₹nt:bootstrap", JSON.stringify((res as any).bootstrap));
            } catch {}
          }
          payerntApi.getDashboard().catch(() => {});
          payerntApi.getProducts().catch(() => {});

          onAuthSuccess(res.account);
        } else if (res.status === "PENDING_REVIEW" || res.status === "REJECTED") {
          toast.info(safeString(res.error, "Your Payernt account is under administrative review."));
          navigate({
            to: "/account-pending",
            search: { type: "payernt", email: cleanEmail } as any,
          });
        } else {
          const msg = safeString(res.error, "Invalid email or password.");
          setLoginErrors({ general: msg });
          toast.error(msg);
        }
      })
      .catch((err) => {
        setIsLoggingIn(false);
        if (err?.status === "PENDING_REVIEW" || err?.status === "REJECTED" || err?.accountStatus) {
          toast.info(safeString(err?.message, "Your Payernt account is under administrative review."));
          navigate({
            to: "/account-pending",
            search: { type: "payernt", email: cleanEmail } as any,
          });
          return;
        }
        const msg = safeString(err?.message || err, "Failed to sign in. Please try again.");
        setLoginErrors({ general: msg });
        toast.error(msg);
      });
  };

  // --- LOGIN OTP HANDLERS ---
  const handleRequestLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = loginOtpEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setLoginOtpError("Please enter a valid registered email address.");
      return;
    }

    setLoginOtpError(null);
    setIsSendingLoginOtp(true);
    try {
      const res = await payerntApi.loginOtpRequest(cleanEmail);
      if (res.success) {
        setLoginOtpStep("verify");
        setLoginOtpDigits(["", "", "", "", "", ""]);
        setLoginResendCooldown(60);
        toast.success(`Login verification code sent to ${cleanEmail}`);
        setTimeout(() => {
          loginOtpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        const msg = res.error || "Failed to send login code.";
        setLoginOtpError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to dispatch verification code.";
      setLoginOtpError(msg);
      toast.error(msg);
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleVerifyLoginOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || loginOtpDigits.join("")).trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setLoginOtpError("Please enter all 6 numeric digits of your login code.");
      return;
    }

    setLoginOtpError(null);
    setIsVerifyingLoginOtp(true);
    try {
      const cleanEmail = loginOtpEmail.trim().toLowerCase();
      const res = await payerntApi.loginOtpVerify({ email: cleanEmail, otp: code });
      if (res.success && res.account) {
        const role = res.account.role || (res as any).role || (res as any).user?.role;
        if (role === "admin" || role === "superadmin") {
          if (res.token) {
            localStorage.setItem("payent:admin:token", res.token);
          }
          localStorage.setItem(
            "payent:admin:current_user",
            JSON.stringify({
              id: res.account.email || res.account.accountId || (res.account as any).id,
              fullName: res.account.name || "Administrator",
              email: res.account.email,
              role: "admin",
              status: "active",
              avatar: res.account.profilePhotoUrl || res.account.profile_photo_url || res.account.avatar || "",
              createdAt: res.account.createdAt || new Date().toISOString(),
            })
          );
          localStorage.removeItem("payent:admin:logged_out");
          localStorage.removeItem("payent:signed_out");
          localStorage.removeItem("paye₹nt_signed_out");
          window.dispatchEvent(new Event("payent:admin:profile-updated"));
          toast.success(`Welcome back, ${res.account.name} (Administrator)!`);
          navigate({ to: "/admin/dashboard" });
          return;
        }

        localStorage.removeItem("payent:signed_out");
        localStorage.removeItem("paye₹nt_signed_out");
        toast.success(`Welcome back, ${res.account.name}!`);

        payerntApi.getDashboard().catch(() => {});
        payerntApi.getProducts().catch(() => {});
        onAuthSuccess(res.account);
      } else if (res.status === "PENDING_REVIEW" || res.status === "REJECTED") {
        toast.info(safeString(res.error, "Your Payernt account is under administrative review."));
        navigate({
          to: "/account-pending",
          search: { type: "payernt", email: cleanEmail } as any,
        });
      } else {
        const msg = safeString(res.error, "Invalid or expired verification code.");
        setLoginOtpError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err?.message || "Verification failed. Please try again.";
      setLoginOtpError(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingLoginOtp(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (loginResendCooldown > 0 || isSendingLoginOtp) return;
    setIsSendingLoginOtp(true);
    setLoginOtpError(null);
    try {
      const cleanEmail = loginOtpEmail.trim().toLowerCase();
      const res = await payerntApi.loginOtpRequest(cleanEmail);
      if (res.success) {
        setLoginResendCooldown(60);
        toast.success("A fresh login code has been sent to your email!");
      } else {
        const msg = res.error || "Failed to resend code.";
        setLoginOtpError(msg);
        toast.error(msg);
      }
    } catch {
      toast.error("Unable to resend code. Please check your connection.");
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleLoginDigitChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, "").slice(-1);
    const updated = [...loginOtpDigits];
    updated[index] = numericChar;
    setLoginOtpDigits(updated);
    setLoginOtpError(null);

    if (numericChar && index < 5) {
      loginOtpInputRefs.current[index + 1]?.focus();
    }
    if (numericChar && index === 5) {
      const fullCode = updated.join("");
      if (fullCode.length === 6) {
        handleVerifyLoginOtp(fullCode);
      }
    }
  };

  const handleLoginKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!loginOtpDigits[index] && index > 0) {
        loginOtpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      loginOtpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      loginOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleLoginPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...loginOtpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setLoginOtpDigits(updated);
    setLoginOtpError(null);
    const targetIndex = Math.min(pasted.length, 5);
    loginOtpInputRefs.current[targetIndex]?.focus();
    if (pasted.length === 6) {
      handleVerifyLoginOtp(pasted);
    }
  };

  const handlePasteLoginFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.info("Please press Ctrl+V / Cmd+V in the box to paste.");
        return;
      }
      const text = await navigator.clipboard.readText();
      const clean = text.replace(/\D/g, "").slice(0, 6);
      if (!clean) {
        toast.error("No numeric verification code found in clipboard.");
        return;
      }
      const updated = ["", "", "", "", "", ""];
      for (let i = 0; i < clean.length; i++) updated[i] = clean[i];
      setLoginOtpDigits(updated);
      setLoginOtpError(null);
      toast.success(`Pasted code ${clean}`);
      const targetIndex = Math.min(clean.length, 5);
      loginOtpInputRefs.current[targetIndex]?.focus();
      if (clean.length === 6) {
        handleVerifyLoginOtp(clean);
      }
    } catch {
      toast.info("Please press Ctrl+V / Cmd+V in the box to paste.");
    }
  };

  // --- REGISTER SUBMIT (REQUEST EMAIL OTP) ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof registerErrors = {};

    const cleanName = name.trim();
    if (!cleanName) {
      errors.name = "Full Name is required.";
    } else if (cleanName.length < 2) {
      errors.name = "Please enter a valid full name (at least 2 letters).";
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      errors.email = "Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      errors.phone = "Mobile Number is required.";
    } else if (!/^\d{10}$/.test(cleanPhone)) {
      errors.phone = "Mobile Number must be exactly 10 digits.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (!isPasswordValid) {
      errors.password = "Password must meet all requirements.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm Password is required.";
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }

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

    try {
      const res = await payerntApi.registerOtpRequest({
        email: cleanEmail,
        phone: cleanPhone,
      });

      if (res.success) {
        try {
          sessionStorage.setItem("payernt:pending_reg", JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password,
          }));
        } catch {}
        setRegisterStep("otp");
        const preloadedOtp = typeof window !== "undefined" ? sessionStorage.getItem("payernt:pending_reg_otp") : null;
        if (preloadedOtp && /^\d{6}$/.test(preloadedOtp)) {
          setRegisterOtpDigits(preloadedOtp.split(""));
          sessionStorage.removeItem("payernt:pending_reg_otp");
        } else {
          setRegisterOtpDigits(["", "", "", "", "", ""]);
        }
        setRegisterResendCooldown(60);
        toast.success(`Verification code sent to ${cleanEmail}`);
        setTimeout(() => {
          registerOtpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        const msg = safeString(res.error, "Failed to send verification code.");
        toast.error(msg);
      }
    } catch (err: any) {
      toast.error(safeString(err?.message || err, "Unable to send verification code. Try again."));
    } finally {
      setIsRegistering(false);
    }
  };

  // --- REGISTER OTP VERIFY & COMPLETE ---
  const handleVerifyRegisterOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || registerOtpDigits.join("")).trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setRegisterOtpError("Please enter all 6 numeric digits of your verification code.");
      return;
    }

    setRegisterOtpError(null);
    setIsVerifyingRegisterOtp(true);
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await payerntApi.register({
        name: cleanName,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        address: "Not Provided",
        pincode: "000000",
        password,
        confirmPassword,
        otp: code,
      });

      if (res.success) {
        toast.success("Payernt account created successfully! Submitted for Admin review.");
        navigate({
          to: "/account-pending",
          search: { type: "payernt", email: cleanEmail } as any,
        });
      } else {
        const msg = safeString(res.error, "Failed to create account.");
        setRegisterOtpError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = safeString(err?.message || err, "Registration failed. Try again.");
      setRegisterOtpError(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingRegisterOtp(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    if (registerResendCooldown > 0 || isResendingRegisterOtp) return;
    setIsResendingRegisterOtp(true);
    setRegisterOtpError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.replace(/\D/g, "");
      const res = await payerntApi.registerOtpRequest({ email: cleanEmail, phone: cleanPhone });
      if (res.success) {
        setRegisterResendCooldown(60);
        toast.success("A fresh verification code has been sent to your email!");
      } else {
        const msg = res.error || "Failed to resend code.";
        setRegisterOtpError(msg);
        toast.error(msg);
      }
    } catch {
      toast.error("Unable to resend code. Please check your connection.");
    } finally {
      setIsResendingRegisterOtp(false);
    }
  };

  const handleRegisterDigitChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, "").slice(-1);
    const updated = [...registerOtpDigits];
    updated[index] = numericChar;
    setRegisterOtpDigits(updated);
    setRegisterOtpError(null);

    if (numericChar && index < 5) {
      registerOtpInputRefs.current[index + 1]?.focus();
    }
    if (numericChar && index === 5) {
      const fullCode = updated.join("");
      if (fullCode.length === 6) {
        handleVerifyRegisterOtp(fullCode);
      }
    }
  };

  const handleRegisterKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!registerOtpDigits[index] && index > 0) {
        registerOtpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      registerOtpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      registerOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleRegisterPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...registerOtpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setRegisterOtpDigits(updated);
    setRegisterOtpError(null);
    const targetIndex = Math.min(pasted.length, 5);
    registerOtpInputRefs.current[targetIndex]?.focus();
    if (pasted.length === 6) {
      handleVerifyRegisterOtp(pasted);
    }
  };

  const handlePasteRegisterFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.info("Please press Ctrl+V / Cmd+V in the box to paste.");
        return;
      }
      const text = await navigator.clipboard.readText();
      const clean = text.replace(/\D/g, "").slice(0, 6);
      if (!clean) {
        toast.error("No numeric verification code found in clipboard.");
        return;
      }
      const updated = ["", "", "", "", "", ""];
      for (let i = 0; i < clean.length; i++) updated[i] = clean[i];
      setRegisterOtpDigits(updated);
      setRegisterOtpError(null);
      toast.success(`Pasted code ${clean}`);
      const targetIndex = Math.min(clean.length, 5);
      registerOtpInputRefs.current[targetIndex]?.focus();
      if (clean.length === 6) {
        handleVerifyRegisterOtp(clean);
      }
    } catch {
      toast.info("Please press Ctrl+V / Cmd+V in the box to paste.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
      {/* Top Header Navigation */}
      <header className="w-full border-b border-border/80 bg-background/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Identity (Payernt) in Top-Left Corner */}
          <Link
            to="/"
            className="flex items-center gap-2.5 focus:outline-none select-none cursor-pointer group transition-transform active:scale-98"
            aria-label="Payernt Home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-black text-sm tracking-tight shadow-xs font-display">
              P
            </div>
            <span className="font-sans font-black tracking-tight text-xl text-neutral-950 dark:text-white leading-none">
              Payernt
            </span>
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

      {/* Subtle soft ambient glow without distracting grid patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[140px] opacity-60" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[280px] bg-accent/5 dark:bg-emerald-500/10 rounded-full blur-[130px] opacity-40" />
      </div>

      {/* Main Two-Column Composition: Left Gear Showcase from image, Right adjusted form */}
      <main className="flex-1 w-full max-w-6xl mx-auto flex items-start justify-center px-4 pt-1 pb-8 sm:px-6 md:px-8 lg:pt-3 lg:pb-12 z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Section — Gear Showcase matching user image exactly in both themes */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-start">
            <AuthGearShowcase
              title="Welcome to Payent"
              subtitle="List your products and earn by renting them out."
              badgeLabel="Payernt"
            />
          </div>

          {/* Right Section — Authentication Form Card */}
          <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg shadow-xl border border-neutral-300/80 bg-card/95 dark:bg-[#1E1E1E] dark:border-neutral-700/80 backdrop-blur-2xl rounded-2xl pt-4.5 sm:pt-5 p-4.5 sm:p-5.5 space-y-3 transition-all duration-300 text-left">
              <div className="absolute -top-3 left-4 px-2 bg-card dark:bg-[#1E1E1E] flex items-center gap-1.5 z-10 pointer-events-none select-none">
                <span className="text-xs sm:text-[13px] font-bold tracking-tight text-foreground">
                  {mode === "login" ? "Sign In to Payernt" : "Create Payernt Account"}
                </span>
              </div>

              {/* Form Heading Subtitle */}
              <div className="space-y-0.5 text-left pb-0.5">
                <p className="text-xs text-muted-foreground font-normal">
                  {mode === "login"
                    ? "Enter your credentials to manage your product listings."
                    : "Register to list your equipment and start earning."}
                </p>
              </div>

              {/* Form Content Switched by Mode */}
              <AnimatePresence mode="wait" initial={false}>
                {mode === "login" ? (
                  <motion.div
                    key="payernt-login"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3 text-left"
                  >
                    {/* General Error Notice */}
                    {loginErrors.general && (
                      <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>{safeString(loginErrors.general)}</span>
                      </div>
                    )}

                    {authMode === "password" ? (
                      <form onSubmit={handleLoginSubmit} className="space-y-3">
                        {/* Email address */}
                        <div className="w-full relative pt-1.5">
                          <div
                            className={`group relative flex items-center gap-2 rounded-xl border bg-card px-3 sm:px-3.5 h-10.5 sm:h-11 transition-colors border-neutral-400/80 dark:border-neutral-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                              loginErrors.email ? "border-destructive focus-within:ring-destructive/30" : ""
                            }`}
                          >
                            <label
                              htmlFor="payernt-login-email"
                              className={`absolute -top-2.5 left-3.5 px-1.5 bg-card text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10 ${
                                loginErrors.email ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"
                              }`}
                            >
                              Email address
                            </label>
                            <span className="text-muted-foreground shrink-0 flex items-center justify-center">
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
                              className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                            />
                          </div>
                          {loginErrors.email && (
                            <p className="mt-1 text-xs text-destructive">{loginErrors.email}</p>
                          )}
                        </div>

                        {/* Password */}
                        <div className="w-full relative pt-1.5">
                          <div
                            className={`group relative flex items-center gap-2 rounded-xl border bg-card px-3 sm:px-3.5 h-10.5 sm:h-11 transition-colors border-neutral-400/80 dark:border-neutral-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                              loginErrors.password ? "border-destructive focus-within:ring-destructive/30" : ""
                            }`}
                          >
                            <label
                              htmlFor="payernt-login-password"
                              className={`absolute -top-2.5 left-3.5 px-1.5 bg-card text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10 ${
                                loginErrors.password ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"
                              }`}
                            >
                              Password
                            </label>
                            <span className="text-muted-foreground shrink-0 flex items-center justify-center">
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
                              className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="p-1 -mr-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors shrink-0 flex items-center justify-center"
                              aria-label={showLoginPassword ? "Hide password" : "Show password"}
                            >
                              {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {loginErrors.password && (
                            <p className="mt-1 text-xs text-destructive">{loginErrors.password}</p>
                          )}
                        </div>

                        {/* Remember Me & Forgot Password Row */}
                        <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
                          <label className="inline-flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none group">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="sr-only"
                            />
                            <AnimatedCircleCheck checked={rememberMe} size={18} />
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
                          className="w-full font-extrabold h-10.5 sm:h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
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
                            if (loginEmail) setLoginOtpEmail(loginEmail);
                            setAuthMode("otp");
                            setLoginOtpStep("request");
                            setLoginErrors({});
                            setLoginOtpError(null);
                          }}
                          className="w-full font-bold h-10.5 sm:h-11 rounded-xl border border-border/80 dark:border-neutral-700/80 bg-secondary/50 hover:bg-secondary dark:bg-[#252525] dark:hover:bg-[#2A2A2A] text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 text-xs sm:text-sm"
                        >
                          <Mail className="h-4 w-4 text-primary shrink-0 stroke-[1.8]" />
                          <span>Sign in with Email OTP</span>
                        </button>
                      </form>
                    ) : (
                      /* EMAIL OTP LOGIN FLOW */
                      loginOtpStep === "request" ? (
                        <form onSubmit={handleRequestLoginOtp} className="space-y-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Enter your registered email address to receive a secure 6-digit login verification code.
                            </p>
                          </div>

                          {loginOtpError && (
                            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                              <XCircle className="h-4 w-4 shrink-0" />
                              <span>{safeString(loginOtpError)}</span>
                            </div>
                          )}

                          <div className="w-full relative pt-1.5">
                            <div className="group relative flex items-center gap-2 rounded-xl border bg-card px-3 sm:px-3.5 h-10.5 sm:h-11 transition-colors border-neutral-400/80 dark:border-neutral-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40">
                              <label
                                htmlFor="payernt-otp-email"
                                className="absolute -top-2.5 left-3.5 px-1.5 bg-card text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10 text-muted-foreground group-focus-within:text-primary"
                              >
                                Email address
                              </label>
                              <span className="text-muted-foreground shrink-0 flex items-center justify-center">
                                <Mail className="h-4 w-4" />
                              </span>
                              <input
                                id="payernt-otp-email"
                                type="email"
                                autoComplete="email"
                                value={loginOtpEmail}
                                onChange={(e) => {
                                  setLoginOtpEmail(e.target.value);
                                  setLoginOtpError(null);
                                }}
                                className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isSendingLoginOtp}
                            className="w-full font-extrabold h-10.5 sm:h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                          >
                            {isSendingLoginOtp ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Sending login code...</span>
                              </div>
                            ) : (
                              <>
                                <span>Send login code</span>
                                <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </button>

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

                          {/* Switch to Password Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (loginOtpEmail) setLoginEmail(loginOtpEmail);
                              setAuthMode("password");
                              setLoginErrors({});
                              setLoginOtpError(null);
                            }}
                            className="w-full font-bold h-10.5 sm:h-11 rounded-xl border border-border/80 dark:border-neutral-700/80 bg-secondary/50 hover:bg-secondary dark:bg-[#252525] dark:hover:bg-[#2A2A2A] text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 text-xs sm:text-sm"
                          >
                            <Lock className="h-4 w-4 text-primary shrink-0 stroke-[1.8]" />
                            <span>Sign in with password</span>
                          </button>
                        </form>
                      ) : (
                        /* OTP Verification View */
                        <div className="space-y-4">
                          {/* Target Email Check & Change */}
                          <div className="p-3 rounded-xl bg-secondary/40 border border-border/70 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Mail className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0 text-left">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Code sent to</p>
                                <p className="text-xs font-bold text-foreground truncate">{loginOtpEmail}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setLoginOtpStep("request");
                                setLoginOtpError(null);
                              }}
                              className="text-xs font-semibold text-primary hover:underline shrink-0 cursor-pointer"
                            >
                              Change
                            </button>
                          </div>

                          {/* 6 Digit Input Group */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-xs font-medium text-muted-foreground">
                                Enter 6-digit code
                              </label>
                              <button
                                type="button"
                                onClick={handlePasteLoginFromClipboard}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer transition-colors"
                                title="Paste 6-digit code from clipboard"
                              >
                                <ClipboardPaste className="h-3.5 w-3.5" />
                                <span>Paste code</span>
                              </button>
                            </div>
                            <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleLoginPaste}>
                              {loginOtpDigits.map((digit, i) => (
                                <input
                                  key={i}
                                  ref={(el) => {
                                    loginOtpInputRefs.current[i] = el;
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleLoginDigitChange(i, e.target.value)}
                                  onKeyDown={(e) => handleLoginKeyDown(i, e)}
                                  disabled={isVerifyingLoginOtp}
                                  aria-label={`Digit ${i + 1} of login code`}
                                  className={`h-12 w-11 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-mono font-extrabold rounded-xl border bg-card text-foreground transition-all focus:outline-none focus:ring-2 disabled:opacity-50 ${
                                    loginOtpError
                                      ? "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
                                      : "border-border/80 focus:border-primary focus:ring-primary/20"
                                  }`}
                                />
                              ))}
                            </div>

                            {loginOtpError && (
                              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                                <XCircle className="h-4 w-4 shrink-0" />
                                <span>{loginOtpError}</span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleVerifyLoginOtp()}
                            disabled={isVerifyingLoginOtp || loginOtpDigits.join("").length < 6}
                            className="w-full font-extrabold h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isVerifyingLoginOtp ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Verifying code...</span>
                              </div>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Verify & sign in</span>
                              </>
                            )}
                          </button>

                          {/* Resend & Back */}
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <span className="text-[11px] text-muted-foreground">Code valid for 5 minutes</span>

                            <div>
                              {loginResendCooldown > 0 ? (
                                <span className="text-muted-foreground font-medium text-[11px]">
                                  Resend in <strong className="font-mono text-foreground">{loginResendCooldown}s</strong>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleResendLoginOtp}
                                  disabled={isSendingLoginOtp}
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isSendingLoginOtp ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      <span>Resend code</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* OR Divider */}
                          <div className="relative my-3">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-border/70 dark:border-[#2D2D2D]" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-card dark:bg-[#1E1E1E] px-3 text-muted-foreground font-semibold tracking-wider text-[11px]">
                                Or
                              </span>
                            </div>
                          </div>

                          {/* Switch to Password Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (loginOtpEmail) setLoginEmail(loginOtpEmail);
                              setAuthMode("password");
                              setLoginErrors({});
                              setLoginOtpError(null);
                            }}
                            className="w-full font-bold h-10.5 sm:h-11 rounded-xl border border-border/80 dark:border-neutral-700/80 bg-secondary/50 hover:bg-secondary dark:bg-[#252525] dark:hover:bg-[#2A2A2A] text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 text-xs sm:text-sm"
                          >
                            <Lock className="h-4 w-4 text-primary shrink-0 stroke-[1.8]" />
                            <span>Sign in with password</span>
                          </button>
                        </div>
                      )
                    )}

                    {/* Switch Link to Register */}
                    <div className="pt-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        Don't have a Payernt account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("register");
                            setRegisterStep("details");
                            setLoginErrors({});
                            setRegisterErrors({});
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
                    className="space-y-3 text-left"
                  >
                    {registerStep === "details" ? (
                      <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
                        {/* 1. Full Name & Mobile Number in 2-col grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Full Name */}
                          <div className="w-full relative pt-1.5">
                            <div
                              className={`group relative flex items-center gap-2 rounded-xl border bg-card px-3 sm:px-3.5 h-10 sm:h-10.5 transition-colors border-neutral-400/80 dark:border-neutral-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                                registerErrors.name ? "border-destructive focus-within:ring-destructive/30" : ""
                              }`}
                            >
                              <label
                                htmlFor="payernt-register-name"
                                className={`absolute -top-2.5 left-3.5 px-1.5 bg-card text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10 ${
                                  registerErrors.name ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"
                                }`}
                              >
                                Full Name <span className="text-destructive">*</span>
                              </label>
                              <span className="text-muted-foreground shrink-0 flex items-center justify-center">
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
                                className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                              />
                            </div>
                            {registerErrors.name && (
                              <p className="mt-1 text-xs text-destructive">{registerErrors.name}</p>
                            )}
                          </div>

                          {/* Mobile Number */}
                          <div className="w-full relative pt-1.5">
                            <div
                              className={`group relative flex items-center gap-2 rounded-xl border bg-card px-3 sm:px-3.5 h-10 sm:h-10.5 transition-colors border-neutral-400/80 dark:border-neutral-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                                registerErrors.phone ? "border-destructive focus-within:ring-destructive/30" : ""
                              }`}
                            >
                              <label
                                htmlFor="payernt-register-phone"
                                className={`absolute -top-2.5 left-3.5 px-1.5 bg-card text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10 ${
                                  registerErrors.phone ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"
                                }`}
                              >
                                Mobile Number <span className="text-destructive">*</span>
                              </label>
                              <span className="text-xs font-bold text-muted-foreground select-none shrink-0">
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
                                className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                              />
                            </div>
                            {registerErrors.phone && (
                              <p className="mt-1 text-xs text-destructive">{registerErrors.phone}</p>
                            )}
                          </div>
                        </div>

                        {/* 2. Email Address */}
                        <div className="w-full relative pt-1.5">
                          <div
                            className={`group relative flex items-center gap-2 rounded-xl border bg-card px-3 sm:px-3.5 h-10 sm:h-10.5 transition-colors border-neutral-400/80 dark:border-neutral-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                              registerErrors.email ? "border-destructive focus-within:ring-destructive/30" : ""
                            }`}
                          >
                            <label
                              htmlFor="payernt-register-email"
                              className={`absolute -top-2.5 left-3.5 px-1.5 bg-card text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10 ${
                                registerErrors.email ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"
                              }`}
                            >
                              Email Address <span className="text-destructive">*</span>
                            </label>
                            <span className="text-muted-foreground shrink-0 flex items-center justify-center">
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
                              className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                            />
                          </div>
                          {registerErrors.email && (
                            <p className="mt-1 text-xs text-destructive">{registerErrors.email}</p>
                          )}
                        </div>

                        {/* 3. Password & Confirm Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Password */}
                          <div className="w-full relative pt-1.5">
                            <div
                              className={`group relative flex items-center gap-2 rounded-xl border bg-card px-3 sm:px-3.5 h-10 sm:h-10.5 transition-colors border-neutral-400/80 dark:border-neutral-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                                registerErrors.password ? "border-destructive focus-within:ring-destructive/30" : ""
                              }`}
                            >
                              <label
                                htmlFor="payernt-register-password"
                                className={`absolute -top-2.5 left-3.5 px-1.5 bg-card text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10 ${
                                  registerErrors.password ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"
                                }`}
                              >
                                Password <span className="text-destructive">*</span>
                              </label>
                              <span className="text-muted-foreground shrink-0 flex items-center justify-center">
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
                                className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="p-1 -mr-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors shrink-0 flex items-center justify-center"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            {registerErrors.password && (
                              <p className="mt-1 text-xs text-destructive">{registerErrors.password}</p>
                            )}
                          </div>

                          {/* Confirm Password */}
                          <div className="w-full relative pt-1.5">
                            <div
                              className={`group relative flex items-center gap-2 rounded-xl border bg-card px-3 sm:px-3.5 h-10 sm:h-10.5 transition-colors border-neutral-400/80 dark:border-neutral-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40 ${
                                registerErrors.confirmPassword ? "border-destructive focus-within:ring-destructive/30" : ""
                              }`}
                            >
                              <label
                                htmlFor="payernt-register-confirm"
                                className={`absolute -top-2.5 left-3.5 px-1.5 bg-card text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10 ${
                                  registerErrors.confirmPassword ? "text-destructive" : "text-muted-foreground group-focus-within:text-primary"
                                }`}
                              >
                                Confirm Password <span className="text-destructive">*</span>
                              </label>
                              <span className="text-muted-foreground shrink-0 flex items-center justify-center">
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
                                className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="p-1 -mr-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors shrink-0 flex items-center justify-center"
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            {registerErrors.confirmPassword && (
                              <p className="mt-1 text-xs text-destructive">{registerErrors.confirmPassword}</p>
                            )}
                          </div>
                        </div>

                        {/* Password Requirements Guidance */}
                        {password.length > 0 && !isPasswordValid && (
                          <div className="p-2 rounded-lg bg-secondary/80 border border-border/80 text-[10px] space-y-0.5 text-muted-foreground">
                            <p className="font-semibold text-foreground">Password requirements:</p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
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

                        {/* Terms & Conditions Checkbox with Animated Circle Tick */}
                        <div className="pt-1">
                          <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none group">
                            <input
                              type="checkbox"
                              checked={termsAccepted}
                              onChange={(e) => {
                                setTermsAccepted(e.target.checked);
                                if (registerErrors.terms) setRegisterErrors((prev) => ({ ...prev, terms: undefined }));
                              }}
                              className="sr-only"
                            />
                            <AnimatedCircleCheck checked={termsAccepted} />
                            <span className="text-muted-foreground text-[11px] leading-tight group-hover:text-foreground transition-colors">
                              I accept the{" "}
                              <Link to="/privacy" target="_blank" className="text-foreground hover:underline font-bold">
                                Lender Terms
                              </Link>{" "}
                              and{" "}
                              <Link to="/privacy" target="_blank" className="text-foreground hover:underline font-bold">
                                Equipment Policy
                              </Link>
                            </span>
                          </label>
                          {registerErrors.terms && (
                            <p className="mt-1 text-xs text-destructive font-medium">
                              {registerErrors.terms}
                            </p>
                          )}
                        </div>

                        {/* Primary Action Button: Continue to Email Verification */}
                        <button
                          type="submit"
                          disabled={isRegistering}
                          className="w-full font-extrabold h-10 sm:h-10.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-1.5 disabled:opacity-50"
                        >
                          {isRegistering ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Sending Verification Code...</span>
                            </div>
                          ) : (
                            <>
                              <span>Continue to Email Verification</span>
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      /* EMAIL OTP VERIFICATION STEP */
                      <div className="space-y-4">
                        {/* Target Email Check & Change */}
                        <div className="p-3 rounded-xl bg-secondary/40 border border-border/70 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Mail className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0 text-left">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Code sent to</p>
                              <p className="text-xs font-bold text-foreground truncate">{email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRegisterStep("details");
                              setRegisterOtpError(null);
                            }}
                            className="text-xs font-semibold text-primary hover:underline shrink-0 cursor-pointer"
                          >
                            Change
                          </button>
                        </div>

                        {/* 6 Digit Input Group */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              Enter 6-digit verification code
                            </label>
                            <button
                              type="button"
                              onClick={handlePasteRegisterFromClipboard}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer transition-colors"
                              title="Paste 6-digit code from clipboard"
                            >
                              <ClipboardPaste className="h-3.5 w-3.5" />
                              <span>Paste code</span>
                            </button>
                          </div>
                          <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleRegisterPaste}>
                            {registerOtpDigits.map((digit, i) => (
                              <input
                                key={i}
                                ref={(el) => {
                                  registerOtpInputRefs.current[i] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleRegisterDigitChange(i, e.target.value)}
                                onKeyDown={(e) => handleRegisterKeyDown(i, e)}
                                disabled={isVerifyingRegisterOtp}
                                aria-label={`Digit ${i + 1} of verification code`}
                                className={`h-12 w-11 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-mono font-extrabold rounded-xl border bg-card text-foreground transition-all focus:outline-none focus:ring-2 disabled:opacity-50 ${
                                  registerOtpError
                                    ? "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
                                    : "border-border/80 focus:border-primary focus:ring-primary/20"
                                }`}
                              />
                            ))}
                          </div>

                          {registerOtpError && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                              <XCircle className="h-4 w-4 shrink-0" />
                              <span>{registerOtpError}</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleVerifyRegisterOtp()}
                          disabled={isVerifyingRegisterOtp || registerOtpDigits.join("").length < 6}
                          className="w-full font-extrabold h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isVerifyingRegisterOtp ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Verifying code...</span>
                            </div>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>Verify & complete registration</span>
                            </>
                          )}
                        </button>

                        {/* Resend & Back Navigation */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-[11px] text-muted-foreground">Code valid for 5 minutes</span>

                          <div>
                            {registerResendCooldown > 0 ? (
                              <span className="text-muted-foreground font-medium text-[11px]">
                                Resend in <strong className="font-mono text-foreground">{registerResendCooldown}s</strong>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResendRegisterOtp}
                                disabled={isResendingRegisterOtp}
                                className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs cursor-pointer disabled:opacity-50"
                              >
                                {isResendingRegisterOtp ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3" />
                                    <span>Resend code</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Switch to Login Link */}
                    <div className="pt-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        Already have a Payernt account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("login");
                            setAuthMode("password");
                            setRegisterErrors({});
                            setLoginErrors({});
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
              <div className="pt-3 border-t border-border/60 flex items-center justify-center text-[11px] text-muted-foreground">
                <span>Secure peer-to-peer equipment rental</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/60 py-4 text-center text-[11px] text-muted-foreground">
        <span>Payent Payernt Product Owner Platform</span>
      </footer>
    </div>
  );
}
