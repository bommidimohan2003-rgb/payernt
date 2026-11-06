/**
 * Global Dual-Side Button Fill Animation System
 *
 * Requirements:
 * 1. Mandatory animation duration: 2000ms (2 seconds).
 * 2. Start the left and right fill panels simultaneously.
 * 3. Both panels move inward toward the center (meeting at 50% each = 100% full fill).
 * 4. Smooth cubic-bezier(0.22, 1, 0.36, 1) easing.
 * 5. Processing color: #8FAF7E (Sage Green).
 * 6. Success state: Complete #8FAF7E fill + Checkmark, holds for 2 seconds, then resets.
 * 7. Failure state: Complete #FF7F7F fill + Error icon, holds for 2 seconds, then resets.
 * 8. Applies to EVERY functional button across the entire Payent application.
 */

export const DUAL_FILL_ANIMATION_DURATION_MS = 2000;
export const DUAL_FILL_DISPLAY_HOLD_MS = 2000;
export const DUAL_FILL_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export type DualFillStatus = "idle" | "processing" | "success" | "error";

/**
 * Trigger dual-side fill animation programmatically on any HTML button element.
 */
export function triggerButtonDualFill(
  buttonEl: HTMLElement | null,
  status: DualFillStatus,
  displayDuration = DUAL_FILL_DISPLAY_HOLD_MS,
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
    }, displayDuration);

    return () => clearTimeout(timer);
  }

  if (status === "idle") {
    buttonEl.removeAttribute("data-dual-state");
  }

  return () => {};
}

/**
 * Wrap an async operation with dual-side button fill lifecycle.
 * Ensures the fill completes its 2000ms inward glide before showing final state.
 */
export async function withDualSideFill<T>(
  buttonEl: HTMLElement | null,
  action: () => Promise<T>,
  displayDuration = DUAL_FILL_DISPLAY_HOLD_MS
): Promise<T> {
  if (!buttonEl) {
    return action();
  }

  triggerButtonDualFill(buttonEl, "processing");
  const startTime = Date.now();

  try {
    const result = await action();
    const elapsed = Date.now() - startTime;
    const remainingTo2s = Math.max(0, DUAL_FILL_ANIMATION_DURATION_MS - elapsed);
    if (remainingTo2s > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTo2s));
    }
    triggerButtonDualFill(buttonEl, "success", displayDuration);
    return result;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const remainingTo2s = Math.max(0, DUAL_FILL_ANIMATION_DURATION_MS - elapsed);
    if (remainingTo2s > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTo2s));
    }
    triggerButtonDualFill(buttonEl, "error", displayDuration);
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

    // Fill completes in exactly 2000ms (2 seconds)
    setTimeout(() => {
      window.removeEventListener("error", onError);
      const nextState = isFailed ? "error" : "success";
      button.setAttribute("data-dual-state", nextState);

      // Keep existing 2-second success/failure display and reset behavior unchanged
      setTimeout(() => {
        button.removeAttribute("data-dual-state");
      }, DUAL_FILL_DISPLAY_HOLD_MS);
    }, DUAL_FILL_ANIMATION_DURATION_MS);
  };

  document.addEventListener("click", handleClick, { capture: true, passive: true });

  return () => {
    document.removeEventListener("click", handleClick, { capture: true });
  };
}
