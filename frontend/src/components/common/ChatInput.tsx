import React, { useRef, useEffect } from "react";
import { Send } from "lucide-react";

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
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [autoFocus, disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-[#E1E4E8] bg-[#FFFFFF] flex gap-2 items-center shrink-0"
    >
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask in English or Telugu (T-English)..."
        disabled={disabled}
        maxLength={2000}
        className="flex-1 h-10 px-4 rounded-full border border-[#E1E4E8] bg-[#F5F6F8] text-sm text-[#252930] placeholder:text-[#707780] focus:outline-none focus:border-[#17191C] focus:bg-[#FFFFFF] transition-all"
      />
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="shrink-0 h-10 w-10 rounded-full bg-[#17191C] text-white flex items-center justify-center hover:bg-[#252930] active:scale-95 disabled:opacity-30 disabled:hover:bg-[#17191C] disabled:active:scale-100 transition-all cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#16A36A] focus:ring-offset-1"
        aria-label="Send message"
      >
        <Send className="h-4 w-4 text-white ml-0.5" />
      </button>
    </form>
  );
}

export default ChatInput;
