PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('binary', 'quantity', 'duration')),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    target_value REAL CHECK (target_value IS NULL OR target_value > 0),
    target_unit TEXT,
    time_of_day TEXT NOT NULL DEFAULT 'anytime'
        CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')),
    icon TEXT,
    colour TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS habit_schedules (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    schedule_type TEXT NOT NULL
        CHECK (schedule_type IN ('daily', 'specific_days', 'weekly_frequency', 'weekly_target')),
    frequency INTEGER CHECK (frequency IS NULL OR frequency > 0),
    days_of_week TEXT,
    target_count INTEGER CHECK (target_count IS NULL OR target_count > 0),
    target_value REAL CHECK (target_value IS NULL OR target_value > 0),
    target_unit TEXT,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS completions (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE RESTRICT,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'skipped')),
    value REAL,
    target_value_snapshot REAL,
    target_unit_snapshot TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (habit_id, date)
);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    time TEXT NOT NULL,
    days TEXT,
    repeat_behaviour TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_habits_active_sort
    ON habits (is_archived, sort_order);
CREATE INDEX IF NOT EXISTS idx_schedules_habit_effective
    ON habit_schedules (habit_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_completions_date
    ON completions (date);
CREATE INDEX IF NOT EXISTS idx_completions_habit_date
    ON completions (habit_id, date);
CREATE INDEX IF NOT EXISTS idx_reminders_habit
    ON reminders (habit_id);
