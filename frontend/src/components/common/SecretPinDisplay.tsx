import React, { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SecretPinDisplayProps {
  pin: string;
  type?: "renter" | "vendor";
  role?: "renter" | "vendor";
  title?: string;
  subtitle?: string;
  description?: string;
  isMaskedDefault?: boolean;
  onHide?: () => void;
  showCopy?: boolean;
  showToggleMask?: boolean;
  onGenerate?: () => void;
  isGenerating?: boolean;
  statusBadge?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Premium Monochrome 4-Digit Secret PIN Display Component.
 * Strictly separates Vendor Secret PIN vs Renter Secret PIN.
 * Renders four distinct, accessible digit boxes with masking, Show/Hide, and Copy.
 */
export function SecretPinDisplay({
  pin,
  type,
  role,
  title,
  subtitle,
  description,
  isMaskedDefault = false,
  onHide,
  showCopy = true,
  showToggleMask = true,
  onGenerate,
  isGenerating = false,
  statusBadge,
  className = "",
  compact = false,
}: SecretPinDisplayProps) {
  const [isMasked, setIsMasked] = useState(isMaskedDefault);
  const [hasCopied, setHasCopied] = useState(false);

  const cleanPin = (pin || "").trim().slice(0, 4);
  const digits = cleanPin.padEnd(4, "•").split("").slice(0, 4);

  const resolvedType = type || role || "renter";
  const resolvedSubtitle = subtitle || description;
  const isVendor = resolvedType === "vendor";
  const defaultTitle = isVendor
    ? "Vendor Secret PIN (4-Digit)"
    : "Renter Secret PIN (4-Digit)";
  const defaultSubtitle = isVendor
    ? "Private vendor credential. Never disclose to renter or courier."
    : "Private renter security PIN. Provide to owner during handover.";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanPin) return;
    navigator.clipboard.writeText(cleanPin);
    setHasCopied(true);
    toast.success(`${isVendor ? "Vendor" : "Renter"} Secret PIN copied to clipboard.`);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleToggleMask = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMasked((prev) => !prev);
  };

  return (
    <div
      className={`rounded-2xl border border-[#A1A1AA]/20 bg-[#10151B] p-3.5 sm:p-4 text-left space-y-3 transition-colors ${className}`}
      role="region"
      aria-label={title || defaultTitle}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#A1A1AA] shrink-0">
            {isVendor ? <Lock className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-[#F5F5F5] tracking-tight">
                {title || defaultTitle}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[#A1A1AA]">
                {isVendor ? "Lender" : "Borrower"}
              </span>
            </div>
            {!compact && (
              <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-snug">
                {resolvedSubtitle || defaultSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showToggleMask && (
            <button
              type="button"
              onClick={handleToggleMask}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#A1A1AA]/25 bg-[#050709] hover:bg-white/10 text-xs font-medium text-[#F5F5F5] transition-colors cursor-pointer"
              title={isMasked ? "Show Secret PIN" : "Mask Secret PIN"}
              aria-label={isMasked ? "Show Secret PIN" : "Mask Secret PIN"}
            >
              {isMasked ? <Eye className="h-3.5 w-3.5 text-[#A1A1AA]" /> : <EyeOff className="h-3.5 w-3.5 text-[#A1A1AA]" />}
              <span className="text-[11px]">{isMasked ? "Show" : "Hide"}</span>
            </button>
          )}

          {showCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#A1A1AA]/25 bg-[#050709] hover:bg-white/10 text-xs font-medium text-[#F5F5F5] transition-colors cursor-pointer"
              title="Copy PIN to clipboard"
              aria-label="Copy PIN to clipboard"
            >
              {hasCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-[#A1A1AA]" />
              )}
              <span className="text-[11px]">{hasCopied ? "Copied" : "Copy"}</span>
            </button>
          )}

          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F5F5F5] hover:bg-white text-[#050709] text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span className="text-[11px]">Generate PIN</span>
            </button>
          )}

          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5] underline cursor-pointer ml-1 px-1 py-0.5"
              title="Close PIN panel"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Four Distinct Digit Boxes */}
      <div
        className="flex items-center justify-center gap-2 sm:gap-3 py-1.5"
        role="group"
        aria-label="4 distinct digits"
      >
        {digits.map((digit, idx) => (
          <div
            key={idx}
            className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl bg-[#050709] border border-[#A1A1AA]/30 flex items-center justify-center font-mono text-xl sm:text-2xl font-black text-[#F5F5F5] shadow-inner select-all transition-all"
            aria-label={`Digit ${idx + 1}`}
          >
            {isMasked ? "•" : digit}
          </div>
        ))}
      </div>

      {/* Footer Details */}
      {(statusBadge || !compact) && (
        <div className="flex flex-wrap items-center justify-between text-[11px] text-[#A1A1AA] pt-2 border-t border-white/5">
          <span>
            {isVendor
              ? "🔒 Handover verification credential for owner"
              : "🔒 Share with owner when verifying receipt"}
          </span>
          {statusBadge ? (
            <span className="font-semibold text-[#F5F5F5]">{statusBadge}</span>
          ) : (
            <span className="font-mono text-[10px] text-[#A1A1AA]/80">4-Digit Security Key</span>
          )}
        </div>
      )}
    </div>
  );
}

interface SecretPinInputProps {
  digits: string[];
  onChange: (index: number, val: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * Accessible 4-Digit PIN Input component for handover verification modals.
 */
export function SecretPinInput({
  digits,
  onChange,
  onKeyDown,
  inputRefs,
  disabled = false,
  error,
  className = "",
}: SecretPinInputProps) {
  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < digits.length - 1) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    }
    if (onKeyDown) {
      onKeyDown(idx, e);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className="flex items-center justify-center gap-2.5 sm:gap-3"
        role="group"
        aria-label="Enter 4-digit PIN"
      >
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => onChange(idx, e.target.value.replace(/\D/g, "").slice(-1))}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            autoComplete="one-time-code"
            aria-label={`Digit ${idx + 1}`}
            className="w-11 h-13 sm:w-13 sm:h-15 text-center font-mono text-2xl sm:text-3xl font-black rounded-xl border border-[#A1A1AA]/30 bg-[#050709] text-[#F5F5F5] focus:outline-none focus:border-[#F5F5F5] focus:ring-1 focus:ring-[#F5F5F5] transition-all shadow-inner disabled:opacity-50"
          />
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-400 font-medium text-center animate-in fade-in" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
