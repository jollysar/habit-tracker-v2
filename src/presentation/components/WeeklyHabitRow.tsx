import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { TodayHabit, WeeklyGoal } from "../../domain/habits/models";

interface WeeklyHabitRowProps {
  readonly habit: TodayHabit;
  readonly goal: WeeklyGoal;
  readonly onSaveValue: (value: number) => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

export function WeeklyHabitRow({ habit, goal, onSaveValue, onEdit, onDelete }: WeeklyHabitRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal.completed));
  const inputRef = useRef<HTMLInputElement>(null);
  const requiresWholeNumber = habit.schedule?.type === "weekly_frequency";

  useEffect(() => {
    if (!editing) setDraft(String(goal.completed));
  }, [editing, goal.completed]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0 || (requiresWholeNumber && !Number.isInteger(parsed))) {
      inputRef.current?.focus();
      return;
    }
    if (parsed !== goal.completed) onSaveValue(parsed);
    setEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") {
      setDraft(String(goal.completed));
      setEditing(false);
    }
  };

  return (
    <div className="group flex min-h-16 items-center gap-4 border-t border-line px-5 py-3.5 first:border-t-0">
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
        <p className="truncate text-sm font-semibold">{habit.name}</p>
        {habit.description && <p className="mt-0.5 truncate text-xs text-ink-400">{habit.description}</p>}
      </div>
      <div className="flex shrink-0 items-center opacity-55 transition group-hover:opacity-100">
        <button className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-leaf-50 hover:text-ink-800" type="button" onClick={onEdit} aria-label={`Edit ${habit.name}`}>
          <Pencil size={14} aria-hidden="true" />
        </button>
        <button className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" type="button" onClick={onDelete} aria-label={`Delete ${habit.name}`}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
