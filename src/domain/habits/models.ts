export type HabitType = "binary" | "quantity" | "duration";
export type CompletionStatus = "completed" | "incomplete" | "missed" | "skipped";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";
export type ScheduleType =
  | "daily"
  | "specific_days"
  | "weekly_frequency"
  | "weekly_target";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type ThemePreference = "system" | "light" | "dark";
export type AppTone = "blue" | "purple" | "green" | "yellow" | "orange" | "coral";
export type PlantType = "oak" | "pine" | "cherry";

export interface HabitTrackerSettings {
  readonly theme: ThemePreference;
  readonly weekStartsOn: Extract<Weekday, "mon" | "sun">;
  readonly tone: AppTone;
}

export interface HabitCategory {
  readonly id: string;
  readonly name: string;
  readonly icon?: string;
  readonly sortOrder: number;
}

export interface HabitSchedule {
  readonly id?: string;
  readonly type: ScheduleType;
  readonly daysOfWeek?: readonly Weekday[];
  readonly targetCount?: number;
  readonly targetValue?: number;
  readonly targetUnit?: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
}

export interface HabitScheduleRecord extends HabitSchedule {
  readonly habitId: string;
}

export interface HabitStatistics {
  readonly habitId: string;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly totalCompletions: number;
  readonly scheduledCount: number;
  readonly completedScheduledCount: number;
  readonly completionPercentage: number;
}

export type WeekCellStatus = CompletionStatus | "not_scheduled";

export interface WeekDaySummary {
  readonly date: string;
  readonly dayLabel: string;
  readonly dateLabel: string;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  readonly completedCount: number;
  readonly scheduledCount: number;
  readonly completionPercentage: number;
}

export interface WeekHabitCell {
  readonly date: string;
  readonly status: WeekCellStatus;
  readonly value?: number;
  readonly isFuture: boolean;
  readonly canCorrect: boolean;
}

export interface WeekHabitRow {
  readonly habit: ManagedHabit;
  readonly cells: readonly WeekHabitCell[];
  readonly completed: number;
  readonly target: number;
  readonly unit: string;
  readonly statistics: HabitStatistics;
}

export interface WeekDashboard {
  readonly startDate: string;
  readonly endDate: string;
  readonly dateLabel: string;
  readonly days: readonly WeekDaySummary[];
  readonly habits: readonly WeekHabitRow[];
  readonly completedCount: number;
  readonly scheduledCount: number;
  readonly completionPercentage: number;
}

export interface CompletionRecord {
  readonly id?: string;
  readonly habitId: string;
  readonly date: string;
  readonly status: Exclude<CompletionStatus, "incomplete">;
  readonly value?: number;
}

export interface HabitProgressRecord {
  readonly habitId: string;
  readonly date: string;
  readonly value: number;
}

export interface MissedCompletion {
  readonly habitId: string;
  readonly date: string;
}

export interface TodayHabit {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly type: HabitType;
  readonly status: CompletionStatus;
  readonly timeOfDay: TimeOfDay;
  readonly streak: number;
  readonly value?: number;
  readonly targetValue?: number;
  readonly targetUnit?: string;
  readonly categoryId?: string;
  readonly categoryName?: string;
  readonly icon?: string;
  readonly colour?: string;
  readonly plantType?: PlantType;
  readonly startDate?: string;
  readonly schedule?: HabitSchedule;
  readonly todayValue?: number;
}

export interface ManagedHabit extends TodayHabit {
  readonly startDate: string;
  readonly endDate?: string;
  readonly isArchived: boolean;
  readonly sortOrder: number;
  readonly schedule: HabitSchedule;
}

export interface WeeklyGoal {
  readonly id: string;
  readonly name: string;
  readonly completed: number;
  readonly target: number;
  readonly unit: string;
}
