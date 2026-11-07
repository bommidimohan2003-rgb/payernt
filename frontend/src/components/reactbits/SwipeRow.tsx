import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import "./SwipeRow.css";

export interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "success";
}

export interface SwipeRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  className?: string;
  disabled?: boolean;
}

export function SwipeRow({
  children,
  actions = [],
  className = "",
  disabled = false,
}: SwipeRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const actionWidth = actions.length * 75; // Approx 75px per action button

  const x = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 450, damping: 30 });

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (disabled) return;
    const threshold = -actionWidth / 2;

    if (info.offset.x < threshold || info.velocity.x < -300) {
      x.set(-actionWidth);
      setIsOpen(true);
    } else {
      x.set(0);
      setIsOpen(false);
    }
  };

  const closeSwipe = () => {
    x.set(0);
    setIsOpen(false);
  };

  return (
    <div className={`swipe-row-wrapper ${className}`}>
      {/* Background Revealed Actions Layer */}
      <div className="swipe-row-actions-layer">
        {actions.map((act, idx) => (
          <button
            key={idx}
            type="button"
            className={`swipe-action-btn ${act.variant || "default"}`}
            onClick={(e) => {
              e.stopPropagation();
              act.onClick();
              closeSwipe();
            }}
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      {/* Foreground Swipeable Content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragElastic={{ left: 0.15, right: 0.05 }}
        style={{ x: smoothX }}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (isOpen) closeSwipe();
        }}
        className="swipe-row-content"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default SwipeRow;
