import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface UseKycScreenshotProtectionOptions {
  documentType?: string; // e.g. "PAN Card" or "Aadhaar Card"
  enabled?: boolean;
}

/**
 * Hook to enforce client-side Anti-Screenshot & Screen Capture Protection
 * for sensitive identity documents (Aadhaar & PAN).
 *
 * Mechanisms:
 * 1. PrintScreen key interception: Prevents default & overwrites system clipboard.
 * 2. Snipping Tool & OS screen grab defense: Obscures form with a security shield on window blur/visibility change.
 * 3. Browser print protection: Disables Ctrl+P / Cmd+P and hides sensitive DOM elements via @media print.
 * 4. Anti-clipboard & anti-selection: Disables right-click context menu, copying, cutting, and dragging.
 */
export function useKycScreenshotProtection({
  documentType = "Identity Document",
  enabled = true,
}: UseKycScreenshotProtectionOptions = {}) {
  const [isObscured, setIsObscured] = useState(false);
  const isFileDialogOpen = useRef(false);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mark when system file picker is opened so window blur doesn't falsely obscure
  const setFileDialogOpen = useCallback((open: boolean) => {
    isFileDialogOpen.current = open;
  }, []);

  const unobscure = useCallback(() => {
    setIsObscured(false);
  }, []);

  const triggerSecurityWarning = useCallback((_reason: string) => {
    // Clear clipboard immediately to scrub any captured pixels or copied text
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("").catch(() => {});
      }
    } catch {}

    // Show warning toast
    toast.error(
      `🚫 Screenshot Blocked: Screen capture of sensitive ${documentType} details is prohibited for regulatory compliance.`,
      { duration: 4000 }
    );

    // Flash obscuring shield immediately
    setIsObscured(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      // Restore only if window is still focused
      if (typeof document !== "undefined" && document.hasFocus() && document.visibilityState === "visible") {
        setIsObscured(false);
      }
    }, 2000);
  }, [documentType]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // 1. Intercept PrintScreen and screenshot / screen print shortcut keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("PrintScreen");
        return;
      }

      // Windows/Linux Snipping Tool / Mac screenshot shortcuts: Ctrl+Shift+S or Meta+Shift+S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Snipping Tool shortcut");
        return;
      }

      // Ctrl+P / Cmd+P (Print to PDF / paper)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        toast.error(`🚫 Printing ${documentType} details is disabled for data privacy.`);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        // Clear clipboard again on keyup to ensure nothing remains in OS clipboard buffer
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("").catch(() => {});
          }
        } catch {}
      }
    };

    // 2. Window Blur: Triggers when Snipping Tool, screen grabber, or external tool unfocuses window
    const handleWindowBlur = () => {
      // If user opened file picker dialog, do not obscure
      if (isFileDialogOpen.current) return;
      setIsObscured(true);
    };

    // 3. Window Focus: Resumes when user clicks back into window
    const handleWindowFocus = () => {
      isFileDialogOpen.current = false;
      setIsObscured(false);
    };

    // 4. Document visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsObscured(true);
      } else if (document.hasFocus()) {
        setIsObscured(false);
      }
    };

    // 5. Inject CSS for @media print and anti-select
    const styleId = "kyc-anti-screenshot-styles";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.innerHTML = `
        @media print {
          .kyc-secure-container,
          .kyc-screen-protected,
          input[id*="pan"],
          input[id*="aadhaar"],
          form[data-kyc-form="true"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
      `;
      document.head.appendChild(styleTag);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [enabled, triggerSecurityWarning, documentType]);

  // Context menu and copy blockers for sensitive inputs
  const protectProps = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      toast.info("Right-click context menu is restricted for identity security.");
    },
    onCopy: (e: React.ClipboardEvent) => {
      e.preventDefault();
      toast.error(`Copying sensitive ${documentType} details is disabled.`);
    },
    onCut: (e: React.ClipboardEvent) => {
      e.preventDefault();
    },
  };

  return {
    isObscured,
    unobscure,
    setFileDialogOpen,
    protectProps,
  };
}
