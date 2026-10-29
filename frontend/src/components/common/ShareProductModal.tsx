import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, Share2, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export interface ShareProductModalProps {
  open?: boolean;
  onClose?: () => void;
  url?: string;
  title?: string;
}

export function ShareProductModal({
  open: controlledOpen,
  onClose: controlledOnClose,
  url: controlledUrl,
  title: controlledTitle,
}: ShareProductModalProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = typeof controlledOpen === "boolean";
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
    setCopied(false);
  };

  useEffect(() => {
    if (isControlled) {
      if (controlledUrl) setShareUrl(controlledUrl);
      if (controlledTitle) setProductTitle(controlledTitle);
    }
  }, [isControlled, controlledUrl, controlledTitle]);

  useEffect(() => {
    const handleFallbackEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string; title?: string }>;
      if (customEvent.detail?.url) {
        setShareUrl(customEvent.detail.url);
        setProductTitle(customEvent.detail.title || "Rental Product");
        setInternalOpen(true);
        setCopied(false);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("payent_manual_share_fallback", handleFallbackEvent);
      return () => {
        window.removeEventListener("payent_manual_share_fallback", handleFallbackEvent);
      };
    }
  }, []);

  const handleCopy = async () => {
    if (!shareUrl) return;

    if (inputRef.current) {
      inputRef.current.select();
      inputRef.current.setSelectionRange(0, 99999);
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (typeof document !== "undefined") {
        document.execCommand("copy");
      }
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.info("Please press Ctrl+C (or Cmd+C) to copy the selected link.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0B0F14] border border-black/10 dark:border-white/10 shadow-2xl p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="share-modal-title" className="text-base font-bold text-neutral-950 dark:text-white">
                    Share Rental Gear
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Public link for friends and fellow creators
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Product context */}
            {productTitle && (
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-white/[0.03] p-3 rounded-2xl border border-black/5 dark:border-white/5 truncate">
                Listing: <span className="font-bold text-neutral-950 dark:text-white">{productTitle}</span>
              </div>
            )}

            {/* Copyable input field */}
            <div className="space-y-2">
              <label htmlFor="share-product-input" className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Product URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="share-product-input"
                  ref={inputRef}
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#050709] text-xs font-mono text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white/20 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Anyone with this link can view this gear listing without logging in.
              </p>
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

