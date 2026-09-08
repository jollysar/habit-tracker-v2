ALTER TABLE habits
ADD COLUMN plant_type TEXT NOT NULL DEFAULT 'oak'
CHECK (plant_type IN ('oak', 'pine', 'cherry'));
