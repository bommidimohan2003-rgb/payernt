import React from "react";

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
    <div className="px-3.5 py-2.5 border-t border-[#E1E4E8] bg-[#F5F6F8] flex flex-wrap gap-1.5 shrink-0">
      {suggestions.map((suggestion, sIdx) => {
        const isConfirm = suggestion.toLowerCase().includes("confirm");
        return (
          <button
            key={sIdx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(suggestion)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-all text-left font-medium shadow-2xs select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isConfirm
                ? "bg-[#16A36A]/10 border-[#16A36A]/30 text-[#16A36A] hover:bg-[#16A36A]/20 font-semibold active:scale-95"
                : "bg-[#FFFFFF] border-[#E1E4E8] hover:border-[#17191C]/40 text-[#252930] hover:text-[#17191C] active:scale-95"
            }`}
          >
            {suggestion}
          </button>
        );
      })}
    </div>
  );
}

export default SuggestedPrompts;
