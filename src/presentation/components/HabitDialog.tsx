import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { ArrowLeft, Bell, CalendarDays, CalendarRange, ChevronDown, ChevronUp, X } from "lucide-react";
import { validateHabitConfiguration } from "../../application/habits/validateHabitConfiguration";
import type {
  HabitCategory,
  HabitReminder,
  HabitSchedule,
  HabitType,
  PlantType,
  ScheduleType,
  TimeOfDay,
  TodayHabit,
  Weekday,
} from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { AnimatedPlant, plantChoices } from "./AnimatedPlant";
import { Button } from "./ui/Button";

export interface HabitDraft {
  readonly name: string;
  readonly description?: string;
  readonly type: HabitType;
  readonly timeOfDay: TimeOfDay;
  readonly targetValue?: number;
  readonly targetUnit?: string;
  readonly categoryId?: string;
  readonly icon?: string;
  readonly colour?: string;
  readonly plantType: PlantType;
  readonly startDate: string;
  readonly schedule: HabitSchedule;
  readonly reminder: Omit<HabitReminder, "habitId"> | null;
}

interface HabitDialogProps {
  readonly open: boolean;
  readonly habit?: TodayHabit;
  readonly categories: readonly HabitCategory[];
  readonly defaultStartDate: string;
  readonly reminder?: HabitReminder;
  readonly onClose: () => void;
  readonly onSave: (habit: HabitDraft) => void;
}

const weekdays: ReadonlyArray<{ id: Weekday; label: string }> = [
  { id: "mon", label: "M" },
  { id: "tue", label: "T" },
  { id: "wed", label: "W" },
  { id: "thu", label: "T" },
  { id: "fri", label: "F" },
  { id: "sat", label: "S" },
  { id: "sun", label: "S" },
];

const colours = ["#73bd8c", "#62a5d8", "#9c7bd8", "#d99a63", "#d86f7f", "#7c8b9b"];
const icons = ["check", "heart", "book", "activity", "droplet", "sparkles"];

const inputClass =
  "mt-1.5 h-10 w-full rounded-full border border-line bg-surface px-3 text-sm text-ink-950 outline-none transition focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100";

const scheduleOptions = [
  ["daily", "Every day", "A daily check-in"],
  ["specific_days", "Specific days", "Choose weekdays"],
  ["weekly_frequency", "Times per week", "Flexible days"],
  ["weekly_target", "Weekly target", "Quantity or duration"],
] as const;

