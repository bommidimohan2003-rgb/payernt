import React, { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/common/Button";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  title?: string;
  description?: string;
  actionButtonText?: string;
  isDestructive?: boolean;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = "Enter Your Password",
  description = "For your security, please enter your account password to view your Security QR.",
  actionButtonText = "Continue",
  isDestructive = false,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError(null);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your account password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(password);
      setPassword("");
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
      const detail = axiosErr?.response?.data?.detail;
      if (axiosErr?.response?.status === 429) {
        setError(detail || "Too many password attempts. Please wait 15 minutes.");
      } else if (axiosErr?.response?.status === 401) {
        setError(detail || "Incorrect password. Please try again.");
      } else {
        setError(detail || "An error occurred verifying your password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#0D151D] border border-neutral-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-modal-title"
      >
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 id="password-modal-title" className="text-lg font-bold text-neutral-900 dark:text-white font-display">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm animate-in fade-in duration-150"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="security-account-password"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5"
            >
              Account Password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="security-account-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                disabled={loading}
                autoComplete="current-password"
                className="w-full h-11 px-3.5 pr-11 text-sm bg-neutral-50 dark:bg-[#131E2A] border border-neutral-300 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 text-[11px] text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-white/5">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Encrypted verification. Password is never stored on your device.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-semibold px-4 h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !password.trim()}
              variant={isDestructive ? "destructive" : "primary"}
              className={`text-xs font-semibold px-5 h-10 rounded-xl ${
                !isDestructive ? "bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100" : ""
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                actionButtonText
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
