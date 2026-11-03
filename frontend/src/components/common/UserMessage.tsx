import React from "react";
import { motion } from "framer-motion";
import { CheckCheck } from "lucide-react";

export interface UserMessageProps {
  id: string;
  text: string;
  timestamp: Date;
}

export function UserMessage({ text, timestamp }: UserMessageProps) {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex flex-col items-end w-full"
    >
      <div className="flex items-start justify-end max-w-[85%] sm:max-w-[80%]">
        <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13.5px] bg-[#17191C] text-white font-normal break-words leading-relaxed border border-[#252930] shadow-[0_1px_3px_rgba(23,25,28,0.12)]">
          {text}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-[#707780] font-mono mt-1 mr-1 select-none">
        <span>{formattedTime}</span>
        <CheckCheck className="h-3 w-3 text-[#16A36A]" aria-label="Delivered" />
      </div>
    </motion.div>
  );
}

export default UserMessage;
