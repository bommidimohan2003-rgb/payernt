import { AnimatePresence, motion } from "framer-motion";
import { X, Check } from "lucide-react";
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
  onAccept,
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

  const handleUnderstand = () => {
    onAccept?.();
    onClose();
  };

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
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-title"
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="relative w-full max-w-xl sm:max-w-2xl bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-10 p-5 sm:p-6 space-y-4 text-left my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h3 id="terms-modal-title" className="text-base sm:text-lg font-semibold text-neutral-950 dark:text-white">
                paYent Rental Agreement
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pr-1">
              <p>
                <strong className="font-semibold text-neutral-950 dark:text-white">1. Equipment Inspection &amp; Safe Handling:</strong>{" "}
                The renter agrees to inspect the gear upon delivery or pickup. Any pre-existing cosmetic wear, missing accessories, or operational anomalies must be recorded and shared within 2 hours of handover. Equipment must be operated responsibly for legal purposes only.
              </p>
              <p>
                <strong className="font-semibold text-neutral-950 dark:text-white">2. Identity Verification &amp; Security Deposit:</strong>{" "}
                Valid government ID verification is mandatory for all bookings. Any security deposit hold is securely safeguarded in paYent Escrow and fully released upon timely, undamaged return of the gear.
              </p>
              <p>
                <strong className="font-semibold text-neutral-950 dark:text-white">3. Timely Returns &amp; Protection Policy:</strong>{" "}
                Gear must be returned at or before the designated slot. Extensions must be requested through paYent at least 2 hours in advance. In case of accidental damage or loss, standard repair assessment and paYent protection coverage apply.
              </p>
            </div>

            {/* Divider & Action */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={handleUnderstand}
                className="min-h-[40px] px-4 py-2 sm:px-5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-semibold text-xs sm:text-sm shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4 stroke-[1.75] shrink-0" aria-hidden="true" />
                <span>I Understand</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
