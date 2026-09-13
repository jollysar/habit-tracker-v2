import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import type { TodayHabit, WeeklyGoal } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { useHabitRowGestures } from "../hooks/useHabitRowGestures";
import { HabitStreakButton } from "./HabitStreakButton";

interface WeeklyHabitRowProps {
  readonly habit: TodayHabit;
  readonly goal: WeeklyGoal;
  readonly onSaveValue: (value: number) => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onViewStreakHistory: () => void;
}

export function WeeklyHabitRow({ habit, goal, onSaveValue, onEdit, onDelete, onViewStreakHistory }: WeeklyHabitRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal.completed));
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const requiresWholeNumber = habit.schedule?.type === "weekly_frequency";
  const gestures = useHabitRowGestures({ onLongPress: () => setMenuOpen(true) });

  useEffect(() => {
    if (!editing) setDraft(String(goal.completed));
  }, [editing, goal.completed]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus({ preventScroll: true }));
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0 || (requiresWholeNumber && !Number.isInteger(parsed))) {
      setError(requiresWholeNumber
        ? "Enter a whole number of zero or more."
        : "Enter a number of zero or more.");
      inputRef.current?.focus();
      return;
    }
    setError("");
    if (parsed !== goal.completed) onSaveValue(parsed);
    setEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") {
      setDraft(String(goal.completed));
      setError("");
      setEditing(false);
    }
  };

  return (
    <div
      ref={gestures.rootRef}
      className={cn("habit-gesture-row group relative border-t border-line first:border-t-0 first:rounded-t-[9px] last:rounded-b-[9px]", menuOpen ? "overflow-visible" : "overflow-hidden lg:overflow-visible")}
      data-page-swipe="ignore"
      onTouchStart={gestures.onTouchStart}
      onTouchMove={gestures.onTouchMove}
      onTouchEnd={gestures.onTouchEnd}
      onTouchCancel={gestures.onTouchCancel}
      onClickCapture={gestures.onClickCapture}
    >
      <button
        className="absolute inset-y-0 left-0 flex w-24 items-center justify-center gap-1.5 bg-red-600 text-sm font-semibold text-white lg:hidden"
        type="button"
        data-delete-action
        data-habit-gesture="ignore"
        aria-label={`Delete ${habit.name}`}
        aria-hidden={!gestures.deleteRevealed}
        inert={!gestures.deleteRevealed}
        tabIndex={gestures.deleteRevealed ? 0 : -1}
        onClick={() => { gestures.closeDelete(); onDelete(); }}
      >
        <Trash2 size={17} aria-hidden="true" />
        Delete
      </button>
      <div className={cn(
        "habit-row-surface relative flex min-h-16 items-center gap-4 bg-surface px-5 py-4 transition-transform duration-200 ease-out lg:translate-x-0",
        gestures.deleteRevealed && "translate-x-24",
      )}>
      <div className="flex w-24 shrink-0 items-baseline gap-1.5" aria-label={`${goal.completed} of ${goal.target} ${goal.unit}`}>
        {editing ? (
          <input
            ref={inputRef}
            className="h-9 w-14 rounded-lg border border-leaf-500 bg-surface px-2 text-left text-lg font-bold tabular-nums outline-none ring-2 ring-leaf-100"
            type="number"
            min="0"
            step={requiresWholeNumber ? "1" : "any"}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            aria-label={`Current weekly value for ${habit.name}`}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `weekly-value-error-${habit.id}` : undefined}
          />
        ) : (
          <button
            className="min-w-7 rounded-lg py-1 text-left text-lg font-bold tabular-nums text-leaf-700 underline decoration-leaf-300 underline-offset-4 transition hover:bg-leaf-50"
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit current weekly value for ${habit.name}`}
          >
            {goal.completed}
          </button>
        )}
        <span className="text-sm font-semibold tabular-nums text-ink-600">/ {goal.target}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{habit.name}</p>
        {habit.description && <p className="mt-0.5 truncate text-xs text-ink-400">{habit.description}</p>}
        {error && <p id={`weekly-value-error-${habit.id}`} className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>}
      </div>
      <div className="hidden shrink-0 items-center opacity-55 transition group-hover:opacity-100 group-focus-within:opacity-100 lg:flex">
        <button className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-leaf-50 hover:text-ink-800" type="button" onClick={onEdit} aria-label={`Edit ${habit.name}`}>
          <Pencil size={14} aria-hidden="true" />
        </button>
        <button className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" type="button" onClick={onDelete} aria-label={`Delete ${habit.name}`}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="relative" ref={menuRef}>
        <HabitStreakButton
          ref={menuButtonRef}
          habitName={habit.name}
          plantType={habit.plantType}
          streak={habit.streak}
          cadence="week"
          menuOpen={menuOpen}
          menuId={`weekly-habit-menu-${habit.id}`}
          onClick={() => setMenuOpen((current) => !current)}
        />
        {menuOpen && (
          <div
            id={`weekly-habit-menu-${habit.id}`}
            className="menu-popover absolute right-0 top-8 z-30 w-44 rounded-lg border border-line bg-surface p-1.5 shadow-xl"
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
              <strong className="text-sm tabular-nums text-ink-950">{habit.streak} {habit.streak === 1 ? "week" : "weeks"}</strong>
            </div>
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onViewStreakHistory(); }}>
              <ArrowUpRight size={14} aria-hidden="true" />
              View streak history
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}>
              <Pencil size={14} aria-hidden="true" />
              Edit details
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }}>
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
