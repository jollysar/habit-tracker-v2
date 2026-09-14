import { useEffect } from "react";
import { isHapticCue, playHaptic } from "../../infrastructure/native/haptics";

const INTERACTIVE_SELECTOR = "button, a[href], [role='button']";

export function useGlobalHaptics() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest<HTMLElement>(INTERACTIVE_SELECTOR);
      if (!control || control.dataset.haptic === "none") return;
      if (control.closest("[data-suppress-haptic='true']")) return;
      if (
        control.matches(":disabled") ||
        control.getAttribute("aria-disabled") === "true" ||
        control.getAttribute("aria-hidden") === "true"
      ) return;

      const requestedCue = control.dataset.haptic;
      void playHaptic(isHapticCue(requestedCue) ? requestedCue : "selection");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);
}
