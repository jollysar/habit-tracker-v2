import type { KeyboardEvent } from "react";

export function handleRovingTabKey<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  options: readonly T[],
  active: T,
  onSelect: (value: T) => void,
): void {
  const currentIndex = options.indexOf(active);
  let nextIndex: number | undefined;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (currentIndex + 1) % options.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + options.length) % options.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = options.length - 1;
  }

  if (nextIndex === undefined) return;
  event.preventDefault();
  onSelect(options[nextIndex]);
  const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
    "[role='tab']",
  );
  tabs?.[nextIndex]?.focus();
}
