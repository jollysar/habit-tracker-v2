import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Gauge, Pencil, Trash2 } from "lucide-react";
import type { TodayHabit, WeeklyGoal } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { playHaptic } from "../../infrastructure/native/haptics";
import { useHabitRowGestures } from "../hooks/useHabitRowGestures";
import { HabitStreakButton } from "./HabitStreakButton";

interface WeeklyHabitRowProps {
  readonly habit: TodayHabit;
  readonly goal: WeeklyGoal;
  readonly onSaveValue: (value: number) => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onReorderStart?: () => void;
  readonly onReorderMove?: (point: { readonly x: number; readonly y: number }) => void;
  readonly onReorderEnd?: () => void;
}

export function WeeklyHabitRow({
  habit,
  goal,
  onSaveValue,
  onEdit,
  onDelete,
  onReorderStart,
  onReorderMove,
  onReorderEnd,
}: WeeklyHabitRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal.completed));
  const [completionPulse, setCompletionPulse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedValueRef = useRef(goal.completed);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const requiresWholeNumber = habit.schedule?.type === "weekly_frequency";
  const isComplete = goal.target > 0 && goal.completed >= goal.target;
  const sliderMaximum = Math.max(1, goal.target);
  const draftValue = Number.isFinite(Number(draft))
    ? Math.min(sliderMaximum, Math.max(0, Number(draft)))
    : goal.completed;
  const progressPercentage = Math.min(100, (draftValue / sliderMaximum) * 100);
  const markerPositions = useMemo(() => {
    const exactMarkerCount = Number.isInteger(goal.target) && goal.target <= 12
      ? Math.max(0, goal.target - 1)
      : 4;
    return Array.from({ length: exactMarkerCount }, (_, index) => (
      ((index + 1) / (exactMarkerCount + 1)) * 100
    ));
  }, [goal.target]);
  const gestures = useHabitRowGestures({
    onLongPress: () => setMenuOpen(true),
    onReorderStart: onReorderStart
      ? () => {
        setMenuOpen(false);
        onReorderStart();
      }
      : undefined,
    onReorderMove,
    onReorderEnd,
  });

  useEffect(() => {
    committedValueRef.current = goal.completed;
    if (!editing) setDraft(String(goal.completed));
  }, [editing, goal.completed]);

  useEffect(() => {
    if (editing) inputRef.current?.focus({ preventScroll: true });
  }, [editing]);

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
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus({ preventScroll: true }));
    const handlePointerDown = (event: PointerEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node)
      ) setMenuOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const commit = (nextDraft = draft) => {
    const parsed = Number(nextDraft);
    if (!Number.isFinite(parsed)) return;
    const normalized = requiresWholeNumber
      ? Math.round(Math.min(sliderMaximum, Math.max(0, parsed)))
      : Math.min(sliderMaximum, Math.max(0, parsed));
    setDraft(String(normalized));
    if (normalized !== committedValueRef.current) {
      committedValueRef.current = normalized;
      void playHaptic(normalized >= goal.target ? "success" : "complete");
      onSaveValue(normalized);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commit(event.currentTarget.value);
      setEditing(false);
    }
    if (event.key === "Escape") {
      setDraft(String(goal.completed));
      setEditing(false);
    }
  };

  return (
    <div
      ref={gestures.rootRef}
      className={cn(
        "habit-gesture-row group relative rounded-[1.75rem] transition-transform duration-200",
        gestures.longPressActive && "is-long-pressing",
        gestures.reordering && "is-reordering",
        menuOpen && "z-50",
        menuOpen ? "overflow-visible" : "overflow-hidden lg:overflow-visible",
      )}
      data-habit-row
      data-habit-id={habit.id}
      aria-grabbed={gestures.reordering}
      onTouchStart={gestures.onTouchStart}
      onTouchMove={gestures.onTouchMove}
      onTouchEnd={gestures.onTouchEnd}
      onTouchCancel={gestures.onTouchCancel}
      onClickCapture={gestures.onClickCapture}
    >
      <div className={cn(
        "habit-row-surface relative flex min-h-14 flex-col bg-transparent px-3.5 py-2 transition-colors duration-300 sm:px-5 sm:py-2.5",
        isComplete && "bg-leaf-50",
        completionPulse && "habit-completion-bloom",
      )}>
        <div className="flex min-h-10 w-full items-center gap-2">
          <button
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full py-1 text-left"
            type="button"
            onClick={() => setEditing((current) => !current)}
            aria-expanded={editing}
            aria-controls={`weekly-progress-${habit.id}`}
            aria-label={`${editing ? "Close" : "Adjust"} weekly progress for ${habit.name}`}
          >
            <span className="flex shrink-0 items-baseline gap-0" aria-label={`${goal.completed} of ${goal.target} ${goal.unit}`}>
              <span key={goal.completed} className="number-pop inline-block text-lg font-bold tabular-nums text-leaf-700">{goal.completed}</span>
              <span className="text-sm font-semibold tabular-nums text-ink-600">/{goal.target}</span>
            </span>
            <span className="min-w-0 flex-1 truncate text-base font-semibold">{habit.name}</span>
          </button>

          <div className="hidden shrink-0 items-center opacity-55 transition group-hover:opacity-100 group-focus-within:opacity-100 lg:flex">
            <button className="grid size-8 place-items-center rounded-full text-ink-400 hover:bg-leaf-50 hover:text-ink-800" type="button" onClick={onEdit} aria-label={`Edit ${habit.name}`}>
              <Pencil size={14} aria-hidden="true" />
            </button>
            <button className="grid size-8 place-items-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" type="button" data-haptic="warning" onClick={onDelete} aria-label={`Delete ${habit.name}`}>
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="relative self-center">
            <HabitStreakButton
              habitName={habit.name}
              plantType={habit.plantType}
              streak={habit.streak}
              cadence="week"
            />
        {menuOpen && createPortal(
          <>
          <button
            className="fixed inset-0 z-[110] cursor-default bg-black/60 backdrop-blur-[1px]"
            type="button"
            aria-label="Close habit actions"
            onClick={() => setMenuOpen(false)}
          />
          <div
            ref={menuRef}
            id={`weekly-habit-menu-${habit.id}`}
            className="habit-action-sheet solid-panel fixed inset-x-0 bottom-0 z-[120] max-h-[calc(100dvh-3rem-env(safe-area-inset-top))] overflow-y-auto rounded-t-[2rem] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-80 sm:rounded-3xl sm:p-3"
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
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
            <div className="px-3 pb-2 pt-1">
              <p className="text-base font-bold tracking-[-0.01em] text-ink-950">{habit.name}</p>
              <p className="mt-0.5 text-xs font-medium text-ink-400">Weekly habit actions</p>
            </div>
            <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-sm font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); setEditing(true); }}>
              <Gauge size={18} aria-hidden="true" />
              Update progress
            </button>
            <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-sm font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}>
              <Pencil size={18} aria-hidden="true" />
              Edit details
            </button>
            <div className="soft-panel my-1.5 h-px" />
            <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" role="menuitem" data-haptic="warning" onClick={() => { setMenuOpen(false); onDelete(); }}>
              <Trash2 size={18} aria-hidden="true" />
              Delete habit
            </button>
          </div>
          </>,
          document.body,
        )}
          </div>
        </div>

        {editing && (
          <div id={`weekly-progress-${habit.id}`} className="cadence-options-reveal px-1 pb-1 pt-2">
            <div
              className="weekly-progress-control relative flex h-9 items-center"
              style={{ "--weekly-progress": `${progressPercentage}%` } as CSSProperties}
            >
              <div className="pointer-events-none absolute inset-x-[10px] top-1/2 z-20 h-4 -translate-y-1/2" aria-hidden="true">
                {markerPositions.map((position) => (
                  <span
                    key={position}
                    className="absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-400/70"
                    style={{ left: `${position}%` }}
                  />
                ))}
              </div>
              <input
                ref={inputRef}
                className="weekly-progress-range relative z-10 w-full"
                type="range"
                min="0"
                max={sliderMaximum}
                step={requiresWholeNumber ? "1" : "0.1"}
                value={draftValue}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onPointerUp={(event) => commit(event.currentTarget.value)}
                onKeyUp={(event) => {
                  if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
                    commit(event.currentTarget.value);
                  }
                }}
                onBlur={(event) => commit(event.currentTarget.value)}
                onKeyDown={handleKeyDown}
                aria-label={`Weekly progress for ${habit.name}`}
                aria-valuetext={`${draftValue} of ${goal.target} ${goal.unit}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
