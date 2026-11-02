import React, { useState, useEffect, useRef } from "react";
import { ShieldAlert, EyeOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Global Anti-Screenshot & Screen Capture Protection Shield
 * 
 * When someone tries to take a screenshot via:
 * - PrintScreen key
 * - Windows Snipping Tool (Win + Shift + S or PrtScn)
 * - Mac Screenshot shortcuts (Cmd + Shift + 3 / 4 / 5)
 * - Browser Print (Ctrl + P / Cmd + P)
 * - Screen capture utility stealing window focus
 * 
 * It immediately blanks the screen with a full-screen blackout shield:
 * "Screenshots are not allowed in this app"
 * and overwrites the system clipboard.
 */
export function GlobalAntiScreenshotShield() {
  const [isBlocked, setIsBlocked] = useState(false);
  const isFileDialogActive = useRef(false);
  const fileDialogTimeout = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<number>(0);

  const showSecurityNotice = () => {
    // Overwrite system clipboard immediately to scrub any captured pixels or data
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Screenshots are not allowed in this app.").catch(() => {});
      }
    } catch {}

    // Throttle toast notifications
    const now = Date.now();
    if (now - toastTimeoutRef.current > 2000) {
      toastTimeoutRef.current = now;
      toast.error("🚫 Screenshots are not allowed in this app", {
        description: "Screen capture and Snipping Tool are disabled to protect user privacy and sensitive data.",
        duration: 4000,
      });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Intercept file input clicks so native OS file picker does not falsely trigger blackout
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
        if (fileDialogTimeout.current) clearTimeout(fileDialogTimeout.current);
        fileDialogTimeout.current = setTimeout(() => {
          isFileDialogActive.current = false;
        }, 60000);
      }
    };

    // 2. Trapping PrintScreen and Screenshot shortcut keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlocked(true);
        showSecurityNotice();
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
        setIsBlocked(true);
        showSecurityNotice();
        return;
      }

      // Browser print command: Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlocked(true);
        showSecurityNotice();
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
    // The blackout shield instantly mounts so the screen capture captures ONLY the security message!
    const handleWindowBlur = () => {
      if (isFileDialogActive.current) return;
      setIsBlocked(true);
      showSecurityNotice();
    };

    // 5. Window Focus: Resumes when user clicks back into the window
    const handleWindowFocus = () => {
      isFileDialogActive.current = false;
      setIsBlocked(false);
    };

    // 6. Visibility Change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsBlocked(true);
      } else if (document.hasFocus()) {
        setIsBlocked(false);
      }
    };

    // 7. Inject print-blocking CSS
    const styleId = "global-anti-screenshot-styles";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.innerHTML = `
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

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (fileDialogTimeout.current) clearTimeout(fileDialogTimeout.current);
    };
  }, []);

  if (!isBlocked) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-label="Screenshots are not allowed in this app"
      onClick={() => setIsBlocked(false)}
      className="fixed inset-0 z-[9999999] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer animate-in fade-in duration-100"
    >
      <div className="h-20 w-20 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/30 flex items-center justify-center mb-6 shadow-2xl animate-pulse">
        <ShieldAlert className="h-10 w-10 stroke-[2.5]" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
        Screenshots are not allowed in this app
      </h1>

      <p className="text-sm text-neutral-400 max-w-md mt-3 leading-relaxed">
        Screen capture, Snipping Tool, and recording are strictly prohibited to protect customer identity documents and platform security.
      </p>

      <div className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer shadow-lg active:scale-95">
        <EyeOff className="h-4 w-4" />
        <span>Click anywhere to resume</span>
      </div>
    </div>
  );
}

export default GlobalAntiScreenshotShield;
