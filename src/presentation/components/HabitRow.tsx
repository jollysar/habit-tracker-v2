import { useEffect, useRef, useState } from "react";
import { Check, Gauge, Minus, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { TodayHabit } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { AnimatedPlant } from "./AnimatedPlant";
import { Button } from "./ui/Button";

interface HabitRowProps {
  readonly habit: TodayHabit;
  readonly isEditing: boolean;
  readonly onToggle: () => void;
  readonly onEdit: () => void;
  readonly onSkip: () => void;
  readonly onReset: () => void;
  readonly onDelete: () => void;
  readonly onLogProgress: () => void;
}

export function HabitRow({ habit, isEditing, onToggle, onEdit, onSkip, onReset, onDelete, onLogProgress }: HabitRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isComplete = habit.status === "completed";
  const isSkipped = habit.status === "skipped";
  const hasProgress = habit.targetValue !== undefined;
  const progress = hasProgress
    ? Math.min(100, Math.round(((habit.value ?? 0) / habit.targetValue!) * 100))
    : 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <div className="group flex items-center gap-3 border-t border-line px-4 py-3.5 first:border-t-0 sm:px-5">
      <button
        className={cn(
          "habit-check grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-150 ease-out active:scale-90",
          isComplete
            ? "border-leaf-500 bg-leaf-500 text-white"
            : isSkipped
              ? "border-ink-400 bg-line text-ink-600"
            : "border-ink-400 bg-surface text-transparent hover:border-leaf-500 hover:text-leaf-500",
        )}
        onClick={onToggle}
        aria-label={isComplete ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}
      >
        {isSkipped ? <Minus size={15} strokeWidth={2.4} aria-hidden="true" /> : <Check size={15} strokeWidth={2.8} aria-hidden="true" />}
      </button>

      <button className="min-w-0 flex-1 text-left" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-sm font-semibold", (isComplete || isSkipped) && "text-ink-600", isComplete && "line-through decoration-line")}>
            {habit.name}
          </span>
          {isSkipped && <span className="rounded-md bg-line px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">Skipped</span>}
          {habit.streak > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-400" title={`${habit.streak}-day streak`}>
              <AnimatedPlant className="relative -top-1" plantType={habit.plantType} streak={habit.streak} size={17} />
              {habit.streak}
            </span>
          )}
        </div>
        {habit.description && <p className="mt-0.5 truncate text-xs text-ink-400">{habit.description}</p>}
        {hasProgress && !isComplete && !isSkipped && (
          <div className="mt-2 flex max-w-sm items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-leaf-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="min-w-20 text-right text-[11px] font-medium text-ink-400">
              {habit.value ?? 0} / {habit.targetValue} {habit.targetUnit}
            </span>
          </div>
        )}
      </button>

      {hasProgress && isComplete && (
        <span className="hidden text-xs font-medium text-ink-400 sm:block">
          {habit.value} {habit.targetUnit}
        </span>
      )}
      {isEditing && (
        <Button variant="secondary" className="h-8 px-2.5 text-xs" onClick={onSkip}>
          <Minus size={14} aria-hidden="true" />
          Skip
        </Button>
      )}
      <div className="relative" ref={menuRef}>
        <Button
          className="opacity-60 group-hover:opacity-100"
          variant="ghost"
          size="icon"
          aria-label={`More options for ${habit.name}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </Button>
        {menuOpen && (
          <div className="menu-popover absolute right-0 top-10 z-30 w-48 rounded-lg border border-line bg-surface p-1.5 shadow-xl" role="menu">
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}>
              <Pencil size={14} aria-hidden="true" />
              Edit details
            </button>
            {habit.type !== "binary" && (
              <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onLogProgress(); }}>
                <Gauge size={14} aria-hidden="true" />
                Log progress
              </button>
            )}
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onSkip(); }}>
              <Minus size={14} aria-hidden="true" />
              Mark skipped
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-800 hover:bg-leaf-50" role="menuitem" onClick={() => { setMenuOpen(false); onReset(); }}>
              <RotateCcw size={14} aria-hidden="true" />
              Reset check-in
            </button>
            <div className="my-1 border-t border-line" />
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }}>
              <Trash2 size={14} aria-hidden="true" />
              Delete habit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
