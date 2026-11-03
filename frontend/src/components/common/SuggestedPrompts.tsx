import React from "react";
import { ArrowUpRight } from "lucide-react";

export interface SuggestedPromptsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({
  suggestions,
  onSelect,
  disabled = false,
}: SuggestedPromptsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="px-3.5 py-2 bg-gradient-to-t from-white via-white to-[#F5F6F8]/50 border-t border-[#E1E4E8]/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
      {suggestions.map((suggestion, sIdx) => {
        const isConfirm =
          suggestion.toLowerCase().includes("confirm") ||
          suggestion.toLowerCase().includes("yes") ||
          suggestion.toLowerCase().includes("proceed");

        return (
          <button
            key={sIdx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(suggestion)}
            className={`group inline-flex items-center gap-1 text-[11.5px] px-3 py-1.5 rounded-lg border transition-all text-left font-medium select-none cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              isConfirm
                ? "bg-[#16A36A]/10 border-[#16A36A]/35 text-[#16A36A] hover:bg-[#16A36A]/20 active:scale-[0.97] font-semibold"
                : "bg-white border-[#E1E4E8] text-[#252930] hover:text-[#17191C] hover:border-[#17191C]/40 hover:bg-[#F5F6F8] active:scale-[0.97] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            }`}
          >
            <span>{suggestion}</span>
            <ArrowUpRight
              className={`h-2.5 w-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all ${
                isConfirm ? "text-[#16A36A]" : "text-[#17191C]"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default SuggestedPrompts;
