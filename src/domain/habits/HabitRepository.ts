import type {
  CompletionStatus,
  CompletionRecord,
  HabitCategory,
  HabitProgressRecord,
  HabitScheduleRecord,
  ManagedHabit,
  MissedCompletion,
  TodayHabit,
} from "./models";

export type RecordedCompletionStatus = Exclude<CompletionStatus, "incomplete">;

export interface HabitRepository {
  ensureStarterData(
    habits: readonly TodayHabit[],
    localDate: string,
  ): Promise<void>;
  listForDate(localDate: string): Promise<readonly TodayHabit[]>;
  listAll(): Promise<readonly ManagedHabit[]>;
  listCategories(): Promise<readonly HabitCategory[]>;
  listSchedules(): Promise<readonly HabitScheduleRecord[]>;
  listSettings(): Promise<Readonly<Record<string, string>>>;
  setSetting(key: string, value: string): Promise<void>;
  listCompletions(
    fromLocalDate: string,
    throughLocalDate: string,
  ): Promise<readonly CompletionRecord[]>;
  listProgress(
    fromLocalDate: string,
    throughLocalDate: string,
  ): Promise<readonly HabitProgressRecord[]>;
  createHabit(habit: ManagedHabit, localDate: string): Promise<void>;
  updateHabit(habit: ManagedHabit, localDate: string): Promise<void>;
  archiveHabit(habitId: string, localDate: string): Promise<void>;
  restoreHabit(habitId: string): Promise<void>;
  reorderHabits(orderedHabitIds: readonly string[]): Promise<void>;
  recordMissedCompletions(
    completions: readonly MissedCompletion[],
  ): Promise<void>;
  setProgress(habitId: string, localDate: string, value: number): Promise<void>;
  clearCompletionStatus(habitId: string, localDate: string): Promise<void>;
  setCheckIn(
    habit: TodayHabit,
    localDate: string,
    status: RecordedCompletionStatus,
  ): Promise<void>;
  clearCheckIn(habitId: string, localDate: string): Promise<void>;
  prepareBackup(): Promise<void>;
}
