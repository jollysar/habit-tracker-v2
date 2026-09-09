import { useEffect, useState, type MouseEvent } from "react";
import { CalendarCheck, Check, CircleMinus, RotateCcw, X, XCircle } from "lucide-react";
import type { CompletionStatus, ManagedHabit } from "../../domain/habits/models";
import { Button } from "./ui/Button";
import { useDialogFocus } from "../hooks/useDialogFocus";

export interface HistoryCorrection {
  readonly habit: ManagedHabit;
  readonly date: string;
  readonly status: CompletionStatus;
  readonly value?: number;
}

interface HistoryCorrectionDialogProps {
  readonly correction?: HistoryCorrection;
  readonly onCancel: () => void;
  readonly onSave: (status: CompletionStatus, value?: number) => void;
}

function readableDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function HistoryCorrectionDialog({
  correction,
  onCancel,
  onSave,
}: HistoryCorrectionDialogProps) {
  const [value, setValue] = useState("0");
  const dialogRef = useDialogFocus<HTMLElement>(Boolean(correction), onCancel);

  useEffect(() => {
    setValue(String(correction?.value ?? correction?.habit.targetValue ?? 0));
  }, [correction]);

  if (!correction) return null;
  const { habit, date } = correction;
  const needsValue = habit.type !== "binary";
  const numericValue = Number(value);
  const saveCompleted = () => onSave(
    "completed",
    needsValue && Number.isFinite(numericValue) && numericValue >= 0
      ? numericValue
      : habit.targetValue,
  );
  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-ink-950/50 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={handleBackdrop}
    >
      <section
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-correction-title"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-10 place-items-center rounded-xl bg-leaf-50 text-leaf-700">
            <CalendarCheck size={19} aria-hidden="true" />
          </span>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close history correction">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Correct history</p>
        <h2 id="history-correction-title" className="mt-1 text-xl font-bold tracking-[-0.03em]">
          {habit.name}
        </h2>
        <p className="mt-1 text-sm text-ink-600">{readableDate(date)}</p>

        {needsValue && (
          <label className="mt-5 block text-xs font-semibold text-ink-600">
            Completed value
            <div className="mt-1.5 flex items-center rounded-xl border border-line focus-within:border-leaf-500 focus-within:ring-2 focus-within:ring-leaf-100">
              <input
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                type="number"
                min="0"
                step="any"
                value={value}
                onChange={(event) => setValue(event.currentTarget.value)}
              />
              <span className="border-l border-line px-3 text-xs text-ink-400">{habit.targetUnit ?? "units"}</span>
            </div>
          </label>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            data-dialog-autofocus
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink-950 px-3 text-sm font-semibold text-surface transition-all duration-150 ease-out hover:bg-ink-800 active:scale-[0.98]"
            type="button"
            onClick={saveCompleted}
          >
            <Check size={16} /> Completed
          </button>
          <Button className="h-11" variant="secondary" onClick={() => onSave("skipped")}>
            <CircleMinus size={16} /> Skipped
          </Button>
          <Button className="h-11 text-red-600 dark:text-red-400" variant="secondary" onClick={() => onSave("missed")}>
            <XCircle size={16} /> Missed
          </Button>
          <Button className="h-11" variant="secondary" onClick={() => onSave("incomplete")}>
            <RotateCcw size={16} /> Clear entry
          </Button>
        </div>
        <p className="mt-4 text-xs leading-5 text-ink-400">
          Corrections immediately recalculate weekly totals, current streaks and best streaks.
        </p>
      </section>
    </div>
  );
}
