import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarRange,
  Check,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDriveDownload,
  Keyboard,
  Laptop,
  LockKeyhole,
  MessageSquareText,
  Moon,
  MoveHorizontal,
  Palette,
  RotateCcw,
  ShieldCheck,
  Send,
  Smartphone,
  Sun,
  X,
} from "lucide-react";
import type { AppTone, NotificationPreferences, ThemePreference, Weekday } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useDialogFocus } from "../hooks/useDialogFocus";

type WeekStart = Extract<Weekday, "mon" | "sun">;

interface SettingsPageProps {
  readonly themePreference: ThemePreference;
  readonly appTone: AppTone;
  readonly weekStartsOn: WeekStart;
  readonly habitCount: number;
  readonly completionCount: number;
  readonly scheduleCount: number;
  readonly confirmBeforeDelete: boolean;
  readonly notificationPreferences: NotificationPreferences;
  readonly onThemeChange: (theme: ThemePreference) => void;
  readonly onAppToneChange: (tone: AppTone) => void;
  readonly onWeekStartsOnChange: (weekday: WeekStart) => void;
  readonly onConfirmBeforeDeleteChange: (enabled: boolean) => void;
  readonly onNotificationPreferencesChange: (preferences: NotificationPreferences) => Promise<boolean>;
  readonly onExport: (format: "json" | "csv") => Promise<string | null>;
  readonly onBackup: () => Promise<string | null>;
  readonly onRestore: () => Promise<string | null>;
}

interface OperationStatus {
  readonly tone: "success" | "error";
  readonly message: string;
}

