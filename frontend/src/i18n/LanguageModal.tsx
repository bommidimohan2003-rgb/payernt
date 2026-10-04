import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, X } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { LanguageSelector } from "./LanguageSelector";

export interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const { tCommon } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0f121a] border border-neutral-200/90 dark:border-white/[0.1] p-5 sm:p-6 shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {tCommon.languages}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {tCommon.selectLanguage}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 cursor-pointer"
                aria-label={tCommon.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Language Selector Body */}
            <div className="pt-1">
              <LanguageSelector onSelect={() => onClose()} />
            </div>

            {/* Footer Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black text-xs font-bold hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-xs"
              >
                {tCommon.confirm}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LanguageModal;
