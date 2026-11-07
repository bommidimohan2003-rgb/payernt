import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Loader2 } from "lucide-react";
import "./BellToggle.css";

export interface BellToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void | Promise<void>;
  unreadCount?: number;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function BellToggle({
  checked,
  onChange,
  unreadCount,
  activeLabel = "Alerts On",
  inactiveLabel = "Muted",
  className = "",
  disabled = false,
}: BellToggleProps) {
  const [loading, setLoading] = useState(false);
  const [ringKey, setRingKey] = useState(0);

  const handleClick = async () => {
    if (disabled || loading) return;

    setRingKey((k) => k + 1);
    const nextVal = !checked;

    try {
      const res = onChange(nextVal);
      if (res && typeof (res as any).then === "function") {
        setLoading(true);
        await res;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`bell-toggle-container ${checked ? "active" : ""} ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
    >
      <motion.span
        key={`bell-${ringKey}`}
        className="bell-toggle-icon"
        initial={false}
        animate={
          checked
            ? {
                rotate: [0, -18, 15, -10, 6, 0],
                scale: [1, 1.15, 0.95, 1.05, 1],
              }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : checked ? (
          <Bell className="h-4 w-4 fill-current stroke-[1.8]" />
        ) : (
          <BellOff className="h-4 w-4 stroke-[1.8]" />
        )}
      </motion.span>

      <AnimatePresence mode="wait">
        <motion.span
          key={checked ? "active" : "inactive"}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{ duration: 0.15 }}
          className="truncate"
        >
          {checked ? activeLabel : inactiveLabel}
        </motion.span>
      </AnimatePresence>

      {unreadCount !== undefined && unreadCount > 0 && checked && (
        <span className="bell-toggle-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
      )}
    </button>
  );
}

export default BellToggle;
