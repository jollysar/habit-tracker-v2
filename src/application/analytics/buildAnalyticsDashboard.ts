import { addMonthsToLocalDateKey } from "../calendar/buildCalendarDashboard";
import { addDaysToLocalDateKey } from "../dates/localDate";
import { endOfLocalWeek, startOfLocalWeek, weekdayForLocalDate } from "../scheduling/habitScheduling";
import { calculateHabitStatistics, scheduleForHabitDate } from "../week/buildWeekDashboard";
import { weeklyProgressKey, type WeeklyProgressOverrides } from "../week/weeklyProgress";
import type {
  CompletionRecord,
  HabitProgressRecord,
  HabitSchedule,
  HabitScheduleRecord,
  ManagedHabit,
  TimeOfDay,
  Weekday,
} from "../../domain/habits/models";

export interface AnalyticsPeriod {
  readonly key: string;
  readonly label: string;
  readonly from: string;
  readonly through: string;
  readonly completionPercentage: number;
  readonly completedScore: number;
  readonly expectedCount: number;
}

export interface HabitAnalyticsRow {
  readonly habit: ManagedHabit;
  readonly completionPercentage: number;
  readonly completedScore: number;
  readonly expectedCount: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly totalCompletions: number;
}

export interface TimeOfDayAnalytics {
  readonly id: TimeOfDay;
  readonly label: string;
  readonly completionPercentage: number;
  readonly expectedCount: number;
}

export interface AnalyticsInsight {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly tone: "positive" | "neutral" | "attention";
}

export interface AnalyticsDashboard {
  readonly monthLabel: string;
  readonly completionPercentage: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly totalCompletions: number;
  readonly weeklyPerformance: readonly AnalyticsPeriod[];
  readonly monthlyPerformance: readonly AnalyticsPeriod[];
  readonly habitPerformance: readonly HabitAnalyticsRow[];
  readonly timeOfDayPerformance: readonly TimeOfDayAnalytics[];
  readonly insights: readonly AnalyticsInsight[];
}

interface PeriodScore {
  readonly completedScore: number;
  readonly expectedCount: number;
  readonly completionPercentage: number;
}

function displayDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function existsOnDate(habit: ManagedHabit, date: string): boolean {
  return habit.startDate <= date && (!habit.endDate || habit.endDate >= date);
}

function fixedScheduleIsDue(schedule: HabitSchedule, date: string): boolean {
  if (schedule.type === "daily") return true;
  return schedule.type === "specific_days" &&
    (schedule.daysOfWeek?.includes(weekdayForLocalDate(date)) ?? false);
}

