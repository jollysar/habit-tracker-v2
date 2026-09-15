import { useEffect, useMemo, useRef, useState } from "react";
import { addDaysToLocalDateKey, toLocalDateKey } from "./application/dates/localDate";
import {
  buildDataExport,
  serializeCsvExport,
  serializeJsonExport,
} from "./application/data/dataExport";
import {
  deleteHabit,
  markHabitSkipped,
  resetHabitCheckIn,
  toggleHabitCompletion,
} from "./application/habits/updateTodayHabit";
import { buildTodayDashboard } from "./application/today/buildTodayDashboard";
import {
  buildTodayHighlights,
  splitTodayHabits,
} from "./application/today/buildTodayHighlights";
import {
  buildScheduledTodayHabits,
  deriveMissedCompletions,
  startOfLocalWeek,
} from "./application/scheduling/habitScheduling";
import {
  buildWeekDashboard,
} from "./application/week/buildWeekDashboard";
import {
  weeklyProgressFromSettings,
  weeklyProgressKey,
  weeklyProgressSettingKey,
  type WeeklyProgressOverrides,
} from "./application/week/weeklyProgress";
import { buildNotificationPlan } from "./application/notifications/buildNotificationPlan";
import type { PlannedNotification } from "./application/notifications/buildNotificationPlan";
import {
  defaultNotificationPreferences,
  NOTIFICATION_SETTINGS_KEY,
  notificationPreferencesFromSettings,
  serializeNotificationPreferences,
} from "./application/notifications/notificationPreferences";
import type { HabitRepository } from "./domain/habits/HabitRepository";
import type {
  CompletionRecord,
  CompletionStatus,
  AppTone,
  HabitCategory,
  HabitProgressRecord,
  HabitReminder,
  HabitScheduleRecord,
  ManagedHabit,
  NotificationPreferences,
  ThemePreference,
  TodayHabit,
} from "./domain/habits/models";
import {
  demoCategories,
  demoTodayHabits,
} from "./infrastructure/demo/todayData";
import { createHabitRepository } from "./infrastructure/sqlite/createHabitRepository";
import {
  chooseAndStageDatabaseRestore,
  saveDatabaseBackup,
  saveTextExport,
} from "./infrastructure/native/dataFiles";
import {
  COMPLETE_ACTION,
  listenForNotificationActions,
  requestNotificationPermission,
  showExternalCompletionConfirmation,
  syncNativeNotifications,
} from "./infrastructure/native/notifications";
import { DeleteHabitDialog } from "./presentation/components/DeleteHabitDialog";
import { ProgressDialog } from "./presentation/components/ProgressDialog";
import {
  HabitDialog,
  type HabitDraft,
} from "./presentation/components/HabitDialog";
import { AppShell, type AppSection } from "./presentation/layout/AppShell";
import { CalendarPage } from "./presentation/pages/CalendarPage";
import { AnalyticsPage } from "./presentation/pages/AnalyticsPage";
import { SettingsPage } from "./presentation/pages/SettingsPage";
import { TodayPage } from "./presentation/pages/TodayPage";
import { WeekPage, type WeekHabitView } from "./presentation/pages/WeekPage";

type WeekStart = "mon" | "sun";

function getInitialThemePreference(): ThemePreference {
  const savedTheme = localStorage.getItem("habit-tracker-theme");
  return savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
    ? savedTheme
    : "system";
}

function getInitialWeekStart(): WeekStart {
  return localStorage.getItem("habit-tracker-week-start") === "sun" ? "sun" : "mon";
}

function normalizeAppTone(value: string | null | undefined): AppTone | undefined {
  if (
    value === "blue" || value === "purple" || value === "green" ||
    value === "yellow" || value === "orange" || value === "coral"
  ) return value;
  if (value === "slate") return "blue";
  if (value === "sage" || value === "neutral") return "green";
  if (value === "warm") return "orange";
  return undefined;
}

function getInitialAppTone(): AppTone {
  return normalizeAppTone(localStorage.getItem("habit-tracker-tone")) ?? "green";
}

function getInitialDeleteConfirmation(): boolean {
  return localStorage.getItem("habit-tracker-confirm-before-delete") !== "false";
}

