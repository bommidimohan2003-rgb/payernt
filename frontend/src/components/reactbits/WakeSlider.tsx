import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import "./WakeSlider.css";

export interface WakeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (val: number) => void;
  onChangeEnd?: (val: number) => void;
  formatValue?: (val: number) => string;
  label?: string;
  barCount?: number;
  className?: string;
  disabled?: boolean;
}

export function WakeSlider({
  min = 0,
  max = 100,
  step = 1,
  value: controlledValue,
  defaultValue,
  onChange,
  onChangeEnd,
  formatValue,
  label,
  barCount = 36,
  className = "",
  disabled = false,
}: WakeSliderProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<number>(
    defaultValue !== undefined ? defaultValue : min
  );
  const currentValue = isControlled ? controlledValue : internalValue;

  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastPosRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Velocity of drag
  const velocity = useMotionValue(0);
  const smoothVelocity = useSpring(velocity, { stiffness: 220, damping: 20 });

  // Normalized progress 0 to 1
  const progress = Math.max(0, Math.min(1, (currentValue - min) / (max - min || 1)));

  const updateFromPosition = useCallback(
    (clientX: number, isFinal = false) => {
      if (!trackRef.current || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rawFrac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

      // Calculate step-aligned value
      const rawVal = min + rawFrac * (max - min);
      const steppedVal = Math.round((rawVal - min) / step) * step + min;
      const clampedVal = Math.max(min, Math.min(max, steppedVal));

      // Calculate velocity
      const now = performance.now();
      const dt = Math.max(1, now - (lastTimeRef.current || now));
      const dx = clientX - (lastPosRef.current || clientX);
      const currentVel = Math.abs(dx / dt) * 10;
      velocity.set(Math.min(currentVel, 5));

      lastPosRef.current = clientX;
      lastTimeRef.current = now;

      if (!isControlled) {
        setInternalValue(clampedVal);
      }
      onChange?.(clampedVal);
      if (isFinal) {
        onChangeEnd?.(clampedVal);
        velocity.set(0);
      }
    },
    [min, max, step, disabled, isControlled, onChange, onChangeEnd, velocity]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    isDraggingRef.current = true;
    lastPosRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || disabled) return;
    updateFromPosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    updateFromPosition(e.clientX, true);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer was lost
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    let nextVal = currentValue;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      nextVal = Math.min(max, currentValue + step);
      velocity.set(1.5);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      nextVal = Math.max(min, currentValue - step);
      velocity.set(1.5);
    } else if (e.key === "Home") {
      nextVal = min;
      velocity.set(2.5);
    } else if (e.key === "End") {
      nextVal = max;
      velocity.set(2.5);
    } else if (e.key === "PageUp") {
      nextVal = Math.min(max, currentValue + step * 5);
      velocity.set(2);
    } else if (e.key === "PageDown") {
      nextVal = Math.max(min, currentValue - step * 5);
      velocity.set(2);
    } else {
      return;
    }
    e.preventDefault();
    if (!isControlled) setInternalValue(nextVal);
    onChange?.(nextVal);
    onChangeEnd?.(nextVal);
    setTimeout(() => velocity.set(0), 150);
  };

  const displayVal = formatValue ? formatValue(currentValue) : currentValue.toLocaleString();

  // Generate bars
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => i / (barCount - 1 || 1));
  }, [barCount]);

  return (
    <div className={`wake-slider-container ${className} ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {(label || formatValue) && (
        <div className="wake-slider-header">
          {label && <span>{label}</span>}
          <span className="wake-slider-value">{displayVal}</span>
        </div>
      )}

      <div
        ref={trackRef}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={label || "Range slider"}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={currentValue}
        aria-valuetext={displayVal}
        className="wake-slider-track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        {bars.map((barPos, idx) => {
          const isActive = barPos <= progress;
          // Distance from active handle
          const dist = Math.abs(barPos - progress);
          // Base curve
          const baseHeight = 12 + Math.sin(barPos * Math.PI) * 10;
          // Wake lift factor depending on proximity and velocity
          const proximityFactor = Math.max(0, 1 - dist * 3.5);

          return (
            <WakeBar
              key={idx}
              baseHeight={baseHeight}
              proximityFactor={proximityFactor}
              smoothVelocity={smoothVelocity}
              isActive={isActive}
            />
          );
        })}

        {/* Current position subtle indicator */}
        <div
          className="wake-slider-indicator"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

interface WakeBarProps {
  baseHeight: number;
  proximityFactor: number;
  smoothVelocity: any;
  isActive: boolean;
}

function WakeBar({ baseHeight, proximityFactor, smoothVelocity, isActive }: WakeBarProps) {
  const height = useTransform(smoothVelocity, (vel: number) => {
    const dynamicLift = proximityFactor * Math.min(Number(vel) * 7, 24);
    return `${Math.min(46, Math.max(8, baseHeight + dynamicLift))}px`;
  });

  return (
    <motion.div
      style={{ height }}
      className={`wake-slider-bar ${isActive ? "active" : ""}`}
    />
  );
}

export default WakeSlider;
