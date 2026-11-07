import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Compass,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";

interface BookingFinishedModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  product: Product | null;
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
  bookingId,
  product,
  startDate,
  endDate,
  totalAmount,
  withInsurance = false,
  deliveryAddress,
  recipientName,
  onViewBooking,
  onContinueShopping,
}: BookingFinishedModalProps) {
  if (!open) return null;

  const displayBookingId = bookingId
    ? bookingId.length > 12
      ? `#${bookingId.slice(-8).toUpperCase()}`
      : `#${bookingId.toUpperCase()}`
    : "#CONFIRMED";

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

        {/* Finished Little Box Modal */}
        <motion.div
          initial={{ scale: 0.88, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="relative w-full max-w-[390px] rounded-3xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 text-center overflow-hidden z-10"
        >
          {/* Subtle Top Ambient Glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-emerald-500/20 dark:bg-emerald-500/25 blur-3xl pointer-events-none rounded-full" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
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
            className="space-y-1.5"
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

          {/* Booking Summary Box */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="mt-4 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 text-left space-y-2.5 text-xs"
          >
            {/* Product row */}
            {product && (
              <div className="flex items-center gap-3 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-11 h-11 rounded-xl object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-neutral-900 dark:text-white text-xs truncate">
                    {product.title}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                    {displayBookingId}
                  </div>
                </div>
              </div>
            )}

            {/* Dates & Insurance Info */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {startDate && (
                <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                  <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">
                    {startDate} {endDate && endDate !== startDate ? `→ ${endDate}` : ""}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5 justify-end">
                {withInsurance ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-[#00D492]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>With Insurance</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-neutral-500 dark:text-neutral-400">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Without Insurance</span>
                  </span>
                )}
              </div>
            </div>

            {/* Delivery destination if provided */}
            {deliveryAddress && (
              <div className="flex items-start gap-1.5 pt-1 text-[11px] text-neutral-600 dark:text-neutral-400 border-t border-neutral-200/80 dark:border-neutral-800">
                <MapPin className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span className="truncate">
                  {recipientName ? `${recipientName} • ` : ""}
                  {deliveryAddress}
                </span>
              </div>
            )}

            {/* Total Paid Amount */}
            {typeof totalAmount === "number" && (
              <div className="flex justify-between items-center pt-1 font-bold text-neutral-900 dark:text-white border-t border-neutral-200/80 dark:border-neutral-800">
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal">
                  Total Confirmed
                </span>
                <span className="font-mono text-sm text-emerald-600 dark:text-[#00D492] font-black">
                  ₹{totalAmount.toFixed(0)}
                </span>
              </div>
            )}
          </motion.div>

          {/* Action Buttons: strictly [Symbol on Left] [Button Name on Right] with compact size */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-5 space-y-2"
          >
            <Button
              type="button"
              id="finished-view-booking-btn"
              size="sm"
              className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              onClick={onViewBooking}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>View Booking Details</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-white/5"
              onClick={onContinueShopping}
            >
              <Compass className="h-3.5 w-3.5 shrink-0" />
              <span>Explore More Gear</span>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
