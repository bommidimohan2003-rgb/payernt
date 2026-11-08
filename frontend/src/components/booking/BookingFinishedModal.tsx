import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import type { Product } from "@/types";

interface BookingFinishedModalProps {
  open: boolean;
  onClose: () => void;
  bookingId?: string;
  product?: Product | null;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  withInsurance?: boolean;
  deliveryAddress?: string;
  recipientName?: string;
  onViewBooking?: () => void;
  onContinueShopping?: () => void;
}

export function BookingFinishedModal({
  open,
  onClose,
  bookingId: _bookingId,
  product: _product,
  startDate: _startDate,
  endDate: _endDate,
  totalAmount: _totalAmount,
  withInsurance: _withInsurance = false,
  deliveryAddress: _deliveryAddress,
  recipientName: _recipientName,
  onViewBooking: _onViewBooking,
  onContinueShopping: _onContinueShopping,
}: BookingFinishedModalProps) {
  // Auto-close / proceed after the confirmation animation has played
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2800);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Finished Confirmation Card */}
        <motion.div
          initial={{ scale: 0.88, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          onClick={onClose}
          className="relative w-full max-w-[360px] rounded-3xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 shadow-2xl p-7 sm:p-8 text-center overflow-hidden z-10 cursor-pointer select-none"
        >
          {/* Subtle Top Ambient Glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-emerald-500/20 dark:bg-emerald-500/25 blur-3xl pointer-events-none rounded-full" />

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close popup"
          >
            <X className="h-4 w-4" />
          </button>

          {/* ============================================================== */}
          {/* REVEALING GREEN TICK MARK ANIMATION                            */}
          {/* ============================================================== */}
          <div className="relative mx-auto mt-1 mb-4 w-20 h-20 flex items-center justify-center">
            {/* Pulsing Emerald Glow */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.35, 1.15], opacity: [0, 0.7, 0.35] }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-emerald-500 blur-xl pointer-events-none"
            />

            {/* Outer Ring & Checkmark Disc */}
            <motion.div
              initial={{ scale: 0.2, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 18,
                delay: 0.08,
              }}
              className="relative w-18 h-18 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-[2.5px] shadow-lg shadow-emerald-500/30 flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full bg-white dark:bg-[#18181B] flex items-center justify-center">
                {/* SVG Green Tick Mark with Stroke Drawing Reveal */}
                <svg
                  className="w-10 h-10 text-emerald-500 dark:text-[#00D492]"
                  viewBox="0 0 52 52"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <motion.path
                    d="M14 27 L23 36 L38 18"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      duration: 0.5,
                      ease: "easeOut",
                      delay: 0.24,
                    }}
                  />
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Finished Little Box Badge & Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="space-y-2 mt-2"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#00D492] border border-emerald-500/25 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              <span>Booking Finished</span>
            </div>

            <h3 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
              Order Confirmed!
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed px-2">
              Your rental reservation is finalized and ready for delivery.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
