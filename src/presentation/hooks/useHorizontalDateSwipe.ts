import { useRef, type TouchEventHandler } from "react";

type SwipeDirection = "previous" | "next";

interface TouchPoint {
  readonly x: number;
  readonly y: number;
}

const SWIPE_THRESHOLD = 56;
const HORIZONTAL_BIAS = 1.35;
const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, [role='dialog'], [data-page-swipe='ignore']";

export function horizontalSwipeDirection(
  start: TouchPoint,
  end: TouchPoint,
): SwipeDirection | undefined {
  const horizontalDistance = end.x - start.x;
  const verticalDistance = end.y - start.y;
  if (Math.abs(horizontalDistance) < SWIPE_THRESHOLD) return undefined;
  if (Math.abs(horizontalDistance) < Math.abs(verticalDistance) * HORIZONTAL_BIAS) return undefined;
  return horizontalDistance > 0 ? "previous" : "next";
}

export function useHorizontalDateSwipe(onSwipe: (direction: SwipeDirection) => void): {
  readonly onTouchStart: TouchEventHandler<HTMLDivElement>;
  readonly onTouchEnd: TouchEventHandler<HTMLDivElement>;
  readonly onTouchCancel: TouchEventHandler<HTMLDivElement>;
} {
  const touchStart = useRef<TouchPoint | undefined>(undefined);

  const onTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) {
      touchStart.current = undefined;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
  };

  const onTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    const start = touchStart.current;
    touchStart.current = undefined;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const direction = horizontalSwipeDirection(start, { x: touch.clientX, y: touch.clientY });
    if (direction) onSwipe(direction);
  };

  const onTouchCancel: TouchEventHandler<HTMLDivElement> = () => {
    touchStart.current = undefined;
  };

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
