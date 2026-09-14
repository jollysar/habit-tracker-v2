import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Droplets,
  HeartPulse,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import type {
  HabitCategory,
  ManagedHabit,
  Weekday,
} from "../../domain/habits/models";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

interface HabitsPageProps {
  readonly habits: readonly ManagedHabit[];
  readonly categories: readonly HabitCategory[];
  readonly onAddHabit: () => void;
  readonly onEditHabit: (habitId: string) => void;
  readonly onArchiveHabit: (habitId: string) => void;
  readonly onRestoreHabit: (habitId: string) => void;
  readonly onMoveHabit: (habitId: string, direction: -1 | 1) => void;
}

const weekdayLabels: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const icons = {
  activity: Activity,
  book: BookOpen,
  check: Check,
  droplet: Droplets,
  heart: HeartPulse,
  sparkles: Sparkles,
} as const;

function describeSchedule(habit: ManagedHabit): string {
  const { schedule } = habit;
  if (schedule.type === "specific_days") {
    return (schedule.daysOfWeek ?? []).map((day) => weekdayLabels[day]).join(", ");
  }
  if (schedule.type === "weekly_frequency") {
    return `${schedule.targetCount ?? 1} times per week`;
  }
  if (schedule.type === "weekly_target") {
    return `${schedule.targetValue ?? 1} ${schedule.targetUnit ?? habit.targetUnit ?? "units"} per week`;
  }
  return "Every day";
}

function typeLabel(habit: ManagedHabit): string {
  if (habit.type === "binary") return "Check-off";
  return `${habit.targetValue ?? 0} ${habit.targetUnit ?? "units"}`;
}

export function HabitsPage({
  habits,
  categories,
  onAddHabit,
  onEditHabit,
  onArchiveHabit,
  onRestoreHabit,
  onMoveHabit,
}: HabitsPageProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<"active" | "archived" | "all">("active");

  const filteredHabits = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return habits.filter((habit) => {
      const matchesQuery = !normalizedQuery ||
        habit.name.toLocaleLowerCase().includes(normalizedQuery) ||
        habit.description?.toLocaleLowerCase().includes(normalizedQuery) ||
        habit.categoryName?.toLocaleLowerCase().includes(normalizedQuery);
      const matchesCategory = categoryId === "all" || habit.categoryId === categoryId;
      const matchesStatus = status === "all" ||
        (status === "archived" ? habit.isArchived : !habit.isArchived);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [categoryId, habits, query, status]);

  const activeHabits = habits.filter((habit) => !habit.isArchived);

  return (
    <div className="mobile-page-safe mx-auto max-w-[1200px] px-5 pb-7 sm:px-8 sm:py-9 xl:px-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Habits</h1>
          <p className="mt-2 hidden text-sm text-ink-600 sm:block">
            {activeHabits.length} active habit{activeHabits.length === 1 ? "" : "s"} · organise what you track.
          </p>
        </div>
        <Button className="hidden self-start lg:flex lg:self-auto" onClick={onAddHabit} aria-keyshortcuts="Meta+N Control+N">
          <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
          Add habit
        </Button>
      </header>

      <Card className="mt-5 p-3 shadow-none sm:mt-8 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_200px_160px]">
          <label className="relative block">
            <span className="sr-only">Search habits</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
            <input
              className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search habits"
            />
          </label>
          <label>
            <span className="sr-only">Filter by category</span>
            <select
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
              value={categoryId}
              onChange={(event) => setCategoryId(event.currentTarget.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
              value={status}
              onChange={(event) => setStatus(event.currentTarget.value as typeof status)}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All statuses</option>
            </select>
          </label>
        </div>
      </Card>

      <div className="mt-4 space-y-3" aria-live="polite">
        {filteredHabits.length === 0 ? (
          <Card className="grid min-h-44 place-items-center p-8 text-center shadow-none">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-leaf-50 text-leaf-600">
                <Search size={19} aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold">No matching habits</p>
            </div>
          </Card>
        ) : filteredHabits.map((habit) => {
          const Icon = icons[habit.icon as keyof typeof icons] ?? Check;
          const activeIndex = activeHabits.findIndex((item) => item.id === habit.id);
          return (
            <article key={habit.id} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 shadow-soft transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-leaf-500/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full text-white shadow-sm"
                style={{ backgroundColor: habit.colour ?? "#73bd8c" }}
                aria-hidden="true"
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-bold">{habit.name}</h3>
                  {habit.categoryName && (
                    <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] font-semibold text-leaf-700">
                      {habit.categoryName}
                    </span>
                  )}
                  {habit.isArchived && (
                    <span className="rounded-full bg-line px-2 py-0.5 text-[10px] font-semibold text-ink-600">Archived</span>
                  )}
                </div>
                {habit.description && <p className="mt-1 truncate text-xs text-ink-400">{habit.description}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-ink-400">
                  <span>{describeSchedule(habit)}</span>
                  <span>{typeLabel(habit)}</span>
                  <span className="hidden capitalize sm:inline">{habit.timeOfDay}</span>
                  <span className="hidden sm:inline">Starts {habit.startDate}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                {!habit.isArchived && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={() => onMoveHabit(habit.id, -1)}
                      disabled={activeIndex <= 0}
                      aria-label={`Move ${habit.name} up`}
                    >
                      <ArrowUp size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={() => onMoveHabit(habit.id, 1)}
                      disabled={activeIndex === activeHabits.length - 1}
                      aria-label={`Move ${habit.name} down`}
                    >
                      <ArrowDown size={15} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-9" onClick={() => onEditHabit(habit.id)} aria-label={`Edit ${habit.name}`}>
                      <Pencil size={15} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-9" data-haptic="warning" onClick={() => onArchiveHabit(habit.id)} aria-label={`Archive ${habit.name}`}>
                      <Archive size={15} />
                    </Button>
                  </>
                )}
                {habit.isArchived && (
                  <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => onRestoreHabit(habit.id)}>
                    <RotateCcw size={14} />
                    Restore
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
