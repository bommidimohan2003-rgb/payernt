import React from "react";
import { ShieldAlert, ShieldCheck, EyeOff } from "lucide-react";

export interface KycScreenShieldProps {
  isObscured: boolean;
  documentType: string;
  onDismiss?: () => void;
}

/**
 * Full-viewport Anti-Screenshot & Screen Capture Protection Shield.
 *
 * Scoped strictly to Aadhaar and PAN KYC pages.
 * Obscures the entire viewport with an impenetrable blackout shield whenever:
 * - PrintScreen key is pressed
 * - Snipping Tool or screenshot shortcuts are used (Win+Shift+S, Cmd+Shift+3/4/5)
 * - Window loses focus to an external capture application
 * - Browser print dialog is triggered (Ctrl+P / Cmd+P)
 */
export function KycScreenShield({
  isObscured,
  documentType,
  onDismiss,
}: KycScreenShieldProps) {
  return (
    <div
      id="kyc-screen-capture-shield"
      role="alert"
      aria-live="assertive"
      aria-label="Screenshots are not allowed in this app"
      onClick={onDismiss}
      className={`fixed inset-0 z-[2147483647] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer transition-opacity duration-100 ${
        isObscured ? "flex opacity-100 pointer-events-auto" : "hidden opacity-0 pointer-events-none"
      }`}
      style={{
        display: isObscured ? "flex" : undefined,
      }}
    >
      <div className="h-20 w-20 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/30 flex items-center justify-center mb-6 shadow-2xl animate-pulse">
        <ShieldAlert className="h-10 w-10 stroke-[2.5]" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
        Screenshots are not allowed in this app
      </h1>

      <p className="text-sm text-neutral-400 max-w-md mt-3 leading-relaxed">
        Screen capture, Snipping Tool, and recording are strictly prohibited to protect your {documentType} details and platform security.
      </p>

      <div className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer shadow-lg active:scale-95">
        <EyeOff className="h-4 w-4" />
        <span>Click anywhere to resume</span>
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

export default KycScreenShield;
