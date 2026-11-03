import React from "react";
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
    <div className="flex flex-col items-end">
      <div className="flex items-start justify-end max-w-[85%]">
        <div className="rounded-2xl rounded-tr-xs px-4 py-2.5 text-sm bg-[#17191C] text-white shadow-2xs font-normal break-words leading-relaxed">
          {text}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-[#707780] mt-1 mr-1 select-none">
        <span>{formattedTime}</span>
        <CheckCheck className="h-3 w-3 text-[#16A36A]" aria-label="Delivered" />
      </div>
    </div>
  );
}

export default UserMessage;
