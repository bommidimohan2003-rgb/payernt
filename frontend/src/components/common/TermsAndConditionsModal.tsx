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

          {/* Modal Container: increased width and compact height matching Image 3 */}
          <motion.div
            initial={{ scale: 0.94, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 10, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-xl sm:max-w-2xl bg-card border border-border/80 dark:border-white/10 rounded-3xl shadow-2xl z-10 p-5 sm:p-6 space-y-4 text-left my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                paYent Rental Agreement
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content: Numbered items exactly matching the uploaded screenshot */}
            <div className="space-y-3.5 text-xs text-muted-foreground leading-relaxed pr-1">
              <p>
                <strong className="text-foreground">1. Equipment Inspection &amp; Safe Handling:</strong>{" "}
                The renter agrees to inspect the gear upon delivery or pickup. Any pre-existing cosmetic wear, missing accessories, or operational anomalies must be recorded and shared within 2 hours of handover. Equipment must be operated responsibly for legal purposes only.
              </p>
              <p>
                <strong className="text-foreground">2. Identity Verification &amp; Security Deposit:</strong>{" "}
                Valid government ID verification is mandatory for all bookings. Any security deposit hold is securely safeguarded in Payernt Escrow and fully released upon timely, undamaged return of the gear.
              </p>
              <p>
                <strong className="text-foreground">3. Timely Returns &amp; Protection Policy:</strong>{" "}
                Gear must be returned at or before the designated slot. Extensions must be requested through Payernt at least 2 hours in advance. In case of accidental damage or loss, standard repair assessment and Payernt protection coverage apply.
              </p>
            </div>

            {/* Divider & Action */}
            <div className="pt-3 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={handleUnderstand}
                className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>I Understand</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
