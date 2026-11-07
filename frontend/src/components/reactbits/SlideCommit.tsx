import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import "./SlideCommit.css";

export interface SlideCommitProps {
  onConfirm: () => Promise<void> | void;
  label?: string;
  successLabel?: string;
  disabled?: boolean;
  className?: string;
  resetAfterSuccessMs?: number;
}

export function SlideCommit({
  onConfirm,
  label = "Slide to confirm",
  successLabel = "Confirmed",
  disabled = false,
  className = "",
  resetAfterSuccessMs,
}: SlideCommitProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState<number>(200);

  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 400, damping: 30 });

  // Update track width on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const handleWidth = 48;
        const padding = 8;
        setMaxDrag(Math.max(80, containerWidth - handleWidth - padding));
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const fillWidth = useTransform(springX, (val: number) => `${Math.max(0, val + 48)}px`);
  const labelOpacity = useTransform(x, [0, maxDrag * 0.6], [1, 0.1]);

  const executeConfirm = async () => {
    setStatus("pending");
    try {
      await onConfirm();
      setStatus("success");
      if (resetAfterSuccessMs) {
        setTimeout(() => {
          x.set(0);
          setStatus("idle");
        }, resetAfterSuccessMs);
      }
    } catch (err) {
      console.error("SlideCommit confirmation error:", err);
      setStatus("error");
      setTimeout(() => {
        x.set(0);
        setStatus("idle");
      }, 1600);
    }
  };

  const handleDragEnd = () => {
    if (disabled || status !== "idle") return;

    if (x.get() >= maxDrag * 0.85) {
      x.set(maxDrag);
      executeConfirm();
    } else {
      x.set(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || status !== "idle") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      x.set(maxDrag);
      executeConfirm();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`slide-commit-container ${status} ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={`${label} - ${status}`}
      onKeyDown={handleKeyDown}
    >
      {/* Background Drag Fill */}
      {status === "idle" && (
        <motion.div
          className="slide-commit-fill"
          style={{ width: fillWidth }}
        />
      )}

      {/* Center Label */}
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success-label"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="slide-commit-label success"
          >
            <Check className="h-5 w-5" />
            <span>{successLabel}</span>
          </motion.div>
        ) : status === "error" ? (
          <motion.div
            key="error-label"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: [0, -6, 6, -3, 3, 0] }}
            exit={{ opacity: 0 }}
            className="slide-commit-label text-[#FF7F7F] flex items-center gap-2"
          >
            <AlertCircle className="h-5 w-5" />
            <span>Confirmation failed. Retry</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle-label"
            style={{ opacity: labelOpacity }}
            className="slide-commit-label"
          >
            {status === "pending" ? "Processing..." : label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable Handle */}
      {status !== "success" && (
        <motion.div
          drag={status === "idle" && !disabled ? "x" : false}
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.08}
          dragMomentum={false}
          style={{ x }}
          onDragEnd={handleDragEnd}
          className={`slide-commit-handle ${status}`}
        >
          {status === "pending" ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : status === "error" ? (
            <AlertCircle className="h-5 w-5 text-white" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </motion.div>
      )}
    </div>
  );
}

export default SlideCommit;
