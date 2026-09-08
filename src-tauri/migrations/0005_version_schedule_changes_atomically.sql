CREATE TRIGGER IF NOT EXISTS close_previous_schedule
BEFORE INSERT ON habit_schedules
BEGIN
    UPDATE habit_schedules
    SET effective_to = date(NEW.effective_from, '-1 day')
    WHERE habit_id = NEW.habit_id
      AND effective_to IS NULL
      AND effective_from < NEW.effective_from;
END;
