import { isTauri } from "@tauri-apps/api/core";
import {
  impactFeedback,
  notificationFeedback,
  selectionFeedback,
} from "@tauri-apps/plugin-haptics";

export type HapticCue =
  | "selection"
  | "soft"
  | "complete"
  | "success"
  | "warning"
  | "longPress";

export function isHapticCue(value: string | undefined): value is HapticCue {
  return value === "selection" || value === "soft" || value === "complete" ||
    value === "success" || value === "warning" || value === "longPress";
}

/**
 * Fire-and-forget by design: tactile feedback must never delay or block the
 * interaction it accompanies. The browser preview remains silent.
 */
export async function playHaptic(cue: HapticCue): Promise<void> {
  const mobileUserAgent = typeof navigator !== "undefined" &&
    /Android|iPad|iPhone|iPod/i.test(navigator.userAgent);
  if (!isTauri() || !mobileUserAgent) return;

  try {
    if (cue === "selection") {
      await selectionFeedback();
      return;
    }
    if (cue === "soft") {
      await impactFeedback("soft");
      return;
    }
    if (cue === "complete") {
      await impactFeedback("medium");
      return;
    }
    if (cue === "longPress") {
      await impactFeedback("heavy");
      return;
    }
    await notificationFeedback(cue);
  } catch {
    // Haptics are an enhancement. Unsupported hardware must remain silent.
  }
}
