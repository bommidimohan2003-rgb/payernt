import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface UseKycScreenshotProtectionOptions {
  documentType?: string; // e.g. "PAN Card" or "Aadhaar Card"
  enabled?: boolean;
}

/**
 * Hook to enforce page-specific Anti-Screenshot & Screen Capture Protection
 * strictly scoped to Aadhaar and PAN KYC pages.
 *
 * Protection Mechanisms:
 * 1. Synchronous Viewport Blanking: Adds a synchronous class to <html> on keydown/blur
 *    so the browser repaints the blackout shield immediately without waiting for React re-render.
 * 2. Instant Clipboard Sanitization: Overwrites OS clipboard with security warning text.
 * 3. Snipping Tool & Screen Grab Defense: Triggers immediately on blur/visibilitychange without
 *    any auto-unobscure timers that could reveal sensitive data during delayed capture.
 * 4. Print Protection: Blocks Ctrl+P / Cmd+P and uses @media print CSS to hide content.
 * 5. Lifecycle Scope: All listeners, DOM classes, and styles are completely cleaned up
 *    on unmount when navigating away, restoring normal screenshot capability for all other pages.
 */
export function useKycScreenshotProtection({
  documentType = "Identity Document",
  enabled = true,
}: UseKycScreenshotProtectionOptions = {}) {
  const [isObscured, setIsObscured] = useState(false);
  const isFileDialogActive = useRef(false);
  const fileDialogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastThrottleRef = useRef<number>(0);

  // Mark when system file picker is opened so native OS file picker does not falsely trigger shield
  const setFileDialogOpen = useCallback((open: boolean) => {
    isFileDialogActive.current = open;
    if (open) {
      if (fileDialogTimeoutRef.current) clearTimeout(fileDialogTimeoutRef.current);
      fileDialogTimeoutRef.current = setTimeout(() => {
        isFileDialogActive.current = false;
      }, 60000);
    }
  }, []);

  const unobscure = useCallback(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("kyc-screenshot-blocked");
    }
    setIsObscured(false);
  }, []);

  const blockAndNotify = useCallback((_reason?: string) => {
    // 1. Immediately apply synchronous CSS blackout
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("kyc-screenshot-blocked");
    }
    setIsObscured(true);

    // 2. Overwrite system clipboard immediately to scrub any captured pixels or data
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Screenshots are not allowed in this app.").catch(() => {});
      }
    } catch {}

    // 3. Display warning notification (throttled to avoid toast flood)
    const now = Date.now();
    if (now - toastThrottleRef.current > 2000) {
      toastThrottleRef.current = now;
      toast.error("🚫 Screenshots are not allowed in this app", {
        description: `Screen capture and Snipping Tool are disabled to protect your ${documentType}.`,
        duration: 4000,
      });
    }
  }, [documentType]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // 1. Track file input clicks so native OS file dialog does not trigger blackout
    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        (target?.tagName === "INPUT" && (target as HTMLInputElement).type === "file") ||
        target?.closest('input[type="file"]') ||
        target?.closest("label[for]") ||
        target?.closest('[data-file-upload="true"]') ||
        target?.closest('button[data-upload="true"]')
      ) {
        isFileDialogActive.current = true;
        if (fileDialogTimeoutRef.current) clearTimeout(fileDialogTimeoutRef.current);
        fileDialogTimeoutRef.current = setTimeout(() => {
          isFileDialogActive.current = false;
        }, 60000);
      }
    };

    // 2. Intercept PrintScreen and screenshot shortcut keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        blockAndNotify("PrintScreen key");
        return;
      }

      // Windows/Linux Snipping Tool & Mac screenshot shortcuts:
      // Win+Shift+S, Ctrl+Shift+S, Meta+Shift+S, Meta+Shift+3, Meta+Shift+4, Meta+Shift+5
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "S" || e.key === "s" || e.key === "3" || e.key === "4" || e.key === "5")) ||
        (e.altKey && (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44))
      ) {
        e.preventDefault();
        e.stopPropagation();
        blockAndNotify("Snipping Tool shortcut");
        return;
      }

      // Browser print command: Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        blockAndNotify("Browser print");
        return;
      }
    };

    // 3. Clear OS clipboard buffer on keyup of PrintScreen
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("Screenshots are not allowed in this app.").catch(() => {});
          }
        } catch {}
      }
    };

    // 4. Window Blur Defense:
    // When Snipping Tool, Win+Shift+S, or screen capture software launches, Windows unfocuses the browser window.
    // Obscures instantly and leaves shield up until user focuses and clicks back into the window.
    const handleWindowBlur = () => {
      if (isFileDialogActive.current) return;
      blockAndNotify("Window blur");
    };

    // 5. Window Focus: Resumes when user returns and window regains full active focus
    const handleWindowFocus = () => {
      isFileDialogActive.current = false;
      if (document.hasFocus() && document.visibilityState === "visible") {
        document.documentElement.classList.remove("kyc-screenshot-blocked");
        setIsObscured(false);
      }
    };

    // 6. Visibility Change: Obscure if user minimizes or switches tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        blockAndNotify("Visibility hidden");
      } else if (document.hasFocus()) {
        document.documentElement.classList.remove("kyc-screenshot-blocked");
        setIsObscured(false);
      }
    };

    // 7. Inject synchronous CSS for instant full-viewport blanking & @media print
    const styleId = "kyc-screenshot-protection-styles";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.innerHTML = `
        html.kyc-screenshot-blocked #kyc-screen-capture-shield {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }
        @media print {
          html, body {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
      `;
      document.head.appendChild(styleTag);
    }

    // Attach capture-phase event listeners
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // CLEANUP ON UNMOUNT (Navigating away from KYC page):
    // Completely unregisters listeners and removes styles, restoring normal screenshot capability on other pages.
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (fileDialogTimeoutRef.current) {
        clearTimeout(fileDialogTimeoutRef.current);
      }

      document.documentElement.classList.remove("kyc-screenshot-blocked");
      const existingStyle = document.getElementById(styleId);
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
  }, [enabled, blockAndNotify]);

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

export default useKycScreenshotProtection;
