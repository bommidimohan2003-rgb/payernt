import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { useEffect } from "react";

interface TermsAndConditionsModalProps {
  open: boolean;
  onClose: () => void;
  onAccept?: () => void;
  productTitle?: string;
  isAccepted?: boolean;
}

export function TermsAndConditionsModal({
  open,
  onClose,
  productTitle,
}: TermsAndConditionsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = origOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] grid place-items-center p-3 sm:p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.92, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-xl bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl z-10 overflow-hidden my-auto flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-black/5 dark:border-white/10 bg-neutral-50/80 dark:bg-[#1E1E1E]/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white tracking-tight">
                      Rental Terms & Conditions
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Payernt Policy
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-[#A8B1BA]">
                    Standard peer-to-peer equipment rental & protection agreement
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 hover:bg-neutral-200/60 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content: ONLY 3 CONDITIONS */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-left leading-relaxed">
              {productTitle && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-neutral-800 dark:text-neutral-200">
                    Applying to: <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{productTitle}</strong>
                  </div>
                </div>
              )}

              {/* Condition 1 */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-[#1E1E1E] border border-black/5 dark:border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-xs sm:text-sm">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <span>Equipment Inspection & Safe Handling</span>
                </div>
                <p className="pl-7 text-xs text-neutral-600 dark:text-[#A8B1BA] leading-relaxed">
                  The renter agrees to inspect the gear upon delivery or pickup. Any pre-existing cosmetic wear, missing accessories, or operational anomalies must be recorded and shared within 2 hours of handover. Equipment must be operated responsibly for legal purposes only.
                </p>
              </div>

              {/* Condition 2 */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-[#1E1E1E] border border-black/5 dark:border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-xs sm:text-sm">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <span>Identity Verification & Security Deposit</span>
                </div>
                <p className="pl-7 text-xs text-neutral-600 dark:text-[#A8B1BA] leading-relaxed">
                  Valid government ID verification is mandatory for all bookings. Any security deposit hold is securely safeguarded in Payernt Escrow and fully released upon timely, undamaged return of the gear.
                </p>
              </div>

              {/* Condition 3 */}
              <div className="p-4 rounded-2xl bg-neutral-100/70 dark:bg-[#1E1E1E] border border-black/5 dark:border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-xs sm:text-sm">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <span>Timely Returns & Protection Policy</span>
                </div>
                <p className="pl-7 text-xs text-neutral-600 dark:text-[#A8B1BA] leading-relaxed">
                  Gear must be returned at or before the designated slot. Extensions must be requested through Payernt at least 2 hours in advance. In case of accidental damage or loss, standard repair assessment and Payernt protection coverage apply.
                </p>
              </div>
            </div>

            {/* Note: NO BUTTONS IN POPUP as explicitly requested */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
