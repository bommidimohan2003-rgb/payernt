/**
 * Global Dual-Side Button Fill Animation System - DEPRECATED / RETIRED
 *
 * All dual-side button fill animations have been globally removed across
 * the application per user specification.
 *
 * Exported signatures are preserved as safe no-ops to ensure 100% backwards
 * compatibility with any legacy imports.
 */

export const DUAL_FILL_ANIMATION_DURATION_MS = 0;
export const DUAL_FILL_DISPLAY_HOLD_MS = 0;
export const DUAL_FILL_EASING = "ease";

export type DualFillStatus = "idle" | "processing" | "success" | "error";

/**
 * No-op implementation of triggerButtonDualFill.
 */
export function triggerButtonDualFill(
  _buttonEl: HTMLElement | null,
  _status: DualFillStatus,
  _displayDuration = 0,
  onComplete?: () => void
): () => void {
  onComplete?.();
  return () => {};
}

/**
 * Safe passthrough for async actions without delay or fill animations.
 */
export async function withDualSideFill<T>(
  _buttonEl: HTMLElement | null,
  action: () => Promise<T>,
  _displayDuration = 0
): Promise<T> {
  return action();
}

/**
 * No-op global listener.
 */
export function setupGlobalDualSideFillListener(): () => void {
  return () => {};
}
