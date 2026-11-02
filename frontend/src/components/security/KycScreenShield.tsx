import React from "react";
import { ShieldAlert, ShieldCheck, EyeOff } from "lucide-react";

interface KycScreenShieldProps {
  isObscured: boolean;
  documentType: string;
  onDismiss?: () => void;
}

/**
 * Privacy Shield overlay that obscures sensitive Aadhaar & PAN details
 * when screen capture, Snipping Tool, or window unfocus is detected.
 */
export function KycScreenShield({
  isObscured,
  documentType,
  onDismiss,
}: KycScreenShieldProps) {
  if (!isObscured) return null;

  return (
    <div
      role="alert"
      aria-label="KYC Privacy Protection Shield Active"
      onClick={onDismiss}
      className="absolute inset-0 z-50 rounded-3xl bg-background/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none shadow-2xl border border-destructive/30 animate-in fade-in duration-150 cursor-pointer"
    >
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3 shadow-sm border border-destructive/20 animate-pulse">
        <ShieldAlert className="h-7 w-7" />
      </div>

      <h4 className="text-base font-bold text-foreground tracking-tight">
        Screenshots are not allowed in this app
      </h4>

      <p className="text-xs text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
        {documentType} numbers and sensitive document photos are obscured while screen capture, Snipping Tool, or window unfocus is detected.
      </p>

      <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground border border-border shadow-xs transition-colors">
        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Click to resume viewing</span>
      </div>
    </div>
  );
}

/**
 * Visual badge indicating that anti-screenshot protection is active on this KYC form.
 */
export function KycProtectionBadge({ documentType = "KYC" }: { documentType?: string }) {
  return (
    <div
      title="Anti-Screenshot & Screen Capture Protection Active"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold select-none"
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Anti-Screenshot Active</span>
      <span className="sm:hidden">Anti-SS Active</span>
    </div>
  );
}