function recordKey(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

function completionValue(
  habit: ManagedHabit,
  date: string,
  completionByKey: ReadonlyMap<string, CompletionRecord>,
  progressByKey: ReadonlyMap<string, HabitProgressRecord>,
): number {
  const key = recordKey(habit.id, date);
  const progress = progressByKey.get(key);
  if (progress) return progress.value;
  const completion = completionByKey.get(key);
  if (completion?.value !== undefined) return completion.value;
  if (completion?.status !== "completed") return 0;
  return habit.type === "binary" ? 1 : habit.targetValue ?? 0;
}

export function calculatePeriodScore(
  habits: readonly ManagedHabit[],
  schedules: readonly HabitScheduleRecord[],
  completions: readonly CompletionRecord[],
  progress: readonly HabitProgressRecord[],
  from: string,
  through: string,
  localDate: string,
  weekStartsOn: Weekday = "mon",
  weeklyProgress: WeeklyProgressOverrides = {},
): PeriodScore {
  const finalDate = through < localDate ? through : localDate;
  if (finalDate < from) return { completedScore: 0, expectedCount: 0, completionPercentage: 0 };
  const completionByKey = new Map(completions.map((record) => [recordKey(record.habitId, record.date), record]));
  const progressByKey = new Map(progress.map((record) => [recordKey(record.habitId, record.date), record]));
  let completedScore = 0;
  let expectedCount = 0;
  const flexibleWeeks = new Map<string, { habit: ManagedHabit; schedule: HabitSchedule; weekStart: string }>();

  for (const habit of habits) {
    let date = habit.startDate > from ? habit.startDate : from;
    const habitEnd = habit.endDate && habit.endDate < finalDate ? habit.endDate : finalDate;
    while (date <= habitEnd) {
      const schedule = scheduleForHabitDate(habit, schedules, date);
      if (schedule && existsOnDate(habit, date)) {
        if (fixedScheduleIsDue(schedule, date)) {
          const completion = completionByKey.get(recordKey(habit.id, date));
          if (completion?.status !== "skipped") {
            expectedCount += 1;
            if (completion?.status === "completed") completedScore += 1;
          }
        } else if (schedule.type === "weekly_frequency" || schedule.type === "weekly_target") {
          const weekStart = startOfLocalWeek(date, weekStartsOn);
          flexibleWeeks.set(
            `${habit.id}:${weekStart}:${schedule.effectiveFrom}`,
            { habit, schedule, weekStart },
          );
        }
      }
      date = addDaysToLocalDateKey(date, 1);
    }
  }

  for (const { habit, schedule, weekStart } of flexibleWeeks.values()) {
    const rangeStart = [weekStart, from, habit.startDate, schedule.effectiveFrom]
      .sort()
      .reverse()[0];
    const weekEnd = endOfLocalWeek(weekStart, weekStartsOn);
    const rangeEnd = [weekEnd, finalDate, habit.endDate, schedule.effectiveTo]
      .filter((date): date is string => Boolean(date))
      .sort()[0];
    let achieved = 0;
    let date = rangeStart;
    while (date <= rangeEnd) {
      if (schedule.type === "weekly_frequency") {
        if (completionByKey.get(recordKey(habit.id, date))?.status === "completed") achieved += 1;
      } else {
        achieved += completionValue(habit, date, completionByKey, progressByKey);
      }
      date = addDaysToLocalDateKey(date, 1);
    }
    achieved = weeklyProgress[weeklyProgressKey(habit.id, weekStart)] ?? achieved;
    const target = schedule.type === "weekly_frequency"
      ? schedule.targetCount ?? 1
      : schedule.targetValue ?? habit.targetValue ?? 1;
    expectedCount += 1;
    completedScore += Math.min(1, achieved / Math.max(1, target));
  }

  return {
    completedScore,
    expectedCount,
    completionPercentage: expectedCount === 0
      ? 0
      : Math.round((completedScore / expectedCount) * 100),
  };
}

function monthEnd(monthStart: string): string {
  return addDaysToLocalDateKey(addMonthsToLocalDateKey(monthStart, 1), -1);
}

function period(
  key: string,
  label: string,
  from: string,
  through: string,
  habits: readonly ManagedHabit[],
  schedules: readonly HabitScheduleRecord[],
  completions: readonly CompletionRecord[],
  progress: readonly HabitProgressRecord[],
  localDate: string,
  weekStartsOn: Weekday,
  weeklyProgress: WeeklyProgressOverrides,
): AnalyticsPeriod {
  return {
    key,
    label,
    from,
    through,
    ...calculatePeriodScore(
      habits, schedules, completions, progress, from, through, localDate, weekStartsOn, weeklyProgress,
    ),
  };
}

function buildInsights(
  weekly: readonly AnalyticsPeriod[],
  habitRows: readonly HabitAnalyticsRow[],
  weekdayScores: ReadonlyMap<Weekday, PeriodScore>,
): readonly AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const settledWeeks = weekly.filter((item) => item.expectedCount >= 2);
  if (settledWeeks.length >= 8) {
    const earlier = settledWeeks.slice(0, 4).reduce((sum, item) => sum + item.completionPercentage, 0) / 4;
    const recent = settledWeeks.slice(-4).reduce((sum, item) => sum + item.completionPercentage, 0) / 4;
    const change = Math.round(recent - earlier);
    if (Math.abs(change) >= 5) {
      insights.push({
        id: "trend",
        title: change > 0 ? "Your consistency is improving" : "Your consistency has dipped",
        detail: `Your last four weeks are ${Math.abs(change)} percentage points ${change > 0 ? "higher" : "lower"} than the previous four.`,
        tone: change > 0 ? "positive" : "attention",
      });
    }
  }

  const weekdays = [...weekdayScores.entries()].filter(([, score]) => score.expectedCount >= 3);
  if (weekdays.length >= 2) {
    weekdays.sort((a, b) => b[1].completionPercentage - a[1].completionPercentage);
    const [bestDay, bestScore] = weekdays[0];
    const average = weekdays.reduce((sum, [, score]) => sum + score.completionPercentage, 0) / weekdays.length;
    if (bestScore.completionPercentage >= average + 8) {
      const label = bestDay.charAt(0).toUpperCase() + bestDay.slice(1) + "days";
      insights.push({
        id: "weekday",
        title: `${label} are your strongest`,
        detail: `You complete ${bestScore.completionPercentage}% of scheduled habits on ${label}.`,
        tone: "positive",
      });
    }
  }

  const eligibleHabits = habitRows.filter((row) => row.expectedCount >= 5);
  if (eligibleHabits.length >= 2) {
    const best = [...eligibleHabits].sort((a, b) => b.completionPercentage - a.completionPercentage)[0];
    insights.push({
      id: "consistent-habit",
      title: `${best.habit.name} is your most consistent habit`,
      detail: `${best.completionPercentage}% completion across ${Math.round(best.expectedCount)} scheduled opportunities.`,
      tone: "neutral",
    });
  }
  return insights.slice(0, 3);
}

