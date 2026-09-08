CREATE TABLE IF NOT EXISTS habit_progress (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE RESTRICT,
    date TEXT NOT NULL,
    value REAL NOT NULL CHECK (value >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habit_progress_date
    ON habit_progress (date);
CREATE INDEX IF NOT EXISTS idx_habit_progress_habit_date
    ON habit_progress (habit_id, date);
