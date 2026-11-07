import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Trash2, AlertTriangle, Check } from "lucide-react";
import "./HoldButton.css";

export interface HoldButtonProps {
  onHold: () => void | Promise<void>;
  duration?: number;
  children?: React.ReactNode;
  holdText?: string;
  completeText?: string;
  variant?: "destructive" | "warning" | "default";
  disabled?: boolean;
  className?: string;
}

export function HoldButton({
  onHold,
  duration = 1500,
  children = "Hold to delete",
  holdText = "Keep holding...",
  completeText = "Deleted",
  variant = "destructive",
  disabled = false,
  className = "",
}: HoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const progress = useMotionValue(0);
  const smoothProgress = useSpring(progress, { stiffness: 350, damping: 25 });
  const fillWidth = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  const startHold = () => {
    if (disabled || isCompleted) return;
    setIsHolding(true);
    startTimeRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const currentProgress = Math.min(1, elapsed / duration);
      progress.set(currentProgress);

      if (currentProgress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Complete!
        setIsHolding(false);
        setIsCompleted(true);
        onHold();
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (isCompleted) return;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsHolding(false);
    progress.set(0);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      if (!isHolding && !isCompleted) {
        e.preventDefault();
        startHold();
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      cancelHold();
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || isCompleted}
      className={`hold-button-container ${variant} ${isHolding ? "holding" : ""} ${
        isCompleted ? "completed" : ""
      } ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      aria-label={isCompleted ? completeText : isHolding ? holdText : typeof children === "string" ? children : "Hold to confirm"}
    >
      <motion.div
        className="hold-button-fill"
        style={{ width: fillWidth }}
      />

      <span className="hold-button-content">
        {isCompleted ? (
          <>
            <Check className="h-4 w-4" />
            <span>{completeText}</span>
          </>
        ) : isHolding ? (
          <>
            <AlertTriangle className="h-4 w-4 animate-bounce" />
            <span>{holdText}</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}

export default HoldButton;
