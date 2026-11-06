/**
 * Global Dual-Side Button Fill Animation System
 *
 * Requirements:
 * 1. Animation starts simultaneously from LEFT and RIGHT edges moving towards the center.
 * 2. Processing color: #8FAF7E (Sage Green).
 * 3. Success state: Complete #8FAF7E fill + Checkmark, holds for 2 seconds, then resets.
 * 4. Failure state: Complete #FF7F7F fill + Error icon, holds for 2 seconds, then resets.
 * 5. Applies to EVERY functional button across the entire Payent application.
 */

export type DualFillStatus = "idle" | "processing" | "success" | "error";

/**
 * Trigger dual-side fill animation programmatically on any HTML button element.
 */
export function triggerButtonDualFill(
  buttonEl: HTMLElement | null,
  status: DualFillStatus,
  duration = 2000,
  onComplete?: () => void
): () => void {
  if (!buttonEl) return () => {};

  buttonEl.classList.add("dual-side-fill-btn");
  buttonEl.setAttribute("data-dual-state", status);

  if (status === "processing") {
    buttonEl.setAttribute("aria-busy", "true");
  } else {
    buttonEl.removeAttribute("aria-busy");
  }

  if (status === "success" || status === "error") {
    const timer = setTimeout(() => {
      buttonEl.removeAttribute("data-dual-state");
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }

  if (status === "idle") {
    buttonEl.removeAttribute("data-dual-state");
  }

  return () => {};
}

/**
 * Wrap an async operation with dual-side button fill lifecycle.
 */
export async function withDualSideFill<T>(
  buttonEl: HTMLElement | null,
  action: () => Promise<T>,
  duration = 2000
): Promise<T> {
  if (!buttonEl) {
    return action();
  }

  triggerButtonDualFill(buttonEl, "processing");

  try {
    const result = await action();
    triggerButtonDualFill(buttonEl, "success", duration);
    return result;
  } catch (error) {
    triggerButtonDualFill(buttonEl, "error", duration);
    throw error;
  }
}

/**
 * Global event listener to attach dual-side fill animation to any functional button
 * across the entire application that isn't already managed by a React Button component.
 */
export function setupGlobalDualSideFillListener(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const button = target.closest("button");
    if (!button) return;

    // Exceptions specified by the user:
    // - Non-interactive decorative elements
    // - Radio buttons, checkboxes, toggle switches
    // - Explicitly opted-out elements
    if (
      button.getAttribute("data-no-dual-fill") === "true" ||
      button.getAttribute("role") === "switch" ||
      button.getAttribute("role") === "checkbox" ||
      button.getAttribute("role") === "radio" ||
      button.classList.contains("no-dual-fill") ||
      button.disabled
    ) {
      return;
    }

    // If managed by the React Button component, let React manage the lifecycle
    if (button.hasAttribute("data-react-managed-button")) {
      return;
    }

    // Apply the dual-side fill classes and attributes
    if (!button.classList.contains("dual-side-fill-btn")) {
      button.classList.add("dual-side-fill-btn");
    }

    // If already processing or in success/error, prevent duplicate clicks
    if (button.getAttribute("data-dual-state") === "processing") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Start processing state: simultaneous fill from left and right edges towards center
    button.setAttribute("data-dual-state", "processing");

    let isFailed = false;
    const onError = () => {
      isFailed = true;
    };
    window.addEventListener("error", onError, { once: true });

    // Transition smoothly to success or error state
    setTimeout(() => {
      window.removeEventListener("error", onError);
      const nextState = isFailed ? "error" : "success";
      button.setAttribute("data-dual-state", nextState);

      // Hold for 2 seconds (2000ms), then return to original appearance
      setTimeout(() => {
        button.removeAttribute("data-dual-state");
      }, 2000);
    }, 450);
  };

  document.addEventListener("click", handleClick, { capture: true, passive: true });

  return () => {
    document.removeEventListener("click", handleClick, { capture: true });
  };
}
