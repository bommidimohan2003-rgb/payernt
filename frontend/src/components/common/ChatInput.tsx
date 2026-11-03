import React, { useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  disabled = false,
  autoFocus = false,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = Boolean(input.trim()) && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 sm:p-3.5 bg-white border-t border-[#E1E4E8] shrink-0"
    >
      <div className="relative flex items-center rounded-xl bg-[#F5F6F8] border border-[#E1E4E8] focus-within:border-[#17191C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#17191C]/8 transition-all p-1">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask in English or Telugu (T-English)..."
          disabled={disabled}
          maxLength={2000}
          className="flex-1 bg-transparent px-3 py-1 text-[13.5px] text-[#252930] placeholder:text-[#707780] focus:outline-none transition-colors"
          aria-label="Ask Payent Agent"
        />

        <button
          type="submit"
          disabled={!canSend}
          className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
            canSend
              ? "bg-[#17191C] text-white hover:bg-[#252930] active:scale-95 cursor-pointer shadow-2xs"
              : "bg-[#17191C]/25 text-white/60 cursor-not-allowed"
          }`}
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