function createDemoManagedHabits(localDate: string): readonly ManagedHabit[] {
  const historyStart = addDaysToLocalDateKey(localDate, -27);
  return demoTodayHabits.map((habit, index) => ({
    ...habit,
    startDate: historyStart,
    isArchived: false,
    sortOrder: index,
    schedule: {
      type: "daily",
      effectiveFrom: historyStart,
    },
  }));
}

function createDemoHistory(
  habits: readonly ManagedHabit[],
  localDate: string,
): { completions: CompletionRecord[]; progress: HabitProgressRecord[] } {
  const completions: CompletionRecord[] = [];
  const progress: HabitProgressRecord[] = [];
  habits.forEach((habit, habitIndex) => {
    for (let offset = -27; offset <= 0; offset += 1) {
      const date = addDaysToLocalDateKey(localDate, offset);
      const todayDemo = demoTodayHabits.find((item) => item.id === habit.id);
      const status = offset === 0
        ? todayDemo?.status
        : (Math.abs(offset) + habitIndex) % 9 === 0
          ? "missed"
          : (Math.abs(offset) + habitIndex) % 13 === 0
            ? "skipped"
            : "completed";
      if (!status || status === "incomplete") continue;
      const value = status === "completed" && habit.type !== "binary"
        ? habit.targetValue
        : undefined;
      completions.push({ habitId: habit.id, date, status, value });
      if (value !== undefined) progress.push({ habitId: habit.id, date, value });
    }
  });
  return { completions, progress };
}

