import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Gauge, Minus, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { TodayHabit } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { HabitStreakButton } from "./HabitStreakButton";
import { useHabitRowGestures } from "../hooks/useHabitRowGestures";

interface HabitRowProps {
  readonly habit: TodayHabit;
  readonly onToggle: () => void;
  readonly onEdit: () => void;
  readonly onSkip: () => void;
  readonly onReset: () => void;
  readonly onDelete: () => void;
  readonly onLogProgress: () => void;
  readonly onViewStreakHistory: () => void;
}

export function HabitRow({ habit, onToggle, onEdit, onSkip, onReset, onDelete, onLogProgress, onViewStreakHistory }: HabitRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [completionPulse, setCompletionPulse] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isComplete = habit.status === "completed";
  const isSkipped = habit.status === "skipped";
  const hasProgress = habit.targetValue !== undefined;
  const progress = hasProgress
    ? Math.min(100, Math.round(((habit.value ?? 0) / habit.targetValue!) * 100))
    : 0;
  const gestures = useHabitRowGestures({ onLongPress: () => setMenuOpen(true) });
  const wasComplete = useRef(isComplete);

  useEffect(() => {
    const newlyCompleted = !wasComplete.current && isComplete;
    wasComplete.current = isComplete;
    if (!newlyCompleted) return;
    setCompletionPulse(true);
    const timer = window.setTimeout(() => setCompletionPulse(false), 520);
    return () => window.clearTimeout(timer);
  }, [isComplete]);

  useEffect(() => {
    if (!menuOpen) return;
    const menuItems = () => Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [],
    );
    window.requestAnimationFrame(() => menuItems()[0]?.focus({ preventScroll: true }));
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <div
      ref={gestures.rootRef}
      className={cn(
        "habit-gesture-row group relative rounded-[1.75rem] transition-transform duration-200",
        gestures.longPressActive && "is-long-pressing",
        menuOpen ? "overflow-visible" : "overflow-hidden lg:overflow-visible",
      )}
      data-habit-row
      onTouchStart={gestures.onTouchStart}
      onTouchMove={gestures.onTouchMove}
      onTouchEnd={gestures.onTouchEnd}
      onTouchCancel={gestures.onTouchCancel}
      onClickCapture={gestures.onClickCapture}
    >
      <button
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center gap-1.5 rounded-r-[1.75rem] bg-red-600 text-sm font-semibold text-white lg:hidden"
        type="button"
        data-delete-action
        data-habit-gesture="ignore"
        aria-label={`Delete ${habit.name}`}
        aria-hidden={!gestures.deleteRevealed}
        inert={!gestures.deleteRevealed}
        tabIndex={gestures.deleteRevealed ? 0 : -1}
        data-haptic="warning"
        onClick={() => { gestures.closeDelete(); onDelete(); }}
      >
        <Trash2 size={17} aria-hidden="true" />
        Delete
      </button>
      <div className={cn(
        "habit-row-surface relative flex min-h-14 items-center gap-2.5 bg-surface px-3.5 py-2.5 transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:gap-3 sm:px-5 sm:py-3 lg:translate-x-0",
        isComplete && "bg-leaf-50",
        completionPulse && "habit-completion-bloom",
        gestures.deleteRevealed && "-translate-x-24",
      )}>
        <button
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3"
        onClick={onToggle}
        data-haptic={isComplete ? "soft" : "complete"}
        aria-label={isComplete ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}
        aria-pressed={isComplete}
      >
        <span
          className={cn(
            "habit-check grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-300 ease-out",
            isComplete
              ? "border-leaf-500 bg-leaf-500 text-white"
              : isSkipped
                ? "border-ink-400 bg-line text-ink-600"
              : "border-ink-400 bg-surface text-transparent group-hover:border-leaf-500 group-hover:text-leaf-500",
          )}
          aria-hidden="true"
        >
          {isSkipped ? <Minus size={15} strokeWidth={2.4} /> : <Check className={cn(isComplete && "habit-check-mark")} size={15} strokeWidth={2.8} />}
        </span>
        <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn("truncate text-base font-semibold", (isComplete || isSkipped) && "text-ink-600", isComplete && "line-through decoration-line")}>
            {habit.name}
          </span>
          {isSkipped && <span className="rounded-full bg-line px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">Skipped</span>}
        </span>
        {habit.description && <span className="mt-0.5 hidden truncate text-xs text-ink-400 sm:block">{habit.description}</span>}
        {hasProgress && !isComplete && !isSkipped && (
          <span className="mt-1.5 flex max-w-sm items-center gap-2 sm:mt-2">
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label={`${habit.name} progress`}
              aria-valuemin={0}
              aria-valuemax={habit.targetValue}
              aria-valuenow={habit.value ?? 0}
            >
              <span className="block h-full rounded-full bg-leaf-500 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
            </span>
            <span className="min-w-20 text-right text-[11px] font-medium text-ink-400">
              {habit.value ?? 0} / {habit.targetValue} {habit.targetUnit}
            </span>
          </span>
        )}
        </span>
        </button>

        {hasProgress && isComplete && (
        <span className="hidden text-xs font-medium text-ink-400 sm:block">
          {habit.value} {habit.targetUnit}
        </span>
        )}
        <div className="relative self-center" ref={menuRef}>
        <HabitStreakButton
          ref={menuButtonRef}
          habitName={habit.name}
          plantType={habit.plantType}
          streak={habit.streak}
          cadence="day"
          menuOpen={menuOpen}
          menuId={`habit-menu-${habit.id}`}
          onClick={() => setMenuOpen((current) => !current)}
        />
        {menuOpen && (
          <div
            id={`habit-menu-${habit.id}`}
            className="menu-popover absolute right-0 top-10 z-30 w-48 rounded-2xl border border-line bg-surface p-1.5 shadow-xl"
            role="menu"
            aria-label={`Actions for ${habit.name}`}
            onKeyDown={(event) => {
              const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']"));
              const currentIndex = items.indexOf(document.activeElement as HTMLElement);
              let nextIndex: number | undefined;
              if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
              if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
              if (event.key === "Home") nextIndex = 0;
              if (event.key === "End") nextIndex = items.length - 1;
              if (nextIndex !== undefined) {
                event.preventDefault();
                items[nextIndex]?.focus();
              }
            }}
          >
            <div className="mb-1 flex items-center justify-between gap-3 border-b border-line px-2.5 py-2 text-xs text-ink-600">
              <span>Current streak</span>
              <strong className="text-sm tabular-nums text-ink-950">{habit.streak} {habit.streak === 1 ? "day" : "days"}</strong>
            </div>
            <button className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onViewStreakHistory(); }}>
              <ArrowUpRight size={14} aria-hidden="true" />
              View streak history
            </button>
            <button className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}>
              <Pencil size={14} aria-hidden="true" />
              Edit details
            </button>
            {habit.type !== "binary" && (
              <button className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onLogProgress(); }}>
                <Gauge size={14} aria-hidden="true" />
                Log progress
              </button>
            )}
            <button className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onSkip(); }}>
              <Minus size={14} aria-hidden="true" />
              Mark skipped
            </button>
            <button className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onReset(); }}>
              <RotateCcw size={14} aria-hidden="true" />
              Reset check-in
            </button>
            <div className="my-1 border-t border-line" />
            <button className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" role="menuitem" data-haptic="warning" onClick={() => { setMenuOpen(false); onDelete(); }}>
              <Trash2 size={14} aria-hidden="true" />
              Delete habit
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
