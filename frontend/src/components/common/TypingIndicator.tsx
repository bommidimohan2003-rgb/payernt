import React from "react";
import { motion } from "framer-motion";
import { PayentAgentIcon } from "./PayentAgentIcon";

export interface TypingIndicatorProps {
  className?: string;
}

/**
 * paYent AI Agent — Premium Assistant Typing Indicator Bubble
 *
 * Left-aligned assistant message bubble matching the AgentMessage surface:
 * - Background: Light grey (#F5F6F8)
 * - Border: Subtle border (#E1E4E8)
 * - Corner geometry: rounded-2xl rounded-tl-xs
 * - Avatar: Custom paYent AI Agent Neural Nexus Symbol (PayentAgentIcon size 26)
 * - Three smoothly animated dots in brand green (#16A36A)
 */
export function TypingIndicator({ className = "" }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`flex flex-col items-start w-full ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Payent Agent is typing"
    >
      <div className="flex items-center gap-2.5">
        {/* Assistant Avatar */}
        <div className="shrink-0 text-neutral-800 dark:text-neutral-200">
          <PayentAgentIcon size={26} />
        </div>

        {/* Message Bubble with 3 Sequential Animated Dots */}
        <div className="rounded-2xl rounded-tl-xs px-4 py-2.5 bg-[#F5F6F8] border border-[#E1E4E8] shadow-[0_1px_2px_rgba(23,25,28,0.02)] flex items-center gap-1.5 h-9 select-none">
          <motion.span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#16A36A]"
            animate={{
              y: [0, -3, 0],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0,
            }}
          />
          <motion.span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#16A36A]"
            animate={{
              y: [0, -3, 0],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <motion.span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#16A36A]"
            animate={{
              y: [0, -3, 0],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default TypingIndicator;