async function readPersistentHabitData(
  repository: HabitRepository,
  localDate: string,
  weekStartsOn: WeekStart,
  selectedDate: string = localDate,
) {
  const [savedAll, savedCategories, schedules, settings, reminders] = await Promise.all([
    repository.listAll(),
    repository.listCategories(),
    repository.listSchedules(),
    repository.listSettings(),
    repository.listReminders(),
  ]);
  const earliestStartDate = savedAll.reduce(
    (earliest, habit) => habit.startDate < earliest ? habit.startDate : earliest,
    localDate,
  );
  let [completions, progress] = await Promise.all([
    repository.listCompletions(earliestStartDate, localDate),
    repository.listProgress(earliestStartDate, localDate),
  ]);
  const missed = deriveMissedCompletions(savedAll, completions, localDate);
  if (missed.length > 0) {
    await repository.recordMissedCompletions(missed);
    completions = [
      ...completions,
      ...missed.map((completion) => ({ ...completion, status: "missed" as const })),
    ];
  }
  const savedWeekStart = settings.week_starts_on === "sun" ? "sun" :
    settings.week_starts_on === "mon" ? "mon" : weekStartsOn;
  const weeklyProgress = weeklyProgressFromSettings(settings);
  return {
    today: buildScheduledTodayHabits(
      savedAll, completions, selectedDate, progress, savedWeekStart, weeklyProgress,
    ),
    all: savedAll,
    categories: savedCategories,
    schedules,
    completions,
    progress,
    settings,
    weeklyProgress,
    reminders,
  };
}

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("today");
  const [weekHabitView, setWeekHabitView] = useState<WeekHabitView>("daily");
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    getInitialThemePreference,
  );
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStart>(getInitialWeekStart);
  const [appTone, setAppTone] = useState<AppTone>(getInitialAppTone);
  const [confirmBeforeDelete, setConfirmBeforeDelete] = useState(getInitialDeleteConfirmation);
  const [savedSettings, setSavedSettings] = useState<Readonly<Record<string, string>>>({});
  const [reminders, setReminders] = useState<readonly HabitReminder[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressOverrides>({});
  const theme: "light" | "dark" = themePreference === "system"
    ? systemDark ? "dark" : "light"
    : themePreference;
  const habitRepository = useMemo(createHabitRepository, []);
  const [localDate, setLocalDate] = useState(() => toLocalDateKey(new Date()));
  const [selectedHomeDate, setSelectedHomeDate] = useState(localDate);
  const localDateRef = useRef(localDate);
  const notificationPlanRef = useRef<readonly PlannedNotification[]>([]);
  const [habits, setHabits] = useState<readonly TodayHabit[]>(
    () => createDemoManagedHabits(localDate),
  );
  const [managedHabits, setManagedHabits] = useState<readonly ManagedHabit[]>(
    () => createDemoManagedHabits(localDate),
  );
  const demoHistory = useMemo(
    () => createDemoHistory(createDemoManagedHabits(localDate), localDate),
    [localDate],
  );
  const [completionHistory, setCompletionHistory] = useState<readonly CompletionRecord[]>(
    demoHistory.completions,
  );
  const [progressHistory, setProgressHistory] = useState<readonly HabitProgressRecord[]>(
    demoHistory.progress,
  );
  const [scheduleHistory, setScheduleHistory] = useState<readonly HabitScheduleRecord[]>(
    () => createDemoManagedHabits(localDate).map((habit) => ({
      ...habit.schedule,
      habitId: habit.id,
    })),
  );
  const [categories, setCategories] = useState<readonly HabitCategory[]>(demoCategories);
  const [habitDialog, setHabitDialog] = useState<
    { mode: "add" } | { mode: "edit"; habitId: string } | null
  >(null);
  const [habitToDeleteId, setHabitToDeleteId] = useState<string | null>(null);
  const [habitToLogId, setHabitToLogId] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  const todayHabitLanes = useMemo(
    () => splitTodayHabits(habits),
    [habits],
  );
  const dashboard = useMemo(
    () => buildTodayDashboard(
      todayHabitLanes.daily,
      new Date(`${selectedHomeDate}T12:00:00`),
    ),
    [selectedHomeDate, todayHabitLanes.daily],
  );
  const selectedWeek = useMemo(
    () => buildWeekDashboard(
      managedHabits,
      scheduleHistory,
      completionHistory,
      progressHistory,
      selectedHomeDate,
      localDate,
      weekStartsOn,
      weeklyProgress,
    ),
    [managedHabits, scheduleHistory, completionHistory, progressHistory, selectedHomeDate, localDate, weekStartsOn, weeklyProgress],
  );
  const todayHighlights = useMemo(
    () => buildTodayHighlights(selectedWeek, scheduleHistory, selectedHomeDate),
    [selectedWeek, scheduleHistory, selectedHomeDate],
  );
  const editingHabit = habitDialog?.mode === "edit"
    ? managedHabits.find((habit) => habit.id === habitDialog.habitId) ??
      habits.find((habit) => habit.id === habitDialog.habitId)
    : undefined;
  const habitToDelete = managedHabits.find(
    (habit) => habit.id === habitToDeleteId,
  ) ?? habits.find((habit) => habit.id === habitToDeleteId);
  const habitToLog = habits.find((habit) => habit.id === habitToLogId);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemDark(media.matches);
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    let midnightTimer: number | undefined;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      midnightTimer = window.setTimeout(
        refreshLocalDate,
        nextMidnight.getTime() - now.getTime() + 100,
      );
    };

    const refreshLocalDate = () => {
      window.clearTimeout(midnightTimer);
      const nextLocalDate = toLocalDateKey(new Date());
      const previousLocalDate = localDateRef.current;

      if (nextLocalDate !== previousLocalDate) {
        localDateRef.current = nextLocalDate;
        setLocalDate(nextLocalDate);
        setSelectedHomeDate((selectedDate) =>
          selectedDate === previousLocalDate ? nextLocalDate : selectedDate,
        );
      }

      scheduleMidnightRefresh();
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshLocalDate();
    };

    scheduleMidnightRefresh();
    window.addEventListener("focus", refreshLocalDate);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", refreshLocalDate);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("habit-tracker-theme", themePreference);
  }, [theme, themePreference]);

  useEffect(() => {
    document.documentElement.dataset.tone = appTone;
    localStorage.setItem("habit-tracker-tone", appTone);
  }, [appTone]);

  useEffect(() => {
    if (!habitRepository) return;
    let cancelled = false;

    const loadPersistentData = async () => {
      try {
        await habitRepository.ensureStarterData(demoTodayHabits, localDate);
        const saved = await readPersistentHabitData(
          habitRepository, localDate, weekStartsOn, selectedHomeDate,
        );
        if (!cancelled) {
          setHabits(saved.today);
          setManagedHabits(saved.all);
          setCategories(saved.categories);
          setScheduleHistory(saved.schedules);
          setCompletionHistory(saved.completions);
          setProgressHistory(saved.progress);
          setSavedSettings(saved.settings);
          setReminders(saved.reminders);
          setNotificationPreferences(notificationPreferencesFromSettings(saved.settings));
          setWeeklyProgress(saved.weeklyProgress);
          if (
            saved.settings.theme === "system" ||
            saved.settings.theme === "light" ||
            saved.settings.theme === "dark"
          ) {
            setThemePreference(saved.settings.theme);
          }
          if (saved.settings.week_starts_on === "mon" || saved.settings.week_starts_on === "sun") {
            setWeekStartsOn(saved.settings.week_starts_on);
          }
          const savedAccent = normalizeAppTone(saved.settings.app_tone);
          if (savedAccent) setAppTone(savedAccent);
          if (saved.settings.confirm_before_delete === "true" || saved.settings.confirm_before_delete === "false") {
            const shouldConfirm = saved.settings.confirm_before_delete === "true";
            setConfirmBeforeDelete(shouldConfirm);
            localStorage.setItem("habit-tracker-confirm-before-delete", String(shouldConfirm));
          }
          setDataError(null);
        }
      } catch (error) {
        console.error("Unable to initialize the local habit database", error);
        if (!cancelled) {
          setDataError(
            "Your local database could not be opened. Changes will not be saved until the app is restarted successfully.",
          );
        }
      }
    };

    void loadPersistentData();
    return () => {
      cancelled = true;
    };
  }, [habitRepository, localDate, selectedHomeDate]);

  const openAddHabit = () => {
    setHabitDialog({ mode: "add" });
  };

  useEffect(() => {
    const sectionShortcuts: Record<string, AppSection> = {
      "1": "today",
      "2": "week",
      "3": "calendar",
      "4": "analytics",
      "5": "settings",
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const modalOpen = habitDialog !== null || habitToDeleteId !== null || habitToLogId !== null;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        if (!modalOpen) openAddHabit();
        return;
      }
      if (!event.altKey || event.metaKey || event.ctrlKey || modalOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const section = sectionShortcuts[event.key];
      if (section) {
        event.preventDefault();
        setActiveSection(section);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [habitDialog, habitToDeleteId, habitToLogId]);

  const refreshPersistentData = async () => {
    if (!habitRepository) return;
    const saved = await readPersistentHabitData(
      habitRepository, localDate, weekStartsOn, selectedHomeDate,
    );
    setHabits(saved.today);
    setManagedHabits(saved.all);
    setCategories(saved.categories);
    setScheduleHistory(saved.schedules);
    setCompletionHistory(saved.completions);
    setProgressHistory(saved.progress);
    setSavedSettings(saved.settings);
    setReminders(saved.reminders);
    setNotificationPreferences(notificationPreferencesFromSettings(saved.settings));
    setWeeklyProgress(saved.weeklyProgress);
  };

  const recoverFromPersistenceFailure = async (
    message: string,
    error: unknown,
  ) => {
    console.error(message, error);
    setDataError(message);
    if (!habitRepository) return;
    try {
      await refreshPersistentData();
    } catch (reloadError) {
      console.error("Unable to reload habits after a database error", reloadError);
    }
  };

  const updateCompletionHistoryForDate = (
    habitId: string,
    date: string,
    status: CompletionStatus,
    value?: number,
  ) => {
    setCompletionHistory((current) => {
      const remaining = current.filter(
        (record) => record.habitId !== habitId || record.date !== date,
      );
      return status === "incomplete"
        ? remaining
        : [...remaining, { habitId, date, status, value }];
    });
  };

  const handleSaveHabit = (draft: HabitDraft) => {
    const { reminder, ...habitDraft } = draft;
    if (reminder && !notificationPreferences.enabled) {
      void handleNotificationPreferencesChange({
        ...notificationPreferences,
        enabled: true,
      });
    }
    const categoryName = categories.find(
      (category) => category.id === draft.categoryId,
    )?.name;

    if (habitDialog?.mode === "edit") {
      const currentHabit = managedHabits.find(
        (habit) => habit.id === habitDialog.habitId,
      );
      if (!currentHabit) return;
      const updatedHabit: ManagedHabit = {
        ...currentHabit,
        ...habitDraft,
        categoryName,
        schedule: habitDraft.schedule,
      };
      setManagedHabits((current) =>
        current.map((habit) => habit.id === updatedHabit.id ? updatedHabit : habit),
      );
      setHabits((current) =>
        current.map((habit) =>
          habit.id === updatedHabit.id
            ? { ...habit, ...habitDraft, categoryName, schedule: habitDraft.schedule }
            : habit,
        ),
      );
      if (habitRepository) {
        void Promise.all([
          habitRepository.updateHabit(updatedHabit, localDate),
          habitRepository.setHabitReminder(updatedHabit.id, reminder),
        ])
          .then(refreshPersistentData)
          .catch((error) => recoverFromPersistenceFailure(
            "The habit could not be updated. Your saved data has been restored.",
            error,
          ));
      }
    } else {
      const activeCount = managedHabits.filter((habit) => !habit.isArchived).length;
      const newHabit: ManagedHabit = {
        ...habitDraft,
        id: crypto.randomUUID(),
        categoryName,
        status: "incomplete",
        streak: 0,
        value: draft.type === "binary" ? undefined : 0,
        isArchived: false,
        sortOrder: activeCount,
      };
      setManagedHabits((current) => [...current, newHabit]);
      if (draft.startDate <= localDate) {
        setHabits((current) => [...current, newHabit]);
      }
      if (habitRepository) {
        void habitRepository.createHabit(newHabit, localDate)
          .then(() => habitRepository.setHabitReminder(newHabit.id, reminder))
          .then(refreshPersistentData)
          .catch((error) => recoverFromPersistenceFailure(
            "The habit could not be created. Your saved data has been restored.",
            error,
          ));
      }
    }
    setHabitDialog(null);
  };

  const handleToggleHabit = (habitId: string) => {
    const currentHabit = habits.find((habit) => habit.id === habitId);
    if (!currentHabit) return;
    const nextHabits = toggleHabitCompletion(habits, habitId);
    const nextHabit = nextHabits.find((habit) => habit.id === habitId);
    if (!nextHabit) return;
    setHabits(nextHabits);

    const persistedHabit =
      nextHabit.status === "completed" &&
      currentHabit.schedule?.type === "weekly_target"
        ? {
            ...nextHabit,
            value: Math.max(
              0,
              (currentHabit.targetValue ?? 0) - (currentHabit.value ?? 0),
            ),
          }
        : nextHabit;
    updateCompletionHistoryForDate(
      habitId,
      selectedHomeDate,
      nextHabit.status,
      nextHabit.status === "completed" ? persistedHabit.value : undefined,
    );

    if (habitRepository) {
      const operation = nextHabit.status === "incomplete"
        ? habitRepository.clearCheckIn(habitId, selectedHomeDate)
        : habitRepository.setCheckIn(persistedHabit, selectedHomeDate, "completed");
      void operation.then(refreshPersistentData).catch((error) =>
        recoverFromPersistenceFailure(
          "That check-in could not be saved. Your saved data has been restored.",
          error,
        ),
      );
    }
  };

  const handleSkipHabit = (habitId: string) => {
    const nextHabits = markHabitSkipped(habits, habitId);
    const nextHabit = nextHabits.find((habit) => habit.id === habitId);
    if (!nextHabit) return;
    setHabits(nextHabits);
    updateCompletionHistoryForDate(habitId, selectedHomeDate, "skipped");
    if (habitRepository) {
      void habitRepository.setCheckIn(nextHabit, selectedHomeDate, "skipped")
        .then(refreshPersistentData).catch(
        (error) => recoverFromPersistenceFailure(
          "The skipped check-in could not be saved. Your saved data has been restored.",
          error,
        ),
      );
    }
  };

  const handleResetHabit = (habitId: string) => {
    setHabits((current) => resetHabitCheckIn(current, habitId));
    updateCompletionHistoryForDate(habitId, selectedHomeDate, "incomplete");
    if (habitRepository) {
      void habitRepository.clearCheckIn(habitId, selectedHomeDate)
        .then(refreshPersistentData).catch((error) =>
        recoverFromPersistenceFailure(
          "The check-in could not be reset. Your saved data has been restored.",
          error,
        ),
      );
    }
  };

  const handleSaveProgress = (value: number) => {
    if (!habitToLog) return;
    const habit = habitToLog;
    const isWeeklyTarget = habit.schedule?.type === "weekly_target";
    const displayedValue = isWeeklyTarget
      ? Math.max(0, (habit.value ?? 0) - (habit.todayValue ?? 0)) + value
      : value;
    const isComplete = displayedValue >= (habit.targetValue ?? Number.POSITIVE_INFINITY);
    setHabits((current) => current.map((item) =>
      item.id === habit.id
        ? {
            ...item,
            value: displayedValue,
            todayValue: value,
            status: isComplete ? "completed" : "incomplete",
          }
        : item,
    ));
    setProgressHistory((current) => [
      ...current.filter(
        (record) => record.habitId !== habit.id || record.date !== selectedHomeDate,
      ),
      { habitId: habit.id, date: selectedHomeDate, value },
    ]);
    updateCompletionHistoryForDate(
      habit.id,
      selectedHomeDate,
      isComplete ? "completed" : "incomplete",
      isComplete ? value : undefined,
    );
    setHabitToLogId(null);

    if (habitRepository) {
      const save = async () => {
        await habitRepository.setProgress(habit.id, selectedHomeDate, value);
        if (isComplete) {
          await habitRepository.setCheckIn(
            { ...habit, value, todayValue: value, status: "completed" },
            selectedHomeDate,
            "completed",
          );
        } else {
          await habitRepository.clearCompletionStatus(habit.id, selectedHomeDate);
        }
        await refreshPersistentData();
      };
      void save().catch((error) => recoverFromPersistenceFailure(
        "Progress could not be saved. Your saved data has been restored.",
        error,
      ));
    }
  };

  const handleSaveWeeklyValue = (habitId: string, value: number) => {
    const habit = habits.find((item) => item.id === habitId) ??
      managedHabits.find((item) => item.id === habitId);
    const goal = todayHighlights.weeklyGoals.find((item) => item.id === habitId);
    if (!habit || !goal) return;
    const normalizedValue = habit.schedule?.type === "weekly_frequency"
      ? Math.max(0, Math.floor(value))
      : Math.max(0, value);
    const weekStart = startOfLocalWeek(selectedHomeDate, weekStartsOn);
    const key = weeklyProgressKey(habitId, weekStart);
    const settingKey = weeklyProgressSettingKey(habitId, weekStart);
    const isComplete = goal.target > 0 && normalizedValue >= goal.target;

    setWeeklyProgress((current) => ({ ...current, [key]: normalizedValue }));
    setHabits((current) => current.map((item) => item.id === habitId
      ? {
          ...item,
          value: normalizedValue,
          todayValue: normalizedValue,
          status: isComplete ? "completed" : "incomplete",
        }
      : item));
    persistSetting(settingKey, String(normalizedValue));
  };

  const archiveHabit = (habitId: string, errorMessage: string) => {
    setHabits((current) => deleteHabit(current, habitId));
    setManagedHabits((current) => current.map((habit) =>
      habit.id === habitId
        ? { ...habit, isArchived: true, endDate: localDate }
        : habit,
    ));
    if (habitRepository) {
      void habitRepository.archiveHabit(habitId, localDate).catch((error) =>
        recoverFromPersistenceFailure(errorMessage, error),
      );
    }
  };

  const handleCorrectHistory = (
    habit: ManagedHabit,
    date: string,
    status: CompletionStatus,
    value?: number,
  ) => {
    setCompletionHistory((current) => {
      const remaining = current.filter(
        (record) => record.habitId !== habit.id || record.date !== date,
      );
      return status === "incomplete"
        ? remaining
        : [...remaining, { habitId: habit.id, date, status, value }];
    });
    setProgressHistory((current) => {
      const remaining = current.filter(
        (record) => record.habitId !== habit.id || record.date !== date,
      );
      return status === "completed" && habit.type !== "binary" && value !== undefined
        ? [...remaining, { habitId: habit.id, date, value }]
        : remaining;
    });

    if (!habitRepository) return;
    const operation = status === "incomplete"
      ? habitRepository.clearCheckIn(habit.id, date)
      : habitRepository.setCheckIn(
          { ...habit, status, value: status === "completed" ? value : undefined },
          date,
          status,
        );
    void operation.then(refreshPersistentData).catch((error) =>
      recoverFromPersistenceFailure(
        "That history correction could not be saved. Your saved data has been restored.",
        error,
      ),
    );
  };

  const persistSetting = (key: string, value: string) => {
    setSavedSettings((current) => ({ ...current, [key]: value }));
    if (habitRepository) {
      void habitRepository.setSetting(key, value).catch((error) =>
        recoverFromPersistenceFailure(
          "That setting could not be saved. Your saved settings have been restored.",
          error,
        ),
      );
    }
  };

  const handleNotificationPreferencesChange = async (
    preferences: NotificationPreferences,
  ): Promise<boolean> => {
    if (preferences.enabled && !notificationPreferences.enabled) {
      const granted = await requestNotificationPermission().catch((error) => {
        console.error("Unable to request notification permission", error);
        return false;
      });
      if (!granted) return false;
    }
    setNotificationPreferences(preferences);
    persistSetting(
      NOTIFICATION_SETTINGS_KEY,
      serializeNotificationPreferences(preferences),
    );
    return true;
  };

  useEffect(() => {
    const plan = buildNotificationPlan({
      now: new Date(),
      habits: managedHabits,
      schedules: scheduleHistory,
      completions: completionHistory,
      progress: progressHistory,
      reminders,
      preferences: notificationPreferences,
      weekStartsOn,
      weeklyProgress,
    });
    notificationPlanRef.current = plan;
    void syncNativeNotifications(plan).catch((error) => {
      console.error("Unable to schedule notifications", error);
    });
  }, [
    completionHistory,
    managedHabits,
    notificationPreferences,
    progressHistory,
    reminders,
    scheduleHistory,
    weekStartsOn,
    weeklyProgress,
  ]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void listenForNotificationActions((action) => {
      if (action.actionId !== COMPLETE_ACTION) return;
      const planned = notificationPlanRef.current.find(
        (item) => item.id === action.notificationId,
      );
      const habitId = action.habitId ?? planned?.habitId;
      const date = action.date || planned?.date || toLocalDateKey(new Date());
      const habit = managedHabits.find((item) =>
        habitId ? item.id === habitId : item.name === action.title
      );
      if (date > toLocalDateKey(new Date())) return;
      if (!habit || habit.isArchived || !habitRepository) return;
      const completedHabit = {
        ...habit,
        status: "completed" as const,
        value: habit.type === "binary" ? undefined : habit.targetValue,
      };
      void habitRepository.setCheckIn(completedHabit, date, "completed")
        .then(async () => {
          await refreshPersistentData();
          setSelectedHomeDate(date);
          setActiveSection("today");
          showExternalCompletionConfirmation(habit.name);
        })
        .catch((error) => recoverFromPersistenceFailure(
          "That notification check-in could not be saved.",
          error,
        ));
    }).then((cleanup) => {
      if (cancelled) cleanup();
      else stop = cleanup;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [habitRepository, managedHabits]);

  const handleThemePreferenceChange = (preference: ThemePreference) => {
    setThemePreference(preference);
    persistSetting("theme", preference);
  };

  const handleAppToneChange = (tone: AppTone) => {
    setAppTone(tone);
    persistSetting("app_tone", tone);
  };

  const handleWeekStartChange = (weekday: WeekStart) => {
    setWeekStartsOn(weekday);
    localStorage.setItem("habit-tracker-week-start", weekday);
    persistSetting("week_starts_on", weekday);
    setHabits(buildScheduledTodayHabits(
      managedHabits,
      completionHistory,
      selectedHomeDate,
      progressHistory,
      weekday,
      weeklyProgress,
    ));
  };

  const handleConfirmBeforeDeleteChange = (enabled: boolean) => {
    setConfirmBeforeDelete(enabled);
    localStorage.setItem("habit-tracker-confirm-before-delete", String(enabled));
    persistSetting("confirm_before_delete", String(enabled));
  };

  const handleDeleteHabit = (dontShowAgain: boolean) => {
    if (!habitToDeleteId) return;
    if (dontShowAgain) handleConfirmBeforeDeleteChange(false);
    archiveHabit(
      habitToDeleteId,
      "The habit could not be deleted. Your saved data has been restored.",
    );
    setHabitToDeleteId(null);
  };

  const requestDeleteHabit = (habitId: string) => {
    if (confirmBeforeDelete) {
      setHabitToDeleteId(habitId);
      return;
    }
    archiveHabit(
      habitId,
      "The habit could not be deleted. Your saved data has been restored.",
    );
  };

  const exportSnapshot = () => buildDataExport({
    settings: {
      ...savedSettings,
      theme: themePreference,
      app_tone: appTone,
      week_starts_on: weekStartsOn,
    },
    categories,
    habits: managedHabits,
    schedules: scheduleHistory,
    completions: completionHistory,
    progress: progressHistory,
  });

  const handleExport = async (format: "json" | "csv") => {
    const snapshot = exportSnapshot();
    return saveTextExport(
      format,
      format === "json"
        ? serializeJsonExport(snapshot)
        : serializeCsvExport(snapshot),
    );
  };

  const handleBackup = async () => {
    await habitRepository?.prepareBackup();
    return saveDatabaseBackup();
  };

  return (
    <AppShell
      activeSection={activeSection}
      onNavigate={setActiveSection}
      onAddHabit={openAddHabit}
    >
      {dataError && (
        <div
          className="fixed right-4 top-4 z-[80] max-w-sm rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-lg dark:border-red-900/60 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          <p className="font-semibold">Local data problem</p>
          <p className="mt-1 leading-5">{dataError}</p>
          <button className="mt-3 text-xs font-bold underline underline-offset-2" type="button" onClick={() => setDataError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {activeSection === "today" && (
        <TodayPage
          dashboard={dashboard}
          weekDateLabel={selectedWeek.dateLabel}
          weeklyHabits={todayHabitLanes.weekly}
          weeklyGoals={todayHighlights.weeklyGoals}
          weeklyCompletionPercentage={todayHighlights.weeklyCompletionPercentage}
          completedWeeklyGoals={todayHighlights.completedWeeklyGoals}
          selectedDate={selectedHomeDate}
          localDate={localDate}
          weekStartsOn={weekStartsOn}
          onSelectDate={setSelectedHomeDate}
          onReturnToToday={() => setSelectedHomeDate(localDate)}
          onAddHabit={openAddHabit}
          onEditHabit={(habitId) => setHabitDialog({ mode: "edit", habitId })}
          onToggleHabit={handleToggleHabit}
          onSkipHabit={handleSkipHabit}
          onResetHabit={handleResetHabit}
          onDeleteHabit={requestDeleteHabit}
          onLogProgress={setHabitToLogId}
          onSaveWeeklyValue={handleSaveWeeklyValue}
          onViewWeek={(view) => {
            setWeekHabitView(view);
            setActiveSection("week");
          }}
        />
      )}

      {activeSection === "week" && (
        <WeekPage
          habits={managedHabits}
          schedules={scheduleHistory}
          completions={completionHistory}
          progress={progressHistory}
          localDate={localDate}
          weekStartsOn={weekStartsOn}
          weeklyProgress={weeklyProgress}
          habitView={weekHabitView}
          onHabitViewChange={setWeekHabitView}
          onCorrectHistory={handleCorrectHistory}
        />
      )}

      {activeSection === "calendar" && (
        <CalendarPage
          habits={managedHabits}
          schedules={scheduleHistory}
          completions={completionHistory}
          progress={progressHistory}
          localDate={localDate}
          weekStartsOn={weekStartsOn}
          onCorrectHistory={handleCorrectHistory}
        />
      )}

      {activeSection === "analytics" && (
        <AnalyticsPage
          habits={managedHabits}
          schedules={scheduleHistory}
          completions={completionHistory}
          progress={progressHistory}
          localDate={localDate}
          weekStartsOn={weekStartsOn}
          weeklyProgress={weeklyProgress}
        />
      )}

      {activeSection === "settings" && (
        <SettingsPage
          themePreference={themePreference}
          appTone={appTone}
          weekStartsOn={weekStartsOn}
          habitCount={managedHabits.length}
          completionCount={completionHistory.length}
          scheduleCount={scheduleHistory.length}
          confirmBeforeDelete={confirmBeforeDelete}
          notificationPreferences={notificationPreferences}
          onThemeChange={handleThemePreferenceChange}
          onAppToneChange={handleAppToneChange}
          onWeekStartsOnChange={handleWeekStartChange}
          onConfirmBeforeDeleteChange={handleConfirmBeforeDeleteChange}
          onNotificationPreferencesChange={handleNotificationPreferencesChange}
          onExport={handleExport}
          onBackup={handleBackup}
          onRestore={chooseAndStageDatabaseRestore}
        />
      )}

      <HabitDialog
        open={habitDialog !== null}
        habit={editingHabit}
        categories={categories}
        defaultStartDate={localDate}
        reminder={editingHabit ? reminders.find((item) => item.habitId === editingHabit.id) : undefined}
        onClose={() => setHabitDialog(null)}
        onSave={handleSaveHabit}
      />
      <DeleteHabitDialog
        habit={habitToDelete}
        onCancel={() => setHabitToDeleteId(null)}
        onConfirm={handleDeleteHabit}
      />
      <ProgressDialog
        habit={habitToLog}
        onCancel={() => setHabitToLogId(null)}
        onSave={handleSaveProgress}
      />
    </AppShell>
  );
}

export default App;
