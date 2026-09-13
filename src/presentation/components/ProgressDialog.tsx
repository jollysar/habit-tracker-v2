import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { Gauge, X } from "lucide-react";
import type { TodayHabit } from "../../domain/habits/models";
import { Button } from "./ui/Button";
import { useDialogFocus } from "../hooks/useDialogFocus";

interface ProgressDialogProps {
  readonly habit?: TodayHabit;
  readonly onCancel: () => void;
  readonly onSave: (value: number) => void;
}

export function ProgressDialog({ habit, onCancel, onSave }: ProgressDialogProps) {
  const [value, setValue] = useState("0");
  const [error, setError] = useState("");
  const dialogRef = useDialogFocus<HTMLElement>(Boolean(habit), onCancel);

  useEffect(() => {
    if (!habit) return;
    setValue(String(habit.todayValue ?? habit.value ?? 0));
    setError("");
  }, [habit]);

  if (!habit) return null;

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCancel();
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setError("Progress must be zero or greater.");
      return;
    }
    onSave(numericValue);
  };

  const isWeeklyTarget = habit.schedule?.type === "weekly_target";

  return (
    <div
      className="mobile-dialog-layer fixed inset-0 z-[60] grid place-items-center bg-ink-950/50 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={handleBackdrop}
    >
      <section
        ref={dialogRef}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-dialog-title"
        aria-describedby={error ? "progress-dialog-error" : undefined}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-10 place-items-center rounded-xl bg-leaf-50 text-leaf-700">
            <Gauge size={19} aria-hidden="true" />
          </span>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close progress dialog">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Log progress</p>
        <h2 id="progress-dialog-title" className="mt-1 text-xl font-bold tracking-[-0.03em]">{habit.name}</h2>
        {isWeeklyTarget && (
          <p className="mt-2 text-sm text-ink-600">
            This week: {habit.value ?? 0} / {habit.targetValue} {habit.targetUnit}
          </p>
        )}
        <form className="mt-5" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-ink-600">
            {isWeeklyTarget ? "Progress for today" : "Today’s progress"}
            <div className="mt-1.5 flex items-center rounded-xl border border-line bg-surface focus-within:border-leaf-500 focus-within:ring-2 focus-within:ring-leaf-100">
              <input
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                type="number"
                min="0"
                step="any"
                value={value}
                onChange={(event) => setValue(event.currentTarget.value)}
                data-dialog-autofocus
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? "progress-dialog-error" : undefined}
              />
              <span className="border-l border-line px-3 text-xs font-medium text-ink-400">{habit.targetUnit}</span>
            </div>
          </label>
          {error && <p id="progress-dialog-error" className="mt-3 text-sm font-medium text-red-600" role="alert">{error}</p>}
          <div className="mt-6 flex justify-end gap-3 border-t border-line pt-5">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Save progress</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
