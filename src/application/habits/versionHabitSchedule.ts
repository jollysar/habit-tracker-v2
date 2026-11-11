import { addDaysToLocalDateKey } from "../dates/localDate";
import type {
  HabitSchedule,
  HabitScheduleRecord,
} from "../../domain/habits/models";

/**
 * Mirrors the repository's schedule-versioning behaviour for the optimistic UI.
 * This keeps a newly edited weekly target visible immediately while preserving
 * the schedule that applied before the edit date.
 */
export function versionHabitSchedule(
  schedules: readonly HabitScheduleRecord[],
  habitId: string,
  schedule: HabitSchedule,
  effectiveFrom: string,
): readonly HabitScheduleRecord[] {
  const existingOnDate = schedules.find(
    (candidate) => candidate.habitId === habitId
      && candidate.effectiveFrom === effectiveFrom,
  );
  const previousDay = addDaysToLocalDateKey(effectiveFrom, -1);
  const nextSchedule: HabitScheduleRecord = {
    ...schedule,
    id: existingOnDate?.id ?? schedule.id,
    habitId,
    effectiveFrom,
    effectiveTo: undefined,
  };

  const retained = schedules.flatMap((candidate) => {
    if (candidate.habitId !== habitId) return [candidate];
    if (candidate.effectiveFrom === effectiveFrom) return [];
    if (
      candidate.effectiveFrom < effectiveFrom
      && (!candidate.effectiveTo || candidate.effectiveTo >= effectiveFrom)
    ) {
      return [{ ...candidate, effectiveTo: previousDay }];
    }
    return [candidate];
  });

  return [...retained, nextSchedule].sort((a, b) =>
    a.habitId.localeCompare(b.habitId)
      || a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
}