export function HabitDialog({
  open,
  habit,
  categories,
  defaultStartDate,
  reminder,
  onClose,
  onSave,
}: HabitDialogProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLElement>(open, onClose);
  const [creationCadence, setCreationCadence] = useState<"daily" | "weekly" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<HabitType>("binary");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("anytime");
  const [targetValue, setTargetValue] = useState("1");
  const [targetUnit, setTargetUnit] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<readonly Weekday[]>([
    "mon",
    "wed",
    "fri",
  ]);
  const [weeklyAmount, setWeeklyAmount] = useState("3");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [icon, setIcon] = useState("check");
  const [colour, setColour] = useState(colours[0]);
  const [plantType, setPlantType] = useState<PlantType>("oak");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setCreationCadence(null);
      return;
    }
    setCreationCadence(habit
      ? habit.schedule?.type === "weekly_frequency" || habit.schedule?.type === "weekly_target"
        ? "weekly"
        : "daily"
      : null);
    setName(habit?.name ?? "");
    setDescription(habit?.description ?? "");
    setType(habit?.type ?? "binary");
    setTimeOfDay(habit?.timeOfDay ?? "anytime");
    setTargetValue(String(habit?.targetValue ?? 1));
    setTargetUnit(habit?.targetUnit ?? "");
    setCategoryId(habit?.categoryId ?? "");
    setScheduleType(habit?.schedule?.type ?? "daily");
    setDaysOfWeek(habit?.schedule?.daysOfWeek ?? ["mon", "wed", "fri"]);
    setWeeklyAmount(
      String(
        habit?.schedule?.type === "weekly_target"
          ? habit.schedule.targetValue ?? 1
          : habit?.schedule?.targetCount ?? 3,
      ),
    );
    setStartDate(habit?.startDate ?? defaultStartDate);
    setIcon(habit?.icon ?? "check");
    setColour(habit?.colour ?? colours[0]);
    setPlantType(habit?.plantType ?? "oak");
    setAdvancedOpen(Boolean(habit?.description || habit?.icon || habit?.colour));
    setReminderEnabled(reminder?.enabled ?? false);
    setReminderTime(reminder?.time ?? "09:00");
    setError("");
  }, [defaultStartDate, habit, open, reminder]);

  useEffect(() => {
    if (!open || (!habit && !creationCadence)) return;
    const focusFrame = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [creationCadence, habit, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const toggleWeekday = (weekday: Weekday) => {
    setDaysOfWeek((current) =>
      current.includes(weekday)
        ? current.filter((day) => day !== weekday)
        : weekdays.map(({ id }) => id).filter(
            (day) => current.includes(day) || day === weekday,
          ),
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    const numericTarget = Number(targetValue);
    const numericWeeklyAmount = Number(weeklyAmount);
    const validationError = validateHabitConfiguration({
      name,
      description,
      type,
      targetValue: numericTarget,
      targetUnit,
      scheduleType,
      daysOfWeek,
      weeklyAmount: numericWeeklyAmount,
      startDate,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const cleanUnit = type === "binary" ? undefined : targetUnit.trim();
    onSave({
      name: cleanName,
      description: description.trim() || undefined,
      type,
      timeOfDay,
      targetValue: type === "binary" ? undefined : numericTarget,
      targetUnit: cleanUnit,
      categoryId: categoryId || undefined,
      icon,
      colour,
      plantType,
      startDate,
      schedule: {
        type: scheduleType,
        daysOfWeek: scheduleType === "specific_days" ? daysOfWeek : undefined,
        targetCount:
          scheduleType === "weekly_frequency" ? numericWeeklyAmount : undefined,
        targetValue:
          scheduleType === "weekly_target" ? numericWeeklyAmount : undefined,
        targetUnit: scheduleType === "weekly_target" ? cleanUnit : undefined,
        effectiveFrom: startDate,
      },
      reminder: reminderEnabled ? { enabled: true, time: reminderTime } : null,
    });
  };

  const visibleScheduleOptions = habit
    ? scheduleOptions
    : scheduleOptions.filter(([id]) => creationCadence === "daily"
      ? id === "daily" || id === "specific_days"
      : id === "weekly_frequency" || id === "weekly_target");

  return (
    <div
      className="mobile-dialog-layer fixed inset-0 z-50 grid place-items-center bg-ink-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={handleBackdrop}
    >
      <section
        ref={dialogRef}
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-dialog-title"
        aria-describedby={error ? "habit-dialog-error" : undefined}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
              {habit ? "Habit details" : creationCadence ? "Step 2 of 2" : "Step 1 of 2"}
            </p>
            <h2 id="habit-dialog-title" className="mt-1 text-xl font-bold tracking-[-0.03em]">
              {habit
                ? "Edit habit"
                : creationCadence
                  ? `New ${creationCadence} habit`
                  : "What kind of habit?"}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close habit dialog">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        {!habit && !creationCadence ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              data-dialog-autofocus
              className="group rounded-3xl border border-line p-5 text-left transition hover:border-leaf-500 hover:bg-leaf-50 focus:outline-none focus:ring-2 focus:ring-leaf-500"
              type="button"
              onClick={() => {
                setCreationCadence("daily");
                setScheduleType("daily");
              }}
            >
              <span className="grid size-10 place-items-center rounded-full bg-leaf-100 text-leaf-700">
                <CalendarDays size={20} aria-hidden="true" />
              </span>
              <span className="mt-4 block text-base font-bold">Daily habit</span>
              <span className="mt-1 block text-sm leading-5 text-ink-400">Check in every day or on selected weekdays.</span>
            </button>
            <button
              className="group rounded-3xl border border-line p-5 text-left transition hover:border-leaf-500 hover:bg-leaf-50 focus:outline-none focus:ring-2 focus:ring-leaf-500"
              type="button"
              onClick={() => {
                setCreationCadence("weekly");
                setScheduleType("weekly_frequency");
                setWeeklyAmount("1");
              }}
            >
              <span className="grid size-10 place-items-center rounded-full bg-leaf-100 text-leaf-700">
                <CalendarRange size={20} aria-hidden="true" />
              </span>
              <span className="mt-4 block text-base font-bold">Weekly habit</span>
              <span className="mt-1 block text-sm leading-5 text-ink-400">Set a flexible weekly frequency or target.</span>
            </button>
          </div>
        ) : (
        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-ink-600">
            Name
            <input
              ref={nameInputRef}
              required
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "habit-dialog-error" : undefined}
              className={inputClass}
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="e.g. Read for 20 minutes"
            />
          </label>

          <fieldset>
            <legend className="text-xs font-semibold text-ink-600">Choose your streak tree</legend>
            <p className="mt-1 text-xs leading-5 text-ink-400">It starts as soil and grows through five stages as your streak builds.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {plantChoices.map((plant) => (
                <button
                  key={plant.id}
                  className={cn(
                    "flex items-center gap-3 rounded-3xl border p-3 text-left transition sm:block sm:text-center",
                    plantType === plant.id
                      ? "border-leaf-500 bg-leaf-50 ring-1 ring-leaf-500"
                      : "border-line hover:bg-leaf-50/60",
                  )}
                  type="button"
                  onClick={() => setPlantType(plant.id)}
                  aria-pressed={plantType === plant.id}
                  aria-label={`Choose ${plant.label}`}
                >
                  <AnimatedPlant plantType={plant.id} stage={4} size={54} className="shrink-0 sm:mx-auto" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{plant.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-ink-400">{plant.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-ink-600">
              Type
              <select className={inputClass} value={type} onChange={(event) => setType(event.currentTarget.value as HabitType)}>
                <option value="binary">Simple check-off</option>
                <option value="quantity">Quantity</option>
                <option value="duration">Duration</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-ink-600">
              Time of day
              <select className={inputClass} value={timeOfDay} onChange={(event) => setTimeOfDay(event.currentTarget.value as TimeOfDay)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="anytime">Anytime</option>
              </select>
            </label>
          </div>

          <div className="rounded-3xl border border-line p-4">
            <button
              className="flex w-full items-center justify-between gap-4 text-left"
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              onClick={() => setReminderEnabled((current) => !current)}
            >
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-leaf-50 text-leaf-700">
                  <Bell size={17} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Habit reminder</span>
                  <span className="mt-0.5 block text-xs text-ink-400">Only sent while this habit is incomplete.</span>
                </span>
              </span>
              <span className={cn(
                "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
                reminderEnabled ? "justify-end bg-leaf-500" : "justify-start bg-line",
              )} aria-hidden="true">
                <span className="size-5 rounded-full bg-white shadow-sm" />
              </span>
            </button>
            {reminderEnabled && (
              <label className="mt-4 block max-w-44 text-xs font-semibold text-ink-600">
                Reminder time
                <input
                  className={inputClass}
                  type="time"
                  value={reminderTime}
                  onChange={(event) => setReminderTime(event.currentTarget.value)}
                />
              </label>
            )}
          </div>

          {type !== "binary" && (
            <div className="grid grid-cols-2 gap-4 rounded-3xl border border-line bg-canvas/50 p-4">
              <label className="block text-xs font-semibold text-ink-600">
                Habit target
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="any"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.currentTarget.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-ink-600">
                Unit
                <input
                  className={inputClass}
                  value={targetUnit}
                  onChange={(event) => setTargetUnit(event.currentTarget.value)}
                  placeholder={type === "duration" ? "minutes" : "pages"}
                />
              </label>
            </div>
          )}

          <fieldset>
            <legend className="text-xs font-semibold text-ink-600">Schedule</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {visibleScheduleOptions.map(([id, label, help]) => (
                <button
                  key={id}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    scheduleType === id
                      ? "border-leaf-500 bg-leaf-50 ring-1 ring-leaf-500"
                      : "border-line hover:bg-leaf-50/60",
                  )}
                  type="button"
                  onClick={() => setScheduleType(id)}
                  aria-pressed={scheduleType === id}
                >
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-0.5 block text-xs text-ink-400">{help}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {scheduleType === "specific_days" && (
            <fieldset>
              <legend className="text-xs font-semibold text-ink-600">Days of the week</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdays.map((weekday) => (
                  <button
                    key={weekday.id}
                    className={cn(
                      "grid size-9 place-items-center rounded-full border text-xs font-bold transition",
                      daysOfWeek.includes(weekday.id)
                        ? "border-ink-950 bg-ink-950 text-surface"
                        : "border-line text-ink-600 hover:bg-leaf-50",
                    )}
                    type="button"
                    onClick={() => toggleWeekday(weekday.id)}
                    aria-pressed={daysOfWeek.includes(weekday.id)}
                    aria-label={weekday.id}
                  >
                    {weekday.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {(scheduleType === "weekly_frequency" || scheduleType === "weekly_target") && (
            <label className="block max-w-xs text-xs font-semibold text-ink-600">
              {scheduleType === "weekly_frequency" ? "Times per week" : `Weekly ${targetUnit.trim() || "target"}`}
              <input
                className={inputClass}
                type="number"
                min="1"
                max={scheduleType === "weekly_frequency" ? 7 : undefined}
                step="any"
                value={weeklyAmount}
                onChange={(event) => setWeeklyAmount(event.currentTarget.value)}
              />
            </label>
          )}

          <button
            className="flex w-full items-center justify-between border-t border-line pt-4 text-sm font-semibold text-ink-600"
            type="button"
            onClick={() => setAdvancedOpen((current) => !current)}
            aria-expanded={advancedOpen}
          >
            Advanced details
            {advancedOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>

          {advancedOpen && (
            <div className="space-y-4 rounded-3xl border border-line bg-canvas/50 p-4">
              <label className="block text-xs font-semibold text-ink-600">
                Category <span className="font-normal text-ink-400">(optional)</span>
                <select className={inputClass} value={categoryId} onChange={(event) => setCategoryId(event.currentTarget.value)}>
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink-600">
                Description <span className="font-normal text-ink-400">(optional)</span>
                <textarea
                  className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink-950 outline-none transition focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
                  value={description}
                  maxLength={240}
                  onChange={(event) => setDescription(event.currentTarget.value)}
                  placeholder="Why this habit matters"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-ink-600">
                  Icon
                  <select className={inputClass} value={icon} onChange={(event) => setIcon(event.currentTarget.value)}>
                    {icons.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-ink-600">
                  Start date
                  <input
                    className={inputClass}
                    type="date"
                    value={startDate}
                    disabled={Boolean(habit)}
                    onChange={(event) => setStartDate(event.currentTarget.value)}
                  />
                  {habit && (
                    <span className="mt-1.5 block font-normal leading-4 text-ink-400">
                      Locked after creation to protect historical records.
                    </span>
                  )}
                </label>
              </div>
              <fieldset>
                <legend className="text-xs font-semibold text-ink-600">Colour</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colours.map((option) => (
                    <button
                      key={option}
                      className={cn(
                        "size-8 rounded-full border-2 border-surface shadow-sm ring-offset-2",
                        colour === option && "ring-2 ring-ink-600",
                      )}
                      style={{ backgroundColor: option }}
                      type="button"
                      onClick={() => setColour(option)}
                      aria-label={`Use colour ${option}`}
                      aria-pressed={colour === option}
                    />
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {error && <p id="habit-dialog-error" className="text-sm font-medium text-red-600" role="alert">{error}</p>}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
            {!habit && (
              <Button variant="ghost" onClick={() => setCreationCadence(null)}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </Button>
            )}
            <div className="ml-auto flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">{habit ? "Save changes" : "Add habit"}</Button>
            </div>
          </div>
        </form>
        )}
      </section>
    </div>
  );
}
