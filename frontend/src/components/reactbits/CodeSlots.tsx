import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./CodeSlots.css";

export interface CodeSlotsProps {
  length?: number;
  value?: string;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean | string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export interface CodeSlotsRef {
  focus: () => void;
  clear: () => void;
}

export const CodeSlots = forwardRef<CodeSlotsRef, CodeSlotsProps>(function CodeSlots(
  {
    length = 6,
    value: controlledValue,
    onChange,
    onComplete,
    error,
    disabled = false,
    autoFocus = false,
    className = "",
  },
  ref
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState("");
  const currentValue = (isControlled ? controlledValue : internalValue).slice(0, length);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      if (!isControlled) setInternalValue("");
      onChange?.("");
    },
  }));

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, length);
    if (!isControlled) {
      setInternalValue(raw);
    }
    onChange?.(raw);
    if (raw.length === length) {
      onComplete?.(raw);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && currentValue.length > 0) {
      // Natural backspace handled by hidden input
    }
  };

  // Determine active slot index
  const activeIndex = Math.min(currentValue.length, length - 1);
  const isComplete = currentValue.length === length;

  return (
    <div className={`code-slots-wrapper ${className}`}>
      <motion.div
        animate={error ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="code-slots-container"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Hidden full-span input for native mobile OTP/autofill & keyboard */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          value={currentValue}
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="code-slots-hidden-input"
          aria-label={`${length}-digit verification code`}
        />

        {Array.from({ length }).map((_, idx) => {
          const char = currentValue[idx] || "";
          const isSlotActive = isFocused && idx === activeIndex && !isComplete;
          const isFilled = Boolean(char);

          return (
            <div
              key={idx}
              className={`code-slot ${isSlotActive ? "focused" : ""} ${
                isFilled ? "filled" : ""
              } ${error ? "error" : ""} ${isComplete && !error ? "success" : ""}`}
            >
              <AnimatePresence mode="popLayout">
                {char ? (
                  <motion.span
                    key={`digit-${idx}-${char}`}
                    initial={{ scale: 0.3, opacity: 0, y: 6 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.3, opacity: 0, y: -6 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  >
                    {char}
                  </motion.span>
                ) : isSlotActive ? (
                  <span className="code-slot-caret" />
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>

      {typeof error === "string" && error.length > 0 && (
        <p className="code-slots-error-text">{error}</p>
      )}
    </div>
  );
});

export default CodeSlots;
