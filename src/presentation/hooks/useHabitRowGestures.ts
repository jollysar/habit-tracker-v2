import { useEffect, useRef, useState, type MouseEvent, type TouchEventHandler } from "react";

interface TouchPoint {
  readonly x: number;
  readonly y: number;
}

export type HabitRowSwipeAction = "reveal-delete" | "close-delete";

const SWIPE_THRESHOLD = 56;
const HORIZONTAL_BIAS = 1.25;
const LONG_PRESS_DELAY = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const GESTURE_IGNORE_SELECTOR = "input, select, textarea, [role='menu'], [data-habit-gesture='ignore']";

export function habitRowSwipeAction(
  start: TouchPoint,
  end: TouchPoint,
): HabitRowSwipeAction | undefined {
  const horizontalDistance = end.x - start.x;
  const verticalDistance = end.y - start.y;
  if (Math.abs(horizontalDistance) < SWIPE_THRESHOLD) return undefined;
  if (Math.abs(horizontalDistance) < Math.abs(verticalDistance) * HORIZONTAL_BIAS) return undefined;
  return horizontalDistance < 0 ? "reveal-delete" : "close-delete";
}

interface HabitRowGestureOptions {
  readonly onLongPress: () => void;
}

export function useHabitRowGestures({ onLongPress }: HabitRowGestureOptions) {
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const startPoint = useRef<TouchPoint | undefined>(undefined);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressTriggered = useRef(false);
  const suppressNextClick = useRef(false);
  const suppressionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = undefined;
  };

  const brieflySuppressClick = () => {
    suppressNextClick.current = true;
    if (suppressionTimer.current) clearTimeout(suppressionTimer.current);
    suppressionTimer.current = setTimeout(() => {
      suppressNextClick.current = false;
    }, 450);
  };

  useEffect(() => {
    if (!deleteRevealed) return;
    const closeWhenClickingElsewhere = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setDeleteRevealed(false);
    };
    window.addEventListener("pointerdown", closeWhenClickingElsewhere);
    return () => window.removeEventListener("pointerdown", closeWhenClickingElsewhere);
  }, [deleteRevealed]);

  useEffect(() => () => {
    clearLongPress();
    if (suppressionTimer.current) clearTimeout(suppressionTimer.current);
  }, []);

  const onTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(GESTURE_IGNORE_SELECTOR)) {
      startPoint.current = undefined;
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    startPoint.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      brieflySuppressClick();
      setDeleteRevealed(false);
      onLongPressRef.current();
    }, LONG_PRESS_DELAY);
  };

  const onTouchMove: TouchEventHandler<HTMLDivElement> = (event) => {
    const start = startPoint.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    if (
      Math.abs(touch.clientX - start.x) > LONG_PRESS_MOVE_TOLERANCE
      || Math.abs(touch.clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE
    ) clearLongPress();
  };

  const onTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    clearLongPress();
    const start = startPoint.current;
    startPoint.current = undefined;
    const touch = event.changedTouches[0];
    if (!start || !touch || longPressTriggered.current) return;
    const action = habitRowSwipeAction(start, { x: touch.clientX, y: touch.clientY });
    if (!action) return;
    brieflySuppressClick();
    setDeleteRevealed(action === "reveal-delete");
  };

  const onTouchCancel: TouchEventHandler<HTMLDivElement> = () => {
    clearLongPress();
    startPoint.current = undefined;
    longPressTriggered.current = false;
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressNextClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick.current = false;
      return;
    }
    if (deleteRevealed && !(event.target as HTMLElement).closest("[data-delete-action]")) {
      event.preventDefault();
      event.stopPropagation();
      setDeleteRevealed(false);
    }
  };

  return {
    rootRef,
    deleteRevealed,
    closeDelete: () => setDeleteRevealed(false),
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onClickCapture,
  };
}