function pathName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function SettingsPage({
  themePreference,
  appTone,
  weekStartsOn,
  habitCount,
  completionCount,
  scheduleCount,
  confirmBeforeDelete,
  notificationPreferences,
  onThemeChange,
  onAppToneChange,
  onWeekStartsOnChange,
  onConfirmBeforeDeleteChange,
  onNotificationPreferencesChange,
  onExport,
  onBackup,
  onRestore,
}: SettingsPageProps) {
  const [busyAction, setBusyAction] = useState<string>();
  const [status, setStatus] = useState<OperationStatus>();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [feedbackType, setFeedbackType] = useState("Suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const restoreDialogRef = useDialogFocus<HTMLElement>(
    confirmRestore,
    () => setConfirmRestore(false),
  );

  const updateNotifications = async (patch: Partial<NotificationPreferences>) => {
    setNotificationBusy(true);
    const next = { ...notificationPreferences, ...patch };
    const applied = await onNotificationPreferencesChange(next);
    if (!applied && patch.enabled) {
      setStatus({
        tone: "error",
        message: "Notifications were not enabled. You can allow them in your device settings.",
      });
    }
    setNotificationBusy(false);
  };

  const run = async (label: string, operation: () => Promise<string | null>) => {
    setBusyAction(label);
    setStatus(undefined);
    try {
      const result = await operation();
      if (result) {
        setStatus({
          tone: "success",
          message: label === "Restore"
            ? result
            : `${label} saved as ${pathName(result)}.`,
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : `${label} failed. Please try again.`,
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const themeOptions: ReadonlyArray<{
    id: ThemePreference;
    label: string;
    description: string;
    icon: typeof Laptop;
  }> = [
    { id: "system", label: "System", description: "Follow this device", icon: Laptop },
    { id: "light", label: "Light", description: "Always light", icon: Sun },
    { id: "dark", label: "Dark", description: "Always dark", icon: Moon },
  ];

  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = feedbackMessage.trim();
    if (!message) return;
    const subject = encodeURIComponent(`Habitree feedback: ${feedbackType}`);
    const body = encodeURIComponent(`${message}\n\n— Sent from Habitree`);
    window.location.assign(`mailto:sargaur03@gmail.com?subject=${subject}&body=${body}`);
  };
  const toneOptions: ReadonlyArray<{
    id: AppTone;
    label: string;
    swatch: string;
  }> = [
    { id: "blue", label: "Blue", swatch: "#3b82f6" },
    { id: "purple", label: "Purple", swatch: "#8b5cf6" },
    { id: "green", label: "Green", swatch: "#22a06b" },
    { id: "yellow", label: "Yellow", swatch: "#e3a008" },
    { id: "orange", label: "Orange", swatch: "#f97316" },
    { id: "coral", label: "Coral", swatch: "#f0645a" },
  ];

  return (
    <div className="app-content-page mobile-page-safe mx-auto max-w-[1200px] px-5 pb-7 sm:px-8 sm:py-9 xl:px-12">
      <header>
        <h1 className="app-section-title">Settings</h1>
        <p className="mt-2 hidden text-sm text-ink-600 lg:block">Appearance, calendar preferences, and control of your local data.</p>
      </header>

      {status && (
        <div
          className={cn(
            "mt-5 flex items-start gap-3 rounded-3xl border px-4 py-3 text-sm sm:mt-6",
            status.tone === "success"
              ? "border-leaf-100 bg-leaf-50 text-leaf-700"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
          )}
          role="status"
        >
          {status.tone === "success" ? <Check className="mt-0.5 shrink-0" size={16} /> : <AlertTriangle className="mt-0.5 shrink-0" size={16} />}
          <span className="min-w-0 break-words">{status.message}</span>
          <button className="ml-auto shrink-0" type="button" onClick={() => setStatus(undefined)} aria-label="Dismiss status"><X size={16} /></button>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700"><Bell size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-bold tracking-[-0.02em]">Notifications</h2>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Enable notifications"
                    aria-checked={notificationPreferences.enabled}
                    disabled={notificationBusy}
                    className={cn(
                      "inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50",
                      notificationPreferences.enabled ? "justify-end bg-leaf-500" : "justify-start bg-line",
                    )}
                    onClick={() => void updateNotifications({ enabled: !notificationPreferences.enabled })}
                  >
                    <span className="size-6 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
                <p className="mt-1 text-xs leading-5 text-ink-400">Gentle, local reminders that stop when they are no longer useful.</p>
              </div>
            </div>

            {notificationPreferences.enabled && (
              <div className="mt-5 space-y-4 border-t border-line pt-5">
                <div className="grid grid-cols-3 gap-3">
                  <label className="text-xs font-semibold text-ink-600">
                    Morning summary
                    <input
                      className="mt-1.5 h-11 w-full rounded-full border border-line bg-surface px-3 text-sm"
                      type="time"
                      value={notificationPreferences.dailyBriefingTime}
                      onChange={(event) => void updateNotifications({ dailyBriefingTime: event.currentTarget.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-600">
                    Quiet from
                    <input
                      className="mt-1.5 h-11 w-full rounded-full border border-line bg-surface px-3 text-sm"
                      type="time"
                      value={notificationPreferences.quietHoursStart}
                      onChange={(event) => void updateNotifications({ quietHoursStart: event.currentTarget.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-600">
                    Quiet until
                    <input
                      className="mt-1.5 h-11 w-full rounded-full border border-line bg-surface px-3 text-sm"
                      type="time"
                      value={notificationPreferences.quietHoursEnd}
                      onChange={(event) => void updateNotifications({ quietHoursEnd: event.currentTarget.value })}
                    />
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ["dailyBriefing", "Daily summary", "Yesterday’s result and today’s clearest focus"],
                    ["endOfDay", "End-of-day nudge", "Only when daily habits remain open"],
                    ["weeklyProgress", "Weekly progress", "A midweek note when a goal is behind pace"],
                    ["weeklySummary", "Weekly summary", "A calm review at the end of your week"],
                    ["freshStart", "Fresh starts", "A neutral next step after a missed habit"],
                    ["inactivityCheckIn", "Gentle check-ins", "An invitation back after three quiet days"],
                  ] as const).map(([key, label, description]) => (
                    <button
                      key={key}
                      type="button"
                      role="switch"
                      aria-checked={notificationPreferences[key]}
                      className="flex items-center justify-between gap-3 rounded-3xl border border-line px-4 py-3 text-left"
                      onClick={() => void updateNotifications({ [key]: !notificationPreferences[key] })}
                    >
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-ink-400">{description}</span>
                      </span>
                      <span className={cn(
                        "inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5",
                        notificationPreferences[key] ? "justify-end bg-leaf-500" : "justify-start bg-line",
                      )} aria-hidden="true"><span className="size-4 rounded-full bg-white" /></span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-5 text-ink-400">Individual habit times are set when adding or editing a habit. Habitree groups reminders that occur together.</p>
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700"><Sun size={17} /></span>
              <div>
                <h2 className="font-bold tracking-[-0.02em]">Appearance</h2>
                <p className="mt-1 hidden text-xs leading-5 text-ink-400 sm:block">Choose the brightness and accent colour of the app.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const selected = themePreference === option.id;
                return (
                  <button
                    key={option.id}
                    className={cn(
                      "flex items-center gap-3 rounded-3xl border p-3.5 text-left transition sm:p-4",
                      selected ? "border-leaf-500 bg-leaf-50 ring-2 ring-leaf-100" : "border-line hover:bg-leaf-50/50",
                    )}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onThemeChange(option.id)}
                  >
                    <Icon size={17} className={selected ? "text-leaf-700" : "text-ink-400"} />
                    <span>
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-0.5 hidden text-[10px] text-ink-400 sm:block">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="my-5 border-t border-line" />
            <fieldset>
              <legend className="flex items-center gap-2 text-xs font-semibold text-ink-600">
                <Palette size={14} aria-hidden="true" />
                Accent colour
              </legend>
              <p className="mt-1 hidden text-[11px] leading-5 text-ink-400 sm:block">Choose the colour used for highlights, progress and selected controls.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {toneOptions.map((option) => {
                  const selected = appTone === option.id;
                  return (
                    <button
                      key={option.id}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-3 py-2.5 text-left text-xs font-semibold transition",
                        selected
                          ? "border-leaf-500 bg-leaf-50 ring-2 ring-leaf-100"
                          : "border-line hover:bg-leaf-50/50",
                      )}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onAppToneChange(option.id)}
                    >
                      <span className="size-3 rounded-full" style={{ backgroundColor: option.swatch }} aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700"><ShieldCheck size={17} /></span>
              <div>
                <h2 className="font-bold tracking-[-0.02em]">Safety</h2>
                <p className="mt-1 hidden text-xs leading-5 text-ink-400 sm:block">Control safeguards around destructive actions.</p>
              </div>
            </div>
            <button
              className="mt-5 flex w-full items-center justify-between gap-4 rounded-3xl border border-line p-4 text-left transition hover:bg-leaf-50/50"
              type="button"
              role="switch"
              aria-checked={confirmBeforeDelete}
              onClick={() => onConfirmBeforeDeleteChange(!confirmBeforeDelete)}
            >
              <span>
                <span className="block text-sm font-semibold">Confirm before deleting</span>
                <span className="mt-1 hidden text-xs leading-5 text-ink-400 sm:block">Show a warning before a habit is removed from active lists.</span>
              </span>
              <span className={cn(
                "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
                confirmBeforeDelete ? "justify-end bg-leaf-500" : "justify-start bg-line",
              )} aria-hidden="true">
                <span className="size-5 rounded-full bg-white shadow-sm" />
              </span>
            </button>
            <div className="mt-5 border-t border-line pt-5 lg:hidden">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-leaf-700">
                <Smartphone size={15} aria-hidden="true" />
                Touch controls
              </div>
              <ul className="mt-3 space-y-2.5 text-xs leading-5 text-ink-600">
                <li className="flex items-start gap-2.5"><MoveHorizontal className="mt-0.5 shrink-0 text-ink-400" size={14} aria-hidden="true" /><span>Swipe an open area on Home to move between days or weeks.</span></li>
                <li className="flex items-start gap-2.5"><MoveHorizontal className="mt-0.5 shrink-0 text-ink-400" size={14} aria-hidden="true" /><span>Swipe a habit left to reveal Delete.</span></li>
                <li className="flex items-start gap-2.5"><Smartphone className="mt-0.5 shrink-0 text-ink-400" size={14} aria-hidden="true" /><span>Press and hold a habit for actions, or tap its plant.</span></li>
              </ul>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700"><MessageSquareText size={17} /></span>
              <div>
                <h2 className="font-bold tracking-[-0.02em]">Send feedback</h2>
                <p className="mt-1 hidden text-xs leading-5 text-ink-400 sm:block">Share an idea or report a problem.</p>
              </div>
            </div>
            <form className="mt-5 space-y-4" onSubmit={submitFeedback}>
              <label className="block text-xs font-semibold text-ink-600" htmlFor="feedback-type">Feedback type</label>
              <select
                id="feedback-type"
                className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
                value={feedbackType}
                onChange={(event) => setFeedbackType(event.currentTarget.value)}
              >
                <option>Suggestion</option>
                <option>Problem</option>
                <option>Something I like</option>
              </select>
              <label className="block text-xs font-semibold text-ink-600" htmlFor="feedback-message">Message</label>
              <textarea
                id="feedback-message"
                className="min-h-28 w-full resize-y rounded-xl border border-line bg-surface p-3 text-sm leading-6 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
                value={feedbackMessage}
                onChange={(event) => setFeedbackMessage(event.currentTarget.value)}
                placeholder="What would make Habitree better for you?"
                required
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="hidden text-[11px] leading-5 text-ink-400 sm:block">This opens your email app. Nothing is sent until you choose Send.</p>
                <Button type="submit" disabled={!feedbackMessage.trim()}>
                  <Send size={15} aria-hidden="true" />
                  Prepare feedback
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"><CalendarRange size={17} /></span>
              <div>
                <h2 className="font-bold tracking-[-0.02em]">Calendar</h2>
                <p className="mt-1 hidden text-xs leading-5 text-ink-400 sm:block">This changes week boundaries everywhere.</p>
              </div>
            </div>
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold text-ink-600">First day of the week</legend>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["mon", "sun"] as const).map((day) => {
                  const selected = weekStartsOn === day;
                  return (
                    <button
                      key={day}
                      className={cn(
                        "rounded-full border px-4 py-3 text-sm font-semibold transition",
                        selected ? "border-leaf-500 bg-leaf-50 text-leaf-700 ring-2 ring-leaf-100" : "border-line text-ink-600 hover:bg-leaf-50/50",
                      )}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onWeekStartsOnChange(day)}
                    >
                      {day === "mon" ? "Monday" : "Sunday"}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700"><Download size={17} /></span>
                <div>
                  <h2 className="font-bold tracking-[-0.02em]">Export your data</h2>
                  <p className="mt-1 hidden text-xs leading-5 text-ink-400 sm:block">Exports never alter your database or completion history.</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-line">
              <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <FileJson className="text-ink-400" size={19} />
                  <div><p className="text-sm font-semibold">JSON archive</p><p className="mt-0.5 hidden text-[11px] text-ink-400 sm:block">Complete, structured and portable</p></div>
                </div>
                <Button variant="secondary" disabled={Boolean(busyAction)} onClick={() => void run("JSON export", () => onExport("json"))}>
                  {busyAction === "JSON export" ? "Saving…" : "Export JSON"}
                </Button>
              </div>
              <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="text-ink-400" size={19} />
                  <div><p className="text-sm font-semibold">CSV history</p><p className="mt-0.5 hidden text-[11px] text-ink-400 sm:block">Completion rows for spreadsheets</p></div>
                </div>
                <Button variant="secondary" disabled={Boolean(busyAction)} onClick={() => void run("CSV export", () => onExport("csv"))}>
                  {busyAction === "CSV export" ? "Saving…" : "Export CSV"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"><Database size={17} /></span>
                <div>
                  <h2 className="font-bold tracking-[-0.02em]">Backup and restore</h2>
                  <p className="mt-1 hidden text-xs leading-5 text-ink-400 sm:block">Create an exact SQLite backup or stage a validated restore.</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <div className="rounded-3xl border border-line p-4">
                <HardDriveDownload className="text-leaf-700" size={20} />
                <p className="mt-3 text-sm font-semibold">Database backup</p>
                <p className="mt-1 hidden min-h-10 text-xs leading-5 text-ink-400 sm:block">Save a restorable copy of every habit, schedule and check-in.</p>
                <Button className="mt-4 w-full" variant="secondary" disabled={Boolean(busyAction)} onClick={() => void run("Backup", onBackup)}>
                  {busyAction === "Backup" ? "Backing up…" : "Create backup"}
                </Button>
              </div>
              <div className="rounded-3xl border border-line p-4">
                <RotateCcw className="text-ink-600" size={20} />
                <p className="mt-3 text-sm font-semibold">Restore backup</p>
                <p className="mt-1 hidden min-h-10 text-xs leading-5 text-ink-400 sm:block">Validate a database and apply it safely on the next restart.</p>
                <Button className="mt-4 w-full" variant="secondary" disabled={Boolean(busyAction)} onClick={() => setConfirmRestore(true)}>
                  Choose backup…
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <aside className="hidden space-y-6 lg:block">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-leaf-700">
              <Keyboard size={17} aria-hidden="true" />
              <h2 className="text-xs font-bold uppercase tracking-[0.14em]">Keyboard</h2>
            </div>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-4"><dt className="text-ink-600">New habit</dt><dd><kbd className="rounded border border-line bg-canvas px-1.5 py-1 font-sans">⌘/Ctrl N</kbd></dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-ink-600">Change section</dt><dd><kbd className="rounded border border-line bg-canvas px-1.5 py-1 font-sans">Alt 1–6</kbd></dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-ink-600">Close a dialog</dt><dd><kbd className="rounded border border-line bg-canvas px-1.5 py-1 font-sans">Esc</kbd></dd></div>
            </dl>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-leaf-700"><ShieldCheck size={17} /><p className="text-xs font-bold uppercase tracking-[0.14em]">Local by design</p></div>
            <p className="mt-4 text-sm font-semibold leading-6">Your habit data stays on this Mac.</p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-ink-400">
              <li className="flex gap-2"><LockKeyhole className="mt-0.5 shrink-0" size={13} />No account or cloud database</li>
              <li className="flex gap-2"><LockKeyhole className="mt-0.5 shrink-0" size={13} />No internet required for tracking</li>
              <li className="flex gap-2"><LockKeyhole className="mt-0.5 shrink-0" size={13} />Exports happen only when you request them</li>
            </ul>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Local database</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-600">Habits</dt><dd className="font-bold">{habitCount}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-600">Schedule versions</dt><dd className="font-bold">{scheduleCount}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-600">Check-ins</dt><dd className="font-bold">{completionCount}</dd></div>
            </dl>
          </Card>

          <Card className="border-leaf-100 bg-leaf-50 p-5 shadow-none">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf-700">Backup safety</p>
            <p className="mt-3 text-xs leading-5 text-ink-600">Before a restore is applied, Habitree preserves the current database as a pre-restore safety copy.</p>
          </Card>
        </aside>
      </div>

      {confirmRestore && (
        <div className="mobile-dialog-layer fixed inset-0 z-[70] grid place-items-center bg-ink-950/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setConfirmRestore(false)}>
          <section ref={restoreDialogRef} className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:p-6" role="alertdialog" aria-modal="true" aria-labelledby="restore-title" aria-describedby="restore-description" tabIndex={-1}>
            <span className="grid size-10 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"><AlertTriangle size={19} /></span>
            <h2 id="restore-title" className="mt-4 text-xl font-bold tracking-[-0.03em]">Restore from a backup?</h2>
            <p id="restore-description" className="mt-2 text-sm leading-6 text-ink-600">The selected database will be validated and staged. Nothing changes until you restart Habitree.</p>
            <p className="mt-3 rounded-2xl border border-line bg-canvas px-3 py-2.5 text-xs leading-5 text-ink-600">Your current database is preserved automatically before the staged backup is applied.</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmRestore(false)} data-dialog-autofocus>Cancel</Button>
              <Button data-haptic="warning" onClick={() => {
                setConfirmRestore(false);
                void run("Restore", onRestore);
              }}>Choose backup</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
