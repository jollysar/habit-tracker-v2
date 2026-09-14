import { useEffect, useState, type MouseEvent } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import type { TodayHabit } from "../../domain/habits/models";
import { Button } from "./ui/Button";
import { useDialogFocus } from "../hooks/useDialogFocus";

interface DeleteHabitDialogProps {
  readonly habit?: TodayHabit;
  readonly onCancel: () => void;
  readonly onConfirm: (dontShowAgain: boolean) => void;
}

export function DeleteHabitDialog({ habit, onCancel, onConfirm }: DeleteHabitDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const dialogRef = useDialogFocus<HTMLElement>(Boolean(habit), onCancel);

  useEffect(() => {
    if (habit) setDontShowAgain(false);
  }, [habit]);

  if (!habit) return null;

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCancel();
  };

  return (
    <div
      className="mobile-dialog-layer fixed inset-0 z-[60] grid place-items-center bg-ink-950/50 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={handleBackdrop}
    >
      <section
        ref={dialogRef}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-habit-title"
        aria-describedby="delete-habit-description"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertTriangle size={19} aria-hidden="true" />
          </span>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close delete warning">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        <h2 id="delete-habit-title" className="mt-4 text-xl font-bold tracking-[-0.03em]">
          Delete “{habit.name}”?
        </h2>
        <p id="delete-habit-description" className="mt-2 text-sm leading-6 text-ink-600">
          This removes the habit. If you want to track it again later, you’ll have to set the habit up again from the start.
        </p>
        <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-300">
          Existing completion history is retained locally for accurate analytics,
          but the habit will be removed from your active lists.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-line px-3 py-3 text-sm text-ink-600">
          <input
            className="size-4 rounded border-line accent-red-600"
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.currentTarget.checked)}
          />
          Don’t show this warning again
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} data-dialog-autofocus>Cancel</Button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            data-haptic="warning"
            onClick={() => onConfirm(dontShowAgain)}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete habit
          </button>
        </div>
      </section>
    </div>
  );
}
