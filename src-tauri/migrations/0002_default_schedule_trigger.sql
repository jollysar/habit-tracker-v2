CREATE TRIGGER IF NOT EXISTS create_default_daily_schedule
AFTER INSERT ON habits
WHEN NOT EXISTS (
    SELECT 1 FROM habit_schedules WHERE habit_id = NEW.id
)
BEGIN
    INSERT INTO habit_schedules (
        id,
        habit_id,
        schedule_type,
        frequency,
        effective_from
    ) VALUES (
        lower(hex(randomblob(16))),
        NEW.id,
        'daily',
        1,
        NEW.start_date
    );
END;
