import { useEffect, useRef, useState, type MouseEvent, type TouchEventHandler } from "react";
import { playHaptic } from "../../infrastructure/native/haptics";

interface TouchPoint {
  readonly x: number;
  readonly y: number;
}

const LONG_PRESS_DELAY = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const GESTURE_IGNORE_SELECTOR = "input, select, textarea, [role='menu'], [data-habit-gesture='ignore']";

interface HabitRowGestureOptions {
  readonly onLongPress: () => void;
  readonly onReorderStart?: () => void;
  readonly onReorderMove?: (point: TouchPoint) => void;
  readonly onReorderEnd?: () => void;
}

export function useHabitRowGestures({
  onLongPress,
  onReorderStart,
  onReorderMove,
  onReorderEnd,
}: HabitRowGestureOptions) {
  const [longPressActive, setLongPressActive] = useState(false);
  const [reordering, setReordering] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const startPoint = useRef<TouchPoint | undefined>(undefined);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressArmed = useRef(false);
  const reorderTriggered = useRef(false);
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
    rootRef.current?.setAttribute("data-suppress-haptic", "true");
    if (suppressionTimer.current) clearTimeout(suppressionTimer.current);
    suppressionTimer.current = setTimeout(() => {
      suppressNextClick.current = false;
      rootRef.current?.removeAttribute("data-suppress-haptic");
    }, 450);
  };

  useEffect(() => () => {
    clearLongPress();
    if (suppressionTimer.current) clearTimeout(suppressionTimer.current);
    rootRef.current?.removeAttribute("data-suppress-haptic");
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
    longPressArmed.current = false;
    reorderTriggered.current = false;
    setLongPressActive(true);
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressArmed.current = true;
      brieflySuppressClick();
      void playHaptic("longPress");
      onLongPressRef.current();
    }, LONG_PRESS_DELAY);
  };

  const onTouchMove: TouchEventHandler<HTMLDivElement> = (event) => {
    const start = startPoint.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    if (longPressArmed.current && onReorderStart && onReorderMove) {
      if (!reorderTriggered.current) {
        reorderTriggered.current = true;
        brieflySuppressClick();
        setLongPressActive(false);
        setReordering(true);
        onReorderStart();
      }
      if (event.cancelable) event.preventDefault();
      onReorderMove({ x: touch.clientX, y: touch.clientY });
      return;
    }
    if (
      Math.abs(touch.clientX - start.x) > LONG_PRESS_MOVE_TOLERANCE
      || Math.abs(touch.clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE
    ) {
      clearLongPress();
      setLongPressActive(false);
    }
  };

  const onTouchEnd: TouchEventHandler<HTMLDivElement> = () => {
    clearLongPress();
    setLongPressActive(false);
    startPoint.current = undefined;
    if (reorderTriggered.current) {
      setReordering(false);
      reorderTriggered.current = false;
      longPressArmed.current = false;
      onReorderEnd?.();
      return;
    }
    if (longPressArmed.current) {
      longPressArmed.current = false;
      return;
    }
  };

  const onTouchCancel: TouchEventHandler<HTMLDivElement> = () => {
    clearLongPress();
    setLongPressActive(false);
    startPoint.current = undefined;
    longPressArmed.current = false;
    if (reorderTriggered.current) onReorderEnd?.();
    reorderTriggered.current = false;
    setReordering(false);
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressNextClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick.current = false;
      return;
    }
  };

  return {
    rootRef,
    longPressActive,
    reordering,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onClickCapture,
  };
}
