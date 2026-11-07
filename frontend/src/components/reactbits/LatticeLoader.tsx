import React, { useState, useEffect, useRef } from "react";
import { Check, AlertCircle } from "lucide-react";
import "./LatticeLoader.css";

export type LatticeStatus = "idle" | "working" | "done" | "error";

export interface LatticeLoaderProps {
  status?: LatticeStatus;
  label?: string;
  gridSize?: 3 | 4;
  showTimer?: boolean;
  shape?: "round" | "square";
  pattern?: "ripple" | "snake" | "orbit" | "pulse";
  className?: string;
  embedded?: boolean;
}

export function LatticeLoader({
  status = "working",
  label = "Processing...",
  gridSize = 3,
  showTimer = true,
  shape = "round",
  pattern = "ripple",
  className = "",
  embedded = false,
}: LatticeLoaderProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  const totalCells = gridSize * gridSize;

  // Stopwatch timer when status is working
  useEffect(() => {
    if (status === "working") {
      startTimeRef.current = performance.now();
      setElapsed(0);
      const timerInterval = setInterval(() => {
        setElapsed((performance.now() - startTimeRef.current) / 1000);
      }, 100);
      return () => clearInterval(timerInterval);
    }
  }, [status]);

  // Phase wave animation step
  useEffect(() => {
    if (status !== "working") return;

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % (totalCells * 2));
    }, 90);

    return () => clearInterval(stepInterval);
  }, [status, totalCells]);

  // Determine cell active state based on pattern
  const isCellHighlighted = (row: number, col: number) => {
    if (status === "done" || status === "error") return true;
    if (status === "idle") return false;

    if (pattern === "ripple") {
      const center = (gridSize - 1) / 2;
      const dist = Math.round(Math.sqrt((row - center) ** 2 + (col - center) ** 2));
      const wave = (activeStep % 5);
      return dist === wave || dist === wave - 1;
    } else if (pattern === "snake") {
      const index = row % 2 === 0 ? row * gridSize + col : row * gridSize + (gridSize - 1 - col);
      const cursor = activeStep % totalCells;
      return index === cursor || index === (cursor - 1 + totalCells) % totalCells;
    } else {
      // Pulse / orbit default
      const index = row * gridSize + col;
      return (index + activeStep) % 4 === 0;
    }
  };

  const formattedTimer = `${elapsed.toFixed(1)}s`;

  return (
    <div
      className={`lattice-loader-container ${embedded ? "lattice-loader-embedded" : ""} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${label} - ${status}`}
    >
      <div className={`lattice-grid lattice-grid-${gridSize}`}>
        {Array.from({ length: totalCells }).map((_, idx) => {
          const row = Math.floor(idx / gridSize);
          const col = idx % gridSize;
          const isHighlighted = isCellHighlighted(row, col);

          let stateClass = "";
          if (isHighlighted) {
            if (status === "working") stateClass = "active-working";
            else if (status === "done") stateClass = "active-done";
            else if (status === "error") stateClass = "active-error";
          }

          return (
            <div
              key={idx}
              className={`lattice-cell ${shape} ${stateClass}`}
            />
          );
        })}
      </div>

      <span className="lattice-label">
        {status === "done" && <Check className="h-3.5 w-3.5 text-[#8FAF7E] inline shrink-0" />}
        {status === "error" && <AlertCircle className="h-3.5 w-3.5 text-[#FF7F7F] inline shrink-0" />}
        {label}
      </span>

      {showTimer && status === "working" && (
        <span className="lattice-timer">{formattedTimer}</span>
      )}
    </div>
  );
}

export default LatticeLoader;
