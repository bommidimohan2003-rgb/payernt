import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { toast } from "sonner";
import { api } from "@/utils/api";

type ResetStep =
  | "EMAIL_ENTRY"
  | "RECOVERY_REQUIRED"
  | "PASSWORD_ENTRY"
  | "SUCCESS";

export function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from query search params (?token=XYZ) if opened via direct authorized link
  const queryParams = new URLSearchParams(location.search as any);
  const rawUrlToken = queryParams.get("token")?.trim() || "";

  // State Machine
  const [step, setStep] = useState<ResetStep>("EMAIL_ENTRY");
  const [email, setEmail] = useState("");
  const [recoveryToken, setRecoveryToken] = useState<string>(rawUrlToken);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [tokenEmail, setTokenEmail] = useState<string>("");

  // Loading & Error States
  const [isValidatingToken, setIsValidatingToken] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // New Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Synchronize and validate URL token on mount or param change
  useEffect(() => {
    const params = new URLSearchParams(location.search as any);
    const urlToken = params.get("token")?.trim() || "";
    if (urlToken) {
      setRecoveryToken(urlToken);
      let isMounted = true;
      setIsValidatingToken(true);
      setRecoveryError(null);

      api.validateResetToken(urlToken)
        .then((res) => {
          if (!isMounted) return;
          if (res?.valid || res?.recovery_authorized) {
            setTokenEmail(res.email || "");
            setMaskedEmail(res.masked_email || res.email || "");
            setStep("PASSWORD_ENTRY");
          } else {
            setRecoveryError("Your password reset link is invalid or expired.");
            setStep("RECOVERY_REQUIRED");
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setRecoveryError("Your password reset link is invalid or expired.");
          setStep("RECOVERY_REQUIRED");
        })
        .finally(() => {
          if (isMounted) setIsValidatingToken(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [location.search]);

  // STEP 1 & 2: Enter Email and Check Database / Recovery Authorization
  const handleCheckAccountAndRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setEmailError(null);
    setRecoveryError(null);

    try {
      const res = await api.forgotPasswordRequest(cleanEmail, recoveryToken || undefined);

      if (res?.account_found && res?.recovery_token) {
        // Step 2 & 3: Account Exists in Database -> Give Set New Password and Confirm fields
        setRecoveryToken(res.recovery_token);
        setMaskedEmail(res.masked_email || cleanEmail);
        setTokenEmail(res.email || cleanEmail);
        setStep("PASSWORD_ENTRY");
        toast.success("Account found. Please set your new password.");
      } else {
        // Account does not exist in database
        const errMsg = res?.message || "No account found with this email address.";
        setEmailError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEmailError(msg || "Unable to check account. Please try again.");
      toast.error(msg || "Unable to check account.");
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 6: Update Password with Verified Recovery Authorization
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const activeToken = recoveryToken;
    if (!activeToken) {
      setRecoveryError("Additional account recovery authorization is required.");
      setStep("RECOVERY_REQUIRED");
      return;
    }

    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }

    // Password Complexity Validation
    const hasMinLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(newPassword);

    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setPasswordError("Password does not meet the required security rules.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await api.forgotPasswordReset(activeToken, newPassword, tokenEmail || email);
      setStep("SUCCESS");
      toast.success("Password updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("invalid") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("token") ||
        msg.toLowerCase().includes("authorization")
      ) {
        setRecoveryError("Your password reset link is invalid or expired.");
        setStep("RECOVERY_REQUIRED");
      } else if (
        msg.toLowerCase().includes("character") ||
        msg.toLowerCase().includes("uppercase") ||
        msg.toLowerCase().includes("lowercase") ||
        msg.toLowerCase().includes("security rules") ||
        msg.toLowerCase().includes("strength")
      ) {
        setPasswordError("Password does not meet the required security rules.");
      } else {
        setPasswordError("Unable to update your password. Please try again.");
      }
      toast.error(msg || "Unable to update your password.");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // STATE 1: Token Validating Loader
  // -------------------------------------------------------------
  if (isValidatingToken) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary animate-spin">
          <RotateCcw className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Checking recovery authorization...
        </p>
        <p className="text-xs text-muted-foreground">
          Please wait while we verify your secure account status.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 2: Recovery Required (Account Found, Recovery Unauthorized)
  // -------------------------------------------------------------
  if (step === "RECOVERY_REQUIRED") {
    return (
      <div className="space-y-5 py-2">
        {/* Account Found Badge */}
        {maskedEmail && (
          <div className="flex items-center justify-between p-3 bg-muted/40 border border-border/50 rounded-xl text-xs">
            <div className="flex items-center space-x-2 truncate">
              <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground truncate">
                Account Found: {maskedEmail}
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full shrink-0">
              Authorization Required
            </span>
          </div>
        )}

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300">
              Additional Account Recovery Authorization is Required
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To protect account integrity, changing a password requires verified recovery authorization. Please sign in with your password or use an authorized recovery session.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => {
            setStep("EMAIL_ENTRY");
            setEmail("");
            setRecoveryToken("");
            setRecoveryError(null);
            setEmailError(null);
            navigate({ to: "/forgot-password", search: { token: "" } });
          }}
          variant="outline"
          className="w-full font-bold py-3 rounded-xl cursor-pointer"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Try Another Account
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 3: Success Confirmation (Step 7)
  // -------------------------------------------------------------
  if (step === "SUCCESS") {
    return (
      <div className="space-y-5 py-4 text-center">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-foreground">
            Password updated successfully.
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Your password has been changed. You can now sign in with your new password.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => navigate({ to: "/login" })}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl shadow-md cursor-pointer"
        >
          Sign In
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 4: Password Entry Form (Steps 3, 4, 5, 6)
  // -------------------------------------------------------------
  if (step === "PASSWORD_ENTRY") {
    return (
      <form onSubmit={handleUpdatePassword} className="space-y-5">
        {/* Account Status Badges */}
        <div className="flex items-center justify-between p-3 bg-muted/40 border border-border/50 rounded-xl text-xs">
          <div className="flex items-center space-x-2 truncate">
            <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-semibold text-foreground truncate">
              Account Found: {maskedEmail || tokenEmail || email}
            </span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full shrink-0">
            Recovery Authorized
          </span>
        </div>

        {/* New Password Field (Masked by default) */}
        <div className="space-y-1.5">
          <div className="relative">
            <Input
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError(null);
              }}
              icon={<Lock className="h-4 w-4 text-muted-foreground" />}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground p-1 cursor-pointer transition-colors"
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm New Password Field (Masked by default) */}
        <div className="space-y-1.5">
          <div className="relative">
            <Input
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError(null);
              }}
              icon={<Lock className="h-4 w-4 text-muted-foreground" />}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground p-1 cursor-pointer transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Single-line password requirement hint when not yet fulfilling all rules */}
        {newPassword.length > 0 && !(newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) && (
          <p className="text-[11px] font-medium text-amber-500 dark:text-amber-400">
            Must be at least 8 characters with uppercase, lowercase, number & special character (!@#$%^&*...).
          </p>
        )}

        {/* Password Validation Error Banner */}
        {passwordError && (
          <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {/* Submit Button (Step 6 requirement: "Update Password & Sign In") */}
        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl shadow-md cursor-pointer"
          loading={submitting}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Update Password & Sign In
        </Button>
      </form>
    );
  }

  // -------------------------------------------------------------
  // STATE 5: Email Entry Form (Step 1)
  // -------------------------------------------------------------
  return (
    <form onSubmit={handleCheckAccountAndRecovery} className="space-y-5">
      <Input
        label="Account Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailError(null);
          setRecoveryError(null);
        }}
        icon={<Mail className="h-4 w-4 text-muted-foreground" />}
        autoComplete="email"
        required
      />

      {emailError && (
        <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{emailError}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl shadow-md cursor-pointer"
        loading={submitting}
      >
        Continue
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </form>
  );
}
