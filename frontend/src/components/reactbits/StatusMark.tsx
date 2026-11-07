import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./StatusMark.css";

export type StatusMarkType = "pending" | "processing" | "success" | "error";

export interface StatusMarkProps {
  status: StatusMarkType;
  progress?: number; // 0 - 100 optional real progress
  size?: number; // In pixels, default 20
  className?: string;
}

export function StatusMark({
  status,
  progress,
  size = 20,
  className = "",
}: StatusMarkProps) {
  const strokeWidth = 2.2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Real progress arc offset if progress is passed
  const strokeDashoffset =
    progress !== undefined
      ? circumference - (Math.max(0, Math.min(100, progress)) / 100) * circumference
      : undefined;

  return (
    <div
      className={`status-mark-container ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={`Status: ${status}${progress !== undefined ? ` (${progress}%)` : ""}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="status-mark-svg"
      >
        <AnimatePresence mode="wait">
          {status === "pending" && (
            <motion.circle
              key="pending-circle"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className="status-mark-ring-pending"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            />
          )}

          {status === "processing" && (
            <g key="processing-group">
              {/* Background faint track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                stroke="currentColor"
                opacity={0.15}
              />
              {/* Animated or progress arc */}
              {progress !== undefined ? (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={strokeWidth}
                  stroke="#3B82F6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: "stroke-dashoffset 0.3s ease" }}
                />
              ) : (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={strokeWidth}
                  className="status-mark-arc-processing"
                  strokeLinecap="round"
                />
              )}
            </g>
          )}

          {status === "success" && (
            <motion.g
              key="success-group"
              className="status-mark-success"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="currentColor"
                opacity={0.16}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
              />
              <motion.path
                d={`M ${size * 0.3} ${size * 0.52} L ${size * 0.44} ${size * 0.68} L ${size * 0.72} ${size * 0.36}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </motion.g>
          )}

          {status === "error" && (
            <motion.g
              key="error-group"
              className="status-mark-error"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="currentColor"
                opacity={0.16}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
              />
              <motion.path
                d={`M ${size * 0.34} ${size * 0.34} L ${size * 0.66} ${size * 0.66} M ${size * 0.66} ${size * 0.34} L ${size * 0.34} ${size * 0.66}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

/**
 * Universal helper to map existing Payent order/booking/KYC status to StatusMarkType
 */
export function mapOrderStatusToStatusMark(
  status: string = "",
  isCancelled: boolean = false
): StatusMarkType {
  const norm = (status || "").toLowerCase().trim();
  if (
    isCancelled ||
    norm === "cancelled" ||
    norm === "canceled" ||
    norm === "rejected" ||
    norm === "declined" ||
    norm === "failed" ||
    norm === "expired"
  ) {
    return "error";
  }

  if (
    norm === "accepted" ||
    norm === "confirmed" ||
    norm === "completed" ||
    norm === "rental_completed" ||
    norm === "returned" ||
    norm === "approved" ||
    norm === "verified"
  ) {
    return "success";
  }

  if (
    norm === "ready_for_pickup" ||
    norm === "ready" ||
    norm === "picked_up" ||
    norm === "rental_in_progress" ||
    norm === "active" ||
    norm === "in_transit" ||
    norm === "delivering" ||
    norm === "working"
  ) {
    return "processing";
  }

  return "pending";
}

export default StatusMark;
