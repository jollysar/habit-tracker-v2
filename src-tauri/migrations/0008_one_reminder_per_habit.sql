DELETE FROM reminders
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM reminders
  GROUP BY habit_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_one_per_habit
  ON reminders (habit_id);
