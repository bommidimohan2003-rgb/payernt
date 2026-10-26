import React, { useEffect } from "react";
import { X, ShieldCheck, Truck, Sparkles, ArrowRight } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExplore: () => void;
}

export function HowItWorksModal({
  isOpen,
  onClose,
  onExplore,
}: HowItWorksModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[540px] bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <span className="text-[11px] font-mono tracking-widest text-[#6622aa] font-bold uppercase">
              How Paye₹nt Works
            </span>
            <h2
              id="how-it-works-title"
              className="text-2xl font-bold font-display text-neutral-900 tracking-tight mt-0.5"
            >
              Rent Gear in 3 Simple Steps
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Steps */}
        <div className="py-6 flex flex-col gap-5">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#ddf0e4] text-[#0d2a1f] flex items-center justify-center shrink-0 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-[#0d2a1f]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                1. Browse & Instant Verify
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                Choose flagship drones, cameras, laptops, or cinema gear.
                Instant KYC verification keeps every transaction safe with
                automated escrow.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#ddf0e4] text-[#0d2a1f] flex items-center justify-center shrink-0 font-bold text-sm">
              <Truck className="w-5 h-5 text-[#0d2a1f]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                2. Insured Delivery or Handoff
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                Get express courier delivery straight to your set, or meet a
                verified local lender in minutes with one-time security OTP
                verification.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#ddf0e4] text-[#0d2a1f] flex items-center justify-center shrink-0 font-bold text-sm">
              <Sparkles className="w-5 h-5 text-[#0d2a1f]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                3. Create & Return
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                Shoot without limits. Pack the gear back into its protective
                case and return it. Your security deposit is released
                automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onExplore();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0d2a1f] hover:bg-[#143a2b] text-white font-medium text-xs sm:text-sm tracking-wide transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <span>Explore Gear Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default HowItWorksModal;