export function buildAnalyticsDashboard(
  habits: readonly ManagedHabit[],
  schedules: readonly HabitScheduleRecord[],
  completions: readonly CompletionRecord[],
  progress: readonly HabitProgressRecord[],
  localDate: string,
  selectedHabitId?: string,
  weekStartsOn: Weekday = "mon",
  weeklyProgress: WeeklyProgressOverrides = {},
): AnalyticsDashboard {
  const selectedHabits = habits.filter((habit) => !selectedHabitId || habit.id === selectedHabitId);
  const currentMonthStart = `${localDate.slice(0, 7)}-01`;
  const analyticsStart = addMonthsToLocalDateKey(currentMonthStart, -5);
  const currentMonth = calculatePeriodScore(
    selectedHabits, schedules, completions, progress, currentMonthStart,
    monthEnd(currentMonthStart), localDate, weekStartsOn, weeklyProgress,
  );
  const monthlyPerformance = Array.from({ length: 6 }, (_, index) => {
    const from = addMonthsToLocalDateKey(currentMonthStart, index - 5);
    return period(
      from.slice(0, 7),
      displayDate(from).toLocaleDateString(undefined, { month: "short" }),
      from,
      monthEnd(from),
      selectedHabits,
      schedules,
      completions,
      progress,
      localDate,
      weekStartsOn,
      weeklyProgress,
    );
  });
  const currentWeekStart = startOfLocalWeek(localDate, weekStartsOn);
  const weeklyPerformance = Array.from({ length: 8 }, (_, index) => {
    const from = addDaysToLocalDateKey(currentWeekStart, (index - 7) * 7);
    return period(
      from,
      displayDate(from).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      from,
      endOfLocalWeek(from, weekStartsOn),
      selectedHabits,
      schedules,
      completions,
      progress,
      localDate,
      weekStartsOn,
      weeklyProgress,
    );
  });
  const habitPerformance = selectedHabits.map<HabitAnalyticsRow>((habit) => {
    const score = calculatePeriodScore(
      [habit], schedules, completions, progress, analyticsStart, localDate,
      localDate, weekStartsOn,
      weeklyProgress,
    );
    const statistics = calculateHabitStatistics(
      habit, schedules, completions, progress, localDate, weekStartsOn, weeklyProgress,
    );
    return {
      habit,
      ...score,
      currentStreak: statistics.currentStreak,
      bestStreak: statistics.bestStreak,
      totalCompletions: statistics.totalCompletions,
    };
  }).sort((a, b) => b.completionPercentage - a.completionPercentage);
  const timeLabels: Record<TimeOfDay, string> = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    anytime: "Anytime",
  };
  const timeOfDayPerformance = (Object.keys(timeLabels) as TimeOfDay[]).map((id) => {
    const score = calculatePeriodScore(
      selectedHabits.filter((habit) => habit.timeOfDay === id),
      schedules,
      completions,
      progress,
      analyticsStart,
      localDate,
      localDate,
      weekStartsOn,
      weeklyProgress,
    );
    return { id, label: timeLabels[id], completionPercentage: score.completionPercentage, expectedCount: score.expectedCount };
  }).filter((item) => item.expectedCount > 0);

  const weekdayScores = new Map<Weekday, PeriodScore>();
  const weekdayIds: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  for (const weekday of weekdayIds) {
    const relevantCompletions = completions.filter((record) => weekdayForLocalDate(record.date) === weekday);
    let completedScore = 0;
    let expectedCount = 0;
    for (const habit of selectedHabits) {
      let date = habit.startDate > analyticsStart ? habit.startDate : analyticsStart;
      const end = habit.endDate && habit.endDate < localDate ? habit.endDate : localDate;
      while (date <= end) {
        if (weekdayForLocalDate(date) === weekday) {
          const schedule = scheduleForHabitDate(habit, schedules, date);
          const completion = relevantCompletions.find((item) => item.habitId === habit.id && item.date === date);
          if (schedule && fixedScheduleIsDue(schedule, date) && completion?.status !== "skipped") {
            expectedCount += 1;
            if (completion?.status === "completed") completedScore += 1;
          }
        }
        date = addDaysToLocalDateKey(date, 1);
      }
    }
    weekdayScores.set(weekday, {
      completedScore,
      expectedCount,
      completionPercentage: expectedCount === 0 ? 0 : Math.round((completedScore / expectedCount) * 100),
    });
  }
  const allStatistics = selectedHabits.map((habit) =>
    calculateHabitStatistics(
      habit, schedules, completions, progress, localDate, weekStartsOn, weeklyProgress,
    )
  );

  return {
    monthLabel: displayDate(currentMonthStart).toLocaleDateString(undefined, { month: "long" }),
    completionPercentage: currentMonth.completionPercentage,
    currentStreak: allStatistics.reduce((max, item) => Math.max(max, item.currentStreak), 0),
    bestStreak: allStatistics.reduce((max, item) => Math.max(max, item.bestStreak), 0),
    totalCompletions: completions.filter((record) =>
      record.status === "completed" && selectedHabits.some((habit) => habit.id === record.habitId)
    ).length,
    weeklyPerformance,
    monthlyPerformance,
    habitPerformance,
    timeOfDayPerformance,
    insights: buildInsights(weeklyPerformance, habitPerformance, weekdayScores),
  };
}
