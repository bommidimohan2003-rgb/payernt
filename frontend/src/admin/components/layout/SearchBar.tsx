import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { CommandSearchModal } from "./CommandSearchModal";

export const ADMIN_SEARCH_PHRASES = [
  "Search users and KYC",
  "Search rentals and bookings",
  "Search products and categories",
  "Search payments and payouts",
  "Search support tickets and logs",
] as const;

export function useTypewriterText(phrases: readonly string[], paused = false): {
  text: string;
  reducedMotion: boolean;
} {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayText(phrases[0] || "Search workspace");
      return;
    }

    if (paused) return;

    const currentPhrase = phrases[phraseIndex % phrases.length] || "Search workspace";
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        }, 55);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 1700);
      }
    } else if (displayText.length > 0) {
      timer = setTimeout(() => {
        setDisplayText(displayText.slice(0, -1));
      }, 28);
    } else {
      timer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 320);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, paused, phraseIndex, phrases, shouldReduceMotion]);

  return { text: displayText, reducedMotion: shouldReduceMotion };
}

export function SearchBar({ className = "" }: { className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { text: displayText, reducedMotion } = useTypewriterText(
    ADMIN_SEARCH_PHRASES,
    modalOpen
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput =
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModalOpen((prev) => !prev);
      } else if (e.key === "/" && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`flex items-center w-full h-9 px-3 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)]/80 border border-[var(--admin-border)] hover:border-[var(--admin-text)]/25 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] text-xs font-medium transition-colors cursor-pointer ${className}`}
        aria-label="Search admin workspace"
      >
        <Search
          className="h-3.5 w-3.5 mr-2 text-[var(--admin-text-muted)] shrink-0"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="flex items-center min-w-0 flex-1 text-left">
          <span className="truncate">{displayText || "\u00A0"}</span>
          <motion.span
            aria-hidden="true"
            animate={reducedMotion ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
            transition={
              reducedMotion
                ? undefined
                : { duration: 0.9, repeat: Infinity, times: [0, 0.49, 0.5, 1] }
            }
            className="inline-block w-0.5 h-3.5 bg-[var(--admin-text)] ml-0.5 shrink-0"
          />
        </span>
      </button>

      <CommandSearchModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
